/**
 * Chat Page - Main conversation interface
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../store/chatStore';
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

  const { messages, isLoading, error, sendMessage, clearError } = useChatStore();

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
      // Reset file input
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
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');
    const orgName = params.get('org');
    const authError = params.get('error');

    if (authResult === 'success' && orgName) {
      setAuthStatus({ connected: true, tenantName: orgName });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authError) {
      // Show error in chat error area
      useChatStore.getState().setError(`Xero connection failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Normal status check
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
    // Force full page navigation to the auth endpoint
    window.location.href = api.getXeroAuthUrl();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Pip</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDocPanel(!showDocPanel)}
              className={`text-sm flex items-center gap-1 px-2 py-1 rounded ${
                showDocPanel ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>📄</span>
              <span>{documents.length > 0 ? `${documents.length} docs` : 'Add docs'}</span>
            </button>
            {authStatus?.connected ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {authStatus.tenantName || 'Connected'}
              </span>
            ) : (
              <button
                onClick={handleConnectXero}
                disabled={isConnecting}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Xero'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Document Panel */}
      {showDocPanel && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-900">Business Context Documents</h3>
              <label className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer ${
                isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
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
            <p className="text-xs text-blue-700 mb-2">
              Upload your business plan, KPIs, or strategy docs to get personalized advice.
            </p>
            {uploadError && (
              <p className="text-xs text-red-600 mb-2">{uploadError}</p>
            )}
            {documents.length === 0 ? (
              <p className="text-sm text-blue-600 italic">No documents uploaded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.docName}
                    className="bg-white rounded-lg px-3 py-2 text-sm flex items-center gap-2 shadow-sm"
                  >
                    <span className="text-gray-600">📄</span>
                    <div>
                      <span className="font-medium text-gray-800">{doc.docName}</span>
                      <span className="text-gray-400 ml-1 text-xs">({doc.docType})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.docName)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                      title="Delete"
                    >
                      ✕
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
            <div className="text-center text-gray-500 mt-20">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                G'day! I'm Pip
              </h2>
              <p className="text-sm max-w-md mx-auto">
                Your AI bookkeeping assistant. Connect Xero to query your finances,
                or upload your business plan to get personalized advice.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
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
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose prose-sm prose-gray max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
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
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-500">
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
        <div className="bg-red-50 border-t border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="bg-white border-t shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-center bg-gray-100 rounded-2xl px-2 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances, business goals, or anything else..."
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none text-sm text-gray-800 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 py-2 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Send
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
