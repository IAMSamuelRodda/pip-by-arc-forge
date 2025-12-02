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

## Summary

**One word by default. Two words reluctantly. Never three.**

Context, placement, and visual conventions should do the heavy lifting. If a label needs explanation, the UI structure is wrong - fix the structure, not the label.
