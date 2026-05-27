/**
 * Scenario Export Pack (v1.37.0)
 *
 * Builds a sanitized, deterministic JSON export of a scenario comparison
 * for external analysis or archival.
 *
 * IMPORTANT: This module does NOT call any AI API. It only prepares data
 * for users to copy, download, or paste into external AI tools.
 *
 * RED LINES:
 * - Do NOT import from services/*
 * - Do NOT include sensitive user/workspace data
 * - Do NOT add persistence
 */

import type { ScenarioMultipliers, ScenarioDeltas } from './scenarioEngine';
import type { CalculationResult } from '../types';
import type { BpAnalysisModel } from './bpTargets';

// --- Interfaces ---

export interface ScenarioMetricSummary {
  totalRevenueUsd: number;
  totalForecastPcs: number;
  shortageMonthCount: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
}

export interface ScenarioExportPack {
  /** Always true for MVP - indicates this is an in-memory analysis */
  scenarioNotCommitted: boolean;
  /** Always true - results are deterministic */
  deterministic: boolean;
  /** ISO timestamp */
  generatedAt: string;
  /** App version */
  appVersion: string;
  /** Multiplier settings used */
  multipliers: {
    forecastVolume: number;
    unitPrice: number;
    coreCapacity: number;
    buCapacity: number;
  };
  /** Baseline summary metrics */
  baselineSummary: ScenarioMetricSummary;
  /** Scenario summary metrics */
  scenarioSummary: ScenarioMetricSummary;
  /** Key deltas */
  deltas: {
    totalRevenueUsd: { base: number | null; scenario: number | null; delta: number | null };
    totalForecastPcs: { base: number | null; scenario: number | null; delta: number | null };
    shortageMonthCount: { base: number | null; scenario: number | null; delta: number | null };
    bpAttainmentPct: { base: number | null; scenario: number | null; delta: number | null };
  };
  /** DQ caveats if any */
  dqCaveats: string[];
}

// --- Sensitive key detection ---

const SENSITIVE_KEYS = [
  'uid',
  'email',
  'token',
  'workspaceId',
  'userId',
  'member',
  'password',
  'secret',
  'apiKey',
];

/**
 * Check if a key matches any known sensitive key pattern.
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sk) => lowerKey === sk.toLowerCase());
}

// --- Helper: extract summary metrics ---

function extractSummary(
  calcResult: CalculationResult
): ScenarioMetricSummary {
  return {
    totalRevenueUsd: calcResult.totalRevenue,
    totalForecastPcs: calcResult.totalForecastPcs,
    shortageMonthCount: calcResult.shortageMonthCount,
    maxCoreUtilization: calcResult.maxCoreUtilization,
    maxBuUtilization: calcResult.maxBuUtilization,
  };
}

// --- Public API ---

/**
 * Build a ScenarioExportPack from comparison data.
 *
 * Always sets scenarioNotCommitted=true and deterministic=true.
 * Sanitizes all data to remove sensitive information.
 */
export function buildScenarioExportPack(
  multipliers: ScenarioMultipliers,
  baseline: { calcResult: CalculationResult; bpModel: BpAnalysisModel },
  scenario: { calcResult: CalculationResult; bpModel: BpAnalysisModel },
  deltas: ScenarioDeltas,
  dqCaveats: string[]
): ScenarioExportPack {
  const baselineSummary = extractSummary(baseline.calcResult);
  const scenarioSummary = extractSummary(scenario.calcResult);

  return {
    scenarioNotCommitted: true,
    deterministic: true,
    generatedAt: new Date().toISOString(),
    appVersion: 'v1.37.0',
    multipliers: {
      forecastVolume: multipliers.forecastVolume,
      unitPrice: multipliers.unitPrice,
      coreCapacity: multipliers.coreCapacity,
      buCapacity: multipliers.buCapacity,
    },
    baselineSummary,
    scenarioSummary,
    deltas: {
      totalRevenueUsd: {
        base: deltas.totalRevenueUsd.base,
        scenario: deltas.totalRevenueUsd.scenario,
        delta: deltas.totalRevenueUsd.delta,
      },
      totalForecastPcs: {
        base: deltas.totalForecastPcs.base,
        scenario: deltas.totalForecastPcs.scenario,
        delta: deltas.totalForecastPcs.delta,
      },
      shortageMonthCount: {
        base: deltas.shortageMonthCount.base,
        scenario: deltas.shortageMonthCount.scenario,
        delta: deltas.shortageMonthCount.delta,
      },
      bpAttainmentPct: {
        base: deltas.bpAttainmentPct.base,
        scenario: deltas.bpAttainmentPct.scenario,
        delta: deltas.bpAttainmentPct.delta,
      },
    },
    dqCaveats: [...dqCaveats],
  };
}

/**
 * Deep-check that no sensitive keys exist in the export pack.
 * Returns a sanitized copy with any sensitive keys removed.
 */
export function sanitizeExportPack(pack: ScenarioExportPack): ScenarioExportPack {
  return removeSensitiveData(pack) as ScenarioExportPack;
}

/**
 * Recursively remove sensitive keys from an object.
 */
function removeSensitiveData<T>(obj: T): T {
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

/**
 * Recursively sort object keys alphabetically for stable JSON output.
 */
function sortKeysDeep(obj: unknown): unknown {
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
 * Export the scenario pack as a JSON string with stable key ordering.
 * Keys are sorted alphabetically at every level.
 */
export function exportScenarioJson(pack: ScenarioExportPack): string {
  const sanitized = sanitizeExportPack(pack);
  const sorted = sortKeysDeep(sanitized);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Copy the scenario JSON to the clipboard.
 */
export async function copyScenarioJson(pack: ScenarioExportPack): Promise<void> {
  const json = exportScenarioJson(pack);
  await navigator.clipboard.writeText(json);
}

/**
 * Download the scenario JSON as a file with UTF-8 BOM.
 * Creates a Blob download link and cleans up after.
 */
export function downloadScenarioJson(pack: ScenarioExportPack, filename?: string): void {
  const json = exportScenarioJson(pack);
  // UTF-8 BOM for proper encoding of CJK characters
  const bom = '﻿';
  const blob = new Blob([bom + json], {
    type: 'application/json;charset=utf-8;',
  });
  const dataUrl = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const defaultFilename = `scenario-analysis-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(dataUrl);
}
