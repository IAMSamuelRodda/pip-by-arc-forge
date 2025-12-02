/**
 * Chat Page - Main conversation interface
 * Arc Forge dark theme
 * Epic 2.2: Chat History with sidebar
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../store/chatStore';
import { api } from '../api/client';
import type { PersonalityInfo } from '../api/client';
import { MainLayout } from '../components/MainLayout';
import { ChatInputArea } from '../components/ChatInputArea';
import { QuickActionCategories } from '../components/QuickActionCategories';
import { ChatHeader } from '../components/ChatHeader';

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
  const [personalityInfo, setPersonalityInfo] = useState<PersonalityInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load personality info
  const loadPersonalityInfo = useCallback(async () => {
    try {
      const result = await api.getSettings();
      setPersonalityInfo(result.personalityInfo);
    } catch (err) {
      console.error('Failed to load personality:', err);
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


  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load personality info on mount
  useEffect(() => {
    loadPersonalityInfo();
  }, [loadPersonalityInfo]);

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
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty state: Centered content with inline input (golden ratio positioning) */
          <div className="h-full flex flex-col items-center justify-center px-4" style={{ paddingBottom: '20vh' }}>
            <div className="text-center max-w-xl w-full">
              <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="44" fill="#0f1419" stroke="#7eb88e" strokeWidth="6"/>
                <path d="M38 70 V30 h14 a10 10 0 0 1 0 20 H38" fill="none" stroke="#7eb88e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-xl font-medium text-arc-text-primary mb-1">
                {personalityInfo?.greeting || 'Hi there'}
              </h2>
              <p className="text-sm text-arc-text-dim mb-6">
                {personalityInfo?.role || 'Your bookkeeper'}
              </p>

              {/* Centered input - Claude.ai pattern */}
              <div className="max-w-4xl mx-auto w-full px-4">
                <ChatInputArea
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmitMessage}
                  placeholder="How can I help you today?"
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
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-arc-accent text-arc-bg-primary'
                        : 'bg-arc-bg-tertiary border border-arc-border text-arc-text-primary'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-arc-text-primary">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-arc-text-primary">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-arc-text-primary">{children}</ol>,
                            li: ({ children }) => <li className="mb-1 text-arc-text-primary">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-arc-accent">{children}</strong>,
                            h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-arc-text-primary">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold mb-2 text-arc-text-primary">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-arc-accent">{children}</h3>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-arc-bg-tertiary border border-arc-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
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
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
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

        {/* Input footer (only shown after first message) */}
        {messages.length > 0 && (
          <footer className="bg-arc-bg-secondary border-t border-arc-border">
            <div className="max-w-4xl mx-auto px-4 py-3">
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
