/**
 * Main Agent Orchestrator
 *
 * Coordinates conversation flow and delegates to sub-agents
 */

import {
  createLLMProviderFromEnv,
  createDatabaseProviderFromEnv,
  type LLMProvider,
  type DatabaseProvider,
  type ResponseStyleId,
  buildStylePrompt,
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
  private dbProvider: DatabaseProvider | null = null;
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

      // Initialize LLM provider
      this.llmProvider = await createLLMProviderFromEnv();
      console.log(`✓ LLM Provider initialized: ${this.llmProvider.name}`);

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
   * Process user message and generate response
   */
  async processMessage(request: AgentRequest): Promise<AgentResponse> {
    const { userId, sessionId, message } = request;

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

      // 6. Build conversation context with system prompt and history
      const systemPrompt = this.buildSystemPrompt(memory, businessContext, memoryContext, responseStyle);
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

      // 8. Invoke LLM provider to generate response with tools
      let llmResponse = await this.llmProvider!.chat(conversationHistory, {
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      // 9. Check if LLM wants to use a tool
      if (llmResponse.toolUse) {
        const toolName = llmResponse.toolUse.name;
        const toolInput = llmResponse.toolUse.input;

        console.log(`🔧 Tool called: ${toolName}`, toolInput);

        // Find and execute the tool (search all tools)
        const tool = allTools.find((t) => t.name === toolName);
        if (tool) {
          const toolResult = await tool.execute(toolInput, userId);

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

          llmResponse = await this.llmProvider!.chat(followUpConversation);
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
  private buildSystemPrompt(memory: any, businessContext: string = '', memoryContext: string = '', responseStyle: ResponseStyleId = 'normal'): string {
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

    // Get style-specific prompt modifier (empty string for 'normal')
    const styleModifier = buildStylePrompt(responseStyle);
    const styleSection = styleModifier ? `\n${styleModifier}\n` : '';

    return `You are Pip, a friendly AI bookkeeping assistant for Australian small business owners.

${relationshipContext}${memorySection}
${businessSection}${styleSection}
## Your Approach

When answering questions about finances or business decisions:

1. **ALWAYS use tools to get live data** - Don't guess. Fetch actual numbers from Xero.
2. **Reference the business context** - Quote specific targets, thresholds, and criteria from uploaded documents.
3. **Structure your response clearly**:
   - Start with the key finding/recommendation
   - Show the relevant numbers (from Xero AND business plan)
   - Explain the gap or comparison
   - Give actionable next steps

## Response Format (for financial questions)

Use this structure when answering questions like "Can I afford X?" or "Am I on track?":

**Assessment**: [Clear yes/no/almost with brief reason]

**Your Targets** (from business plan):
- [Relevant target/threshold]
- [Budget or criteria]

**Current Position** (from Xero):
- [Actual numbers]
- [Trend or average]

**Recommendation**: [Specific, actionable advice]

## Tools Available

### Memory Tools (Always Available)
- read_memory: Get all stored memories about this user (use when they ask "what do you know about me?")
- search_memory: Search memories for specific information about the user

### Xero Tools (When Connected)
- get_invoices: Fetch invoices (filter by status, date)
- get_profit_and_loss: Get P&L report for date range
- get_balance_sheet: Get current balance sheet
- get_bank_transactions: Get bank transaction history
- get_contacts: Get customers/suppliers
- get_organisation: Get org info

## Communication Style
- Be direct and helpful - like a trusted colleague
- Use Australian English (organisation, colour, labour)
- Keep responses concise but complete
- Use bullet points and clear structure
- End with a helpful follow-up question when appropriate`;
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
}
