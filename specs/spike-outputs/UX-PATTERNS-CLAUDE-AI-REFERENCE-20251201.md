# UX Patterns Reference: Claude.ai Interface

> **Purpose**: Document Claude.ai UI/UX patterns to model Pip's PWA after
> **Created**: 2025-12-01
> **Source**: Screenshots from Claude.ai desktop interface

## Design Philosophy

Claude.ai uses a **minimal, contextual controls** approach:
- No cluttered headers with buttons
- Tools and settings appear contextually near the input
- Tooltips provide discoverability without visual noise
- Attachments preview inline with easy dismiss
- **Collapsible sidebar** for navigation (chats, projects) - maximizes chat area

---

## Pattern 0: Collapsible Left Sidebar

**Purpose**: Navigation and chat history without cluttering the main chat area

### Expanded State

```
┌──────────────────────┬─────────────────────────────────────┐
│ [≡] Claude           │  Test ▼                      Share  │
│                      │                                     │
│ [+] New chat         │  ┌─────────────────────────────┐   │
│                      │  │ SR  test                    │   │
│ 💬 Chats             │  └─────────────────────────────┘   │
│ 📁 Projects          │                                     │
│ ✨ Artifacts         │  Thinking about interpreting...  ▼  │
│ </> Code             │                                     │
│                      │  Hey Samuel! All systems go...      │
│ ─────────────────── │                                     │
│ Starred              │                                     │
│   Comprehensive or.. │                                     │
│   Rapid ai agent...  │                                     │
│                      │                                     │
│ Recents              │                                     │
│   Test            ⋯  │  ← hover shows menu                 │
│   Storing and ret... │                                     │
│   Financial repor... │                                     │
│   Setting financi... │                                     │
│   (more chats...)    │                                     │
│                      │                                     │
│ ─────────────────── │                                     │
│ 👤 Samuel Rodda   ▼  │  [+] [≡] [⟲]    Opus 4.5 ▼   [↑]  │
└──────────────────────┴─────────────────────────────────────┘
        ~250px                      Remaining width
```

### Collapsed State

```
┌────┬──────────────────────────────────────────────────────┐
│ [≡]│  Test ▼                                       Share  │
│    │                                                      │
│ [+]│  ┌─────────────────────────────────────────────┐    │
│ 💬 │  │ SR  test                                    │    │
│ 📁 │  └─────────────────────────────────────────────┘    │
│ ✨ │                                                      │
│ </>│  Thinking about interpreting a minimal test...  ▼   │
│    │                                                      │
│    │  Hey Samuel! All systems go. What can I help...     │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│    │                                                      │
│ 👤 │  [+] [≡] [⟲]                      Opus 4.5 ▼   [↑]  │
└────┴──────────────────────────────────────────────────────┘
 ~48px                    Maximized chat area
```

### Key Elements

| Element | Expanded | Collapsed |
|---------|----------|-----------|
| Toggle button | Top of sidebar `[≡]` | Same position |
| New chat | `[+] New chat` with label | Just `[+]` icon |
| Navigation | Icons + labels | Icons only |
| Chat history | Full list with titles | Hidden (access via Chats icon) |
| User profile | Avatar + name + dropdown | Just avatar |

### Sidebar Sections

| Section | Purpose |
|---------|---------|
| **New chat** | Start fresh conversation |
| **Chats** | Access all chat history |
| **Projects** | Isolated context workspaces |
| **Artifacts** | Generated code/content |
| **Code** | Code-specific view |
| **Starred** | Pinned important chats |
| **Recents** | Recent chat history |

### Chat List Item

