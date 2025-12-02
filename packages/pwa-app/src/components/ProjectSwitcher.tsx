/**
 * Project Switcher - Dropdown to select active project
 * Epic 2.3: Projects feature
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore, useCurrentProject } from '../store/projectStore';
import { useChatStore } from '../store/chatStore';

interface ProjectSwitcherProps {
  inSidebar?: boolean;
}

export function ProjectSwitcher({ inSidebar = false }: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { projects, isLoading, loadProjects, setCurrentProject, createProject } = useProjectStore();
  const currentProject = useCurrentProject();

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewProjectName('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      await createProject({
        name: newProjectName.trim(),
        isDefault: projects.length === 0,
      });
      setNewProjectName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const { loadChatList, newChat } = useChatStore();

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    setIsOpen(false);
    // Refresh chat list for the new project and start fresh
    newChat();
    loadChatList();
  };

  // Show "Add Project" button when no projects exist
  const hasProjects = projects.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-arc-border hover:border-arc-accent transition-colors ${
          inSidebar ? 'w-full' : ''
        }`}
        disabled={isLoading}
      >
        {/* Project color badge */}
        {currentProject?.color ? (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentProject.color }}
          />
        ) : (
          <svg className="w-4 h-4 text-arc-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )}

        {/* Project name */}
        <span className="text-sm text-arc-text-secondary truncate max-w-[120px]">
          {isLoading ? 'Loading...' : currentProject?.name || 'Add Project'}
        </span>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-arc-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Project list */}
          {hasProjects && (
            <div className="py-1 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-arc-bg-tertiary transition-colors ${
                    project.id === currentProject?.id ? 'bg-arc-bg-tertiary' : ''
                  }`}
                >
                  {/* Color badge */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  />

                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-arc-text-primary truncate">
                        {project.name}
                      </span>
                      {project.isDefault && (
                        <span className="text-xs text-arc-text-dim px-1.5 py-0.5 bg-arc-bg-primary rounded">
                          default
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <span className="text-xs text-arc-text-dim truncate block">
                        {project.description}
                      </span>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {project.id === currentProject?.id && (
                    <svg className="w-4 h-4 text-arc-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state / Create first project */}
          {!hasProjects && !isCreating && (
            <div className="px-3 py-3">
              <p className="text-xs text-arc-text-dim mb-2">No projects yet</p>
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-3 py-1.5 bg-arc-accent text-arc-bg-primary text-sm rounded-lg hover:bg-arc-accent-dim transition-colors"
              >
                Create project
              </button>
            </div>
          )}

          {/* Create project form */}
          {isCreating && (
            <div className="px-3 py-3 border-b border-arc-border">
              <p className="text-xs text-arc-text-dim mb-2">New project</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateProject();
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 px-2 py-1.5 text-sm bg-arc-bg-tertiary border border-arc-border rounded focus:border-arc-accent focus:outline-none text-arc-text-primary placeholder-arc-text-dim"
                />
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-2 py-1.5 bg-arc-accent text-arc-bg-primary text-sm rounded hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {/* Divider */}
          {hasProjects && <div className="border-t border-arc-border" />}

          {/* Actions */}
          <div className="py-1">
            {/* Add new project button (when projects exist) */}
            {hasProjects && !isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New project
              </button>
            )}

            {/* Manage projects link */}
            {hasProjects && (
              <a
                href="/settings#projects"
                className="flex items-center gap-2 px-3 py-2 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage projects
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
