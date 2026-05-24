/**
 * Tests for snapshotMetadata helpers (Phase 6.2).
 */

import { describe, it, expect } from 'vitest';
import type { SnapshotListItem } from '../types/snapshot';
import {
  getKindLabel,
  getKindColor,
  getReviewStatusLabel,
  getReviewStatusColor,
  snapshotMatchesFilter,
  filterSnapshotsByKind,
  getRecommendedComparePair,
  hasMetadata,
  getEffectiveKind,
  getEffectiveReviewStatus,
  getPeriodLabel,
} from './snapshotMetadata';

// Helper to create mock snapshot
function createMockSnapshot(
  id: string,
  overrides?: Partial<SnapshotListItem>
): SnapshotListItem {
  return {
    id,
    name: `Snapshot ${id}`,
    createdAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    sourceAppVersion: 'v1.24.0',
    derivedHighlights: {
      totalRevenueUsd: 1000000,
      totalForecastPcs: 10000,
      maxCoreUtilization: 0.8,
      maxBuUtilization: 0.7,
      shortageMonthCount: 2,
      worstBottleneckMonth: '2026-06',
      bpAttainment: 0.9,
      bpGapMillionTwd: -100,
      keyFindingsCount: 3,
      skuCount: 10,
      forecastMonthCount: 12,
    },
    ...overrides,
  };
}

describe('getKindLabel', () => {
  it('returns correct labels for each kind', () => {
    expect(getKindLabel('working')).toBe('Working');
    expect(getKindLabel('bpBaseline')).toBe('BP Baseline');
    expect(getKindLabel('customerUpdate')).toBe('Customer Update');
    expect(getKindLabel('capacityReview')).toBe('Capacity Review');
    expect(getKindLabel('scenario')).toBe('Scenario');
    expect(getKindLabel('archive')).toBe('Archive');
  });

  it('returns General for undefined', () => {
    expect(getKindLabel(undefined)).toBe('General');
  });
});

describe('getKindColor', () => {
  it('returns correct colors for each kind', () => {
    expect(getKindColor('working')).toBe('blue');
    expect(getKindColor('bpBaseline')).toBe('green');
    expect(getKindColor('customerUpdate')).toBe('orange');
    expect(getKindColor('capacityReview')).toBe('purple');
    expect(getKindColor('scenario')).toBe('cyan');
    expect(getKindColor('archive')).toBe('default');
  });

  it('returns default for undefined', () => {
    expect(getKindColor(undefined)).toBe('default');
  });
});

describe('getReviewStatusLabel', () => {
  it('returns correct labels for each status', () => {
    expect(getReviewStatusLabel('draft')).toBe('Draft');
    expect(getReviewStatusLabel('reviewed')).toBe('Reviewed');
    expect(getReviewStatusLabel('locked')).toBe('Locked');
    expect(getReviewStatusLabel('archived')).toBe('Archived');
  });

  it('returns Draft for undefined', () => {
    expect(getReviewStatusLabel(undefined)).toBe('Draft');
  });
});

describe('getReviewStatusColor', () => {
  it('returns correct colors for each status', () => {
    expect(getReviewStatusColor('draft')).toBe('default');
    expect(getReviewStatusColor('reviewed')).toBe('green');
    expect(getReviewStatusColor('locked')).toBe('blue');
    expect(getReviewStatusColor('archived')).toBe('default');
  });

  it('returns default for undefined', () => {
    expect(getReviewStatusColor(undefined)).toBe('default');
  });
});

describe('snapshotMatchesFilter', () => {
  it('returns true for all filter', () => {
    const snapshot = createMockSnapshot('1');
    expect(snapshotMatchesFilter(snapshot, 'all')).toBe(true);
  });

  it('returns true when kind matches filter', () => {
    const snapshot = createMockSnapshot('1', {
      metadata: { kind: 'working' },
    });
    expect(snapshotMatchesFilter(snapshot, 'working')).toBe(true);
  });

  it('returns false when kind does not match filter', () => {
    const snapshot = createMockSnapshot('1', {
      metadata: { kind: 'working' },
    });
    expect(snapshotMatchesFilter(snapshot, 'bpBaseline')).toBe(false);
  });

  it('returns false when kind is undefined but filter is specific', () => {
    const snapshot = createMockSnapshot('1');
    expect(snapshotMatchesFilter(snapshot, 'working')).toBe(false);
  });
});

describe('filterSnapshotsByKind', () => {
  it('returns all snapshots for all filter', () => {
    const snapshots = [
      createMockSnapshot('1', { metadata: { kind: 'working' } }),
      createMockSnapshot('2', { metadata: { kind: 'bpBaseline' } }),
    ];
    expect(filterSnapshotsByKind(snapshots, 'all')).toHaveLength(2);
  });

  it('filters by specific kind', () => {
    const snapshots = [
      createMockSnapshot('1', { metadata: { kind: 'working' } }),
      createMockSnapshot('2', { metadata: { kind: 'bpBaseline' } }),
      createMockSnapshot('3', { metadata: { kind: 'working' } }),
    ];
    const filtered = filterSnapshotsByKind(snapshots, 'working');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('1');
    expect(filtered[1].id).toBe('3');
  });
});

