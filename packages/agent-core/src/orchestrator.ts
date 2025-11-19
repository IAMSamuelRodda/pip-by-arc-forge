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
} from '@zero-agent/core';
import { SessionManager } from './session/manager.js';
import { MemoryManager } from './memory/manager.js';
import { XeroClient } from './xero/client.js';
import { createXeroTools, type Tool } from './tools/xero-tools.js';
import type { AgentRequest, AgentResponse } from './types.js';

export class AgentOrchestrator {
  private sessionManager: SessionManager | null = null;
  private memoryManager: MemoryManager | null = null;
  private llmProvider: LLMProvider | null = null;
  private dbProvider: DatabaseProvider | null = null;
  private xeroClient: XeroClient | null = null;
  private xeroTools: Tool[] = [];
  private initializationPromise: Promise<void>;

  constructor() {
    // Initialize providers asynchronously
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize all providers from environment configuration
   */
  private async initialize(): Promise<void> {
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
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }

  /**
   * Ensure all providers are ready before processing messages
   */
  private async ensureReady(): Promise<void> {
    await this.initializationPromise;
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

      // 3. Build conversation context with system prompt and history
      const systemPrompt = this.buildSystemPrompt(memory);
      const conversationHistory = [
        { role: 'system' as const, content: systemPrompt },
        ...(session?.messages || []),
        { role: 'user' as const, content: message },
      ];

      // 4. Convert Xero tools to Anthropic tool format
      const anthropicTools = this.xeroTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object" as const,
          properties: tool.parameters.properties,
          required: tool.parameters.required || [],
        },
      }));

      // 5. Invoke LLM provider to generate response with tools
      let llmResponse = await this.llmProvider!.chat(conversationHistory, {
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      // 6. Check if LLM wants to use a tool
      if (llmResponse.toolUse) {
        const toolName = llmResponse.toolUse.name;
        const toolInput = llmResponse.toolUse.input;

        console.log(`🔧 Tool called: ${toolName}`, toolInput);

        // Find and execute the tool
        const tool = this.xeroTools.find((t) => t.name === toolName);
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
   * Build system prompt with user context and memory
   */
  private buildSystemPrompt(memory: any): string {
    const relationshipContext = memory?.relationshipStage
      ? `Your relationship with this user is at the "${memory.relationshipStage}" stage.`
      : 'This is your first conversation with this user.';

    return `You are a helpful AI assistant for Xero accounting software.

${relationshipContext}

Your capabilities:
- Access and query Xero data using the available tools
- Create and manage invoices
- Reconcile bank transactions
- Generate financial reports
- Track and categorize expenses
- Answer questions about Xero features

When the user asks about their Xero data, use the appropriate tools to fetch the information.
Always provide clear, natural responses based on the real data from Xero.

Communication style: Be helpful, professional, and concise. Use Australian English spelling and terminology.`;
  }

  /**
   * Create new conversation session
   */
  async createSession(userId: string): Promise<string> {
    await this.ensureReady();
    return await this.sessionManager!.createSession(userId);
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
