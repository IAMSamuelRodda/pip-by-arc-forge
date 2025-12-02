# UI/UX Design Philosophy

> **Purpose**: Define principles for intuitive, minimal interface design
> **Audience**: Developers implementing frontend features

---

## Core Principle: Intuitive Over Explicit

Rely on intuitive UI patterns for UX rather than explicit text. Users should understand function through context, placement, and convention - not verbose explanations.

---

## Button & Label Naming

### Default: One Word

Use single-word labels when context makes meaning clear:

| Context | Label | Why it works |
|---------|-------|--------------|
| Chat input field | **Send** | Adjacent to message input - obviously sends the message |
| Empty project list | **Create** | Only action available - context implies "create project" |
| File list item | **Delete** | Standard destructive action, universally understood |
| Modal with single action | **Save** | Modal title provides context |

### Reluctantly: Two Words

Add a second word only when ambiguity would cause confusion:

| Context | Label | Why two words needed |
|---------|-------|---------------------|
| Header dropdown (multiple features) | **Create project** | Could be "create chat", "create folder", etc. |
| Settings page (mixed actions) | **Connect Xero** | Multiple integrations possible |
| List with multiple item types | **New document** | Distinguishes from "new folder" |

### Never: Three+ Words

Verbose labels indicate UI structure problems:

| Avoid | Problem | Solution |
|-------|---------|----------|
| "Create your first project" | Marketing copy, not UI | Restructure: "No projects yet" (text) + "Create" (button) |
| "Click here to send message" | Redundant instruction | "Send" - placement makes function obvious |
| "Save changes and close" | Multiple actions in one label | Separate buttons or auto-save |

---

## Empty States

### Do
- Brief status text: "No projects yet", "No messages"
- Single clear action button
- Let context explain purpose

### Don't
- Marketing copy explaining the feature
- Large icons with explanatory paragraphs
- "Get started by..." instructions

**Example - Good:**
```
No projects yet
[Create project]
```

**Example - Bad:**
```
[folder icon]
Organize your work with projects
Projects help you keep different clients
and contexts separate.
[Create your first project]
```

---

## Contextual Clarity Rules

1. **Isolated context = shorter labels**: A button inside a "Projects" dropdown can just say "Create" - the dropdown title provides context.

2. **Shared space = longer labels**: A button in a header with multiple features needs "Create project" to distinguish from other create actions.

3. **Universal actions = one word**: Save, Delete, Edit, Send, Close, Cancel - these are universally understood.

4. **Domain actions = two words**: "Connect Xero", "Upload document" - domain-specific actions need the object specified.

---

## Visual Hierarchy Over Text

Prefer visual indicators to text explanations:

| Instead of | Use |
|------------|-----|
| "This is your current project" | Checkmark icon, highlighted row |
| "Click to expand" | Chevron icon (standard affordance) |
| "3 items selected" | Badge/counter next to selection |
| "Loading, please wait..." | Spinner (no text needed) |

---

## Layout Patterns

### Sidebar-Centric Navigation (Claude.ai/ChatGPT Pattern)

Primary navigation lives in a collapsible left sidebar:

| Position | Element | Behavior |
|----------|---------|----------|
| Top | Toggle button | Collapse/expand sidebar |
| Below toggle | Primary action | "New chat" - always visible |
| Below action | Context switcher | Project selector (when expanded) |
| Middle | Item list | Scrollable list of chats |
| Above footer | Secondary nav | Docs, utilities |
| Bottom | Profile | Avatar + dropdown (Settings, Logout) |

**Why**: Vertical real estate is abundant. Horizontal space is precious for content. Sidebar contains navigation; main area is for work.

### Centered Input Pattern (Empty State)

When no conversation exists, center the input with golden ratio positioning:

```
┌─────────────────────────┐
│         (38%)           │
│                         │
│     [Logo]              │
│     Greeting            │
│     [Input field]       │
│     [Suggestions]       │
│                         │
│         (62%)           │
└─────────────────────────┘
```

**After first message**: Input moves to fixed footer. Chat messages fill the main area.

**Why**: The centered input creates visual focus on the primary action. Users immediately know where to type. After conversation starts, the fixed footer provides consistent input location.

### Header Minimalism

Headers should contain only:
- Logo/title (identity)
- Status indicators (connection state)

**Move to sidebar**: User account, settings, navigation, feature toggles.

**Why**: Headers compete with content. Keep them thin. Let the sidebar handle navigation.

### Progressive Disclosure

Show UI elements only when relevant:

| Element | Hidden State | Revealed State |
|---------|--------------|----------------|
| Document panel | Button in sidebar | Slides in below header |
| Profile dropdown | Avatar only | Click to expand menu |
| Chat options | Hidden | Hover to reveal |

**Why**: Reduce visual noise. Show options when the user signals intent.

---

## Summary

**One word by default. Two words reluctantly. Never three.**

Context, placement, and visual conventions should do the heavy lifting. If a label needs explanation, the UI structure is wrong - fix the structure, not the label.
