/**
 * ProjectDetailSidebar - Right sidebar for project configuration
 * Sections: Memory, Instructions, Files
 * Claude.ai pattern: Project-specific context and configuration
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Icons
// ============================================================================

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 4.5a2.5 2.5 0 00-4.96-.46 2.5 2.5 0 00-1.98 3 2.5 2.5 0 00-1.32 4.24 3 3 0 000 5.5A2.5 2.5 0 007 21.29a2.5 2.5 0 003.5 2.23 2.5 2.5 0 003-3.5 3 3 0 000-5.5 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-1.98-3A2.5 2.5 0 0012 4.5z" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface ProjectDetailSidebarProps {
  projectId: string;
  instructions?: string;
  onInstructionsChange: (instructions: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectDetailSidebar({
  instructions = '',
  onInstructionsChange,
}: ProjectDetailSidebarProps) {
  const [instructionsValue, setInstructionsValue] = useState(instructions);
  const [isSaving, setIsSaving] = useState(false);
  const [memoryExpanded, setMemoryExpanded] = useState(true);
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(true);

  // Update local state when prop changes
  useEffect(() => {
    setInstructionsValue(instructions);
  }, [instructions]);

  // Auto-save on blur
  const handleInstructionsBlur = async () => {
    if (instructionsValue !== instructions) {
      setIsSaving(true);
      try {
        await onInstructionsChange(instructionsValue);
      } catch (error) {
        console.error('Failed to save instructions:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="w-80 border-l border-arc-border bg-arc-bg-secondary flex-shrink-0 overflow-y-auto">
      {/* Memory Section */}
      <div className="border-b border-arc-border">
        <button
          onClick={() => setMemoryExpanded(!memoryExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-arc-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            <BrainIcon />
            <span className="text-sm font-medium text-arc-text-primary">Memory</span>
          </div>
          {memoryExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
        {memoryExpanded && (
          <div className="px-4 pb-4">
            <div className="text-xs text-arc-text-dim">
              <p>No memories yet for this project.</p>
              <p className="mt-2">Pip will learn as you chat.</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Section */}
      <div className="border-b border-arc-border">
        <button
          onClick={() => setInstructionsExpanded(!instructionsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-arc-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileTextIcon />
            <span className="text-sm font-medium text-arc-text-primary">Instructions</span>
          </div>
          {instructionsExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
        {instructionsExpanded && (
          <div className="px-4 pb-4">
            <textarea
              value={instructionsValue}
              onChange={(e) => setInstructionsValue(e.target.value)}
              onBlur={handleInstructionsBlur}
              placeholder="Add custom instructions for this project..."
              className="w-full h-32 px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary placeholder-arc-text-dim focus:border-arc-accent focus:outline-none resize-none"
            />
            {isSaving && (
              <div className="mt-2 text-xs text-arc-text-dim">Saving...</div>
            )}
            <div className="mt-2 text-xs text-arc-text-dim">
              {instructionsValue.length}/5000 characters
            </div>
          </div>
        )}
      </div>

      {/* Files Section */}
      <div className="border-b border-arc-border">
        <button
          onClick={() => setFilesExpanded(!filesExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-arc-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderIcon />
            <span className="text-sm font-medium text-arc-text-primary">Files</span>
          </div>
          {filesExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
        {filesExpanded && (
          <div className="px-4 pb-4">
            <div className="text-xs text-arc-text-dim">
              <p>No files uploaded yet.</p>
              <p className="mt-2">Upload project documents to provide context to Pip.</p>
            </div>
            <button className="mt-3 w-full px-3 py-2 bg-arc-bg-tertiary border border-arc-border rounded-lg text-sm text-arc-text-primary hover:bg-arc-bg-primary transition-colors">
              Upload File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
