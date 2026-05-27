/**
 * AI Copilot Guardrails — v1.38.0
 *
 * These guardrails enforce the 10 veto-class red lines for the AI Data Copilot MVP.
 * They are used at runtime to validate AI copilot behavior, sanitize context,
 * and block forbidden external AI service calls.
 *
 * Design principles:
 * - Pure functions, zero side effects
 * - All checks are synchronous and deterministic
 * - Conservative: false positives preferred over false negatives
 * - Used by aiCopilotContext.ts sanitizeDeep() as a cross-reference
 */

// ============================================================
// 10 Red Lines (Veto-class)
// ============================================================

export const AI_COPILOT_RED_LINES = [
  'NO_FORMULA_MODIFICATION',
  'NO_DATA_INVENTION',
  'NO_CURRENCY_CONFUSION',
  'NO_CAUSAL_DISTORTION',
  'NO_ASSUMPTION_BREACH',
  'NO_CONFIDENCE_BYPASS',
  'NO_AUTO_BUSINESS_DECISION',
  'NO_HUMAN_IN_THE_LOOP_BYPASS',
  'NO_METRIC_REGISTRY_VIOLATION',
  'NO_SCENARIO_OVER_COMMITMENT',
] as const;

export type AiCopilotRedLine = (typeof AI_COPILOT_RED_LINES)[number];

// ============================================================
// Sensitive Keys — must never appear in AI context
// ============================================================

export const AI_CONTEXT_SENSITIVE_KEYS = [
  'uid',
  'email',
  'token',
  'auth',
  'apiKey',
  'secret',
  'password',
  'workspaceId',
  'userId',
  'ownerUid',
  'member',
] as const;

// ============================================================
// Forbidden External AI Service Patterns
// ============================================================

export const FORBIDDEN_EXTERNAL_PATTERNS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.deepseek.com',
  'api.cohere.com',
] as const;

// ============================================================
// Red Line Descriptions
// ============================================================

const RED_LINE_DESCRIPTIONS: Record<AiCopilotRedLine, string> = {
  NO_FORMULA_MODIFICATION:
    'AI must never modify formulas, calculation logic, or derived values. All computation stays in the deterministic engine.',
  NO_DATA_INVENTION:
    'AI must never fabricate, interpolate, or hallucinate data points. All numbers must trace back to user-supplied inputs or deterministic calculations.',
  NO_CURRENCY_CONFUSION:
    'AI must never mix USD and TWD/CNY without explicit labeling. Currency assumptions are fixed by the context and must not be overridden.',
  NO_CAUSAL_DISTORTION:
    'AI must never imply direct causation for proportional attributions. BP Gap Attribution is revenue-share based, not causal.',
  NO_ASSUMPTION_BREACH:
    'AI must never override the working-days-per-month, layer-count-to-BU-steps, or other fixed assumptions listed in the context.',
  NO_CONFIDENCE_BYPASS:
    'AI must never suppress or ignore data-quality confidence levels. If confidence is "blocked", the copilot must refuse to answer and surface the blocking issues.',
  NO_AUTO_BUSINESS_DECISION:
    'AI must never make or recommend go/no-go, approve/reject, or commit/defer decisions. It can only present analysis and let humans decide.',
  NO_HUMAN_IN_THE_LOOP_BYPASS:
    'AI must never generate actions that bypass human approval. All fix drafts are read-only proposals requiring explicit human action.',
  NO_METRIC_REGISTRY_VIOLATION:
    'AI must never use metric names or definitions outside the registered metric registry. All metrics must match the canonical names in the codebase.',
  NO_SCENARIO_OVER_COMMITMENT:
    'AI must never treat scenario results as confirmed forecasts. Scenario outputs must always be labeled as "what-if" projections, not commitments.',
};

// ============================================================
// Validation Functions
// ============================================================

