# ChatGPT Memory with Pip

> **Purpose**: Guide for enabling ChatGPT memory when using Pip MCP connector
> **Audience**: End users setting up Pip with ChatGPT

---

## Understanding the Memory Situation

When using MCP connectors with ChatGPT, there are two different experiences:

| Subscription | Setup Mode | Memory Status |
|--------------|------------|---------------|
| Plus | Developer Mode | Disabled (security) |
| Business/Teams | Developer Mode (testing) | Disabled |
| Business/Teams | Published Connector | **Possibly Enabled** (unverified) |
| Enterprise/Edu | Published Connector | **Possibly Enabled** (unverified) |

**Key Insight**: Memory is disabled during Developer Mode testing. Research suggests published connectors may retain memory, but this is **UNVERIFIED** and needs testing with an actual Business account.

**For Plus Users**: You need to use Option 2 below (Memory Import via Pip context layer).

---

## Option 1: Published Connector (Business/Teams - UNVERIFIED)

> **Status**: This approach is based on OpenAI documentation research but has NOT been tested with an actual Business account. If you try this, please report results.

If you have a ChatGPT Business or Teams subscription with admin access, publishing the connector MAY enable memory functionality.

### Step 1: Set Up as Admin

1. Go to **Workspace Settings** (gear icon)
2. Navigate to **Permissions & Roles** > **Connected Data**
3. Enable **Developer mode / Create custom MCP connectors**

### Step 2: Add Pip Connector in Developer Mode

1. Open **Settings** > **Apps & Connectors** > **Advanced**
2. Enable **Developer Mode**
3. Click **+** to add new connector
4. Enter Pip connection details:
   - **Name**: Pip by Arc Forge
   - **URL**: `https://mcp.pip.arcforge.au/sse`
   - **OAuth Client ID**: `pip-mcp-client`
   - **OAuth Client Secret**: *(your invite secret)*
5. Complete OAuth flow (sign in, connect Xero)
6. Test the connector to verify it works

### Step 3: Publish to Workspace

1. Go to **Workspace Settings** > **Connectors**
2. Find Pip in **Drafts**
3. Click **Publish**
4. Review safety warnings and confirm

### Step 4: Use Without Developer Mode

1. Turn OFF Developer Mode in your personal settings
2. Open a new chat
3. Go to **Apps & Connectors** tool menu
4. Enable Pip (it will show "custom" label)
5. Memory is now enabled for this conversation

### Verification (Please Report Results!)

- Input field should NOT have orange border (that indicates Dev Mode)
- Ask ChatGPT something personal it should remember
- Use Pip tools in the same conversation
- Both should work together

**If this works for you**: Please let us know so we can update this documentation!

---

## Option 2: Memory Import (For Plus Users)

> **Status**: Memory import requires Pip's memory stack which is currently in development. This section documents the planned workflow.

If you're on ChatGPT Plus (or can't publish connectors), you will be able to export your ChatGPT memories and import them into Pip's memory layer.

### Step 1: Export Your ChatGPT Data

1. Open ChatGPT and go to **Settings**
2. Click **Data Controls**
3. Click **Export Data** > **Confirm export**
4. Wait for email (few minutes to hours depending on data size)
5. Download the ZIP file within 24 hours

### What's in the Export

| File | Contents |
|------|----------|
| `conversations.json` | All chat history (main source) |
| `shared_conversations.json` | Publicly shared chats |
| `message_feedback.json` | Thumbs up/down ratings |
| `user.json` | Account settings |
| `chat.html` | Human-readable chat history |

### Step 2: Extract Key Memories

The export doesn't include a separate "memories.json" file. Your saved memories are embedded within conversations or stored separately in ChatGPT's memory system.

**Option A: Manual Memory Export**

In a ChatGPT conversation (without MCP enabled), ask:
```
Please list all of my saved memories that you know about me.
Format them as a bullet list with categories like:
- Personal info
- Work/business
- Preferences
- Projects
```

Copy this output to a text file.

**Option B: Parse conversations.json**

The `conversations.json` file contains all your chat history. Key memories are often in:
- Messages where you said "Remember that..."
- Long-running project discussions
- Repeated patterns in your questions

### Step 3: Upload to Pip Memory Layer (Coming Soon)

> **Not Yet Implemented**: This feature is in development.

Once available:
1. Go to https://app.pip.arcforge.au
2. Sign in to your account
3. Navigate to **Memory** section
4. Upload your memories file or paste extracted content
5. Pip will use this context in all conversations across all platforms

### Context Document Format (Recommended)

Create a file called `my-context.txt`:

```
# About Me
- Name: [Your name]
- Business: [Business name]
- Role: [Your role]

# Business Context
- Industry: [Industry]
- Business model: [Description]
- Fiscal year: [Start month]

# Xero Preferences
- Default organisation: [Org name]
- Preferred reports: [P&L, Balance Sheet, etc.]
- Common queries: [What I usually ask about]

# Communication Preferences
- Tone: [Casual/Professional]
- Detail level: [Brief summaries vs detailed breakdowns]
- Currency: [AUD/USD/etc.]
```

---

## Memory Works Differently Across Platforms

| Platform | Memory Type | Status |
|----------|-------------|--------|
| **Claude.ai** | Native memory | Works normally with MCP |
| **ChatGPT (Published)** | Native memory | Works after publishing |
| **ChatGPT (Dev Mode)** | Disabled | Use import workaround |
| **Pip PWA** | Memory layer | Coming soon (in development) |

**Recommendation**: For the best "Pip knows me" experience:
1. Use Claude.ai (memory just works) ✅
2. Or use ChatGPT Business with published connector (unverified)
3. Or wait for Pip memory layer (in development)

---

## Troubleshooting

**Memory not working with published connector?**
- Ensure you're NOT in Developer Mode
- Check input field doesn't have orange border
- Try a new conversation after disabling Dev Mode

**Data export taking too long?**
- Large accounts can take hours
- Email expires in 24 hours - download promptly
- Try during off-peak hours

**Context not being used by Pip?**
- Verify document uploaded successfully in Business Context
- Context applies to new conversations, not existing ones
- Check document format is readable (plain text preferred)

---

## Sources

- [OpenAI: How to export your data](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data)
- [OpenAI: Connectors in ChatGPT](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt)
- [OpenAI: Developer Mode help](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta)

---

**Last Updated**: 2025-11-30
