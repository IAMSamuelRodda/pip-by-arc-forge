/**
 * Chat Page - Main conversation interface
 * Arc Forge dark theme
 * Epic 2.2: Chat History with sidebar
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
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

interface Document {
  docName: string;
  docType: string;
  chunkCount: number;
  createdAt: number;
}

export function ChatPage() {
  const [input, setInput] = useState('');
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user info from auth store
  const user = useAuthStore((state) => state.user);

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
  } = useChatStore();

  // Get current chat's bookmark status
  const currentChat = chatList.find(c => c.sessionId === sessionId);
  const isCurrentChatBookmarked = currentChat?.isBookmarked ?? false;

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

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      const result = await api.listDocuments();
      setDocuments(result.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await api.uploadDocument(file);
      await loadDocuments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docName: string) => {
    if (!confirm(`Delete "${docName}"?`)) return;

    try {
      await api.deleteDocument(docName);
      await loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Handle OAuth callback errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError) {
      useChatStore.getState().setError(`Xero connection failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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


  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handler for ChatInputArea component (receives message directly)
  const handleSubmitMessage = async (message: string, _attachments?: File[]) => {
    if (!message.trim() || isLoading) return;
    setInput('');
    await sendMessage(message);
    // TODO: Handle attachments when file upload is implemented (Epic 2.4)
  };

  return (
    <MainLayout
      showDocsToggle
      showDocs={showDocPanel}
      onToggleDocs={() => setShowDocPanel(!showDocPanel)}
    >
      {/* Header - seamless background */}
      <ChatHeader
          sessionId={sessionId}
          title={currentTitle || 'Pip'}
          isBookmarked={isCurrentChatBookmarked}
          hasMessages={messages.length > 0}
          onBookmark={handleBookmark}
          onRename={handleRename}
          onAddToProject={handleAddToProject}
          onDelete={handleDelete}
        />

      {/* Document Panel */}
      {showDocPanel && (
        <div className="bg-arc-bg-tertiary border-b border-arc-border px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-arc-text-primary">Business Context</h3>
              <label className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                isUploading
                  ? 'bg-arc-bg-secondary text-arc-text-dim cursor-not-allowed'
                  : 'bg-arc-accent text-arc-bg-primary hover:bg-arc-accent-dim'
              }`}>
                {isUploading ? 'Uploading...' : '+ Upload'}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.md,.docx"
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-arc-text-tertiary mb-3">
              Upload business plans, KPIs, or strategy docs for personalized advice.
            </p>
            {uploadError && (
              <p className="text-xs text-red-400 mb-2">{uploadError}</p>
            )}
            {documents.length === 0 ? (
              <p className="text-sm text-arc-text-dim italic">No documents uploaded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.docName}
                    className="bg-arc-bg-secondary rounded-lg px-3 py-2 text-sm flex items-center gap-2 border border-arc-border-subtle"
                  >
                    <span className="text-arc-accent text-xs">file</span>
                    <span className="text-arc-text-primary">{doc.docName}</span>
                    <span className="text-arc-text-dim text-xs">({doc.docType})</span>
                    <button
                      onClick={() => handleDeleteDocument(doc.docName)}
                      className="text-arc-text-dim hover:text-red-400 ml-1 transition-colors"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages / Empty State */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Top fade gradient */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-arc-bg-primary to-transparent z-10" />

        {messages.length === 0 ? (
          /* Empty state: Left-aligned logo with greeting, centered input */
          <div className="h-full flex flex-col items-center justify-center px-4" style={{ paddingBottom: '20vh' }}>
            <div className="max-w-2xl w-full">
              {/* Logo + Greeting - Left aligned, inline */}
              <div className="flex items-center gap-4 mb-8 px-4">
                <svg className="w-12 h-12 flex-shrink-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="44" fill="var(--arc-bg-secondary)" stroke="var(--arc-accent)" strokeWidth="6"/>
                  <path d="M38 70 V30 h14 a10 10 0 0 1 0 20 H38" fill="none" stroke="var(--arc-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-2xl font-medium text-arc-text-primary">
                  {greeting}
                </h2>
              </div>

              {/* Input */}
              <div className="w-full px-4">
                <ChatInputArea
                  value={input}
                  onChange={setInput}
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
          /* Conversation view */
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto px-4 py-6">
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
        )}

      </main>

      {/* Scroll to bottom button - fixed at viewport bottom, grey color */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 p-2 bg-arc-bg-tertiary/90 backdrop-blur-sm rounded-full text-arc-text-dim hover:text-arc-text-secondary hover:bg-arc-bg-secondary transition-all z-30 border border-arc-border-subtle"
          title="Scroll to bottom"
        >
          <ArrowDownIcon />
        </button>
      )}

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

        {/* Input footer (only shown after first message) - seamless with content */}
        {messages.length > 0 && (
          <footer className="bg-arc-bg-primary">
            <div className="max-w-2xl mx-auto px-4 pb-3">
              <ChatInputArea
                value={input}
                onChange={setInput}
                onSubmit={handleSubmitMessage}
                placeholder="Ask about your finances..."
                isLoading={isLoading}
              />
            </div>
          </footer>
        )}
    </MainLayout>
  );
}