```tsx
function ChatListItem({ chat, isActive }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
        isActive ? 'bg-arc-bg-tertiary' : 'hover:bg-arc-bg-secondary'
      }`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <span className="text-sm text-arc-text-primary truncate">
        {chat.title}
      </span>

      {/* Menu appears on hover */}
      {showMenu && (
        <button className="text-arc-text-dim hover:text-arc-text-secondary">
          ⋯
        </button>
      )}
    </div>
  );
}
```

### Implementation Notes

```tsx
function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`
      flex flex-col h-screen bg-arc-bg-secondary border-r border-arc-border
      transition-all duration-200
      ${collapsed ? 'w-12' : 'w-64'}
    `}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 hover:bg-arc-bg-tertiary"
      >
        <SidebarIcon />
      </button>

      {/* New chat */}
      <button className="flex items-center gap-2 mx-2 p-2 rounded-lg bg-arc-accent text-arc-bg-primary">
        <PlusIcon />
        {!collapsed && <span>New chat</span>}
      </button>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        <NavItem icon={ChatIcon} label="Chats" collapsed={collapsed} />
        <NavItem icon={FolderIcon} label="Projects" collapsed={collapsed} />
        {/* ... */}
      </nav>

      {/* Chat history (expanded only) */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <ChatHistoryList />
        </div>
      )}

      {/* User profile */}
      <UserProfile collapsed={collapsed} />
    </aside>
  );
}
```

### Pip Sidebar Sections

For Pip, adapt to our features:

| Claude.ai | Pip Equivalent |
|-----------|----------------|
| New chat | New chat |
| Chats | Chats (history) |
| Projects | Projects (multi-Xero org) |
| Artifacts | Documents (uploaded context) |
| Code | - (not applicable) |
| Starred | Starred chats |
| Recents | Recent chats |

---

## Pattern 0.5: User Profile Menu (Account Settings)

**Purpose**: Account-level settings accessed via user avatar at bottom of sidebar

### Visual Layout

```
┌─────────────────────────────┐
│ samuelrodda@gmail.com       │  ← Email display (non-clickable)
│                             │
│ ⚙️ Settings        ⇧+Ctrl+, │  ← Keyboard shortcut shown
│ 🌐 Language             →   │  ← Submenu indicator
│ ❓ Get help                 │
│ ─────────────────────────── │
│ ≡ View all plans            │  ← Subscription/billing
│ ℹ️ Learn more           →   │
│ ─────────────────────────── │
│ ⎋ Log out                   │
└─────────────────────────────┘
        ▲
        │
┌───────┴───────┐
│  SR           │  ← Avatar with initials (auto-generated)
│  Samuel Ro... │
└───────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **Avatar** | User initials (SR), future: custom image/logo |
| **Email** | Shown at top for account identification |
| **Settings** | Opens full settings page (permission levels, personality) |
| **Language** | Submenu for language selection |
| **Get help** | Support/documentation link |
| **Plans** | Subscription/billing info |
| **Log out** | Session termination |

### Avatar Generation

