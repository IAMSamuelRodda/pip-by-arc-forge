/**
 * MainLayout - Shared layout with sidebar for all main pages
 * Provides consistent navigation across Chat, Chats, Projects, Settings pages
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { api } from '../api/client';

interface Document {
  docName: string;
  docType: string;
  chunkCount: number;
  createdAt: number;
}

interface MainLayoutProps {
  children: React.ReactNode;
  /** Whether to show the docs toggle button in sidebar */
  showDocsToggle?: boolean;
  /** Callback when docs panel is toggled (only used by ChatPage) */
  onToggleDocs?: () => void;
  /** Whether docs panel is currently shown */
  showDocs?: boolean;
}

export function MainLayout({
  children,
  showDocsToggle = false,
  onToggleDocs,
  showDocs = false,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Load documents for count
  const loadDocuments = useCallback(async () => {
    try {
      const result = await api.listDocuments();
      setDocuments(result.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="flex h-screen bg-arc-bg-primary font-mono">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        docsCount={documents.length}
        showDocs={showDocsToggle ? showDocs : undefined}
        onToggleDocs={showDocsToggle ? onToggleDocs : undefined}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
