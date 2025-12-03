/**
 * ChatActionsMenu - Shared menu for chat actions
 * Used in both sidebar (on hover "...") and header (title dropdown)
 * DRY pattern: single source of truth for chat actions
 */

import { useState, useRef, useEffect } from 'react';

// ============================================================================
// Icons
// ============================================================================

const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg className="h-4 w-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
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

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MoreIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

export interface ChatActionsMenuProps {
  sessionId: string;
  title: string;
  isBookmarked?: boolean;
  onBookmark: (sessionId: string) => Promise<void>;
  onRename: (sessionId: string, newTitle: string) => Promise<void>;
  onAddToProject?: (sessionId: string) => void;
  onDelete: (sessionId: string) => Promise<void>;
  /** 'dropdown' for header title, 'dots' for sidebar hover */
  variant?: 'dropdown' | 'dots';
  /** Position of menu relative to trigger */
  menuPosition?: 'bottom-left' | 'bottom-right';
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChatActionsMenu({
  sessionId,
  title,
  isBookmarked = false,
  onBookmark,
  onRename,
  onAddToProject,
  onDelete,
  variant = 'dots',
  menuPosition = 'bottom-right',
  className = '',
}: ChatActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when renaming
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onBookmark(sessionId);
    setIsOpen(false);
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(title);
    setIsOpen(false);
  };

  const handleRenameSubmit = async () => {
    if (renameValue.trim() && renameValue.trim() !== title) {
      await onRename(sessionId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(title);
    }
  };

  const handleAddToProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToProject?.(sessionId);
    setIsOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await onDelete(sessionId);
    }
    setIsOpen(false);
  };

  // If renaming, show inline input
  if (isRenaming) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onBlur={handleRenameSubmit}
        onKeyDown={handleRenameKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="px-2 py-1 text-sm bg-arc-bg-tertiary border border-arc-accent rounded text-arc-text-primary focus:outline-none min-w-0"
      />
    );
  }

  const menuPositionClasses = {
    'bottom-left': 'left-0 top-full mt-1',
    'bottom-right': 'right-0 top-full mt-1',
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Trigger Button */}
      {variant === 'dropdown' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-arc-bg-tertiary transition-colors text-arc-text-primary"
        >
          <span className="text-base font-medium">{title}</span>
          <ChevronDownIcon />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-0.5 rounded opacity-0 group-hover/chat:opacity-100 hover:bg-arc-bg-secondary text-arc-text-dim hover:text-arc-text-primary transition-all"
        >
          <MoreIcon />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${menuPositionClasses[menuPosition]} bg-arc-bg-tertiary border border-arc-border rounded-lg shadow-lg z-50 py-1 min-w-44`}
        >
          <button
            onClick={handleBookmark}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
          >
            <BookmarkIcon filled={isBookmarked} />
            {isBookmarked ? 'Unbookmark' : 'Bookmark'}
          </button>
          <button
            onClick={handleStartRename}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
          >
            <RenameIcon />
            Rename
          </button>
          {onAddToProject && (
            <button
              onClick={handleAddToProject}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-secondary transition-colors"
            >
              <FolderIcon />
              Add to project
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-arc-bg-secondary transition-colors"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
