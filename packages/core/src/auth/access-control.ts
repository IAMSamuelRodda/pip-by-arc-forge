/**
 * Access Control System
 *
 * Implements role + tier + feature flag authorization model.
 * Separates WHO you are (role) from WHAT you've paid for (tier) from
 * temporary overrides (feature flags).
 *
 * Performance: All checks are O(1) or O(n) where n is tiny (0-5 flags).
 * Typical check takes < 0.1ms - negligible vs API latency.
 */

import type { User, UserRole, SubscriptionTier, FeatureFlag } from '../database/types.js';

// ============================================================================
// Model Access Configuration
// ============================================================================

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'ollama' | 'openai' | 'byom';
  /** Tiers that can access this model */
  allowedTiers: SubscriptionTier[];
  /** Feature flags that grant access (bypasses tier check) */
  allowedFlags?: FeatureFlag[];
  /** If true, only superadmin can access */
  superadminOnly?: boolean;
  /** Cost per 1K tokens (for rate limiting) */
  costPer1kTokens?: number;
}

/**
 * Available models with access configuration
 * This is the single source of truth for model access control
 */
export const MODEL_CONFIGS: ModelConfig[] = [
  // Anthropic API models (paid tiers)
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    allowedTiers: ['starter', 'pro', 'enterprise'],
    costPer1kTokens: 0.003,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    allowedTiers: ['starter', 'pro', 'enterprise'],
    costPer1kTokens: 0.001,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    allowedTiers: ['pro', 'enterprise'],
    costPer1kTokens: 0.015,
  },

  // Local Ollama models (beta testers only via Tailscale GPU)
  {
    id: 'qwen2.5:3b',
    name: 'Qwen 2.5 3B (Local)',
    provider: 'ollama',
    allowedTiers: [], // No tier access - flag only
    allowedFlags: ['beta_tester'],
    costPer1kTokens: 0, // Free - runs on local GPU
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B (Local)',
    provider: 'ollama',
    allowedTiers: [],
    allowedFlags: ['beta_tester'],
    costPer1kTokens: 0,
  },

  // BYOM (Bring Your Own Model) - user provides API key
  {
    id: 'byom',
    name: 'Your API Key',
    provider: 'byom',
    allowedTiers: ['free', 'starter', 'pro', 'enterprise'],
    allowedFlags: ['byom_enabled'],
    costPer1kTokens: 0, // User pays directly
  },
];

// ============================================================================
// Rate Limit Configuration
// ============================================================================

export interface RateLimits {
  /** Max tokens per day */
  dailyTokenLimit: number;
  /** Max requests per minute */
  requestsPerMinute: number;
  /** Max concurrent requests */
  maxConcurrentRequests: number;
  /** Whether to enforce limits */
  enforced: boolean;
}

const UNLIMITED: RateLimits = {
  dailyTokenLimit: Infinity,
  requestsPerMinute: Infinity,
  maxConcurrentRequests: Infinity,
  enforced: false,
};

const TIER_LIMITS: Record<SubscriptionTier, RateLimits> = {
  free: {
    dailyTokenLimit: 0, // BYOM only
    requestsPerMinute: 10,
    maxConcurrentRequests: 1,
    enforced: true,
  },
  starter: {
    dailyTokenLimit: 50_000,
    requestsPerMinute: 20,
    maxConcurrentRequests: 2,
    enforced: true,
  },
  pro: {
    dailyTokenLimit: 500_000,
    requestsPerMinute: 60,
    maxConcurrentRequests: 5,
    enforced: true,
  },
  enterprise: {
    dailyTokenLimit: 5_000_000,
    requestsPerMinute: 120,
    maxConcurrentRequests: 10,
    enforced: true,
  },
};

const BETA_TESTER_LIMITS: RateLimits = {
  dailyTokenLimit: 100_000, // Generous for testing
  requestsPerMinute: 30,
  maxConcurrentRequests: 3,
  enforced: true,
};

// ============================================================================
// Access Control Functions
// ============================================================================

/**
 * Check if a user can access a specific model
 *
 * Order of checks (short-circuit on first match):
 * 1. Superadmin bypasses everything
 * 2. Model is superadmin-only → deny unless superadmin
 * 3. Feature flag grants access
 * 4. Subscription tier grants access
 *
 * @returns true if user can access the model
 */
export function canAccessModel(user: User, modelId: string): boolean {
  const model = MODEL_CONFIGS.find(m => m.id === modelId);
  if (!model) return false;

  // 1. Superadmin bypasses all restrictions
  if (user.role === 'superadmin') return true;

  // 2. Superadmin-only models
  if (model.superadminOnly) return false;

  // 3. Feature flag override (e.g., beta_tester for local models)
  if (model.allowedFlags && model.allowedFlags.length > 0) {
    const hasFlag = model.allowedFlags.some(flag =>
      user.featureFlags.includes(flag)
    );
    if (hasFlag) return true;
  }

  // 4. Subscription tier check
  return model.allowedTiers.includes(user.subscriptionTier);
}

/**
 * Get all models accessible to a user
 * Used for populating the model selector in the UI
 */
export function getAccessibleModels(user: User): ModelConfig[] {
  return MODEL_CONFIGS.filter(model => canAccessModel(user, model.id));
}

/**
 * Get rate limits for a user
 *
 * Order of precedence:
 * 1. Superadmin → unlimited
 * 2. unlimited_tokens flag → unlimited
 * 3. beta_tester flag → beta tester limits
 * 4. Subscription tier limits
 */
export function getRateLimits(user: User): RateLimits {
  // 1. Superadmin = unlimited
  if (user.role === 'superadmin') return UNLIMITED;

  // 2. Explicit unlimited flag
  if (user.featureFlags.includes('unlimited_tokens')) return UNLIMITED;

  // 3. Beta testers get special limits
  if (user.featureFlags.includes('beta_tester')) return BETA_TESTER_LIMITS;

  // 4. Tier-based limits
  return TIER_LIMITS[user.subscriptionTier];
}

/**
 * Check if user has a specific feature flag
 * Convenience function for feature gating
 */
export function hasFeatureFlag(user: User, flag: FeatureFlag): boolean {
  // Superadmin implicitly has all flags
  if (user.role === 'superadmin') return true;
  return user.featureFlags.includes(flag);
}

/**
 * Check if user is admin or superadmin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin' || user.role === 'superadmin';
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(user: User): boolean {
  return user.role === 'superadmin';
}

/**
 * Get the default model for a user based on their access
 * Returns the first accessible model, prioritizing cheaper options
 */
export function getDefaultModel(user: User): ModelConfig | undefined {
  const accessible = getAccessibleModels(user);

  // Prioritize: BYOM > local models > cheapest API model
  const byom = accessible.find(m => m.provider === 'byom');
  if (byom) return byom;

  const local = accessible.find(m => m.provider === 'ollama');
  if (local) return local;

  // Sort by cost and return cheapest
  const sorted = accessible
    .filter(m => m.provider === 'anthropic')
    .sort((a, b) => (a.costPer1kTokens || 0) - (b.costPer1kTokens || 0));

  return sorted[0];
}
