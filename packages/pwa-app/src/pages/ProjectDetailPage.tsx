/**
 * Project Detail Page - Inside a specific project
 * Claude.ai pattern: Chat input creates project-scoped chats
 * Shows project's chats and configuration sidebar
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';
import { projectApi } from '../api/client';
import { MainLayout } from '../components/MainLayout';
import { ChatInputArea } from '../components/ChatInputArea';
import { ProjectDetailSidebar } from '../components/ProjectDetailSidebar';

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChatsIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface ProjectChat {
  sessionId: string;
  projectId?: string | null;
  title: string;
  previewText?: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  isBookmarked?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { projects, loadProjects, updateProject, deleteProject, setCurrentProject } = useProjectStore();
  const { newChat, loadChatList, chatList } = useChatStore();

  const [projectChats, setProjectChats] = useState<ProjectChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [chatInputValue, setChatInputValue] = useState('');

  // Find current project
  const project = projects.find(p => p.id === projectId);

  // CRITICAL FIX (issue_042): Sync URL projectId with global currentProjectId
  // This ensures chats created in this project view get the correct projectId
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

  // Load project and chats on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load all chats (sidebar and project detail share the same store)
  const loadAllChats = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingChats(true);
    try {
      // Load ALL chats - don't filter the global store
      // Project filtering happens locally in the useEffect below
      await loadChatList();
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
  }, [projectId, loadChatList]);

  useEffect(() => {
    loadAllChats();
  }, [loadAllChats]);

  // Filter chats for this project
  useEffect(() => {
    const filtered = chatList.filter(chat => chat.projectId === projectId);
    setProjectChats(filtered);
  }, [chatList, projectId]);

  // Initialize form values when project loads
  useEffect(() => {
    if (project) {
      setInstructions(project.instructions || '');
      setEditedName(project.name);
      setEditedDescription(project.description || '');
    }
  }, [project]);

  // Handle creating a new chat in this project
  const handleNewProjectChat = async (message: string) => {
    if (!message.trim() || !projectId) return;

    // Create new chat with project ID and send the first message
    await newChat(projectId);

    // Navigate to chat page - the message will be sent there
    // Store the initial message to send after navigation
    sessionStorage.setItem('pendingMessage', message);
    navigate('/');
  };

  // Handle chat click
  const handleChatClick = async (chatSessionId: string) => {
    // Load this chat and navigate to chat page
    const { loadChat } = useChatStore.getState();
    await loadChat(chatSessionId);
    navigate('/');
  };

  // Handle saving instructions (called from sidebar)
  const handleSaveInstructions = async (newInstructions: string) => {
    if (!projectId) return;

    try {
      await projectApi.updateProject(projectId, { instructions: newInstructions.trim() });
      // Refresh projects to get updated data
      await loadProjects();
      setInstructions(newInstructions);
    } catch (err) {
      console.error('Failed to save instructions:', err);
    }
  };

  // Handle updating project name/description
  const handleUpdateProject = async () => {
    if (!projectId || !editedName.trim()) return;

    try {
      await updateProject(projectId, {
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
      });
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!projectId) return;

    if (confirm('Delete this project? Chats will remain but won\'t be associated with any project.')) {
      await deleteProject(projectId);
      navigate('/projects');
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!project) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center text-arc-text-dim">
          {projects.length === 0 ? 'Loading...' : 'Project not found'}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-arc-border">
          <button
            onClick={() => navigate('/projects')}
            className="p-1 text-arc-text-secondary hover:text-arc-text-primary transition-colors"
            title="Back to projects"
          >
            <ChevronLeftIcon />
          </button>

          {isEditingName ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="flex-1 px-2 py-1 bg-arc-bg-secondary border border-arc-border rounded text-arc-text-primary focus:border-arc-accent focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateProject();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                onClick={handleUpdateProject}
                className="px-3 py-1 bg-arc-accent text-arc-bg-primary text-sm rounded hover:bg-arc-accent-dim"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setEditedName(project.name);
                }}
                className="px-3 py-1 text-arc-text-secondary text-sm hover:bg-arc-bg-tertiary rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <h1 className="text-lg font-medium text-arc-text-primary">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-arc-text-secondary">{project.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-2 text-arc-text-dim hover:text-arc-text-secondary hover:bg-arc-bg-tertiary rounded transition-colors"
                  title="Edit project"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-2 text-arc-text-dim hover:text-red-400 hover:bg-arc-bg-tertiary rounded transition-colors"
                  title="Delete project"
                >
                  <TrashIcon />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Chat Input - creates project-scoped chat */}
            <div className="px-6 py-4 border-b border-arc-border">
              <div className="max-w-2xl mx-auto">
                <ChatInputArea
                  value={chatInputValue}
                  onChange={setChatInputValue}
                  onSubmit={(message) => {
                    handleNewProjectChat(message);
                    setChatInputValue('');
                  }}
                  placeholder={`Ask Pip about ${project.name}...`}
                  isLoading={false}
                />
              </div>
            </div>

            {/* Project Chats */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-arc-text-dim uppercase tracking-wide mb-3">
                  <ChatsIcon />
                  <span>Chats in this project</span>
                  <span className="text-arc-text-dim">({projectChats.length})</span>
                </div>

                {isLoadingChats ? (
                  <div className="text-sm text-arc-text-dim py-4">Loading chats...</div>
                ) : projectChats.length === 0 ? (
                  <div className="text-sm text-arc-text-dim py-4 italic">
                    No chats yet. Start one above!
                  </div>
                ) : (
                  <div className="space-y-1">
                    {projectChats.map((chat) => (
                      <button
                        key={chat.sessionId}
                        onClick={() => handleChatClick(chat.sessionId)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-arc-bg-secondary transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-arc-text-primary truncate flex-1">
                            {chat.title}
                          </span>
                          <span className="text-xs text-arc-text-dim ml-2 flex-shrink-0">
                            {formatDate(chat.updatedAt)}
                          </span>
                        </div>
                        {chat.previewText && (
                          <p className="text-xs text-arc-text-dim truncate mt-0.5">
                            {chat.previewText}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Project Configuration */}
          <ProjectDetailSidebar
            projectId={projectId!}
            instructions={instructions}
            onInstructionsChange={handleSaveInstructions}
          />
        </div>
      </div>
    </MainLayout>
  );
}
