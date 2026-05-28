/**
 * Shared sensitive-key list and recursive sanitizer.
 *
 * Deduplicates the same logic previously in:
 *   aiCopilotContext.ts, aiCopilotGuardrails.ts,
 *   managementReport.ts, scenarioExport.ts
 */

export const SENSITIVE_KEYS: ReadonlyArray<string> = [
  'uid',
  'email',
  'token',
  'auth',
  'apiKey',
  'api_key',
  'secret',
  'password',
  'workspaceId',
  'userId',
  'ownerUid',
  'member',
  'credential',
];

/**
 * Check whether an object key should be stripped.
 * Uses substring matching so "userEmail", "authToken", etc. are also caught.
 */
export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((sk) => lower.includes(sk.toLowerCase()));
}

/**
 * Recursively strip all sensitive keys from an object tree.
 * Returns a deep clone with sensitive keys removed.
 */
export function sanitizeDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeDeep(item)) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) continue;
    result[key] = sanitizeDeep(value);
  }
  return result as T;
}
