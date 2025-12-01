# PWA Model Selector Design

> **Spike**: Multi-Model LLM Architecture Research (spike_m2_004)
> **Created**: 2025-12-01
> **Purpose**: UI/UX design for model switching in Pip PWA

## Design Goals

1. **Simple** - One-click model switching, not buried in settings
2. **Informative** - Show relevant model metadata (speed, cost tier)
3. **Non-disruptive** - Switching doesn't lose conversation context
4. **Familiar** - Similar to ChatGPT/Claude.ai model dropdowns

---

## Component Design

### Location

Model selector appears in the **input footer**, next to the send button. This mirrors ChatGPT's placement and keeps it accessible during conversation.

```
┌─────────────────────────────────────────────────┐
│ Header: Pip logo | docs | Xero | User | Settings│
├─────────────────────────────────────────────────┤
│                                                 │
│                 Messages Area                   │
│                                                 │
├─────────────────────────────────────────────────┤
│ > [Input field...          ] [Model ▼] [Send]  │
└─────────────────────────────────────────────────┘
```

### Dropdown States

**Collapsed** (default):
```
┌─────────────────┐
│ Sonnet 4 ▼      │
└─────────────────┘
```

**Expanded**:
```
┌───────────────────────────────┐
│ ● Claude Sonnet 4    ★ best   │
│   Claude Haiku       ⚡ fast  │
│   GPT-4o             ○ alt    │
│ ─────────────────────────────│
│   Local (Ollama)     🏠 free  │
│     └ DeepSeek 33B            │
│     └ Llama 3.1               │
└───────────────────────────────┘
```

---

## React Component Mockup

