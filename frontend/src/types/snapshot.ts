/**
 * Snapshot types for Forecast Versioning (Phase 6).
 *
 * A snapshot captures the complete state of a project's data at a point in time,
 * allowing comparison between two versions to understand what changed.
 */

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from './index';

/**
 * Raw inputs captured in a snapshot.
 */
export interface SnapshotRawInputs {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  parameters: ProjectParameters;
}

/**
 * Derived highlights computed from the raw inputs at snapshot time.
 * These are stored to avoid re-computation and to show summary in list view.
 */
export interface SnapshotDerivedHighlights {
  totalRevenueUsd: number;
  totalForecastPcs: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
  shortageMonthCount: number;
  worstBottleneckMonth: string | null;
  bpAttainment: number | null;
  bpGapMillionTwd: number | null;
  keyFindingsCount: number;
  skuCount: number;
  forecastMonthCount: number;
}

/**
 * Complete snapshot document stored in Firestore.
 */
export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  sourceAppVersion: string;
  scope: 'personal' | 'workspace';
  workspaceId?: string;
  rawInputs: SnapshotRawInputs;
  derivedHighlights: SnapshotDerivedHighlights;
}

/**
 * Payload for creating a new snapshot.
 */
export interface CreateSnapshotPayload {
  name: string;
  description?: string;
  rawInputs: SnapshotRawInputs;
  derivedHighlights: SnapshotDerivedHighlights;
}

/**
 * Snapshot list item (lighter weight for list view).
 */
export interface SnapshotListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  sourceAppVersion: string;
  derivedHighlights: SnapshotDerivedHighlights;
}
