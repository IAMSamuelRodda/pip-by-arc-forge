/**
 * Chat Sidebar - Navigation-only sidebar
 * Claude.ai pattern: Navigation + quick access (Bookmarked/Recents)
 * Full chat browsing happens on dedicated /chats page
 */

import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { ProjectSwitcher } from './ProjectSwitcher';
import { ProfileDropdown } from './ProfileDropdown';

// ============================================================================
// Icons
// ============================================================================

const CollapseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

const ExpandIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DocsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ChatsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth={2} />
    <polyline points="12 6 12 12 16 14" strokeWidth={2} />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  docsCount?: number;
  showDocs?: boolean;
  onToggleDocs?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ChatSidebar({ isOpen, onToggle, docsCount = 0, showDocs, onToggleDocs }: ChatSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    chatList,
    sessionId,
    isLoadingList,
    loadChatList,
    loadChat,
    newChat,
  } = useChatStore();

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // Get recent chats (last 5)
  const recentChats = useMemo(() => {
    return chatList.slice(0, 5);
  }, [chatList]);

  // Get bookmarked chats (TODO: implement proper bookmarking)
  // For now, this will be empty - placeholder for future implementation
  const bookmarkedChats = useMemo(() => {
    // In the future, filter by chat.isBookmarked
    return [];
  }, []);

  // Format timestamp as relative time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle chat click
  const handleChatClick = async (chatSessionId: string) => {
    await loadChat(chatSessionId);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    newChat();
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const isChatsPage = location.pathname === '/chats';

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
            {isOpen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-2 pb-2">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-2 p-2 rounded-lg bg-arc-accent text-arc-bg-primary hover:bg-arc-accent/90 transition-colors ${
              isOpen ? '' : 'justify-center'
            }`}
            title="New chat"
          >
            <PlusIcon />
            {isOpen && <span className="text-sm font-medium">New chat</span>}
          </button>
        </div>

        {/* Docs Button (below New Chat) */}
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
              <DocsIcon />
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

        {/* Project Switcher (in sidebar) */}
        {isOpen && (
          <div className="px-2 pb-2">
            <ProjectSwitcher inSidebar />
          </div>
        )}

        {/* Navigation */}
        <div className="px-2 pb-2">
          <button
            onClick={() => navigate('/chats')}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
              isChatsPage
                ? 'bg-arc-accent/20 text-arc-accent'
                : 'text-arc-text-secondary hover:bg-arc-bg-tertiary'
            } ${isOpen ? '' : 'justify-center'}`}
            title="Browse all chats"
          >
            <ChatsIcon />
            {isOpen && (
              <>
                <span className="text-sm flex-1 text-left">Chats</span>
                {chatList.length > 0 && (
                  <span className="text-xs text-arc-text-dim">{chatList.length}</span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Quick Access Sections (only when expanded) */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            {/* Bookmarked Section */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-arc-text-dim uppercase tracking-wide">
                <BookmarkIcon />
                <span>Bookmarked</span>
              </div>
            </div>
            {bookmarkedChats.length === 0 ? (
              <div className="px-3 py-2 text-xs text-arc-text-dim italic">
                No bookmarks yet
              </div>
            ) : (
              <div className="px-2 py-1 space-y-0.5">
                {bookmarkedChats.map((chat: { sessionId: string; title: string; updatedAt: number }) => (
                  <button
                    key={chat.sessionId}
                    onClick={() => handleChatClick(chat.sessionId)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors truncate ${
                      chat.sessionId === sessionId
                        ? 'bg-arc-accent/20 text-arc-accent'
                        : 'text-arc-text-primary hover:bg-arc-bg-tertiary'
                    }`}
                  >
                    {chat.title}
                  </button>
                ))}
              </div>
            )}

            {/* Recents Section */}
            <div className="px-3 pt-4 pb-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-arc-text-dim uppercase tracking-wide">
                <ClockIcon />
                <span>Recents</span>
              </div>
            </div>
            {isLoadingList ? (
              <div className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : recentChats.length === 0 ? (
              <div className="px-3 py-2 text-xs text-arc-text-dim italic">
                No recent chats
              </div>
            ) : (
              <div className="px-2 py-1 space-y-0.5">
                {recentChats.map((chat) => (
                  <button
                    key={chat.sessionId}
                    onClick={() => handleChatClick(chat.sessionId)}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors group ${
                      chat.sessionId === sessionId
                        ? 'bg-arc-accent/20 text-arc-accent'
                        : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate flex-1">{chat.title}</span>
                      <span className="text-xs text-arc-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(chat.updatedAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed state - just show icons */}
        {!isOpen && (
          <div className="flex-1" />
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