```tsx
function UserAvatar({ user, size = 'md' }: Props) {
  // Generate initials from name or email
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      rounded-full bg-arc-bg-tertiary border border-arc-border
      flex items-center justify-center
      text-arc-text-primary font-medium
    `}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} className="w-full h-full rounded-full" />
      ) : (
        initials
      )}
    </div>
  );
}
```

### Profile Menu Implementation

```tsx
function UserProfileMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-2 w-full hover:bg-arc-bg-tertiary rounded-lg"
      >
        <UserAvatar user={user} />
        <span className="text-sm text-arc-text-primary truncate">
          {user.name || user.email.split('@')[0]}
        </span>
        <ChevronIcon className="ml-auto text-arc-text-dim" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-arc-bg-secondary border border-arc-border rounded-xl shadow-lg">
          {/* Email header */}
          <div className="px-4 py-3 border-b border-arc-border">
            <span className="text-sm text-arc-text-secondary">{user.email}</span>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <MenuItem icon={SettingsIcon} label="Settings" shortcut="⇧+Ctrl+," href="/settings" />
            <MenuItem icon={GlobeIcon} label="Language" hasSubmenu />
            <MenuItem icon={HelpIcon} label="Get help" href="/help" />
          </div>

          <div className="border-t border-arc-border p-2">
            <MenuItem icon={PlansIcon} label="View all plans" href="/plans" />
            <MenuItem icon={InfoIcon} label="Learn more" hasSubmenu />
          </div>

          <div className="border-t border-arc-border p-2">
            <MenuItem icon={LogoutIcon} label="Log out" onClick={logout} />
          </div>
        </div>
      )}
    </div>
  );
}
```

### Pip Profile Menu

For Pip, adapt menu items:

| Claude.ai | Pip Equivalent |
|-----------|----------------|
| Settings | Settings (permissions, personality, Xero) |
| Language | Language (future) |
| Get help | Help / Documentation |
| View all plans | - (single tier for now) |
| Learn more | About Pip |
| Log out | Log out |

### Settings Distinction

**Important**: Two types of "settings" exist:

| Type | Access Point | Contains |
|------|--------------|----------|
| **Chat settings** | Footer `≡` icon | Model, tools, toggles |
| **Account settings** | Profile menu → Settings | Permissions, personality, Xero connection, email prefs |

---

## Pattern 0.6: Full Settings Page (Account Settings)

**Purpose**: Comprehensive account configuration accessed via Profile Menu → Settings

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ Settings                                                     [X]    │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│  General  ◄──│  Profile                                             │
│  Account     │  ┌────┬─────────────────┐  ┌─────────────────────┐   │
│  Privacy     │  │ SR │ Samuel Rodda    │  │ What should Pip     │   │
│  Billing     │  └────┴─────────────────┘  │ call you? [Samuel]  │   │
│  Usage       │                            └─────────────────────┘   │
│  Capabilities│  What best describes your work?                      │
│  Connectors  │  ┌─────────────────────────────────────────────┐     │
│  Claude Code │  │ Engineering                              ▼  │     │
│              │  └─────────────────────────────────────────────┘     │
│              │                                                      │
│              │  What personal preferences should Pip consider?      │
│              │  ┌─────────────────────────────────────────────┐     │
│              │  │ I am an ai coding developer.                │     │
│              │  │                                             │     │
│              │  └─────────────────────────────────────────────┘     │
│              │                                                      │
│              │  ─────────────────────────────────────────────────   │
│              │                                                      │
│              │  Notifications                                       │
│              │                                                      │
│              │  Response completions                        [○]     │
│              │  Get notified when Pip has finished...               │
│              │                                                      │
│              │  Email summaries                             [●]     │
│              │  Get email when Pip needs your attention...          │
│              │                                                      │
│              │  ─────────────────────────────────────────────────   │
│              │                                                      │
│              │  Appearance                                          │
│              │                                                      │
│              │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│              │  │  Light  │  │  Match  │  │  Dark   │               │
│              │  │ preview │  │ preview │  │ preview │               │
│              │  └─────────┘  └────✓────┘  └─────────┘               │
│              │     Light      Match sys      Dark                   │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Settings Navigation Tabs

| Tab | Claude.ai | Pip Equivalent |
|-----|-----------|----------------|
| **General** | Profile, notifications, appearance | Same |
| **Account** | Email, password, delete | Same |
| **Privacy** | Data handling, memory settings | Memory settings |
| **Billing** | Subscription, payment | - (free beta) |
| **Usage** | Token usage, limits | - (future) |
| **Capabilities** | Feature toggles | Permission levels |
| **Connectors** | MCP connections | Xero connection |
| **Claude Code** | CLI settings | - (not applicable) |

### Key Personalization Features

#### 1. "What should [Assistant] call you?"
Separate from full name - allows nickname/preferred name:
```tsx
<div>
  <label>What should Pip call you?</label>
  <input
    value={preferredName}
    onChange={(e) => setPreferredName(e.target.value)}
    placeholder="Your preferred name"
  />
