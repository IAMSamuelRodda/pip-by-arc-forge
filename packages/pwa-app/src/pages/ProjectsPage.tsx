/**
 * Projects Page - Full project browser
 * Claude.ai pattern: Dedicated page for browsing/managing all projects
 * Accessed via sidebar navigation
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, useCurrentProject } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';
import { projectApi } from '../api/client';

// ============================================================================
// Icons
// ============================================================================

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const MoreIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface EditingProject {
  id: string;
  name: string;
  description: string;
  color: string;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectsPage() {
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
  } = useProjectStore();
  const currentProject = useCurrentProject();
  const { newChat, loadChatList } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [editing, setEditing] = useState<EditingProject | null>(null);
  const [colors, setColors] = useState<string[]>([]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
    projectApi.getColors().then(({ colors }) => setColors(colors)).catch(console.error);
  }, [loadProjects]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setMenuOpenFor(null);
    if (menuOpenFor) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [menuOpenFor]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  // Handle project selection
  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    newChat();
    loadChatList();
    navigate('/');
  };

  // Handle create project
  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createProject({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
        isDefault: projects.length === 0,
      });
      setNewName('');
      setNewDescription('');
      setNewColor('#3B82F6');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Handle update project
  const handleUpdate = async () => {
    if (!editing || !editing.name.trim()) return;
    try {
      await updateProject(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim() || undefined,
        color: editing.color,
      });
      setEditing(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  // Handle delete project
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Delete this project? Chats will remain but won\'t be associated with any project.')) {
      await deleteProject(projectId);
    }
    setMenuOpenFor(null);
  };

  // Start editing
  const startEdit = (e: React.MouseEvent, project: { id: string; name: string; description?: string; color?: string }) => {
    e.stopPropagation();
    setEditing({
      id: project.id,
      name: project.name,
      description: project.description || '',
      color: project.color || '#3B82F6',
    });
    setMenuOpenFor(null);
  };

  // Color picker component
  const ColorPicker = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            value === color ? 'border-white scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-arc-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-arc-border">
        <button
          onClick={() => navigate('/')}
          className="p-1 text-arc-text-secondary hover:text-arc-text-primary transition-colors"
        >
          <ChevronLeftIcon />
        </button>
        <h1 className="text-lg font-medium text-arc-text-primary">Projects</h1>
        <span className="text-sm text-arc-text-dim">({projects.length})</span>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-arc-border">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-arc-text-dim">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 bg-arc-bg-secondary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none"
          />
        </div>

        {/* New Project Button */}
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-2 bg-arc-accent text-arc-bg-primary text-sm rounded-lg hover:bg-arc-accent-dim transition-colors"
        >
          <PlusIcon />
          <span>New</span>
        </button>
      </div>

      {/* Create Project Form */}
      {isCreating && (
        <div className="px-6 py-4 border-b border-arc-border bg-arc-bg-secondary">
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              autoFocus
              className="w-full px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none"
            />
            <div>
              <p className="text-xs text-arc-text-dim mb-2">Color</p>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-1.5 bg-arc-accent text-arc-bg-primary text-sm rounded-lg hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setNewDescription('');
                  setNewColor('#3B82F6');
                }}
                className="px-3 py-1.5 text-arc-text-secondary text-sm rounded-lg hover:bg-arc-bg-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-arc-text-dim">
            Loading...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-arc-text-dim">
            {searchQuery ? (
              <p>No projects match "{searchQuery}"</p>
            ) : (
              <>
                <FolderIcon />
                <p className="mt-2">No projects yet</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-2 text-arc-accent hover:underline"
                >
                  Create your first project
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-arc-border">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`group relative flex items-start gap-4 px-6 py-4 hover:bg-arc-bg-secondary cursor-pointer transition-colors ${
                  project.id === currentProject?.id ? 'bg-arc-bg-secondary' : ''
                }`}
                onClick={() => handleSelectProject(project.id)}
              >
                {/* Editing mode */}
                {editing?.id === project.id ? (
                  <div className="flex-1 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      autoFocus
                      className="w-full px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary focus:border-arc-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none"
                    />
                    <div>
                      <p className="text-xs text-arc-text-dim mb-2">Color</p>
                      <ColorPicker value={editing.color} onChange={(color) => setEditing({ ...editing, color })} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={!editing.name.trim()}
                        className="px-3 py-1.5 bg-arc-accent text-arc-bg-primary text-sm rounded-lg hover:bg-arc-accent-dim disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 text-arc-text-secondary text-sm rounded-lg hover:bg-arc-bg-tertiary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Color badge */}
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    />

                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-arc-text-primary truncate">
                          {project.name}
                        </span>
                        {project.isDefault && (
                          <span className="text-xs text-arc-text-dim px-1.5 py-0.5 bg-arc-bg-tertiary rounded">
                            default
                          </span>
                        )}
                        {project.id === currentProject?.id && (
                          <span className="text-xs text-arc-accent">
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-arc-text-secondary truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenFor(menuOpenFor === project.id ? null : project.id);
                        }}
                        className="p-1.5 text-arc-text-dim hover:text-arc-text-primary hover:bg-arc-bg-tertiary rounded transition-colors"
                      >
                        <MoreIcon />
                      </button>

                      {menuOpenFor === project.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-20">
                          <button
                            onClick={(e) => startEdit(e, project)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
                          >
                            <EditIcon />
                            Edit
                          </button>
                          {!project.isDefault && (
                            <button
                              onClick={(e) => handleDelete(e, project.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-arc-bg-tertiary transition-colors"
                            >
                              <TrashIcon />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
