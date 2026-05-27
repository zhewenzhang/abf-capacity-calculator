/**
 * AI Copilot Export Pack (v1.39.0)
 *
 * Builds sanitized, deterministic JSON exports and combined packs
 * for the AI Data Copilot MVP.
 *
 * Key constraints:
 * - Pure function, zero side effects (no Firestore, no services)
 * - All exports are sanitized (no sensitive keys)
 * - UTF-8 BOM for downloads
 * - Stable key ordering (alphabetical sort at every level)
 * - Export metadata (exportedAt, appVersion, schemaVersion) included
 * - Eval pack available for minimal context-only export
 *
 * Consumes AiCopilotContext from aiCopilotContext.ts.
 */

import type { AiCopilotContext } from './aiCopilotContext';
import { buildAiCopilotPromptPack } from './aiCopilotPrompt';

// ============================================================
// Constants
// ============================================================

/**
 * Keys that should be removed from any exported object.
 * Same list as aiCopilotContext.ts SENSITIVE_KEYS.
 */
const SENSITIVE_KEYS = [
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
];

/** Current application version for export metadata. */
const APP_VERSION = '1.39.0';

/** Schema version for export format compatibility. */
const SCHEMA_VERSION = '1.0.0';

// ============================================================
// Helpers
// ============================================================

/**
 * Check if a key matches any known sensitive key pattern.
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()));
}

/**
 * Recursively sort object keys alphabetically for stable JSON output.
 * Same pattern as scenarioExport.ts.
 */
export function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Recursively remove sensitive keys from an object.
 * Same pattern as scenarioExport.ts and aiBriefExport.ts.
 */
export function removeSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeSensitiveData(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      continue; // Skip sensitive keys
    }
    result[key] = removeSensitiveData(value);
  }
  return result as T;
}

// ============================================================
// Public API
// ============================================================

/**
 * Export the context as a sanitized JSON string with stable key ordering.
 *
 * - Keys are sorted alphabetically at every level
 * - 2-space indentation
 * - No sensitive keys
 * - Includes export metadata: exportedAt, appVersion, schemaVersion
 */
export function buildAiCopilotExportJson(context: AiCopilotContext): string {
  const sanitized = removeSensitiveData(context);
  const sorted = sortKeysDeep(sanitized) as Record<string, unknown>;
  const withMetadata: Record<string, unknown> = {
    _meta: {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    },
    ...sorted,
  };
  const finalSorted = sortKeysDeep(withMetadata);
  return JSON.stringify(finalSorted, null, 2);
}

/**
 * Build a minimal eval pack: sanitized context data only, no prompt text.
 *
 * Designed for automated evaluation pipelines that need just the raw data.
 * - Keys are sorted alphabetically at every level
 * - Includes export metadata
 * - No sensitive keys
 * - 2-space indentation
 */
export function buildAiCopilotEvalPack(context: AiCopilotContext): string {
  const sanitized = removeSensitiveData(context);
  const sorted = sortKeysDeep(sanitized) as Record<string, unknown>;
  const withMetadata: Record<string, unknown> = {
    _meta: {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      packType: 'eval',
    },
    ...sorted,
  };
  const finalSorted = sortKeysDeep(withMetadata);
  return JSON.stringify(finalSorted, null, 2);
}

/**
 * Build a combined pack: prompt + JSON in a markdown fenced code block.
 */
export function buildAiCopilotCombinedPack(context: AiCopilotContext): string {
  const prompt = buildAiCopilotPromptPack(context);
  const json = buildAiCopilotExportJson(context);

  return [
    prompt,
    '',
    '---',
    '',
    '以下是受控 Context JSON，請只根據此資料分析：',
    '',
    '```json',
    json,
    '```',
  ].join('\n');
}

/**
 * Download the combined pack as a JSON file with UTF-8 BOM.
 *
 * Creates a Blob download link, triggers the download, and cleans up.
 */
export function downloadAiCopilotPack(context: AiCopilotContext, filename?: string): void {
  const json = buildAiCopilotExportJson(context);
  // UTF-8 BOM for proper encoding of CJK characters
  const bom = '﻿';
  const blob = new Blob([bom + json], { type: 'application/json;charset=utf-8;' });
  const dataUrl = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const defaultFilename = `ai-copilot-context-${timestamp}.json`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(dataUrl);
}

/**
 * Copy the prompt pack to clipboard.
 */
export async function copyAiCopilotPrompt(context: AiCopilotContext): Promise<void> {
  const prompt = buildAiCopilotPromptPack(context);
  await navigator.clipboard.writeText(prompt);
}

/**
 * Copy the combined pack to clipboard.
 */
export async function copyAiCopilotPack(context: AiCopilotContext): Promise<void> {
  const pack = buildAiCopilotCombinedPack(context);
  await navigator.clipboard.writeText(pack);
}
