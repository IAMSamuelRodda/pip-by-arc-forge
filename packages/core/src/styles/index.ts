/**
 * Response Styles Module
 *
 * Provides user-controlled response formatting styles for Pip.
 * Based on Claude.ai's response styles pattern.
 *
 * Styles control HOW Pip responds (format, length, tone).
 * Unlike personalities (which define WHO Pip is), styles are
 * neutral adjustments that the user controls.
 */

import type { ResponseStyle, ResponseStyleId } from "../database/types.js";

/**
 * Normal - Default balanced responses
 */
export const normalStyle: ResponseStyle = {
  id: "normal",
  name: "Normal",
  description: "Balanced responses with appropriate detail",
  promptModifier: "", // No modifier - use default behavior
};

/**
 * Formal - Professional, structured responses
 */
export const formalStyle: ResponseStyle = {
  id: "formal",
  name: "Formal",
  description: "Professional tone with complete sentences",
  promptModifier: `
## Response Style: Formal

Adjust your communication style:
- Use professional, business-appropriate language
- Write in complete, well-structured sentences
- Avoid contractions (use "do not" instead of "don't")
- Be precise and unambiguous
- Use appropriate financial terminology
- Structure responses with clear headings when presenting multiple items
- Maintain a respectful, courteous tone throughout
`.trim(),
};

/**
 * Concise - Brief, direct responses
 */
export const conciseStyle: ResponseStyle = {
  id: "concise",
  name: "Concise",
  description: "Brief, to-the-point answers",
  promptModifier: `
## Response Style: Concise

Adjust your communication style:
- Keep responses as brief as possible while remaining accurate
- Lead with the answer, then provide supporting details only if essential
- Use bullet points for multiple items
- Avoid filler words and unnecessary context
- Skip pleasantries unless the user initiated them
- One sentence is often enough for simple questions
- Tables over prose when presenting data
`.trim(),
};

/**
 * Explanatory - Detailed with reasoning
 */
export const explanatoryStyle: ResponseStyle = {
  id: "explanatory",
  name: "Explanatory",
  description: "Detailed with context and reasoning",
  promptModifier: `
## Response Style: Explanatory

Adjust your communication style:
- Provide thorough explanations with context
- Explain the "why" behind numbers and recommendations
- Connect information to the broader business picture
- Walk through calculations step-by-step when relevant
- Anticipate follow-up questions and address them proactively
- Use examples to illustrate abstract concepts
- Explain accounting terms in plain language when they appear
`.trim(),
};

/**
 * Learning - Educational, teaches concepts
 */
export const learningStyle: ResponseStyle = {
  id: "learning",
  name: "Learning",
  description: "Educational explanations of concepts",
  promptModifier: `
## Response Style: Learning

You are in TEACHING MODE. Your primary goal is education, not just answering.

Structure your responses as mini-lessons:
1. **Answer first** - Give the direct answer
2. **Explain why** - Teach the underlying concept
3. **Define terms** - Bold and explain any financial/accounting terms (e.g., **Accounts Receivable** = money owed to you by customers)
4. **Real example** - Provide a concrete example when helpful
5. **Pro tip** - End with a practical insight or "did you know"

Use phrases like:
- "Here's how this works..."
- "Think of it like..."
- "The reason this matters is..."
- "A common mistake to avoid..."

Make the user smarter with every interaction.
`.trim(),
};

/**
 * All available response styles
 */
export const responseStyles: Record<ResponseStyleId, ResponseStyle> = {
  normal: normalStyle,
  formal: formalStyle,
  concise: conciseStyle,
  explanatory: explanatoryStyle,
  learning: learningStyle,
};

/**
 * Get a response style by ID
 */
export function getResponseStyle(id: ResponseStyleId): ResponseStyle {
  const style = responseStyles[id];
  if (!style) {
    throw new Error(`Unknown response style: ${id}`);
  }
  return style;
}

/**
 * Build the style portion of a system prompt
 *
 * Returns an empty string for "normal" style (no modification needed)
 */
export function buildStylePrompt(styleId: ResponseStyleId): string {
  const style = getResponseStyle(styleId);
  return style.promptModifier;
}

/**
 * Get all styles as an array for UI display
 */
export function getStyleOptions(): Array<{
  id: ResponseStyleId;
  name: string;
  description: string;
}> {
  return Object.values(responseStyles).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
}

/**
 * Default response style
 */
export const DEFAULT_RESPONSE_STYLE: ResponseStyleId = "normal";
