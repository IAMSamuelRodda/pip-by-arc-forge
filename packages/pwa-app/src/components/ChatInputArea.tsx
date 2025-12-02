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
  description: string;
  provider: 'anthropic' | 'ollama';
}

// Available models
const MODELS: ModelOption[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4.5', description: 'Smartest for everyday tasks', provider: 'anthropic' },
  { id: 'claude-opus-4-20250514', name: 'Opus 4.5', description: 'Most capable for complex work', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Haiku 3.5', description: 'Fastest for quick answers', provider: 'anthropic' },
];

const MORE_MODELS: ModelOption[] = [
  { id: 'claude-opus-4-20250514', name: 'Opus 4', description: '', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', description: '', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Opus 3', description: '', provider: 'anthropic' },
  { id: 'ollama-local', name: 'Ollama (Local)', description: 'Local GPU', provider: 'ollama' },
];

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
  xeroConnected?: boolean;
}

function ToolsMenu({ isOpen, onClose, currentStyle, styles, onStyleChange, xeroConnected = false }: ToolsMenuProps) {
  const [showStyleSubmenu, setShowStyleSubmenu] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 w-48 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-20">
        <div className="py-1">
          {/* Style selector */}
          <div className="relative">
            <button
              onClick={() => setShowStyleSubmenu(!showStyleSubmenu)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
            >
              <span>Style</span>
              <div className="flex items-center gap-1 text-arc-text-secondary">
                <span className="text-xs">{styles.find(s => s.id === currentStyle)?.name || 'Normal'}</span>
                <ChevronIcon direction="right" />
              </div>
            </button>
            {showStyleSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-32 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl">
                <div className="py-1">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => { onStyleChange(style.id); setShowStyleSubmenu(false); onClose(); }}
                      title={style.description}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
                    >
                      <span>{style.name}</span>
                      {currentStyle === style.id && <CheckIcon />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-arc-border my-1" />

          {/* Xero status */}
          <div className="flex items-center justify-between px-3 py-1.5 text-sm">
            <div className="flex items-center gap-2 text-arc-text-primary">
              <span className="w-2 h-2 rounded-full bg-[#13B5EA]" />
              <span>Xero</span>
            </div>
            <span className={`text-xs ${xeroConnected ? 'text-arc-accent' : 'text-arc-text-dim'}`}>
              {xeroConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="border-t border-arc-border my-1" />

          <a href="/settings" className="block px-3 py-1.5 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary transition-colors">
            Settings
          </a>
        </div>
      </div>
    </>
  );
}

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

function ModelSelector({ isOpen, onClose, currentModel, onModelChange }: ModelSelectorProps) {
  const [showMoreModels, setShowMoreModels] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full right-0 mb-2 w-56 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl z-20">
        <div className="py-1">
          {/* Main models */}
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => { onModelChange(model.id); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-arc-bg-tertiary transition-colors"
            >
              <div className="text-left">
                <div className="text-arc-text-primary font-medium">{model.name}</div>
                <div className="text-xs text-arc-text-dim">{model.description}</div>
              </div>
              {currentModel === model.id && <CheckIcon />}
            </button>
          ))}

          <div className="border-t border-arc-border my-1" />

          {/* More models */}
          <div className="relative">
            <button
              onClick={() => setShowMoreModels(!showMoreModels)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-arc-text-secondary hover:bg-arc-bg-tertiary transition-colors"
            >
              <span>More models</span>
              <ChevronIcon direction="right" />
            </button>
            {showMoreModels && (
              <div className="absolute left-full top-0 ml-1 w-40 bg-arc-bg-secondary border border-arc-border rounded-lg shadow-xl">
                <div className="py-1">
                  {MORE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { onModelChange(model.id); setShowMoreModels(false); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-arc-text-primary hover:bg-arc-bg-tertiary transition-colors"
                    >
                      <span>{model.name}</span>
                      {currentModel === model.id && <CheckIcon />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [currentModel, setCurrentModel] = useState('claude-sonnet-4-20250514');
  const [styles, setStyles] = useState<ResponseStyleOption[]>([]);
  const [currentStyle, setCurrentStyle] = useState<ResponseStyleId>('normal');
  const [xeroConnected, setXeroConnected] = useState(false);

  // Load settings
  useEffect(() => {
    api.getStyles().then(({ styles }) => setStyles(styles)).catch(console.error);
    api.getSettings().then(({ settings }) => setCurrentStyle(settings.responseStyle)).catch(console.error);
    api.getAuthStatus().then((status) => setXeroConnected(status.connected)).catch(console.error);
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

  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId);
    // TODO: Wire to backend when model selection API is added
    console.log('Model changed to:', modelId);
  }, []);

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

  const canSubmit = value.trim() && !isLoading && !disabled;

  // Get display name for current model
  const currentModelData = [...MODELS, ...MORE_MODELS].find(m => m.id === currentModel) || MODELS[0];

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
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full bg-transparent focus:outline-none text-sm text-arc-text-primary placeholder-arc-text-dim resize-none"
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
                xeroConnected={xeroConnected}
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
              title={`Memory ${memoryEnabled ? 'enabled' : 'disabled'} - Uses stored knowledge about you`}
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
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-arc-text-secondary hover:text-arc-text-primary transition-colors"
                title="Select model"
              >
                <span>{currentModelData.name}</span>
                <ChevronIcon direction="down" />
              </button>
              <ModelSelector
                isOpen={modelMenuOpen}
                onClose={() => setModelMenuOpen(false)}
                currentModel={currentModel}
                onModelChange={handleModelChange}
              />
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="p-2 bg-arc-accent text-arc-bg-primary rounded-lg hover:bg-arc-accent-dim disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Send"
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
