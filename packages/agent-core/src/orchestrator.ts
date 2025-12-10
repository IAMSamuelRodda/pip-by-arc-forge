/**
 * Main Agent Orchestrator
 *
 * Coordinates conversation flow and delegates to sub-agents
 */

import {
  createLLMProviderFromEnv,
  createLLMProvider,
  createDatabaseProviderFromEnv,
  type LLMProvider,
  type DatabaseProvider,
  type ResponseStyleId,
  buildStylePrompt,
  isToolCapableModel,
  RateLimiter,
} from '@pip/core';
import Database from 'better-sqlite3';
import { SessionManager } from './session/manager.js';
import { MemoryManager } from './memory/manager.js';
import { XeroClient } from './xero/client.js';
import { createXeroTools, type Tool } from './tools/xero-tools.js';
import { createMemoryTools } from './tools/memory-tools.js';
import type { AgentRequest, AgentResponse } from './types.js';

// Database path for knowledge graph access
const DB_PATH = process.env.DATABASE_PATH || './data/pip.db';

export class AgentOrchestrator {
  private sessionManager: SessionManager | null = null;
  private memoryManager: MemoryManager | null = null;
  private llmProvider: LLMProvider | null = null;
  private ollamaProvider: LLMProvider | null = null;
  private dbProvider: DatabaseProvider | null = null;
  private rateLimiter: RateLimiter | null = null;
  private xeroClient: XeroClient | null = null;
  private xeroTools: Tool[] = [];
  private memoryTools: Tool[] = [];
  private initializationPromise: Promise<void> | null = null;
  private initialized = false;

  constructor() {
    // Lazy initialization - will be triggered on first use
  }

  /**
   * Initialize all providers from environment configuration
   * Can be called explicitly or will be called automatically on first use
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Initialize database first (required by managers)
      this.dbProvider = await createDatabaseProviderFromEnv();
      console.log(`✓ Database Provider initialized: ${this.dbProvider.name}`);

      // Initialize managers with database
      this.sessionManager = new SessionManager(this.dbProvider);
      this.memoryManager = new MemoryManager(this.dbProvider);

      // Initialize rate limiter for token usage tracking
      this.rateLimiter = new RateLimiter(this.dbProvider);
      console.log(`✓ Rate Limiter initialized`);

      // Initialize LLM providers (Anthropic as default, Ollama as optional)
      this.llmProvider = await createLLMProviderFromEnv();
      console.log(`✓ LLM Provider initialized: ${this.llmProvider.name}`);

      // Initialize Ollama provider (optional - routes via Tailscale to local GPU)
      // OLLAMA_ENDPOINT should be set to Tailscale IP (e.g., http://100.64.0.2:11434)
      const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
      try {
        this.ollamaProvider = await createLLMProvider({
          provider: 'ollama',
          auth: { method: 'local', credentials: { endpoint: ollamaEndpoint } },
        });
        console.log(`✓ Ollama Provider initialized (${ollamaEndpoint})`);
      } catch (error) {
        console.log(`ℹ Ollama not available at ${ollamaEndpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize Xero client and tools
      const xeroClientId = process.env.XERO_CLIENT_ID;
      const xeroClientSecret = process.env.XERO_CLIENT_SECRET;
      if (xeroClientId && xeroClientSecret) {
        this.xeroClient = new XeroClient(this.dbProvider, xeroClientId, xeroClientSecret);
        this.xeroTools = createXeroTools(this.xeroClient);
        console.log(`✓ Xero Client initialized with ${this.xeroTools.length} tools`);
      } else {
        console.warn('⚠ Xero credentials not found - Xero tools will not be available');
      }

      // Initialize memory tools (always available)
      this.memoryTools = createMemoryTools();
      console.log(`✓ Memory tools initialized with ${this.memoryTools.length} tools`);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }

  /**
   * Ensure all providers are ready before processing messages
   */
  private async ensureReady(): Promise<void> {
    await this.initialize();
    if (!this.llmProvider || !this.llmProvider.isReady()) {
      throw new Error('LLM provider not ready');
    }
    if (!this.dbProvider || !this.dbProvider.isConnected()) {
      throw new Error('Database provider not connected');
    }
    if (!this.sessionManager || !this.memoryManager) {
      throw new Error('Managers not initialized');
    }
  }

