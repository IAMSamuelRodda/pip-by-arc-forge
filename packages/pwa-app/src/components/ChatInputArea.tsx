/**
 * ChatInputArea - Claude.ai-style chat input
 *
 * Pattern:
 * ┌─────────────────────────────────────────────────────┐
 * │  [Text input area - multiline capable]              │
 * │                                                     │
 * │  [+] [≡] [🧠]                   Sonnet 4.5 ▾  [↑]  │
 * └─────────────────────────────────────────────────────┘
 *    └─icons─┘ └memory┘              └─model─┘   └send┘
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { api, type ResponseStyleId, type ResponseStyleOption } from '../api/client';
import { useChatStore } from '../store/chatStore';

// ============================================================================
// Types
// ============================================================================

interface Attachment {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  description?: string;
  provider: string;
}

// Model descriptions by provider/id pattern
const MODEL_DESCRIPTIONS: Record<string, string> = {
  'claude-sonnet': 'Smartest for everyday tasks',
  'claude-opus': 'Most capable for complex work',
  'claude-haiku': 'Fastest for quick answers',
  'qwen': 'Local - fast, private',
  'llama': 'Local - fast, private',
  'byom': 'Use your own API key',
};

function getModelDescription(id: string): string {
  for (const [pattern, desc] of Object.entries(MODEL_DESCRIPTIONS)) {
    if (id.toLowerCase().includes(pattern.toLowerCase())) {
      return desc;
    }
  }
  return '';
}

// ============================================================================
// Icon Components
// ============================================================================

const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SlidersIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

// Brain icon for memory
const BrainIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M12 18v-5" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronIcon = ({ direction = 'down' }: { direction?: 'down' | 'right' }) => (
  <svg
    className="w-3 h-3"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ transform: direction === 'right' ? 'rotate(-90deg)' : undefined }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ============================================================================
// Sub-components
// ============================================================================

function AttachmentPreview({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (id: string) => void }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-arc-border">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 bg-arc-bg-secondary border border-arc-border-subtle rounded-lg px-3 py-2 text-sm group"
        >
          <FileIcon />
          <span className="text-arc-text-primary max-w-[150px] truncate">{attachment.file.name}</span>
          <button
            onClick={() => onRemove(attachment.id)}
            className="text-arc-text-dim hover:text-red-400 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: ResponseStyleId;
  styles: ResponseStyleOption[];
  onStyleChange: (style: ResponseStyleId) => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

function ToolsMenu({ isOpen, onClose, currentStyle, styles, onStyleChange, buttonRef }: ToolsMenuProps) {
  const [showStyleSubmenu, setShowStyleSubmenu] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const styleButtonRef = useRef<HTMLButtonElement>(null);

  // Detect viewport position on open
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 200; // Approximate menu height

      // Open upward if not enough space below and more space above
      setOpenUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
    }
    // Reset submenu when parent closes
    if (!isOpen) {
      setShowStyleSubmenu(false);
    }
  }, [isOpen, buttonRef]);

  // Calculate submenu position when style button is clicked
  useEffect(() => {
    if (showStyleSubmenu && styleButtonRef.current) {
      const rect = styleButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.right + 4,
      });
    }
  }, [showStyleSubmenu]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute left-0 w-64 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-50 ${
          openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        <div className="py-1">
          {/* Style selector */}
          <button
            ref={styleButtonRef}
            onClick={() => setShowStyleSubmenu(!showStyleSubmenu)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
          >
            <span>Response Style</span>
            <div className="flex items-center gap-2 text-arc-text-secondary">
              <span className="text-xs">{styles.find(s => s.id === currentStyle)?.name || 'Normal'}</span>
              <ChevronIcon direction="right" />
            </div>
          </button>

          <div className="border-t border-arc-border my-1" />

          <a href="/settings" className="block px-4 py-2 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary transition-colors">
            Settings
          </a>
        </div>
      </div>

      {/* Style submenu - fixed position to escape parent overflow */}
      {showStyleSubmenu && (
        <div
          className="fixed w-40 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-50"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="py-1">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => { onStyleChange(style.id); setShowStyleSubmenu(false); onClose(); }}
                title={style.description}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
              >
                <span>{style.name}</span>
                {currentStyle === style.id && <CheckIcon />}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  accessibleModels: ModelOption[];
  isLoading: boolean;
}

function ModelSelector({ isOpen, onClose, currentModel, onModelChange, accessibleModels, isLoading }: ModelSelectorProps) {
  if (!isOpen) return null;

  // Separate cloud and local models
  const cloudModels = accessibleModels.filter(m => m.provider === 'anthropic');
  const localModels = accessibleModels.filter(m => m.provider === 'ollama');
  const byomModels = accessibleModels.filter(m => m.provider === 'byom');

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full right-0 mb-2 w-56 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-20">
        <div className="py-1">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-arc-text-dim">Loading models...</div>
          ) : accessibleModels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-arc-text-dim">No models available</div>
          ) : (
            <>
              {/* Cloud models */}
              {cloudModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => { onModelChange(model.id); onClose(); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-arc-bg-tertiary transition-colors"
                >
                  <div className="text-left">
                    <div className="text-arc-text-primary font-medium">{model.name}</div>
                    <div className="text-xs text-arc-text-dim">{getModelDescription(model.id)}</div>
                  </div>
                  {currentModel === model.id && <CheckIcon />}
                </button>
              ))}

              {/* Local models */}
              {localModels.length > 0 && (
                <>
                  {cloudModels.length > 0 && <div className="border-t border-arc-border my-1" />}
                  <div className="px-3 py-1 text-xs text-arc-text-dim flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Local</span>
                  </div>
                  {localModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { onModelChange(`ollama:${model.id}`); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-arc-bg-tertiary transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-arc-text-primary font-medium">{model.name}</div>
                        <div className="text-xs text-arc-text-dim">{getModelDescription(model.id)}</div>
                      </div>
                      {(currentModel === model.id || currentModel === `ollama:${model.id}`) && <CheckIcon />}
                    </button>
                  ))}
                </>
              )}

              {/* BYOM option */}
              {byomModels.length > 0 && (
                <>
                  <div className="border-t border-arc-border my-1" />
                  {byomModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { onModelChange(model.id); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-arc-bg-tertiary transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-arc-text-primary font-medium">{model.name}</div>
                        <div className="text-xs text-arc-text-dim">{getModelDescription(model.id)}</div>
                      </div>
                      {currentModel === model.id && <CheckIcon />}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatInputArea({
  value,
  onChange,
  onSubmit,
  placeholder = 'How can I help you today?',
  disabled = false,
  isLoading = false,
  autoFocus = false,
}: ChatInputAreaProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [styles, setStyles] = useState<ResponseStyleOption[]>([]);
  const [currentStyle, setCurrentStyle] = useState<ResponseStyleId>('normal');
  const [accessibleModels, setAccessibleModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Model selection from store (persisted)
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const modelLoadingState = useChatStore((state) => state.modelLoadingState);
  const setModelLoadingState = useChatStore((state) => state.setModelLoadingState);

  // Load settings and accessible models
  useEffect(() => {
    api.getStyles().then(({ styles }) => setStyles(styles)).catch(console.error);
    api.getSettings().then(({ settings }) => setCurrentStyle(settings.responseStyle)).catch(console.error);

    // Fetch accessible models from API (filtered by user's role/tier/flags)
    api.getAccessibleModels()
      .then(({ models, defaultModelId }) => {
        setAccessibleModels(models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
        })));
        // If current selected model is not accessible, switch to default
        if (defaultModelId && !models.some(m => m.id === selectedModel || `ollama:${m.id}` === selectedModel)) {
          setSelectedModel(defaultModelId);
        }
        setModelsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load accessible models:', err);
        setModelsLoading(false);
      });
  }, []);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      status: 'pending',
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleStyleChange = useCallback(async (styleId: ResponseStyleId) => {
    try {
      await api.updateSettings({ responseStyle: styleId });
      setCurrentStyle(styleId);
    } catch (err) {
      console.error('Failed to update style:', err);
    }
  }, []);

  const handleModelChange = useCallback(async (modelId: string) => {
    setSelectedModel(modelId);

    // Pre-warm Ollama when local model selected
    // Shows loading state while model loads into VRAM
    if (modelId.startsWith('ollama:')) {
      // Extract model name (e.g., "ollama:deepseek-r1:14b" -> "deepseek-r1:14b")
      const modelName = modelId.replace('ollama:', '');

      // Set loading state - pulse starts
      setModelLoadingState('loading');

      try {
        await api.warmupOllama(modelName);
        // Stop pulsing when loaded
        setModelLoadingState('idle');
      } catch {
        // Stop pulsing on error too
        setModelLoadingState('idle');
      }
    } else {
      // Cloud models don't need warmup - always ready
      setModelLoadingState('idle');
    }
  }, [setSelectedModel, setModelLoadingState]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || isLoading || disabled) return;
    const files = attachments.map(a => a.file);
    onSubmit(value.trim(), files.length > 0 ? files : undefined);
    setAttachments([]);
  }, [value, isLoading, disabled, attachments, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Disable submit while model is loading (for Ollama models)
  const isModelLoading = modelLoadingState === 'loading';
  const canSubmit = value.trim() && !isLoading && !disabled && !isModelLoading;

  // Get display name for current model
  const getModelDisplayName = (modelId: string): string => {
    // Check accessible models first (both direct and ollama: prefixed)
    const normalizedId = modelId.startsWith('ollama:') ? modelId.replace('ollama:', '') : modelId;
    const model = accessibleModels.find(m => m.id === modelId || m.id === normalizedId);
    if (model) return model.name;

    // Handle ollama models (format: "ollama:modelname") - format nicely
    if (modelId.startsWith('ollama:')) {
      const ollamaModel = modelId.replace('ollama:', '');
      return ollamaModel
        .replace(/:latest$/, '')
        .split(/[-:]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    // Fallback to first accessible model or generic name
    return accessibleModels[0]?.name || 'Select Model';
  };

  const currentModelName = getModelDisplayName(selectedModel);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,.docx,.csv,.xlsx"
        multiple
        className="hidden"
      />

      {/* Main container - uses arc theme colors */}
      <div className="bg-arc-bg-tertiary border border-arc-border rounded-2xl">
        <AttachmentPreview attachments={attachments} onRemove={(id) => setAttachments(prev => prev.filter(a => a.id !== id))} />

        {/* Text area */}
        <div className="px-4 pt-4 pb-3">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full bg-transparent focus:outline-none text-base text-arc-text-primary placeholder-arc-text-dim resize-none"
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* Left icons */}
          <div className="flex items-center gap-1">
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-arc-text-secondary hover:text-arc-text-primary rounded-lg hover:bg-arc-bg-secondary transition-colors"
              title="Attach files"
            >
              <PlusIcon />
            </button>

            {/* Tools menu */}
            <div className="relative">
              <button
                ref={toolsButtonRef}
                type="button"
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                className="p-2 text-arc-text-secondary hover:text-arc-text-primary rounded-lg hover:bg-arc-bg-secondary transition-colors"
                title="Tools"
              >
                <SlidersIcon />
              </button>
              <ToolsMenu
                isOpen={toolsMenuOpen}
                onClose={() => setToolsMenuOpen(false)}
                currentStyle={currentStyle}
                styles={styles}
                onStyleChange={handleStyleChange}
                buttonRef={toolsButtonRef}
              />
            </div>

            {/* Memory toggle - brain icon, blue when enabled */}
            <button
              type="button"
              onClick={() => setMemoryEnabled(!memoryEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                memoryEnabled
                  ? 'text-arc-accent bg-arc-accent/10'
                  : 'text-arc-text-secondary hover:text-arc-text-primary hover:bg-arc-bg-secondary'
              }`}
              title={memoryEnabled ? 'Memory on' : 'Memory off'}
            >
              <BrainIcon />
            </button>
          </div>

          {/* Right side: Model selector + Send */}
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className={`flex items-center gap-1 px-2 py-2 text-xs text-arc-text-secondary hover:text-arc-text-primary transition-colors rounded-lg ${
                  isModelLoading ? 'model-selector-loading' : ''
                }`}
                title={isModelLoading ? 'Loading model...' : 'Select model'}
              >
                <span>{currentModelName}</span>
                <ChevronIcon direction="down" />
              </button>
              <ModelSelector
                isOpen={modelMenuOpen}
                onClose={() => setModelMenuOpen(false)}
                currentModel={selectedModel}
                onModelChange={handleModelChange}
                accessibleModels={accessibleModels}
                isLoading={modelsLoading}
              />
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="p-2 bg-arc-accent text-arc-bg-primary rounded-lg enabled:hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={isModelLoading ? 'Loading model...' : 'Send'}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Attachment, ChatInputAreaProps };
