/**
 * Pip Guide MCP Tool
 *
 * On-demand context injection for helping users understand how Pip works.
 * Similar to Claude Code's skills pattern - lightweight discovery with
 * full content loaded only when requested.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProviderToolDefinition } from "../types/tools.js";
import {
  type GuideTopic,
  GUIDE_TOPICS,
  getGuideContent,
  getTopicList,
} from "../content/pip-guide.js";

// Tool definition for the registry
export const guideToolDefinitions: ProviderToolDefinition[] = [
  {
    provider: "system",
    providerType: "system",
    category: "help",
    name: "get_pip_guide",
    shortName: "get_pip_guide",
    description: `Get instructions on how Pip works. Use when user asks "how do I...", "what is...", "how to configure...", or needs help with Pip features.

Topics:
- overview: What Pip is and capabilities
- settings: Permission levels, response styles, vacation mode
- connectors: How to connect Xero, Gmail, Google Sheets
- permissions: Understanding safety levels (read-only, create, update, delete)
- memory: How Pip remembers things across conversations
- troubleshooting: Common issues and fixes (expired tokens, permission denied)

Call without topic to get the topic list. Call with topic to get detailed guide.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          enum: GUIDE_TOPICS,
          description: "The topic to get help on. Omit to see all available topics.",
        },
      },
    },
  },
];

/**
 * Execute the guide tool
 */
export async function executeGuideTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  if (toolName !== "get_pip_guide") {
    return {
      content: [
        {
          type: "text",
          text: `Unknown guide tool: ${toolName}`,
        },
      ],
      isError: true,
    };
  }

  const { topic } = args as { topic?: GuideTopic };

  // If no topic specified, return the topic list
  if (!topic) {
    const topics = getTopicList();
    const topicList = topics
      .map((t) => `- **${t.topic}**: ${t.description}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `# Pip Guide Topics

Choose a topic to learn more:

${topicList}

Example: "Tell me about Pip's permission levels" or "How do I connect Xero?"`,
        },
      ],
    };
  }

  // Validate topic
  if (!GUIDE_TOPICS.includes(topic)) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown topic: "${topic}". Available topics: ${GUIDE_TOPICS.join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  // Return the guide content for the requested topic
  const content = getGuideContent(topic);

  return {
    content: [
      {
        type: "text",
        text: content,
      },
    ],
  };
}
