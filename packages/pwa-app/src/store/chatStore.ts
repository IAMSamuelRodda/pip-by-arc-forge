/**
 * Chat Store - Zustand state management for chat
 * Epic 2.2: Chat History support
 * Epic 2.3: Projects integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';
import type { ChatSummary } from '../api/client';
import { useProjectStore } from './projectStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Model selection
export type ModelProvider = 'anthropic' | 'ollama';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  provider: ModelProvider;
}

// Default model (Sonnet 4.5 - balanced performance)
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// Model loading states for Ollama warmup UX
export type ModelLoadingState = 'idle' | 'loading' | 'ready' | 'error';

interface ChatState {
  // Current chat
  messages: Message[];
  sessionId: string | null;
  currentTitle: string | null;
  isLoading: boolean;
  error: string | null;

  // Model selection (persisted)
  selectedModel: string;
  modelLoadingState: ModelLoadingState;

  // Chat history
  chatList: ChatSummary[];
  isLoadingList: boolean;

  // Per-chat drafts (persisted) - keyed by sessionId, "_new" for new chat
  drafts: Record<string, string>;

  // Actions
  sendMessage: (content: string, options?: { projectId?: string }) => Promise<void>;
  loadChatList: (projectId?: string | null) => Promise<void>;
  loadChat: (sessionId: string) => Promise<void>;
  newChat: (projectId?: string) => void;
  deleteChat: (sessionId: string) => Promise<void>;
  renameChat: (sessionId: string, title: string) => Promise<void>;
  bookmarkChat: (sessionId: string) => Promise<void>;
  moveToProject: (sessionId: string, projectId: string | null) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  setSelectedModel: (modelId: string) => void;
  setModelLoadingState: (state: ModelLoadingState) => void;
  getDraft: () => string;
  setDraft: (text: string) => void;
  clearDraft: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  messages: [],
  sessionId: null,
  currentTitle: null,
  isLoading: false,
  error: null,
  selectedModel: DEFAULT_MODEL,
  modelLoadingState: 'idle' as ModelLoadingState,
  chatList: [],
  isLoadingList: false,
  drafts: {},

  sendMessage: async (content: string, options?: { projectId?: string }) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Use explicitly passed projectId, falling back to global state for backwards compatibility
      const projectId = options?.projectId ?? useProjectStore.getState().currentProjectId;
      const selectedModel = get().selectedModel;
      const response = await api.chat(content, get().sessionId || undefined, projectId || undefined, selectedModel);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
      };

      const isNewChat = !get().sessionId;
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        sessionId: response.sessionId,
        isLoading: false,
        // Generate title from first message for new chats
        currentTitle: isNewChat ? content.substring(0, 50) : state.currentTitle,
      }));

      // Refresh chat list after sending message (updates preview)
      get().loadChatList();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  },

  loadChatList: async (projectId?: string | null) => {
    // Only show loading state if we don't have cached data
    // This prevents the flash when navigating between pages
    const currentState = get();
    const shouldShowLoading = currentState.chatList.length === 0;

    if (shouldShowLoading) {
      set({ isLoadingList: true });
    }

    try {
      // If projectId provided, use it; otherwise load all chats (no filter)
      const result = await api.listChats(50, projectId);
      set({ chatList: result.sessions, isLoadingList: false });
    } catch (error) {
      console.error('Failed to load chat list:', error);
      set({ isLoadingList: false });
    }
  },

  loadChat: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const chat = await api.getChat(sessionId);
      const messages: Message[] = chat.messages.map((m, i) => ({
        id: `${m.role}-${i}-${chat.createdAt}`,
        role: m.role,
        content: m.content,
        timestamp: chat.createdAt + i * 1000,
      }));
      set({
        sessionId: chat.sessionId,
        currentTitle: chat.title,
        messages,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load chat',
      });
    }
  },

  newChat: (projectId?: string) => {
    // Store the project ID for new chat if provided
    // The sendMessage will pick it up from projectStore
    if (projectId) {
      useProjectStore.getState().setCurrentProject(projectId);
    }
    set({
      messages: [],
      sessionId: null,
      currentTitle: null,
      error: null,
    });
  },

  deleteChat: async (sessionId: string) => {
    try {
      await api.deleteChat(sessionId);
      // If deleting current chat, clear it
      if (get().sessionId === sessionId) {
        get().newChat();
      }
      // Refresh chat list
      get().loadChatList();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete chat' });
    }
  },

  renameChat: async (sessionId: string, title: string) => {
    try {
      await api.renameChat(sessionId, title);
      // Update current title if renaming current chat
      if (get().sessionId === sessionId) {
        set({ currentTitle: title });
      }
      // Refresh chat list
      get().loadChatList();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to rename chat' });
    }
  },

  bookmarkChat: async (sessionId: string) => {
    try {
      await api.bookmarkChat(sessionId);
      // Refresh chat list to update bookmark status
      get().loadChatList();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to bookmark chat' });
    }
  },

  moveToProject: async (sessionId: string, projectId: string | null) => {
    try {
      await api.moveToProject(sessionId, projectId);
      // Refresh chat list to update project assignment
      get().loadChatList();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to move chat to project' });
    }
  },

  clearMessages: () => set({ messages: [], sessionId: null, currentTitle: null }),

  clearError: () => set({ error: null }),

  setError: (error: string) => set({ error }),

  setSelectedModel: (modelId: string) => set({ selectedModel: modelId }),

  setModelLoadingState: (state: ModelLoadingState) => set({ modelLoadingState: state }),

  // Per-chat draft management
  getDraft: () => {
    const key = get().sessionId || '_new';
    return get().drafts[key] || '';
  },

  setDraft: (text: string) => {
    const key = get().sessionId || '_new';
    set((state) => ({
      drafts: { ...state.drafts, [key]: text },
    }));
  },

  clearDraft: () => {
    const key = get().sessionId || '_new';
    set((state) => {
      const { [key]: _, ...rest } = state.drafts;
      return { drafts: rest };
    });
  },
    }),
    {
      name: 'pip-chat-storage',
      partialize: (state) => ({ selectedModel: state.selectedModel, drafts: state.drafts }),
    }
  )
);
