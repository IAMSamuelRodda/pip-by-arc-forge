/**
 * Manage Memory Modal - Claude.ai Pattern 0.7
 * Two-tier memory: auto-generated summary + user edits
 */

import { useState, useEffect } from 'react';
import { memoryApi, type MemoryStatus, type MemoryEdit } from '../api/client';

interface ManageMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'summary' | 'edits';

export function ManageMemoryModal({ isOpen, onClose }: ManageMemoryModalProps) {
  const [view, setView] = useState<View>('summary');
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [edits, setEdits] = useState<MemoryEdit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit input state
  const [editInput, setEditInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Summary generation state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMemory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === 'edits') {
      loadEdits();
    }
  }, [isOpen, view]);

  const loadMemory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await memoryApi.getMemory();
      setMemory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEdits = async () => {
    try {
      const result = await memoryApi.getEdits();
      setEdits(result.edits);
    } catch (err) {
      console.error('Failed to load edits:', err);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editInput.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      // Use "User" as the default entity for inline edits
      await memoryApi.addEdit('User', editInput.trim());
      setEditInput('');
      // Reload memory to update edit count
      await loadMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEdit = async (entityName: string, observation: string) => {
    try {
      await memoryApi.deleteEdit(entityName, observation);
      setEdits(edits.filter(e => !(e.entityName === entityName && e.observation === observation)));
      // Reload memory to update edit count
      await loadMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleClearAllEdits = async () => {
    if (!confirm('Clear all your memory edits? This cannot be undone.')) return;

    try {
      await memoryApi.clearEdits();
      setEdits([]);
      await loadMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear edits');
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      setError(null);
      const result = await memoryApi.generateSummary();
      // Update memory state with new summary
      setMemory(prev => prev ? {
        ...prev,
        summary: result.summary,
        summaryGeneratedAt: result.generatedAt,
        isStale: false,
        entityCount: result.entityCount,
        observationCount: result.observationCount,
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-arc-bg-secondary border border-arc-border rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arc-border">
          <h2 className="text-lg font-medium text-arc-text-primary">
            {view === 'summary' ? 'Manage memory' : 'Manage edits'}
          </h2>
          <button
            onClick={onClose}
            className="text-arc-text-secondary hover:text-arc-text-primary transition-colors text-xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 text-arc-text-secondary">
                <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="mt-3 text-sm text-arc-text-secondary">Loading...</p>
            </div>
          ) : view === 'summary' ? (
            <SummaryView
              memory={memory}
              editInput={editInput}
              setEditInput={setEditInput}
              onSubmitEdit={handleSubmitEdit}
              isSubmitting={isSubmitting}
              onManageEdits={() => setView('edits')}
              onGenerateSummary={handleGenerateSummary}
              isGeneratingSummary={isGeneratingSummary}
            />
          ) : (
            <EditsView
              edits={edits}
              onBack={() => setView('summary')}
              onDeleteEdit={handleDeleteEdit}
              onClearAll={handleClearAllEdits}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Summary View Component
interface SummaryViewProps {
  memory: MemoryStatus | null;
  editInput: string;
  setEditInput: (value: string) => void;
  onSubmitEdit: () => void;
  isSubmitting: boolean;
  onManageEdits: () => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
}

function SummaryView({
  memory,
  editInput,
  setEditInput,
  onSubmitEdit,
  isSubmitting,
  onManageEdits,
  onGenerateSummary,
  isGeneratingSummary,
}: SummaryViewProps) {
  const hasSummary = memory?.summary;
  const hasEntities = (memory?.entityCount || 0) > 0;
  const isStale = memory?.isStale ?? false;

  // Tooltip text based on state
  const tooltipText = isGeneratingSummary
    ? 'Generating summary...'
    : hasSummary
      ? isStale
        ? 'Memory changed - click to refresh'
        : 'Regenerate summary'
      : 'Generate a summary of your memories';

  return (
    <div className="space-y-4">
      {/* Summary Box */}
      <div className="bg-arc-bg-tertiary border border-arc-border rounded-lg p-4">
        {hasSummary ? (
          <>
            <p className="text-sm text-arc-text-primary whitespace-pre-wrap">{memory.summary}</p>
            {isStale && (
              <p className="mt-3 text-xs text-yellow-400">
                Memory changed
              </p>
            )}
          </>
        ) : hasEntities ? (
          <p className="text-sm text-arc-text-secondary italic">
            {memory?.entityCount} memories, {memory?.observationCount} observations
          </p>
        ) : (
          <p className="text-sm text-arc-text-secondary italic">
            No memories yet
          </p>
        )}
      </div>

      {/* Summarise Button - only show if there are entities */}
      {hasEntities && (
        <button
          onClick={onGenerateSummary}
          disabled={isGeneratingSummary}
          title={tooltipText}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isStale && !isGeneratingSummary
              ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
              : 'bg-arc-bg-tertiary border border-arc-border text-arc-text-primary hover:border-arc-accent/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGeneratingSummary ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Summarising
            </>
          ) : (
            'Summarise'
          )}
        </button>
      )}

      {/* Inline Edit Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={editInput}
          onChange={(e) => setEditInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmitEdit()}
          placeholder="Tell Pip what to remember or forget..."
          disabled={isSubmitting}
          className="flex-1 bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-2 text-sm text-arc-text-primary placeholder:text-arc-text-dim focus:outline-none focus:border-arc-accent disabled:opacity-50"
        />
        <button
          onClick={onSubmitEdit}
          disabled={!editInput.trim() || isSubmitting}
          className="px-4 py-2 bg-arc-accent text-arc-bg-primary rounded-lg text-sm font-medium hover:bg-arc-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '...' : 'Save'}
        </button>
      </div>

      {/* Manage Edits Button */}
      <button
        onClick={onManageEdits}
        className="w-full flex items-center justify-between p-4 bg-arc-bg-tertiary border border-arc-border rounded-lg hover:border-arc-accent/50 transition-colors"
      >
        <span className="text-sm text-arc-text-primary">Manage edits</span>
        <span className="flex items-center gap-2">
          {(memory?.editCount || 0) > 0 && (
            <span className="text-xs bg-arc-accent/20 text-arc-accent px-2 py-0.5 rounded">
              {memory?.editCount}
            </span>
          )}
          <span className="text-arc-text-secondary">&rarr;</span>
        </span>
      </button>
    </div>
  );
}

// Edits View Component
interface EditsViewProps {
  edits: MemoryEdit[];
  onBack: () => void;
  onDeleteEdit: (entityName: string, observation: string) => void;
  onClearAll: () => void;
}

function EditsView({ edits, onBack, onDeleteEdit, onClearAll }: EditsViewProps) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-arc-text-secondary">
        These are things you explicitly asked Pip to remember. You can remove them individually or clear all.
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-arc-accent hover:text-arc-accent/80 transition-colors"
        >
          &larr; Back to memory
        </button>
        {edits.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-arc-text-dim hover:text-red-400 transition-colors"
          >
            Clear edits
          </button>
        )}
      </div>

      {/* Edits List */}
      {edits.length === 0 ? (
        <div className="bg-arc-bg-tertiary border border-arc-border rounded-lg p-4">
          <p className="text-sm text-arc-text-secondary italic text-center">
            No edits yet. Use &quot;Tell Pip what to remember&quot; to add explicit memories.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {edits.map((edit, index) => (
            <div
              key={`${edit.entityName}-${index}`}
              className="flex items-center justify-between bg-arc-bg-tertiary border border-arc-border rounded-lg p-3"
            >
              <div className="flex-1 pr-4">
                <p className="text-sm text-arc-text-primary">{edit.observation}</p>
                <p className="text-xs text-arc-text-dim mt-1">
                  {edit.entityName} &bull; {new Date(edit.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => onDeleteEdit(edit.entityName, edit.observation)}
                className="text-arc-text-dim hover:text-red-400 transition-colors p-1"
                title="Delete this edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
