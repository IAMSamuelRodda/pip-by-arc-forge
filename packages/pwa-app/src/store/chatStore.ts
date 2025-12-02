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

// Default model
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

interface ChatState {
  // Current chat
  messages: Message[];
  sessionId: string | null;
  currentTitle: string | null;
  isLoading: boolean;
  error: string | null;

  // Model selection (persisted)
  selectedModel: string;

  // Chat history
  chatList: ChatSummary[];
  isLoadingList: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadChatList: () => Promise<void>;
  loadChat: (sessionId: string) => Promise<void>;
  newChat: () => void;
  deleteChat: (sessionId: string) => Promise<void>;
  renameChat: (sessionId: string, title: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  setSelectedModel: (modelId: string) => void;
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
  chatList: [],
  isLoadingList: false,

  sendMessage: async (content: string) => {
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
      // Get current project and model from stores
      const currentProjectId = useProjectStore.getState().currentProjectId;
      const selectedModel = get().selectedModel;
      const response = await api.chat(content, get().sessionId || undefined, currentProjectId || undefined, selectedModel);

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

  loadChatList: async () => {
    set({ isLoadingList: true });
    try {
      // Filter by current project
      const currentProjectId = useProjectStore.getState().currentProjectId;
      const result = await api.listChats(50, currentProjectId);
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

  newChat: () => {
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

  clearMessages: () => set({ messages: [], sessionId: null, currentTitle: null }),

  clearError: () => set({ error: null }),

  setError: (error: string) => set({ error }),

  setSelectedModel: (modelId: string) => set({ selectedModel: modelId }),
    }),
    {
      name: 'pip-chat-storage',
      partialize: (state) => ({ selectedModel: state.selectedModel }),
    }
  )
);