  /**
   * Get the appropriate LLM provider based on model selection
   * Supports formats: "ollama:modelname" or "ollama-local" (legacy)
   */
  private getProvider(model?: string): { provider: LLMProvider; modelOverride?: string } {
    // Check for Ollama models (format: "ollama:modelname" or legacy "ollama-local")
    if (model?.startsWith('ollama:') || model === 'ollama-local') {
      if (!this.ollamaProvider || !this.ollamaProvider.isReady()) {
        throw new Error('Ollama is not available. Make sure Ollama is running locally.');
      }
      // Extract specific model name if provided (e.g., "ollama:deepseek-coder:33b" -> "deepseek-coder:33b")
      const modelOverride = model?.startsWith('ollama:') ? model.replace('ollama:', '') : undefined;
      return { provider: this.ollamaProvider, modelOverride };
    }
    return { provider: this.llmProvider! };
  }

  /**
   * Process user message and generate response
   */
  async processMessage(request: AgentRequest): Promise<AgentResponse> {
    const { userId, sessionId, message, model } = request;

    try {
      // Ensure LLM provider is ready
      await this.ensureReady();

      // 1. Load session context from database
      const session = await this.sessionManager!.getSession(userId, sessionId);

      // 2. Load user memory (preferences, relationship stage)
      const memory = await this.memoryManager!.getCoreMemory(userId);

      // 3. Load user settings (response style, permissions)
      const userSettings = await this.dbProvider!.getUserSettings(userId);
      const responseStyle: ResponseStyleId = userSettings?.responseStyle || 'normal';

      // 4. Load business context (uploaded documents)
      const businessContext = await this.getBusinessContext(userId);

      // 5. Load memory context from knowledge graph
      const memoryContext = await this.getMemoryContext(userId, request.projectId);

      // 6. Load project instructions (if chat is in a project)
      let projectInstructions: string | undefined;
      if (request.projectId) {
        const project = await this.dbProvider!.getProject(userId, request.projectId);
        projectInstructions = project?.instructions || undefined;
      }

      // 7. Build conversation context with system prompt and history
      // Determine display name for model (for Ollama models, extract the model name)
      const modelDisplayName = model?.startsWith('ollama:')
        ? model.replace('ollama:', '')
        : model?.includes(':') ? model : undefined;
      const systemPrompt = this.buildSystemPrompt(memory, businessContext, memoryContext, responseStyle, modelDisplayName, projectInstructions);
      const conversationHistory = [
        { role: 'system' as const, content: systemPrompt },
        ...(session?.messages || []),
        { role: 'user' as const, content: message },
      ];

      // 7. Combine all available tools (Xero + Memory)
      const allTools = [...this.xeroTools, ...this.memoryTools];
      const anthropicTools = allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object" as const,
          properties: tool.parameters.properties,
          required: tool.parameters.required || [],
        },
      }));

      // 8. Get the appropriate provider for the selected model
      const { provider, modelOverride } = this.getProvider(model);
      const isOllamaModel = model?.startsWith('ollama:') || model === 'ollama-local';

      // Log which model is being used
      console.log(`💬 Chat request: model=${model || 'default'}, provider=${provider.name}, override=${modelOverride || 'none'}`);

      // 9. Invoke LLM provider to generate response with tools
      // For Ollama, check if the specific model supports native tool calling
      // Models like qwq, llama3.1, mistral support tools; deepseek-r1 doesn't
      const ollamaModelName = modelOverride || '';
      const ollamaSupportsTools = isOllamaModel && isToolCapableModel(ollamaModelName);
      const useTools = anthropicTools.length > 0 && (!isOllamaModel || ollamaSupportsTools);

      if (isOllamaModel) {
        console.log(`🔧 Ollama model ${ollamaModelName}: tools ${ollamaSupportsTools ? 'enabled' : 'disabled'}`);
      }

      let llmResponse = await provider.chat(conversationHistory, {
        tools: useTools ? anthropicTools : undefined,
        model: modelOverride || (isOllamaModel ? undefined : model), // Use specific Ollama model or cloud model
      });

      // 9. Check if LLM wants to use a tool
      if (llmResponse.toolUse) {
        const toolName = llmResponse.toolUse.name;
        const toolInput = llmResponse.toolUse.input;

        console.log(`🔧 Tool called: ${toolName}`, toolInput);

        // Find and execute the tool (search all tools)
        const tool = allTools.find((t) => t.name === toolName);
        if (tool) {
          // Pass execution context with userId and projectId for proper scoping
          const toolResult = await tool.execute(toolInput, { userId, projectId: request.projectId });

          // Send tool result back to LLM for final response
          const followUpConversation = [
            ...conversationHistory,
            {
              role: 'assistant' as const,
              content: llmResponse.content || `Using tool: ${toolName}`,
            },
            {
              role: 'user' as const,
              content: `Tool result:\n${JSON.stringify(toolResult, null, 2)}`,
            },
          ];

          llmResponse = await provider.chat(followUpConversation, {
            model: modelOverride || (isOllamaModel ? undefined : model),
          });
        }
      }

      // 6. TODO: Route to sub-agents if needed
      // - Invoice operations → InvoiceAgent
      // - Bank reconciliation → ReconciliationAgent
      // - Financial reports → ReportingAgent
      // - Expense tracking → ExpenseAgent

      // 7. Update session history
      await this.sessionManager!.updateSession(userId, sessionId, {
        messages: [
          ...(session?.messages || []),
          { role: 'user', content: message },
          { role: 'assistant', content: llmResponse.content },
        ],
      });

      // 8. TODO: Update memory if needed (extract learnings from conversation)

      // Return response with metadata
      return {
        message: llmResponse.content,
        sessionId,
        metadata: {
          tokensUsed: llmResponse.usage.totalTokens,
        },
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Retrieve business context for user (simple recency-based for MVP)
   * Phase 1: Get most recent documents
   * Phase 2: Will use embeddings for semantic retrieval
   */
  private async getBusinessContext(userId: string): Promise<string> {
    try {
      const contexts = await (this.dbProvider as any).getBusinessContext(userId, { limit: 10 });

      if (!contexts || contexts.length === 0) {
        return '';
      }

      // Group by document for better organization
      const byDoc = new Map<string, { type: string; chunks: string[] }>();
      for (const ctx of contexts) {
        if (!byDoc.has(ctx.docName)) {
          byDoc.set(ctx.docName, { type: ctx.docType, chunks: [] });
        }
        byDoc.get(ctx.docName)!.chunks.push(ctx.content);
      }

      // Format for injection into prompt
      const sections: string[] = [];
      for (const [docName, data] of byDoc) {
        const content = data.chunks.join('\n\n');
        sections.push(`### ${docName} (${data.type})\n${content}`);
      }

      return sections.join('\n\n---\n\n');
    } catch (error) {
      console.error('Error retrieving business context:', error);
      return '';
    }
  }

  /**
   * Get memory context from knowledge graph for system prompt injection
   * Returns formatted summary of what Pip knows about the user
   */
  private async getMemoryContext(userId: string, projectId?: string): Promise<string> {
    try {
      const db = new Database(DB_PATH);
      try {
        // Build scope clause for project isolation
        const scopeClause = projectId
          ? 'AND e.project_id = ?'
          : 'AND e.project_id IS NULL';
        const scopeParams = projectId ? [userId, projectId] : [userId];

        // Get entities with their observations
        const entities = db.prepare(`
          SELECT e.name, e.entity_type, GROUP_CONCAT(o.observation, '||') as observations
          FROM memory_entities e
          LEFT JOIN memory_observations o ON e.id = o.entity_id
          WHERE e.user_id = ? ${scopeClause}
          GROUP BY e.id
          ORDER BY e.created_at DESC
          LIMIT 20
        `).all(...scopeParams) as { name: string; entity_type: string; observations: string | null }[];

        if (entities.length === 0) {
          return '';
        }

        // Get relations
        const relations = db.prepare(`
          SELECT e1.name as from_name, r.relation_type, e2.name as to_name
          FROM memory_relations r
          JOIN memory_entities e1 ON r.from_entity_id = e1.id
          JOIN memory_entities e2 ON r.to_entity_id = e2.id
          WHERE r.user_id = ? ${scopeClause.replace(/e\./g, 'r.')}
          ORDER BY r.created_at DESC
          LIMIT 10
        `).all(...scopeParams) as { from_name: string; relation_type: string; to_name: string }[];

        // Format entities
        const entityLines: string[] = [];
        for (const entity of entities) {
          const obs = entity.observations ? entity.observations.split('||') : [];
          if (obs.length > 0) {
            entityLines.push(`**${entity.name}** (${entity.entity_type}):`);
            for (const o of obs.slice(0, 5)) { // Limit observations per entity
              entityLines.push(`  - ${o}`);
            }
          }
        }

        // Format relations
        const relationLines: string[] = [];
        for (const rel of relations) {
          relationLines.push(`- ${rel.from_name} ${rel.relation_type} ${rel.to_name}`);
        }

        // Build final context
        let context = '';
        if (entityLines.length > 0) {
          context += entityLines.join('\n');
        }
        if (relationLines.length > 0) {
          context += '\n\n**Relationships:**\n' + relationLines.join('\n');
        }

        return context;
      } finally {
        db.close();
      }
    } catch (error) {
      console.error('Error retrieving memory context:', error);
      return '';
    }
  }

  /**
   * Build system prompt with user context, memory, and response style
   */
  private buildSystemPrompt(memory: any, businessContext: string = '', memoryContext: string = '', responseStyle: ResponseStyleId = 'normal', modelName?: string, projectInstructions?: string): string {
    const relationshipContext = memory?.relationshipStage
      ? `Your relationship with this user is at the "${memory.relationshipStage}" stage.`
      : 'This is your first conversation with this user.';

    // Memory section - what Pip remembers about this user
    const memorySection = memoryContext
      ? `\n\n## What You Remember About This User\nYou have learned the following from previous conversations. Use this context to personalize your responses:\n\n${memoryContext}\n`
      : '';

    const businessSection = businessContext
      ? `\n\n## Business Context (from uploaded documents)\nIMPORTANT: The user has uploaded these business documents. Reference specific numbers, targets, and criteria from these documents in your answers:\n\n${businessContext}\n`
      : '\n\n## Business Context\nNo business documents uploaded yet. Encourage the user to upload their business plan, KPIs, or financial goals for personalized advice.\n';

    // Project instructions - custom behavior for this project
    const projectSection = projectInstructions
      ? `\n\n## Project Instructions\nIMPORTANT: You MUST follow these custom instructions for this project:\n\n${projectInstructions}\n`
      : '';

    // Get style-specific prompt modifier (empty string for 'normal')
    const styleModifier = buildStylePrompt(responseStyle);
    const styleSection = styleModifier ? `\n${styleModifier}\n` : '';

    // Add model identity for local models that don't know themselves
    const modelIdentity = modelName
      ? `\n\nNote: You are powered by ${modelName}. If asked about your model, refer to this.`
      : '';

    return `You are Pip, a helpful intelligent assistant for Australian small business owners. You're good with the books - sharp, direct, and knowledgeable.${modelIdentity}

${relationshipContext}${memorySection}
${businessSection}${projectSection}${styleSection}
## How You Work

- Use tools to get real data from Xero when available - don't guess numbers
- Reference uploaded business documents when relevant
- Give clear, actionable answers
- Be direct - like a trusted colleague who knows their stuff

## Tools Available

**Memory:** read_memory, search_memory
**Xero (when connected):** get_invoices, get_profit_and_loss, get_balance_sheet, get_bank_transactions, get_contacts, get_organisation

## Style

- Australian English (organisation, colour)
- Concise but complete
- Structure with bullet points when helpful`;
  }

  /**
   * Create new conversation session
   */
  async createSession(userId: string, projectId?: string): Promise<string> {
    await this.ensureReady();
    return await this.sessionManager!.createSession(userId, projectId);
  }

  /**
   * Get conversation history
   */
  async getHistory(userId: string, sessionId: string) {
    await this.ensureReady();
    const session = await this.sessionManager!.getSession(userId, sessionId);
    return session?.messages || [];
  }

  /**
   * Generate a short, concise title for a chat based on the first message
   * Uses the same model that was used for the conversation
   */
  async generateTitle(message: string, model?: string): Promise<string> {
    try {
      await this.ensureReady();

      const { provider, modelOverride } = this.getProvider(model);
      const isOllamaModel = model?.startsWith('ollama:') || model === 'ollama-local';

      const response = await provider.chat([
        {
          role: 'user',
          content: `Generate a 3-5 word chat title for this message. Respond with ONLY the title, no quotes or explanation:\n\n"${message.substring(0, 200)}"`,
        },
      ], {
        model: modelOverride || (isOllamaModel ? undefined : model),
      });

      let title = response.content.trim();
      // Strip <think> blocks from reasoning models (qwq, deepseek-r1)
      title = title.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      // Clean up any quotes that slipped through
      return title.replace(/^["']|["']$/g, '').substring(0, 50);
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Fallback to simple truncation
      return message.substring(0, 50).trim() + (message.length > 50 ? '...' : '');
    }
  }
}
