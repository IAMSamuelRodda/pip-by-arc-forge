/**
 * Chat Sidebar - Collapsible sidebar with projects, chats, and profile
 * Pattern: Claude.ai sidebar layout
 * Epic 2.2: Chat History
 * Epic 2.3: Projects integration
 */

import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { ProjectSwitcher } from './ProjectSwitcher';
import { ProfileDropdown } from './ProfileDropdown';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  docsCount?: number;
  showDocs?: boolean;
  onToggleDocs?: () => void;
}

export function ChatSidebar({ isOpen, onToggle, docsCount = 0, showDocs, onToggleDocs }: ChatSidebarProps) {
  const {
    chatList,
    sessionId,
    isLoadingList,
    loadChatList,
    loadChat,
    newChat,
    deleteChat,
  } = useChatStore();

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setMenuOpenFor(null);
    if (menuOpenFor) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [menuOpenFor]);

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      deleteChat(chatId);
    }
    setMenuOpenFor(null);
  };

  // Format timestamp as relative time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-arc-bg-secondary border-r border-arc-border z-40 transition-all duration-200 flex flex-col ${
          isOpen ? 'w-64' : 'w-12'
        }`}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-end p-2">
          <button
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-arc-bg-tertiary text-arc-text-secondary transition-colors"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-2 pb-2">
          <button
            onClick={newChat}
            className={`w-full flex items-center gap-2 p-2 rounded-lg bg-arc-accent text-arc-bg-primary hover:bg-arc-accent/90 transition-colors ${
              isOpen ? '' : 'justify-center'
            }`}
            title="New chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isOpen && <span className="text-sm font-medium">New chat</span>}
          </button>
        </div>

        {/* Project Switcher (in sidebar) */}
        {isOpen && (
          <div className="px-2 pb-2">
            <ProjectSwitcher inSidebar />
          </div>
        )}

        {/* Chat List Header */}
        {isOpen && (
          <div className="px-3 pt-2 pb-1">
            <span className="text-xs font-medium text-arc-text-dim uppercase tracking-wide">Chats</span>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingList ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : chatList.length === 0 ? (
            isOpen && (
              <div className="p-4 text-center text-sm text-arc-text-dim">
                No chats yet
              </div>
            )
          ) : (
            <div className="px-2 py-1 space-y-1">
              {chatList.map((chat) => {
                const isActive = chat.sessionId === sessionId;
                return (
                  <div key={chat.sessionId} className="relative">
                    <button
                      onClick={() => loadChat(chat.sessionId)}
                      className={`w-full text-left p-2 rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-arc-accent/20 text-arc-accent'
                          : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                      }`}
                    >
                      {isOpen ? (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{chat.title}</p>
                            <p className="text-xs text-arc-text-dim truncate mt-0.5">
                              {formatTime(chat.updatedAt)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenFor(menuOpenFor === chat.sessionId ? null : chat.sessionId);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-arc-bg-secondary rounded transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Context Menu */}
                    {menuOpenFor === chat.sessionId && isOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-arc-bg-tertiary border border-arc-border rounded-lg shadow-lg z-50 py-1 min-w-32">
                        <button
                          onClick={(e) => handleDeleteChat(e, chat.sessionId)}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-arc-bg-secondary transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Docs button */}
        {onToggleDocs && (
          <div className="px-2 pb-2">
            <button
              onClick={onToggleDocs}
              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                showDocs
                  ? 'bg-arc-accent/20 text-arc-accent'
                  : 'text-arc-text-secondary hover:bg-arc-bg-tertiary'
              } ${isOpen ? '' : 'justify-center'}`}
              title="Business documents"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isOpen && (
                <>
                  <span className="text-sm flex-1 text-left">Docs</span>
                  {docsCount > 0 && (
                    <span className="text-xs text-arc-text-dim">{docsCount}</span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* Profile Dropdown (bottom) */}
        <div className="p-2 border-t border-arc-border">
          <ProfileDropdown collapsed={!isOpen} />
        </div>
      </aside>

      {/* Spacer to push content */}
      <div className={`flex-shrink-0 transition-all duration-200 ${isOpen ? 'w-64' : 'w-12'}`} />
    </>
  );
}
