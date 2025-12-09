/**
 * Chat Sidebar - Navigation-only sidebar
 * Claude.ai pattern: Navigation + quick access (Bookmarked/Recents)
 * Full chat browsing happens on dedicated /chats page
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { useProjectStore } from '../store/projectStore';
import { ProfileDropdown } from './ProfileDropdown';
import { ChatActionsMenu } from './ChatActionsMenu';
import { ProjectPicker } from './ProjectPicker';

// ============================================================================
// Icons
// ============================================================================

const CollapseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

// Sidebar expand icon (double arrow >>)
const ExpandIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

// Official Pip Logo (matches favicon.svg) - uses CSS custom properties
const PipLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="var(--arc-bg-secondary)" stroke="var(--arc-accent)" strokeWidth="6"/>
    <path d="M38 70 V30 h14 a10 10 0 0 1 0 20 H38" fill="none" stroke="var(--arc-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Plus icon for New Chat button (compact size)
const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
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
}

// ============================================================================
// Component
// ============================================================================

export function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
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
    moveToProject,
  } = useChatStore();

  const { projects, loadProjects } = useProjectStore();

  const [recentsHidden, setRecentsHidden] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatProjectId, setSelectedChatProjectId] = useState<string | null>(null);

  // Load chat list and projects on mount
  useEffect(() => {
    loadChatList();
    loadProjects();
  }, [loadChatList, loadProjects]);

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

  const handleAddToProject = (chatSessionId: string) => {
    // Find the chat to get its current project ID
    const chat = chatList.find(c => c.sessionId === chatSessionId);
    setSelectedChatId(chatSessionId);
    setSelectedChatProjectId(chat?.projectId || null);
    setProjectPickerOpen(true);
  };

  const handleProjectSelect = async (projectId: string | null) => {
    if (selectedChatId) {
      await moveToProject(selectedChatId, projectId);
    }
  };

  const isChatsPage = location.pathname === '/chats';
  const isProjectsPage = location.pathname === '/projects';

  return (
    <>
      {/* Sidebar - collapsed mode: entire sidebar is clickable to expand, with hover effect */}
      <aside
        className={`group/sidebar fixed left-0 top-0 h-full bg-arc-bg-secondary border-r border-arc-border z-40 transition-all duration-200 flex flex-col ${
          isOpen ? 'w-64' : 'w-12 hover:bg-arc-bg-tertiary cursor-pointer'
        }`}
        onClick={!isOpen ? onToggle : undefined}
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
            <div className="w-full flex justify-center">
              {/* Logo - hidden on sidebar hover */}
              <span className="group-hover/sidebar:hidden p-1.5">
                <PipLogo />
              </span>
              {/* Toggle - shown on sidebar hover with background */}
              <button
                onClick={onToggle}
                className="hidden group-hover/sidebar:flex p-1.5 rounded hover:bg-arc-bg-primary text-arc-text-secondary transition-colors"
                title="Expand sidebar"
              >
                <ExpandIcon />
              </button>
            </div>
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

        {/* Navigation */}
        <div className="px-2 pb-2 space-y-1">
          {/* Chats */}
          <button
            onClick={() => navigate('/chats')}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
              isChatsPage
                ? 'bg-arc-accent/20 text-arc-accent'
                : 'text-arc-text-primary hover:bg-arc-bg-tertiary'
            } ${isOpen ? '' : 'justify-center'}`}
            title="Browse all chats"
          >
            <span className={isChatsPage ? '' : 'text-arc-accent/70'}>
              <ChatsIcon />
            </span>
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
                : 'text-arc-text-primary hover:bg-arc-bg-tertiary'
            } ${isOpen ? '' : 'justify-center'}`}
            title="Browse projects"
          >
            <span className={isProjectsPage ? '' : 'text-arc-accent/70'}>
              <ProjectsIcon />
            </span>
            {isOpen && (
              <>
                <span className="text-sm flex-1 text-left">Projects</span>
                {projects.length > 0 && (
                  <span className="text-xs text-arc-text-dim">{projects.length}</span>
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
              <div className="flex items-center gap-1.5 text-xs font-medium text-arc-text-secondary uppercase tracking-wide">
                <span className="text-arc-accent/70">
                  <BookmarkIcon />
                </span>
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
                <div className="flex items-center gap-1.5 text-xs font-medium text-arc-text-secondary uppercase tracking-wide">
                  <span className="text-arc-accent/70">
                    <ClockIcon />
                  </span>
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

        {/* Profile Dropdown (bottom) - separator only when expanded */}
        <div className={`p-2 ${isOpen ? 'border-t border-arc-border' : ''}`}>
          <ProfileDropdown collapsed={!isOpen} />
        </div>
      </aside>

      {/* Spacer to push content */}
      <div className={`flex-shrink-0 transition-all duration-200 ${isOpen ? 'w-64' : 'w-12'}`} />

      {/* Project Picker Modal */}
      <ProjectPicker
        isOpen={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        onSelect={handleProjectSelect}
        currentProjectId={selectedChatProjectId}
      />
    </>
  );
}