</div>
```

#### 2. Work Context Dropdown
Helps assistant understand user's domain:
```tsx
const WORK_CONTEXTS = [
  'Engineering',
  'Small Business Owner',
  'Freelancer/Contractor',
  'Accountant/Bookkeeper',
  'Finance/CFO',
  'Operations',
  'Other',
];

<select value={workContext} onChange={...}>
  {WORK_CONTEXTS.map(ctx => <option key={ctx}>{ctx}</option>)}
</select>
```

#### 3. Personal Preferences Textarea
Free-form customization (like a user-defined system prompt):
```tsx
<div>
  <label>What personal preferences should Pip consider?</label>
  <p className="text-xs text-arc-text-dim">
    Your preferences will apply to all conversations.
  </p>
  <textarea
    value={preferences}
    onChange={(e) => setPreferences(e.target.value)}
    placeholder="e.g., I prefer concise responses, I'm Australian so use AUD..."
    rows={3}
  />
</div>
```

#### 4. Theme Selection with Visual Previews
```tsx
const THEMES = [
  { id: 'light', label: 'Light', preview: '/previews/light.png' },
  { id: 'system', label: 'Match system', preview: '/previews/system.png' },
  { id: 'dark', label: 'Dark', preview: '/previews/dark.png' },
];

function ThemeSelector({ value, onChange }) {
  return (
    <div className="flex gap-4">
      {THEMES.map(theme => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          className={`flex flex-col items-center gap-2 ${
            value === theme.id ? 'ring-2 ring-arc-accent' : ''
          }`}
        >
          <div className="w-32 h-20 rounded-lg overflow-hidden border border-arc-border">
            <img src={theme.preview} alt={theme.label} />
          </div>
          <span className="text-sm">{theme.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### Pip Settings Page Structure

**Phase 1 (MVP):**
- General: Profile (name, preferred name), Personality selector
- Capabilities: Permission levels (existing)
- Connectors: Xero connection status

**Phase 2:**
- General: + Work context, personal preferences, notifications
- Appearance: Theme selector (issue_016)
- Privacy: Memory settings

**Phase 3:**
- Usage: API usage tracking
- Billing: If subscription model added

---

## Pattern 0.7: Two-Tier Memory Management

**Purpose**: Separate system-generated memory from user-requested memory edits

### Claude.ai Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Manage memory                                         [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Here's what Claude remembers about you! This summary is     │
│ regenerated each night and does not include projects,       │
│ which have their own specific memory.                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Samuel has been working on web development projects,    │ │
│ │ implementing complex CSS animations, JavaScript         │ │
│ │ navigation, and booking systems with deposit            │ │
│ │ requirements. He explored AWS services setup...         │ │
│ │                                                         │ │
│ │ Long-term background                                    │ │
│ │ Samuel has demonstrated consistent interest in system   │ │
│ │ optimization, development tooling, and business         │ │
│ │ automation...                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [📎]                                                        │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Manage edits                                     2  → │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### "Manage edits" Sub-view

```
┌─────────────────────────────────────────────────────────────┐
│ Manage edits                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Here's what Claude remembers about you! This summary is     │
│ regenerated each night and does not include projects.       │
│                                                             │
│ ← Back to memory                          Clear edits ↺     │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ User prefers to handle invoices on Mondays      🗑️ │     │
│ └─────────────────────────────────────────────────────┘     │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ User prefers financial reports on Fridays       🗑️ │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Architecture: Single Memory with Tracked Edits

**Key insight**: It's ONE unified memory system, not two separate stores.

| Aspect | Description |
|--------|-------------|
| **Primary engine** | Automatic - LLM extracts relevant info using memory tools |
| **User edits** | Explicit requests tracked separately for easy removal |
| **Storage** | Same memory store, edits just have a flag |

### The Flow

1. **Automatic extraction** (primary): LLM naturally uses memory tools during conversation
2. **User explicit request**: "Remember that I prefer invoices on Mondays" → flagged as "edit"
3. **Manage edits**: User can view and remove their explicit requests without affecting auto-extracted memory

### Inline Edit Feature

Claude.ai has an input field inside the memory view:

```
┌─────────────────────────────────────────────────────────────┐
│ ...workflow preferences including handling invoices on      │
│ Mondays and receiving financial reports on Fridays.         │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ Tell Claude what to remember or forget...        → │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
│ Samuel is actively working on multiple technical projects...│
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Manage edits                                     2  → │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

This allows users to:
- Read what the assistant knows
- Directly add/modify memory inline
- Manage their explicit edits separately

### Current Pip Memory Architecture

**What we have:**
- Knowledge Graph (entities, relations, observations)
- 9 MCP tools for CRUD
- User/project isolation
- LLM automatically uses memory tools ✓

**What we need to add:**

#### 1. Edit Flag for Observations

```sql
-- Track which observations came from explicit user requests
ALTER TABLE memory_observations ADD COLUMN is_user_edit BOOLEAN DEFAULT FALSE;
```

#### 2. Memory Summary Generation

```sql
-- Cache generated summaries (regenerated periodically)
CREATE TABLE memory_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  summary TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  UNIQUE(user_id, project_id)
);
```

#### 3. API Endpoints

```typescript
// GET /api/memory - Get summary + edit count
interface MemoryResponse {
  summary: string;           // Prose summary of all memory
  generatedAt: number;
  editCount: number;         // Count of user explicit edits
}

// POST /api/memory/edit - Add explicit edit (from inline input)
interface AddEditRequest {
  content: string;  // "Remember that I prefer X" or "Forget that Y"
}

// GET /api/memory/edits - List user's explicit edits
// DELETE /api/memory/edits/:id - Remove specific edit
// DELETE /api/memory/edits - Clear all user edits
```

#### 4. Tool Enhancement

```typescript
// add_observations tool gets optional flag
{
  name: "add_observations",
  inputSchema: {
    properties: {
      // ... existing
      isUserEdit: {
        type: "boolean",
        default: false,
        description: "True if this is an explicit user request to remember something"
      }
    }
  }
}
```

### Detection: When to Flag as User Edit

**Explicit requests** (flag `isUserEdit: true`):
- "Remember that..."
- "Always remember..."
- "Don't forget that..."
- "Note that I prefer..."
- "Forget that..." (triggers delete)
- Using inline "Tell Pip what to remember or forget..." input

**Automatic extraction** (default, no flag):
- LLM naturally calls memory tools during conversation
- Background fact extraction
- Context building

### Summary Regeneration (Nightly Job)

```typescript
// Background job (cron or scheduled task)
async function regenerateMemorySummaries() {
  const users = await getAllUsersWithMemory();

  for (const userId of users) {
    const graph = memoryManager.readGraph();

    // Use LLM to generate prose summary
    const summary = await llm.generateMemorySummary(graph);

    await db.upsertMemorySummary({
      userId,
      summary,
      generatedAt: Date.now(),
    });
  }
}
```

### UI Components

```tsx
// Memory management modal
function ManageMemoryModal({ isOpen, onClose }) {
  const [view, setView] = useState<'summary' | 'edits'>('summary');
  const { summary, editCount } = useMemory();
  const { edits, deleteEdit, clearEdits } = useMemoryEdits();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Manage memory</h2>
      <p className="text-sm text-arc-text-dim">
        Here's what Pip remembers about you! This summary is
        regenerated each night.
      </p>

      {view === 'summary' ? (
        <>
          {/* Prose summary */}
          <div className="bg-arc-bg-tertiary rounded-lg p-4 mt-4">
            <p className="text-arc-text-primary whitespace-pre-wrap">
              {summary}
            </p>
          </div>

          {/* Manage edits button */}
          <button
            onClick={() => setView('edits')}
            className="mt-4 flex items-center justify-between w-full p-3 bg-arc-bg-secondary rounded-lg"
          >
            <span>Manage edits</span>
            <span className="flex items-center gap-2">
              <span className="text-arc-text-dim">{editCount}</span>
              <ChevronRightIcon />
            </span>
          </button>
        </>
      ) : (
        <>
          {/* Back to summary */}
          <div className="flex justify-between mt-4">
            <button onClick={() => setView('summary')}>
              ← Back to memory
            </button>
            <button onClick={clearEdits}>
              Clear edits ↺
            </button>
          </div>

          {/* Edit list */}
          <div className="mt-4 space-y-2">
            {edits.map(edit => (
              <div
                key={edit.id}
                className="flex items-center justify-between p-3 bg-arc-bg-tertiary rounded-lg"
              >
                <span>{edit.content}</span>
                <button onClick={() => deleteEdit(edit.id)}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
```

### Access Points

| Location | Action |
|----------|--------|
| Settings → Privacy | "Manage memory" link |
| Profile menu | "Manage memory" option |
| Chat (future) | Memory indicator when Pip uses memory |

### Implementation Approach

```tsx
// Settings page with tab navigation
function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'capabilities', label: 'Capabilities', icon: ShieldIcon },
    { id: 'connectors', label: 'Connectors', icon: PlugIcon },
  ];

  return (
    <div className="flex h-screen bg-arc-bg-primary">
      {/* Settings sidebar */}
      <nav className="w-48 bg-arc-bg-secondary border-r border-arc-border p-4">
        <h1 className="text-xl font-medium text-arc-text-primary mb-6">Settings</h1>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
              activeTab === tab.id
                ? 'bg-arc-bg-tertiary text-arc-text-primary'
                : 'text-arc-text-secondary hover:bg-arc-bg-tertiary'
            }`}
          >
            <tab.icon className="inline w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Settings content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'capabilities' && <CapabilitiesSettings />}
        {activeTab === 'connectors' && <ConnectorsSettings />}
      </main>
    </div>
  );
}
```

---

## Pattern 1: Contextual Settings Menu (NOT Settings Button)

**Current Pip**: Big "Settings" link in header

**Claude.ai Pattern**:
- Small slider/tools icon next to input field
- Opens dropdown with toggles for features
- Connectors (like "Pip by Arc Forge") have on/off toggles
- Settings are contextual to the chat experience

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│       How can I help you today?                     │
│                                                     │
│  [+]  [≡]  [⟲]                                     │
│        │                                            │
│        └── Opens dropdown:                          │
│            ┌─────────────────────────┐              │
│            │ ○ Search menu           │              │
│            │ ✎ Use style        →    │              │
│            │ ⟲ Extended thinking [●] │              │
│            │ ◉ Research         [○]  │              │
│            │ ─────────────────────── │              │
│            │ ⊕ Web search       [●]  │              │
│            │ △ Drive search     [○]  │              │
│            │ M Gmail search   Connect│              │
│            │ 📅 Calendar      Connect│              │
│            │ P Pip by Arc Forge [●]→ │              │
│            │ ─────────────────────── │              │
│            │ + Add connectors        │              │
│            │ ⚙ Manage connectors     │              │
│            └─────────────────────────┘              │
└─────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| Toggle switches | Boolean on/off for features |
| Arrow (→) | Indicates sub-menu or settings |
| "Connect" links | OAuth integration buttons |
| Grouped sections | Dividers separate feature types |

### Implementation Notes for Pip

```tsx
// Instead of: <Link to="/settings">Settings</Link> in header
// Use: <ToolsMenu /> near input with dropdowns

<footer className="...">
  <div className="flex items-center gap-2">
    <AttachmentButton />      {/* + icon */}
    <ToolsMenu />             {/* ≡ slider icon */}
    <HistoryButton />         {/* clock icon */}
  </div>
  <input ... />
  <button>Send</button>
</footer>
```

---

## Pattern 2: Tooltips on Hover

**Purpose**: Help users discover features without cluttering the UI

### Example

```
  [+]  [≡]  [⟲]
       │
       └── Hover shows: "Search and tools"
```

### Implementation

```tsx
<button
  title="Search and tools"
  className="..."
  onClick={() => setShowTools(!showTools)}
>
  <SlidersIcon />
</button>
```

Or with a custom tooltip component for better styling:

```tsx
<Tooltip content="Search and tools">
  <button onClick={() => setShowTools(!showTools)}>
    <SlidersIcon />
  </button>
</Tooltip>
```

---

## Pattern 3: Plus (+) Icon for Attachments

**Purpose**: Single entry point for all content addition

### Menu Options (from Claude.ai)

| Option | Description |
|--------|-------------|
| Upload a file | Local file picker |
| Take a screenshot | Screen capture |
| Add from GitHub | GitHub integration |
| Add from Google Drive | Cloud files |
| **Add from Pip by Arc Forge** | MCP connector data |
| Use a project | Context from projects |

### Visual Layout

```
  [+] clicked →  ┌───────────────────────────┐
                 │ ○ Search menu             │
                 │ 📎 Upload a file          │
                 │ 📷 Take a screenshot      │
                 │ ◉ Add from GitHub        →│
                 │ △ Add from Google Drive  →│
                 │ P Add from Pip by Arc... →│
                 │ 📁 Use a project         →│
                 └───────────────────────────┘
```

### Implementation Notes

```tsx
// Use react-dropzone for file handling (from spike_m2_002)
import { useDropzone } from 'react-dropzone';

function AttachmentMenu() {
  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,  // We control when dialog opens
    onDrop: handleFiles,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Menu>
        <MenuButton><PlusIcon /></MenuButton>
        <MenuItems>
          <MenuItem onClick={open}>Upload a file</MenuItem>
          <MenuItem onClick={takeScreenshot}>Take a screenshot</MenuItem>
          {/* ... */}
        </MenuItems>
      </Menu>
    </div>
  );
}
```

---

## Pattern 4: Attachment Preview with Dismiss

**Purpose**: Show attached files inline below input with easy removal

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ How can I help you today?                           │
│                                                     │
│  [+]  [≡]  [⟲]                       Opus 4.5 ▼  ⬆ │
│                                                     │
│  ┌─────────────┐  ┌─────────────────────────────┐   │
│  │[×]          │  │[×]                          │   │
│  │             │  │  Production VPS             │   │
│  │ pip_assist  │  │  Infrastructure             │   │
│  │ ant_te      │  │  ──────────────             │   │
│  │ xt          │  │  <code preview>             │   │
│  │ 48 lines    │  │                             │   │
│  │             │  │                             │   │
│  │  [TXT]      │  │                             │   │
│  └─────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Behavior |
|---------|----------|
| **[×] button** | Appears on hover (top-left corner), removes attachment |
| **File thumbnail** | Image preview or icon based on type |
| **File metadata** | Name, line count, file type badge |
| **Multiple files** | Horizontal scroll if many attachments |

### Implementation Notes

```tsx
interface Attachment {
  id: string;
  name: string;
  type: 'text' | 'image' | 'pdf' | 'code';
  preview?: string;  // First few lines for text/code
  lines?: number;
  url?: string;      // For images
}

function AttachmentPreview({ attachment, onRemove }: Props) {
  return (
    <div className="relative group rounded-lg border border-arc-border p-3 bg-arc-bg-tertiary">
      {/* X button - shows on hover */}
      <button
        onClick={() => onRemove(attachment.id)}
        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-arc-bg-secondary border border-arc-border
                   opacity-0 group-hover:opacity-100 transition-opacity
                   flex items-center justify-center text-arc-text-dim hover:text-arc-text-primary"
      >
        ×
      </button>

      {/* Content based on type */}
      {attachment.type === 'image' ? (
        <img src={attachment.url} className="max-h-24 rounded" />
      ) : (
        <>
          <div className="text-sm text-arc-text-primary truncate">
            {attachment.name}
          </div>
          {attachment.lines && (
            <div className="text-xs text-arc-text-dim">
              {attachment.lines} lines
            </div>
          )}
          <div className="mt-2 px-2 py-1 bg-arc-bg-secondary rounded text-xs uppercase">
            {attachment.type}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Pattern 5: Model Selector (Already Designed)

See `PWA-MODEL-SELECTOR-DESIGN-20251201.md` for full implementation.

Key observation from Claude.ai: Model selector is in footer area, right side near send button.

```
[+]  [≡]  [⟲]                       Opus 4.5 ▼  [⬆ Send]
                                         │
                                         └── Dropdown for model selection
```

---

## Pattern 6: Quick Toggle Buttons

**Purpose**: Features users frequently enable/disable get dedicated icon buttons (not buried in menus)

### Claude.ai Example: Extended Thinking Toggle

The clock-like icon `⟲` is NOT for history - it's a **quick toggle** for Extended Thinking:

```
  [+]  [≡]  [⟲]
              │
              └── Extended Thinking toggle
                  - Click to toggle on/off
                  - Visual state change (color/fill) shows current state
                  - No dropdown, just instant toggle
```

### Visual State

| State | Appearance |
|-------|------------|
| OFF | Outline icon, muted color |
| ON | Filled icon, accent color (blue) |

### Implementation

```tsx
function QuickToggle({
  enabled,
  onToggle,
  icon: Icon,
  tooltip
}: Props) {
  return (
    <button
      onClick={onToggle}
      title={tooltip}
      className={`p-2 rounded-lg transition-colors ${
        enabled
          ? 'bg-blue-500/20 text-blue-400'  // ON state
          : 'bg-arc-bg-tertiary text-arc-text-dim hover:text-arc-text-secondary'  // OFF state
      }`}
    >
      <Icon filled={enabled} />
    </button>
  );
}
```

### Pip Candidates for Quick Toggles

| Feature | Use Case |
|---------|----------|
| Extended Thinking | If Claude API supports it |
| Memory | Toggle "remember this conversation" |
| Xero Connection | Quick connect/disconnect indicator |
| Local Model | Toggle Ollama vs Cloud |

---

## Pip PWA Footer Redesign

Combining all patterns, the new footer structure:

```
┌─────────────────────────────────────────────────────────────┐
│ Attachments (if any):                                       │
│ ┌─────────┐  ┌─────────┐                                    │
│ │[×] file │  │[×] file │                                    │
│ └─────────┘  └─────────┘                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [+]  [≡]  [?]   > Type message...    [Model ▼]  [Send]    │
│   │    │    │                              │                │
│   │    │    │                              └── Model picker │
│   │    │    └── Quick toggle (TBD feature)                  │
│   │    └── Tools/Settings menu                              │
│   └── Attachments menu                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Icon Reference

| Icon | Purpose | Tooltip | Behavior |
|------|---------|---------|----------|
| `+` | Attachments | "Add content" | Opens menu |
| `≡` (sliders) | Tools/Settings | "Search and tools" | Opens dropdown |
| `?` | Quick toggle | Feature-specific | Toggle on/off |

---

## Migration Path

### Phase 1: Footer Icons
1. Move settings access from header to footer tools menu
2. Add + attachment button (wire up react-dropzone)
3. Add tooltips to all icon buttons

### Phase 2: Attachment Preview
1. Implement attachment state management
2. Build preview component with hover-dismiss
3. Integrate with file upload API

### Phase 3: Tools Menu
1. Design dropdown with feature toggles
2. Add model selector (from spike_m2_004)
3. Connect to existing settings API

---

## References

- Screenshots from Claude.ai (2025-12-01)
- `SPIKE-m2-002-react-refactor-assessment.md` - React + react-dropzone recommendation
- `PWA-MODEL-SELECTOR-DESIGN-20251201.md` - Model selector component design
