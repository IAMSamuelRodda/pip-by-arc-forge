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

// Pip Logo icon
const PipLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" className="fill-arc-accent" />
    <text x="16" y="21" textAnchor="middle" className="fill-arc-bg-primary font-bold" style={{ fontSize: '14px' }}>P</text>
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

const MoreIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const StarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const RenameIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  } = useChatStore();

  const currentProject = useCurrentProject();

  const [recentsHidden, setRecentsHidden] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  // Handle delete chat
  const handleDeleteChat = async (e: React.MouseEvent, chatSessionId: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await deleteChat(chatSessionId);
    }
    setMenuOpenFor(null);
  };

  // Handle bookmark chat (TODO: implement)
  const handleBookmarkChat = (e: React.MouseEvent, _chatSessionId: string) => {
    e.stopPropagation();
    // TODO: Implement bookmarking
    setMenuOpenFor(null);
  };

  // Handle start rename
  const handleStartRename = (e: React.MouseEvent, chatSessionId: string, currentTitle: string) => {
    e.stopPropagation();
    setRenamingChat(chatSessionId);
    setRenameValue(currentTitle);
    setMenuOpenFor(null);
  };

  // Handle rename submit
  const handleRenameSubmit = async (chatSessionId: string) => {
    if (renameValue.trim()) {
      await renameChat(chatSessionId, renameValue.trim());
    }
    setRenamingChat(null);
    setRenameValue('');
  };

  // Handle add to project (TODO: implement)
  const handleAddToProject = (e: React.MouseEvent, _chatSessionId: string) => {
    e.stopPropagation();
    // TODO: Implement add to project
    setMenuOpenFor(null);
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
                        {renamingChat === chat.sessionId ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSubmit(chat.sessionId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(chat.sessionId);
                              if (e.key === 'Escape') {
                                setRenamingChat(null);
                                setRenameValue('');
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1.5 text-sm bg-arc-bg-tertiary border border-arc-accent rounded text-arc-text-primary focus:outline-none"
                          />
                        ) : (
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenFor(menuOpenFor === chat.sessionId ? null : chat.sessionId);
                                }}
                                className="p-0.5 rounded opacity-0 group-hover/chat:opacity-100 hover:bg-arc-bg-secondary text-arc-text-dim hover:text-arc-text-primary transition-all"
                              >
                                <MoreIcon />
                              </button>
                            </div>
                          </button>
                        )}

                        {/* Context Menu */}
                        {menuOpenFor === chat.sessionId && (
                          <div className="absolute right-0 top-full mt-1 bg-arc-bg-tertiary border border-arc-border rounded-lg shadow-lg z-50 py-1 min-w-36">
                            <button
                              onClick={(e) => handleBookmarkChat(e, chat.sessionId)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
                            >
                              <StarIcon />
                              Bookmark
                            </button>
                            <button
                              onClick={(e) => handleStartRename(e, chat.sessionId, chat.title)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
                            >
                              <RenameIcon />
                              Rename
                            </button>
                            <button
                              onClick={(e) => handleAddToProject(e, chat.sessionId)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
                            >
                              <FolderIcon />
                              Add to project
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(e, chat.sessionId)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-arc-bg-secondary transition-colors"
                            >
                              <TrashIcon />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
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