/**
 * Recursively check an object for sensitive keys.
 * Returns the list of found sensitive key names.
 * Comparison is case-insensitive (matches aiCopilotContext.ts sanitizeDeep behavior).
 */
export function hasSensitiveKeys(obj: Record<string, unknown>): string[] {
  const found: string[] = [];
  const sensitiveLower = AI_CONTEXT_SENSITIVE_KEYS.map(k => k.toLowerCase());

  function walk(current: unknown, path: string): void {
    if (current === null || current === undefined) return;
    if (typeof current !== 'object') return;

    if (Array.isArray(current)) {
      current.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }

    for (const key of Object.keys(current as Record<string, unknown>)) {
      const keyLower = key.toLowerCase();
      if (sensitiveLower.some(sk => keyLower.includes(sk))) {
        found.push(key);
      }
      walk((current as Record<string, unknown>)[key], `${path}.${key}`);
    }
  }

  walk(obj, '$');
  // Deduplicate
  return [...new Set(found)];
}

/**
 * Validate that a code string does not contain external AI API calls.
 * Returns true if the code is clean (no forbidden patterns found).
 * Returns false if any forbidden pattern is detected.
 */
export function validateNoExternalAiCall(code: string): boolean {
  const lower = code.toLowerCase();
  return !FORBIDDEN_EXTERNAL_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

/**
 * Validate that a context object passes all guardrail checks.
 * Returns { valid: true, violations: [] } for clean contexts.
 * Returns { valid: false, violations: [...] } for contexts with issues.
 */
export function validateContext(context: unknown): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // 1. Must be a non-null object
  if (context === null || context === undefined || typeof context !== 'object') {
    return { valid: false, violations: ['Context is null, undefined, or not an object'] };
  }

  const ctx = context as Record<string, unknown>;

  // 2. Check for sensitive keys
  const sensitiveKeys = hasSensitiveKeys(ctx);
  if (sensitiveKeys.length > 0) {
    violations.push(
      `Sensitive keys found in context: ${sensitiveKeys.join(', ')}`
    );
  }

  // 3. Check schemaVersion exists
  if (!('schemaVersion' in ctx)) {
    violations.push('Missing required field: schemaVersion');
  }

  // 4. Check role exists and is valid
  const validRoles = ['owner', 'editor', 'viewer'];
  if ('role' in ctx) {
    if (!validRoles.includes(ctx.role as string)) {
      violations.push(`Invalid role: ${ctx.role}. Must be one of: ${validRoles.join(', ')}`);
    }
  } else {
    violations.push('Missing required field: role');
  }

  // 5. Check that arrays are within caps (matching aiCopilotContext.ts limits)
  const dataQualitySummary = ctx.dataQualitySummary as Record<string, unknown> | undefined;
  if (dataQualitySummary?.topIssues && Array.isArray(dataQualitySummary.topIssues)) {
    if (dataQualitySummary.topIssues.length > 8) {
      violations.push(
        `topIssues array exceeds cap of 8 (found ${dataQualitySummary.topIssues.length})`
      );
    }
  }

  const riskBriefSummary = ctx.riskBriefSummary as Record<string, unknown> | undefined;
  if (riskBriefSummary?.topDrivers && Array.isArray(riskBriefSummary.topDrivers)) {
    if (riskBriefSummary.topDrivers.length > 5) {
      violations.push(
        `topDrivers array exceeds cap of 5 (found ${riskBriefSummary.topDrivers.length})`
      );
    }
  }
  if (riskBriefSummary?.shortageMonths && Array.isArray(riskBriefSummary.shortageMonths)) {
    if (riskBriefSummary.shortageMonths.length > 12) {
      violations.push(
        `shortageMonths array exceeds cap of 12 (found ${riskBriefSummary.shortageMonths.length})`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Return human-readable description of each red line.
 * Used for documentation, error messages, and audit trails.
 */
export function getGuardrailSummary(): Record<AiCopilotRedLine, string> {
  return { ...RED_LINE_DESCRIPTIONS };
}
