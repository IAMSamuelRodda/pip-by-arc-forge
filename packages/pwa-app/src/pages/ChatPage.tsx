/**
 * Chat Page - Main conversation interface
 * Arc Forge dark theme
 * Epic 2.2: Chat History with sidebar
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { MainLayout } from '../components/MainLayout';
import { ChatInputArea } from '../components/ChatInputArea';
import { QuickActionCategories } from '../components/QuickActionCategories';
import { ChatHeader } from '../components/ChatHeader';

// Personalized greetings - warm, helpful assistant tone
const GREETINGS = [
  "Welcome back, {name}~",
  "Hi {name}! What's good today?",
  "Greetings, {name}.",
  "Good to see you, {name}.",
  "Hi there, {name}!",
  "Hello, {name}.",
  "Ready when you are, {name}.",
  "Hi {name}, how can I help?",
  "Hello there, {name}!",
  "Welcome, {name}.",
];

// Scroll to bottom icon
const ArrowDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

// User avatar - visual only, matches sidebar profile display
const UserAvatar = () => (
  <div className="w-6 h-6 rounded-full bg-arc-accent/20 flex items-center justify-center flex-shrink-0">
    <span className="text-xs font-medium text-arc-accent">SA</span>
  </div>
);

export function ChatPage() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get user info from auth store
  const user = useAuthStore((state) => state.user);

  // Get projects from project store
  const { projects } = useProjectStore();

  // Get first name from user.name (e.g., "John Smith" -> "John")
  const firstName = useMemo(() => {
    if (!user?.name) return null;
    const parts = user.name.trim().split(' ');
    return parts[0] || null;
  }, [user?.name]);

  // Select a random greeting (stable per session)
  const greeting = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * GREETINGS.length);
    const template = GREETINGS[randomIndex];
    const name = firstName || 'there';
    return template.replace('{name}', name);
  }, [firstName]);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
    currentTitle,
    sessionId,
    chatList,
    bookmarkChat,
    renameChat,
    deleteChat,
    getDraft,
    setDraft,
    clearDraft,
  } = useChatStore();

  // Get draft for current chat (changes when sessionId changes)
  const input = getDraft();

  // Get current chat's bookmark status
  const currentChat = chatList.find(c => c.sessionId === sessionId);
  const isCurrentChatBookmarked = currentChat?.isBookmarked ?? false;

  // Get project info for breadcrumb (if chat is in a project)
  const projectId = currentChat?.projectId;
  const projectName = projectId
    ? projects.find(p => p.id === projectId)?.name
    : undefined;

  // Chat action handlers for header
  const handleBookmark = async (chatSessionId: string) => {
    await bookmarkChat(chatSessionId);
  };

  const handleRename = async (chatSessionId: string, newTitle: string) => {
    await renameChat(chatSessionId, newTitle);
  };

  const handleDelete = async (chatSessionId: string) => {
    await deleteChat(chatSessionId);
  };

  const handleAddToProject = (_chatSessionId: string) => {
    // TODO: Implement add to project
  };

  // Timer for loading state
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Handle OAuth callback errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError) {
      useChatStore.getState().setError(`Xero connection failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle pending message from ProjectDetailPage navigation
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('pendingMessage');
    const pendingProjectId = sessionStorage.getItem('pendingProjectId');
    if (pendingMessage) {
      sessionStorage.removeItem('pendingMessage');
      sessionStorage.removeItem('pendingProjectId');
      // Send the message after a brief delay to ensure store is ready
      // Pass explicit projectId to avoid race conditions with global state
      setTimeout(() => {
        sendMessage(pendingMessage, { projectId: pendingProjectId || undefined });
      }, 100);
    }
  }, [sendMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track scroll position to show/hide scroll button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handler for ChatInputArea component (receives message directly)
  const handleSubmitMessage = async (message: string, _attachments?: File[]) => {
    if (!message.trim() || isLoading) return;
    clearDraft();
    // Pass explicit projectId from current chat context to avoid global state race conditions
    await sendMessage(message, { projectId: projectId || undefined });
    // TODO: Handle attachments when file upload is implemented (Epic 2.4)
  };

  return (
    <MainLayout>
      {/* Header - seamless background */}
      <ChatHeader
          sessionId={sessionId}
          title={currentTitle || 'Pip'}
          projectName={projectName}
          projectId={projectId || undefined}
          isBookmarked={isCurrentChatBookmarked}
          hasMessages={messages.length > 0}
          onBookmark={handleBookmark}
          onRename={handleRename}
          onAddToProject={handleAddToProject}
          onDelete={handleDelete}
        />

      {/* Messages / Empty State - flex-1 and relative for overlay positioning */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Top fade gradient */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-arc-bg-primary to-transparent z-10" />

        {messages.length === 0 ? (
          /* Empty state: Centered logo with greeting, centered input */
          <div className="h-full flex flex-col items-center justify-center px-4" style={{ paddingBottom: '20vh' }}>
            <div className="max-w-[44rem] w-full">
              {/* Logo + Greeting - Centered, inline, logo matches text height */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <svg className="h-[1.2em] w-[1.2em] flex-shrink-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ fontSize: '2.25rem' }}>
                  <circle cx="50" cy="50" r="44" fill="var(--arc-bg-secondary)" stroke="var(--arc-accent)" strokeWidth="6"/>
                  <path d="M38 70 V30 h14 a10 10 0 0 1 0 20 H38" fill="none" stroke="var(--arc-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-3xl font-medium text-arc-text-primary">
                  {greeting}
                </h2>
              </div>

              {/* Input */}
              <div className="w-full">
                <ChatInputArea
                  value={input}
                  onChange={setDraft}
                  onSubmit={handleSubmitMessage}
                  placeholder="Ask about your finances..."
                  isLoading={isLoading}
                  autoFocus
                />

                {/* Quick action categories - outside input, auto-submit on click */}
                <QuickActionCategories onSelectPrompt={(prompt) => handleSubmitMessage(prompt)} />
              </div>
            </div>
          </div>
        ) : (
          /* Conversation view with overlaid input */
          <>
            {/* Scrollable messages area - extends behind footer */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto"
            >
              {/* Bottom padding to account for footer overlay */}
              <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex justify-start"
                    >
                      {message.role === 'user' ? (
                        /* User message - left-aligned with avatar and subtle background */
                        <div className="flex items-start gap-3 max-w-[85%] bg-arc-bg-tertiary rounded-xl px-3 py-2.5">
                          <UserAvatar />
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-arc-text-primary pt-0.5">
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        /* Assistant message - plain markdown, narrower than input */
                        <div className="max-w-xl">
                          <div className="prose prose-sm prose-invert max-w-none text-arc-text-primary">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-3 last:mb-0 text-arc-text-primary leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-arc-text-primary space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-arc-text-primary space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="text-arc-text-primary">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-arc-text-primary">{children}</strong>,
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-arc-text-primary">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4 first:mt-0 text-arc-text-primary">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-arc-text-primary">{children}</h3>,
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-arc-bg-tertiary px-1.5 py-0.5 rounded text-arc-accent text-sm">{children}</code>
                                  ) : (
                                    <code className="block bg-arc-bg-tertiary p-3 rounded-lg text-sm overflow-x-auto">{children}</code>
                                  );
                                },
                                pre: ({ children }) => <pre className="bg-arc-bg-tertiary p-3 rounded-lg mb-3 overflow-x-auto">{children}</pre>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-arc-accent pl-4 italic text-arc-text-secondary mb-3">{children}</blockquote>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-arc-text-secondary">
                          {elapsedSeconds < 5
                            ? 'Pip is thinking...'
                            : elapsedSeconds < 15
                              ? `Checking your data... (${elapsedSeconds}s)`
                              : `Still working on it... (${elapsedSeconds}s)`}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Scroll to bottom button - floats over messages */}
            {showScrollButton && (
              <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={scrollToBottom}
                  className="p-2 bg-arc-bg-tertiary/90 backdrop-blur-sm rounded-full text-arc-text-dim hover:text-arc-text-secondary hover:bg-arc-bg-secondary transition-all border border-arc-border-subtle shadow-lg"
                  title="Scroll to bottom"
                >
                  <ArrowDownIcon />
                </button>
              </div>
            )}

            {/* Input footer - overlays on messages with gradient fade */}
            <footer className="absolute bottom-0 left-0 right-0 z-10">
              {/* Gradient fade from transparent to solid */}
              <div className="h-8 bg-gradient-to-t from-arc-bg-primary to-transparent" />
              <div className="bg-arc-bg-primary pb-3 px-4">
                <div className="max-w-[44rem] mx-auto">
                  <ChatInputArea
                    value={input}
                    onChange={setDraft}
                    onSubmit={handleSubmitMessage}
                    placeholder="Ask about your finances..."
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </footer>
          </>
        )}

      </main>


      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/30 border-t border-red-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