```tsx
// components/ModelSelector.tsx

import { useState, useRef, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  shortName: string;
  provider: 'anthropic' | 'openai' | 'ollama';
  tier: 'premium' | 'fast' | 'local';
  available: boolean;
  badge?: string;
}

const MODELS: Model[] = [
  { id: 'claude-sonnet', name: 'Claude Sonnet 4', shortName: 'Sonnet 4', provider: 'anthropic', tier: 'premium', available: true, badge: 'best' },
  { id: 'claude-haiku', name: 'Claude 3.5 Haiku', shortName: 'Haiku', provider: 'anthropic', tier: 'fast', available: true, badge: 'fast' },
  { id: 'gpt-4o', name: 'GPT-4o', shortName: 'GPT-4o', provider: 'openai', tier: 'premium', available: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', shortName: 'GPT Mini', provider: 'openai', tier: 'fast', available: true, badge: 'cheap' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder 33B', shortName: 'DeepSeek', provider: 'ollama', tier: 'local', available: true, badge: 'local' },
  { id: 'llama-3.1', name: 'Llama 3.1 8B', shortName: 'Llama', provider: 'ollama', tier: 'local', available: false },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'best': return 'text-yellow-400';
      case 'fast': return 'text-blue-400';
      case 'cheap': return 'text-green-400';
      case 'local': return 'text-purple-400';
      default: return 'text-arc-text-dim';
    }
  };

  const cloudModels = MODELS.filter(m => m.provider !== 'ollama');
  const localModels = MODELS.filter(m => m.provider === 'ollama');

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
          isOpen
            ? 'bg-arc-bg-primary border-arc-accent'
            : 'border-arc-border hover:border-arc-accent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="text-sm text-arc-text-primary">{selected.shortName}</span>
        <svg
          className={`w-3 h-3 text-arc-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-arc-bg-secondary border border-arc-border rounded-xl shadow-lg overflow-hidden z-50">
          {/* Cloud Models */}
          <div className="p-2">
            <div className="text-xs text-arc-text-dim px-2 py-1 uppercase tracking-wide">Cloud</div>
            {cloudModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                disabled={!model.available}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  model.id === selectedModel
                    ? 'bg-arc-accent/20 text-arc-accent'
                    : model.available
                      ? 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                      : 'opacity-50 cursor-not-allowed text-arc-text-dim'
                }`}
              >
                <div className="flex items-center gap-2">
                  {model.id === selectedModel && (
                    <span className="w-2 h-2 bg-arc-accent rounded-full" />
                  )}
                  <span className="text-sm">{model.name}</span>
                </div>
                {model.badge && (
                  <span className={`text-xs ${getBadgeColor(model.badge)}`}>
                    {model.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-arc-border" />

          {/* Local Models */}
          <div className="p-2">
            <div className="text-xs text-arc-text-dim px-2 py-1 uppercase tracking-wide">
              Local (Ollama)
            </div>
            {localModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  if (model.available) {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }
                }}
                disabled={!model.available}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  model.id === selectedModel
                    ? 'bg-arc-accent/20 text-arc-accent'
                    : model.available
                      ? 'hover:bg-arc-bg-tertiary text-arc-text-primary'
                      : 'opacity-50 cursor-not-allowed text-arc-text-dim'
                }`}
              >
                <div className="flex items-center gap-2">
                  {model.id === selectedModel && (
                    <span className="w-2 h-2 bg-arc-accent rounded-full" />
                  )}
                  <span className="text-sm">{model.name}</span>
                  {!model.available && (
                    <span className="text-xs text-arc-text-dim">(offline)</span>
                  )}
                </div>
                {model.badge && model.available && (
                  <span className={`text-xs ${getBadgeColor(model.badge)}`}>
                    {model.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## State Management Approach

### Option A: Context + Local Storage (Recommended)

```tsx
// store/modelStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModelState {
  selectedModel: string;
  availableModels: string[];
  setModel: (modelId: string) => void;
  setAvailableModels: (models: string[]) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: 'claude-sonnet', // default
      availableModels: [],
      setModel: (modelId) => set({ selectedModel: modelId }),
      setAvailableModels: (models) => set({ availableModels: models }),
    }),
    {
      name: 'pip-model-preference',
    }
  )
);
```

### Why Context + Local Storage?

1. **Persists across sessions** - User preference remembered
2. **Simple** - No backend changes needed for preference storage
3. **Consistent with chatStore** - Same pattern used for messages
4. **Fast** - No API call to retrieve preference

---

## Integration Points

### 1. ChatPage Footer Modification

```tsx
// In ChatPage.tsx footer section

<footer className="bg-arc-bg-secondary border-t border-arc-border">
  <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
    <div className="flex gap-3 items-center bg-arc-bg-tertiary border border-arc-border rounded-xl px-3 py-2 focus-within:border-arc-accent transition-colors">
      <span className="text-arc-text-dim text-sm">{'>'}</span>
      <input ... />

      {/* NEW: Model Selector */}
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        disabled={isLoading}
      />

      <button type="submit" ...>Send</button>
    </div>
  </form>
</footer>
```

### 2. API Client Modification

```tsx
// In api/client.ts

export async function sendMessage(
  content: string,
  model?: string  // NEW: optional model override
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      content,
      model: model || undefined,  // Pass to backend
    }),
  });
  // ...
}
```

### 3. Server Route Modification

```ts
// In server/routes/chat.ts

router.post('/chat', async (req, res) => {
  const { content, model } = req.body;

  // Route to LiteLLM with model selection
  const response = await litellm.chat({
    model: model || 'claude-sonnet',  // Default to Sonnet
    messages: [{ role: 'user', content }],
  });

  // ...
});
```

---

## Model Availability Detection

### Approach: Periodic Health Check

```tsx
// hooks/useModelAvailability.ts

import { useEffect } from 'react';
import { useModelStore } from '../store/modelStore';
import { api } from '../api/client';

export function useModelAvailability() {
  const setAvailableModels = useModelStore(s => s.setAvailableModels);

  useEffect(() => {
    const checkModels = async () => {
      try {
        // GET /api/models returns available models from LiteLLM
        const { models } = await api.getAvailableModels();
        setAvailableModels(models);
      } catch (err) {
        console.error('Failed to check model availability:', err);
      }
    };

    checkModels();

    // Re-check every 5 minutes (handles Ollama coming online/offline)
    const interval = setInterval(checkModels, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [setAvailableModels]);
}
```

### Server Endpoint

```ts
// GET /api/models

router.get('/models', async (req, res) => {
  // Query LiteLLM for available models
  const models = await litellm.listModels();

  // Filter to configured models and check health
  const available = await Promise.all(
    models.map(async (model) => {
      try {
        // Quick health check (no actual generation)
        await litellm.models.retrieve(model.id);
        return { ...model, available: true };
      } catch {
        return { ...model, available: false };
      }
    })
  );

  res.json({ models: available });
});
```

---

## Mid-Conversation Model Switching

### Behavior

1. **Allowed** - User can switch models at any time
2. **No context loss** - Messages stay in conversation
3. **Visual indicator** - Show which model generated each response
4. **No automatic re-generation** - Previous responses stay as-is

### Message Metadata

```tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;  // NEW: Track which model generated this
}
```

### Visual Indicator (Optional)

```tsx
// In message bubble, show model badge for assistant messages

{message.role === 'assistant' && message.model && (
  <span className="text-xs text-arc-text-dim ml-2">
    via {getModelShortName(message.model)}
  </span>
)}
```

---

## Mobile Responsiveness

### Collapsed View (< 640px)

On mobile, show only the model icon/initial:

```tsx
<button className="...">
  <span className="hidden sm:inline">{selected.shortName}</span>
  <span className="sm:hidden">{selected.shortName[0]}</span>
  <svg ... />
</button>
```

### Full-Screen Dropdown (< 640px)

On mobile, dropdown becomes bottom sheet:

```tsx
{isOpen && (
  <div className={`
    absolute z-50
    sm:bottom-full sm:mb-2 sm:right-0 sm:w-64 sm:rounded-xl
    max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-xl
    bg-arc-bg-secondary border border-arc-border shadow-lg
  `}>
    {/* ... */}
  </div>
)}
```

---

## Implementation Checklist

When implementing (post-spike):

- [ ] Create `ModelSelector` component
- [ ] Create `modelStore` with Zustand
- [ ] Add model field to message type
- [ ] Update API client to pass model parameter
- [ ] Create GET /api/models endpoint
- [ ] Update chat route to accept model parameter
- [ ] Connect LiteLLM proxy to chat route
- [ ] Add model availability polling
- [ ] Test with all configured models
- [ ] Mobile responsive testing

---

## Open Questions (For Implementation)

1. **Warm-up strategy** - How to pre-warm local Ollama models? (see issue_017)
2. **Cost display** - Should we show estimated cost per message?
3. **Rate limiting** - Different limits per model tier?
4. **Fallback behavior** - Auto-switch to backup model on failure?
5. **Conversation export** - Include model metadata in exports?
