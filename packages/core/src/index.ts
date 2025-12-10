/**
 * Pip - Core Package
 *
 * Shared abstractions for LLM providers, database backends, styles, and personalities
 */

// LLM Abstraction
export * from "./llm/index.js";

// Database Abstraction
export * from "./database/index.js";

// Response Styles (Claude.ai pattern)
export * from "./styles/index.js";

// Personalities (deferred feature)
export * from "./personalities/index.js";

// Access Control (role + tier + flags)
export * from "./auth/access-control.js";