describe('getRecommendedComparePair', () => {
  it('returns null for less than 2 snapshots', () => {
    const snapshots = [createMockSnapshot('1')];
    const result = getRecommendedComparePair(snapshots);
    expect(result.baseId).toBeNull();
    expect(result.targetId).toBeNull();
    expect(result.reason).toContain('Need at least 2');
  });

  it('recommends BP Baseline vs latest Working', () => {
    const snapshots = [
      createMockSnapshot('bp-1', {
        createdAt: new Date('2026-01-01'),
        metadata: { kind: 'bpBaseline' },
      }),
      createMockSnapshot('work-1', {
        createdAt: new Date('2026-02-01'),
        metadata: { kind: 'working' },
      }),
      createMockSnapshot('work-2', {
        createdAt: new Date('2026-03-01'),
        metadata: { kind: 'working' },
      }),
    ];
    const result = getRecommendedComparePair(snapshots);
    expect(result.baseId).toBe('bp-1');
    expect(result.targetId).toBe('work-2');
    expect(result.reason).toContain('BP Baseline');
  });

  it('recommends BP Baseline vs latest Customer Update', () => {
    const snapshots = [
      createMockSnapshot('bp-1', {
        createdAt: new Date('2026-01-01'),
        metadata: { kind: 'bpBaseline' },
      }),
      createMockSnapshot('cust-1', {
        createdAt: new Date('2026-02-01'),
        metadata: { kind: 'customerUpdate' },
      }),
    ];
    const result = getRecommendedComparePair(snapshots);
    expect(result.baseId).toBe('bp-1');
    expect(result.targetId).toBe('cust-1');
  });

  it('falls back to latest two when no BP Baseline', () => {
    const snapshots = [
      createMockSnapshot('1', { createdAt: new Date('2026-01-01') }),
      createMockSnapshot('2', { createdAt: new Date('2026-02-01') }),
      createMockSnapshot('3', { createdAt: new Date('2026-03-01') }),
    ];
    const result = getRecommendedComparePair(snapshots);
    // Latest two: 3 (target) and 2 (base)
    expect(result.targetId).toBe('3');
    expect(result.baseId).toBe('2');
    expect(result.reason).toContain('Latest two');
  });

  it('uses oldest BP Baseline when multiple exist', () => {
    const snapshots = [
      createMockSnapshot('bp-1', {
        createdAt: new Date('2026-01-01'),
        metadata: { kind: 'bpBaseline' },
      }),
      createMockSnapshot('bp-2', {
        createdAt: new Date('2026-02-01'),
        metadata: { kind: 'bpBaseline' },
      }),
      createMockSnapshot('work-1', {
        createdAt: new Date('2026-03-01'),
        metadata: { kind: 'working' },
      }),
    ];
    const result = getRecommendedComparePair(snapshots);
    expect(result.baseId).toBe('bp-1'); // oldest BP Baseline
    expect(result.targetId).toBe('work-1');
  });
});

describe('hasMetadata', () => {
  it('returns false when metadata is undefined', () => {
    const snapshot = createMockSnapshot('1');
    expect(hasMetadata(snapshot)).toBe(false);
  });

  it('returns true when kind is set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { kind: 'working' } });
    expect(hasMetadata(snapshot)).toBe(true);
  });

  it('returns true when periodLabel is set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { periodLabel: '2026 BP' } });
    expect(hasMetadata(snapshot)).toBe(true);
  });

  it('returns true when reviewStatus is set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { reviewStatus: 'reviewed' } });
    expect(hasMetadata(snapshot)).toBe(true);
  });

  it('returns true when note is set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { note: 'Important' } });
    expect(hasMetadata(snapshot)).toBe(true);
  });

  it('returns false when metadata exists but all fields are undefined', () => {
    const snapshot = createMockSnapshot('1', { metadata: {} });
    expect(hasMetadata(snapshot)).toBe(false);
  });
});

describe('getEffectiveKind', () => {
  it('returns kind when set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { kind: 'working' } });
    expect(getEffectiveKind(snapshot)).toBe('working');
  });

  it('returns undefined when metadata is missing', () => {
    const snapshot = createMockSnapshot('1');
    expect(getEffectiveKind(snapshot)).toBeUndefined();
  });
});

describe('getEffectiveReviewStatus', () => {
  it('returns status when set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { reviewStatus: 'reviewed' } });
    expect(getEffectiveReviewStatus(snapshot)).toBe('reviewed');
  });

  it('returns draft as default', () => {
    const snapshot = createMockSnapshot('1');
    expect(getEffectiveReviewStatus(snapshot)).toBe('draft');
  });
});

describe('getPeriodLabel', () => {
  it('returns periodLabel when set', () => {
    const snapshot = createMockSnapshot('1', { metadata: { periodLabel: '2026 BP' } });
    expect(getPeriodLabel(snapshot)).toBe('2026 BP');
  });

  it('returns formatted date as fallback', () => {
    const snapshot = createMockSnapshot('1', {
      createdAt: new Date('2026-01-15'),
    });
    const label = getPeriodLabel(snapshot);
    expect(label).toContain('2026');
  });
});
