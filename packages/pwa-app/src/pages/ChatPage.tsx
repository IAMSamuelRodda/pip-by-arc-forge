/**
 * Chat Page - Main conversation interface
 * Arc Forge dark theme
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

interface AuthStatus {
  connected: boolean;
  tenantName?: string;
}

interface Document {
  docName: string;
  docType: string;
  chunkCount: number;
  createdAt: number;
}

export function ChatPage() {
  const [input, setInput] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { messages, isLoading, error, sendMessage, clearError } = useChatStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  // Check auth status on mount and handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');
    const orgName = params.get('org');
    const authError = params.get('error');

    if (authResult === 'success' && orgName) {
      setAuthStatus({ connected: true, tenantName: orgName });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authError) {
      useChatStore.getState().setError(`Xero connection failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      api.getAuthStatus()
        .then(setAuthStatus)
        .catch(() => setAuthStatus({ connected: false }));
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleConnectXero = () => {
    setIsConnecting(true);
    window.location.href = api.getXeroAuthUrl();
  };

  return (
    <div className="flex flex-col h-screen bg-arc-bg-primary font-mono">
      {/* Header */}
      <header className="bg-arc-bg-secondary border-b border-arc-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-arc-accent rounded-lg flex items-center justify-center">
              <span className="text-arc-bg-primary font-bold text-sm">P</span>
            </div>
            <h1 className="text-lg font-semibold text-arc-text-primary">Pip</h1>
            <span className="text-xs text-arc-text-dim">by Arc Forge</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDocPanel(!showDocPanel)}
              className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                showDocPanel
                  ? 'bg-arc-accent/20 border-arc-accent text-arc-accent'
                  : 'border-arc-border text-arc-text-secondary hover:border-arc-accent hover:text-arc-accent'
              }`}
            >
              <span className="text-xs">docs</span>
              <span className="text-arc-text-dim">{documents.length}</span>
            </button>
            {authStatus?.connected ? (
              <span className="text-sm text-arc-accent flex items-center gap-2">
                <span className="w-2 h-2 bg-arc-accent rounded-full animate-pulse"></span>
                {authStatus.tenantName || 'Connected'}
              </span>
            ) : (
              <button
                onClick={handleConnectXero}
                disabled={isConnecting}
                className="text-sm px-3 py-1.5 rounded-lg border border-arc-border text-arc-text-secondary hover:border-arc-accent hover:text-arc-accent disabled:opacity-50 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Xero'}
              </button>
            )}
            {/* User menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-arc-border">
              <span className="text-sm text-arc-text-secondary">
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm px-2 py-1 text-arc-text-dim hover:text-arc-text-secondary transition-colors"
                title="Sign out"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

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

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <div className="w-20 h-20 bg-arc-bg-tertiary border border-arc-border rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl text-arc-accent">P</span>
              </div>
              <h2 className="text-2xl font-medium text-arc-text-primary mb-2">
                G'day! I'm Pip
              </h2>
              <p className="text-sm text-arc-text-secondary max-w-md mx-auto mb-8">
                Your AI bookkeeping assistant. Connect Xero to query your finances,
                or upload your business plan for personalized advice.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Show my unpaid invoices',
                  'Can I afford to hire someone?',
                  'How am I tracking against my goals?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-secondary hover:border-arc-accent hover:text-arc-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
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
          )}
        </div>
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

      {/* Input */}
      <footer className="bg-arc-bg-secondary border-t border-arc-border">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-center bg-arc-bg-tertiary border border-arc-border rounded-xl px-3 py-2 focus-within:border-arc-accent transition-colors">
            <span className="text-arc-text-dim text-sm">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances, business goals, or anything else..."
              className="flex-1 bg-transparent focus:outline-none text-sm text-arc-text-primary placeholder-arc-text-dim"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-1.5 bg-arc-accent text-arc-bg-primary rounded-lg font-medium text-sm hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
