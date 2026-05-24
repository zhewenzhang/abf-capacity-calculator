/**
 * Snapshot metadata helpers for Forecast Version History Workflow (Phase 6.2).
 *
 * Pure helper functions for:
 * - Label mappings (kind, review status)
 * - Recommended compare pair selection
 * - Filtering helpers
 *
 * All functions are deterministic — no AI, no external API calls.
 */

import type { SnapshotListItem, SnapshotKind, SnapshotReviewStatus } from '../types/snapshot';

/**
 * Get display label for snapshot kind.
 */
export function getKindLabel(kind: SnapshotKind | undefined): string {
  switch (kind) {
    case 'working':
      return 'Working';
    case 'bpBaseline':
      return 'BP Baseline';
    case 'customerUpdate':
      return 'Customer Update';
    case 'capacityReview':
      return 'Capacity Review';
    case 'scenario':
      return 'Scenario';
    case 'archive':
      return 'Archive';
    default:
      return 'General';
  }
}

/**
 * Get color for snapshot kind tag.
 */
export function getKindColor(kind: SnapshotKind | undefined): string {
  switch (kind) {
    case 'working':
      return 'blue';
    case 'bpBaseline':
      return 'green';
    case 'customerUpdate':
      return 'orange';
    case 'capacityReview':
      return 'purple';
    case 'scenario':
      return 'cyan';
    case 'archive':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Get display label for review status.
 */
export function getReviewStatusLabel(status: SnapshotReviewStatus | undefined): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'reviewed':
      return 'Reviewed';
    case 'locked':
      return 'Locked';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

/**
 * Get color for review status tag.
 */
export function getReviewStatusColor(status: SnapshotReviewStatus | undefined): string {
  switch (status) {
    case 'draft':
      return 'default';
    case 'reviewed':
      return 'green';
    case 'locked':
      return 'blue';
    case 'archived':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Check if a snapshot matches a filter kind.
 */
export function snapshotMatchesFilter(
  snapshot: SnapshotListItem,
  filterKind: SnapshotKind | 'all'
): boolean {
  if (filterKind === 'all') return true;
  return snapshot.metadata?.kind === filterKind;
}

/**
 * Filter snapshots by kind.
 */
export function filterSnapshotsByKind(
  snapshots: SnapshotListItem[],
  filterKind: SnapshotKind | 'all'
): SnapshotListItem[] {
  if (filterKind === 'all') return snapshots;
  return snapshots.filter((s) => snapshotMatchesFilter(s, filterKind));
}

export type RecommendedCompareReason =
  | 'insufficientSnapshots'
  | 'bpBaselineVsLatestUpdate'
  | 'latestTwoVersions';

/**
 * Recommended compare pair result.
 */
export interface RecommendedComparePair {
  baseId: string | null;
  targetId: string | null;
  reasonKey: RecommendedCompareReason;
}

/**
 * Get recommended compare pair deterministically.
 *
 * Priority:
 * 1. BP Baseline (oldest) vs latest Working/Customer Update
 * 2. Latest two snapshots
 *
 * Returns null values if insufficient snapshots.
 */
export function getRecommendedComparePair(
  snapshots: SnapshotListItem[]
): RecommendedComparePair {
  if (snapshots.length < 2) {
    return {
      baseId: null,
      targetId: null,
      reasonKey: 'insufficientSnapshots',
    };
  }

  // Find BP Baseline (oldest if multiple)
  const bpBaselines = snapshots.filter(
    (s) => s.metadata?.kind === 'bpBaseline'
  );

  // Find Working or Customer Update (latest)
  const workingOrCustomerUpdate = snapshots.filter(
    (s) => s.metadata?.kind === 'working' || s.metadata?.kind === 'customerUpdate'
  );

  // Priority 1: BP Baseline (oldest) vs latest Working/Customer Update
  if (bpBaselines.length > 0 && workingOrCustomerUpdate.length > 0) {
    // Sort BP Baselines by createdAt ascending (oldest first)
    const sortedBpBaselines = [...bpBaselines].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const base = sortedBpBaselines[0];

    // Sort Working/Customer Update by createdAt descending (latest first)
    const sortedWorking = [...workingOrCustomerUpdate].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const target = sortedWorking[0];

    // Ensure they're different snapshots
    if (base.id !== target.id) {
      return {
        baseId: base.id,
        targetId: target.id,
        reasonKey: 'bpBaselineVsLatestUpdate',
      };
    }
  }

  // Priority 2: Latest two snapshots
  const sortedByDate = [...snapshots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    baseId: sortedByDate[1].id,
    targetId: sortedByDate[0].id,
    reasonKey: 'latestTwoVersions',
  };
}

/**
 * Check if metadata is missing (for backward compatibility display).
 */
export function hasMetadata(snapshot: SnapshotListItem): boolean {
  return (
    snapshot.metadata !== undefined &&
    (snapshot.metadata.kind !== undefined ||
      snapshot.metadata.periodLabel !== undefined ||
      snapshot.metadata.reviewStatus !== undefined ||
      snapshot.metadata.note !== undefined)
  );
}

/**
 * Get effective kind with fallback.
 */
export function getEffectiveKind(snapshot: SnapshotListItem): SnapshotKind | undefined {
  return snapshot.metadata?.kind;
}

/**
 * Get effective review status with fallback to 'draft'.
 */
export function getEffectiveReviewStatus(snapshot: SnapshotListItem): SnapshotReviewStatus {
  return snapshot.metadata?.reviewStatus ?? 'draft';
}

/**
 * Get period label or fallback to created date.
 */
export function getPeriodLabel(snapshot: SnapshotListItem): string {
  if (snapshot.metadata?.periodLabel) {
    return snapshot.metadata.periodLabel;
  }
  // Fallback to created date
  return new Date(snapshot.createdAt).toLocaleDateString();
}

/**
 * All available filter options.
 */
export const SNAPSHOT_FILTER_OPTIONS: Array<{ value: SnapshotKind | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'working', label: 'Working' },
  { value: 'bpBaseline', label: 'BP Baseline' },
  { value: 'customerUpdate', label: 'Customer Update' },
  { value: 'capacityReview', label: 'Capacity Review' },
  { value: 'scenario', label: 'Scenario' },
  { value: 'archive', label: 'Archive' },
];
