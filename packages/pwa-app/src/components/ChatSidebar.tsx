/**
 * Chat Sidebar - Navigation-only sidebar
 * Claude.ai pattern: Navigation + quick access (Bookmarked/Recents)
 * Full chat browsing happens on dedicated /chats page
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { useCurrentProject } from '../store/projectStore';
import { ProfileDropdown } from './ProfileDropdown';
import { ChatActionsMenu } from './ChatActionsMenu';

// ============================================================================
// Icons
// ============================================================================

const CollapseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

// Sidebar toggle icon (hamburger menu)
const SidebarToggleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// Official Pip Logo (matches favicon.svg)
const PipLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="#0f1419" stroke="#7eb88e" strokeWidth="6"/>
    <path d="M38 70 V30 h14 a10 10 0 0 1 0 20 H38" fill="none" stroke="#7eb88e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Plus icon for New Chat button (compact size)
const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
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

const ProjectsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
    deleteChat,
    renameChat,
    bookmarkChat,
  } = useChatStore();

  const currentProject = useCurrentProject();

  const [recentsHidden, setRecentsHidden] = useState(false);

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
  }, [loadChatList]);

  // Get recent chats (last 30)
  const recentChats = useMemo(() => {
    return chatList.slice(0, 30);
  }, [chatList]);

  // Get bookmarked chats
  const bookmarkedChats = useMemo(() => {
    return chatList.filter(chat => chat.isBookmarked);
  }, [chatList]);

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

  // Chat action handlers for ChatActionsMenu
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

  const isChatsPage = location.pathname === '/chats';
  const isProjectsPage = location.pathname === '/projects';

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`group/sidebar fixed left-0 top-0 h-full bg-arc-bg-secondary border-r border-arc-border z-40 transition-all duration-200 flex flex-col ${
          isOpen ? 'w-64' : 'w-12'
        }`}
      >
        {/* Header - ChatGPT pattern: Logo becomes toggle on hover (collapsed), split (expanded) */}
        <div className="flex items-center p-2 h-12">
          {isOpen ? (
            // Expanded: Logo left, toggle right
            <>
              <div className="flex items-center gap-2 flex-1">
                <PipLogo />
                <span className="text-sm font-semibold text-arc-text-primary">Pip</span>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded hover:bg-arc-bg-tertiary text-arc-text-secondary transition-colors"
                title="Collapse sidebar"
              >
                <CollapseIcon />
              </button>
            </>
          ) : (
            // Collapsed: Logo by default, toggle icon on sidebar hover
            <button
              onClick={onToggle}
              className="w-full flex justify-center p-1.5 rounded hover:bg-arc-bg-tertiary text-arc-text-secondary transition-colors"
              title="Expand sidebar"
            >
              {/* Logo - hidden on sidebar hover */}
              <span className="group-hover/sidebar:hidden">
                <PipLogo />
              </span>
              {/* Toggle - shown on sidebar hover */}
              <span className="hidden group-hover/sidebar:block">
                <SidebarToggleIcon />
              </span>
            </button>
          )}
        </div>

        {/* New Chat Button - Green box around icon, normal text */}
        <div className="px-2 pb-2">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-arc-bg-tertiary transition-colors ${
              isOpen ? '' : 'justify-center'
            }`}
            title="New chat"
          >
            <span className="p-1 bg-arc-accent rounded-md text-white flex-shrink-0">
              <PlusIcon />
            </span>
            {isOpen && <span className="text-sm text-arc-text-primary">New chat</span>}
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

        {/* Navigation */}
        <div className="px-2 pb-2 space-y-1">
          {/* Chats */}
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

          {/* Projects */}
          <button
            onClick={() => navigate('/projects')}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
              isProjectsPage
                ? 'bg-arc-accent/20 text-arc-accent'
                : 'text-arc-text-secondary hover:bg-arc-bg-tertiary'
            } ${isOpen ? '' : 'justify-center'}`}
            title="Browse projects"
          >
            <ProjectsIcon />
            {isOpen && (
              <>
                <span className="text-sm flex-1 text-left">Projects</span>
                {currentProject && (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentProject.color || '#3B82F6' }}
                    title={currentProject.name}
                  />
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
                {bookmarkedChats.map((chat) => (
                  <div key={chat.sessionId} className="relative group/chat">
                    <button
                      onClick={() => handleChatClick(chat.sessionId)}
                      className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                        chat.sessionId === sessionId
                          ? 'bg-arc-accent/20 text-arc-accent'
                          : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate flex-1">{chat.title}</span>
                        <ChatActionsMenu
                          sessionId={chat.sessionId}
                          title={chat.title}
                          isBookmarked={true}
                          onBookmark={handleBookmark}
                          onRename={handleRename}
                          onAddToProject={handleAddToProject}
                          onDelete={handleDelete}
                          variant="dots"
                        />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recents Section */}
            <div className="px-3 pt-4 pb-1 group/recents">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-arc-text-dim uppercase tracking-wide">
                  <ClockIcon />
                  <span>Recents</span>
                </div>
                <button
                  onClick={() => setRecentsHidden(!recentsHidden)}
                  className="text-xs text-arc-text-dim hover:text-arc-text-secondary opacity-0 group-hover/recents:opacity-100 transition-opacity"
                >
                  {recentsHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>
            {!recentsHidden && (
              <>
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
                      <div key={chat.sessionId} className="relative group/chat">
                        <button
                          onClick={() => handleChatClick(chat.sessionId)}
                          className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                            chat.sessionId === sessionId
                              ? 'bg-arc-accent/20 text-arc-accent'
                              : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate flex-1">{chat.title}</span>
                            <ChatActionsMenu
                              sessionId={chat.sessionId}
                              title={chat.title}
                              isBookmarked={chat.isBookmarked}
                              onBookmark={handleBookmark}
                              onRename={handleRename}
                              onAddToProject={handleAddToProject}
                              onDelete={handleDelete}
                              variant="dots"
                            />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* All chats button */}
                {chatList.length > 0 && (
                  <div className="px-2 pt-2 pb-1">
                    <button
                      onClick={() => navigate('/chats')}
                      className="w-full text-left px-2 py-1.5 text-xs text-arc-text-dim hover:text-arc-text-secondary transition-colors"
                    >
                      All chats →
                    </button>
                  </div>
                )}
              </>
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
