/**
 * Snapshot types for Forecast Versioning (Phase 6).
 *
 * A snapshot captures the complete state of a project's data at a point in time,
 * allowing comparison between two versions to understand what changed.
 *
 * Phase 6.2: Added optional metadata for Forecast Version History Workflow.
 * All metadata fields are optional for backward compatibility.
 */

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from './index';

/**
 * Snapshot kind / version type for categorization.
 */
export type SnapshotKind =
  | 'working'
  | 'bpBaseline'
  | 'customerUpdate'
  | 'capacityReview'
  | 'scenario'
  | 'archive';

/**
 * Review status for snapshot lifecycle tracking.
 */
export type SnapshotReviewStatus =
  | 'draft'
  | 'reviewed'
  | 'locked'
  | 'archived';

/**
 * Optional metadata for Forecast Version History Workflow (Phase 6.2).
 * All fields are optional to maintain backward compatibility with existing snapshots.
 */
export interface SnapshotMetadata {
  /** Version type / category */
  kind?: SnapshotKind;
  /** Human-readable period label, e.g. "2026 BP", "2026-Q3 Update" */
  periodLabel?: string;
  /** Review lifecycle status */
  reviewStatus?: SnapshotReviewStatus;
  /** Additional notes */
  note?: string;
}

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
  /** Optional metadata (Phase 6.2) */
  metadata?: SnapshotMetadata;
}

/**
 * Payload for creating a new snapshot.
 */
export interface CreateSnapshotPayload {
  name: string;
  description?: string;
  rawInputs: SnapshotRawInputs;
  derivedHighlights: SnapshotDerivedHighlights;
  /** Optional metadata (Phase 6.2) */
  metadata?: SnapshotMetadata;
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
  /** Optional metadata (Phase 6.2) */
  metadata?: SnapshotMetadata;
}
