/**
 * Projects Settings Panel - Full CRUD UI for projects
 * Epic 2.3: Projects feature
 */

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { projectApi } from '../api/client';
import type { Project } from '../api/client';

interface EditingState {
  projectId: string;
  name: string;
  description: string;
}

export function ProjectsSettingsPanel() {
  const { projects, isLoading, loadProjects, updateProject, deleteProject } = useProjectStore();
  const [colors, setColors] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load colors on mount
  useEffect(() => {
    loadColors();
  }, []);

  // Focus name input when editing
  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editing]);

  const loadColors = async () => {
    try {
      const result = await projectApi.getColors();
      setColors(result.colors);
    } catch (err) {
      console.error('Failed to load colors:', err);
    }
  };

  const startEditing = (project: Project) => {
    setEditing({
      projectId: project.id,
      name: project.name,
      description: project.description || '',
    });
    setColorPickerFor(null);
    setDeleteConfirm(null);
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const saveEditing = async () => {
    if (!editing) return;

    const trimmedName = editing.name.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      await updateProject(editing.projectId, {
        name: trimmedName,
        description: editing.description.trim() || undefined,
      });
      setEditing(null);
      setSuccess('Project updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleColorChange = async (projectId: string, color: string) => {
    try {
      setError(null);
      await updateProject(projectId, { color });
      setColorPickerFor(null);
      setSuccess('Color updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update color');
    }
  };

  const handleSetDefault = async (projectId: string) => {
    try {
      setError(null);
      await projectApi.setDefaultProject(projectId);
      await loadProjects(); // Refresh to update isDefault flags
      setSuccess('Default project updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      setError(null);
      await deleteProject(projectId);
      setDeleteConfirm(null);
      setSuccess('Project deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center gap-2 text-arc-text-secondary">
          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-arc-text-secondary">
        <p>No projects yet. Create one from the project switcher in the header.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-2">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Project List */}
      <div className="space-y-3">
        {projects.map((project) => {
          const isEditing = editing?.projectId === project.id;
          const showColorPicker = colorPickerFor === project.id;
          const showDeleteConfirm = deleteConfirm === project.id;

          return (
            <div
              key={project.id}
              className="bg-arc-bg-tertiary border border-arc-border rounded-xl p-4 transition-all hover:border-arc-border"
            >
              {/* Main Row */}
              <div className="flex items-start gap-3">
                {/* Color Badge (clickable) */}
                <button
                  onClick={() => setColorPickerFor(showColorPicker ? null : project.id)}
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center hover:ring-2 hover:ring-arc-accent/50 transition-all"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                  title="Change color"
                >
                  {showColorPicker && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-2">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Project name"
                        className="w-full px-3 py-1.5 text-sm bg-arc-bg-primary border border-arc-border rounded-lg focus:border-arc-accent focus:outline-none text-arc-text-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <input
                        type="text"
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-1.5 text-sm bg-arc-bg-primary border border-arc-border rounded-lg focus:border-arc-accent focus:outline-none text-arc-text-secondary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditing}
                          className="px-3 py-1 text-sm bg-arc-accent text-arc-bg-primary rounded-lg hover:bg-arc-accent-dim transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 text-sm text-arc-text-secondary hover:text-arc-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-arc-text-primary truncate">
                          {project.name}
                        </h3>
                        {project.isDefault && (
                          <span className="text-xs text-arc-text-dim px-1.5 py-0.5 bg-arc-bg-primary rounded">
                            default
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-arc-text-dim truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Actions (when not editing) */}
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    {/* Edit Button */}
                    <button
                      onClick={() => startEditing(project)}
                      className="p-1.5 text-arc-text-dim hover:text-arc-text-secondary transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Set Default Button (if not already default) */}
                    {!project.isDefault && (
                      <button
                        onClick={() => handleSetDefault(project.id)}
                        className="p-1.5 text-arc-text-dim hover:text-arc-accent transition-colors"
                        title="Set as default"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirm(project.id)}
                      className="p-1.5 text-arc-text-dim hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Color Picker */}
              {showColorPicker && (
                <div className="mt-3 pt-3 border-t border-arc-border">
                  <p className="text-xs text-arc-text-dim mb-2">Select color</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(project.id, color)}
                        className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                          project.color === color ? 'ring-2 ring-arc-accent ring-offset-2 ring-offset-arc-bg-tertiary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="mt-3 pt-3 border-t border-arc-border">
                  <p className="text-sm text-arc-text-secondary mb-2">
                    Delete "{project.name}"? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 text-sm text-arc-text-secondary hover:text-arc-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <p className="text-xs text-arc-text-dim">
        Projects help you organize conversations by client or context. Each project has its own chat history.
      </p>
    </div>
  );
}
