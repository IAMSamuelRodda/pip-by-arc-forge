/**
 * ProjectPicker - Modal for selecting a project
 * Used for "Move to Project" and "Remove from Project" actions
 */

import { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';

// ============================================================================
// Icons
// ============================================================================

const FolderIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface ProjectPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string | null) => void;
  currentProjectId?: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectPicker({
  isOpen,
  onClose,
  onSelect,
  currentProjectId,
}: ProjectPickerProps) {
  const { projects, loadProjects } = useProjectStore();
  const [selectedId, setSelectedId] = useState<string | null>(currentProjectId || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      setSelectedId(currentProjectId || null);
      setSearchQuery(''); // Reset search when modal opens
    }
  }, [isOpen, currentProjectId, loadProjects]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle selection
  const handleSelect = (projectId: string | null) => {
    setSelectedId(projectId);
  };

  // Handle confirm
  const handleConfirm = () => {
    onSelect(selectedId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-arc-bg-secondary rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-arc-border">
          <h2 className="text-lg font-medium text-arc-text-primary">Move to Project</h2>
          <button
            onClick={onClose}
            className="p-1 text-arc-text-secondary hover:text-arc-text-primary transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Search */}
        {projects.length > 3 && (
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-arc-text-dim">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* General (no project) option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              selectedId === null
                ? 'bg-arc-accent/20 text-arc-accent'
                : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
            }`}
          >
            <HomeIcon />
            <span className="flex-1 text-left text-sm">General (no project)</span>
            {selectedId === null && <CheckIcon />}
          </button>

          {/* Divider */}
          {filteredProjects.length > 0 && (
            <div className="my-2 px-3">
              <div className="border-t border-arc-border" />
            </div>
          )}

          {/* Projects */}
          {filteredProjects.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-arc-text-dim">
              {searchQuery ? 'No projects match your search' : 'No projects yet'}
            </div>
          ) : (
            filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedId === project.id
                    ? 'bg-arc-accent/20 text-arc-accent'
                    : 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                }`}
              >
                <FolderIcon />
                <span className="flex-1 text-left text-sm font-medium">{project.name}</span>
                {selectedId === project.id && <CheckIcon />}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-arc-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedId === currentProjectId}
            className="px-4 py-2 text-sm bg-arc-accent text-arc-bg-primary rounded-lg hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
