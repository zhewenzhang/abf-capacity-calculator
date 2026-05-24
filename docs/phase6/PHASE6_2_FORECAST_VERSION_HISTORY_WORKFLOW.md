# Phase 6.2: Forecast Version History Workflow

**Version**: v1.24.0
**Date**: 2026-05-24
**Status**: Completed

## Overview

Phase 6.2 upgrades snapshots from "scattered saves and comparisons" to a mature **Forecast Version History Workflow**. Users can now naturally manage multiple forecast versions:

- Which version is the current working version
- Which version is the BP baseline
- Which version is a customer update
- Which versions are worth comparing
- Which versions are outdated

## Key Features

### 1. Optional Snapshot Metadata

All metadata fields are optional for backward compatibility:

```typescript
interface SnapshotMetadata {
  kind?: SnapshotKind;           // Version type
  periodLabel?: string;          // e.g., "2026 BP", "2026-Q3 Update"
  reviewStatus?: SnapshotReviewStatus;  // Lifecycle status
  note?: string;                 // Additional notes
}
```

Old snapshots without metadata display safely with fallback values.

### 2. Version Type Tags (SnapshotKind)

| Kind | Color | Use Case |
|------|-------|----------|
| `working` | blue | Current work-in-progress |
| `bpBaseline` | green | Business Plan baseline |
| `customerUpdate` | orange | Customer-requested changes |
| `capacityReview` | purple | Capacity planning review |
| `scenario` | cyan | What-if scenarios |
| `archive` | default | Historical reference |

### 3. Review Status Tags (SnapshotReviewStatus)

| Status | Color | Meaning |
|--------|-------|---------|
| `draft` | default | Work in progress |
| `reviewed` | green | Reviewed and approved |
| `locked` | blue | No further changes allowed |
| `archived` | default | Historical reference only |

### 4. Simple Filtering

Users can filter snapshots by kind:
- All
- Working
- BP Baseline
- Customer Update
- Capacity Review
- Scenario
- Archive

### 5. Recommended Compare Pairs

Deterministic recommendation logic (no AI):

1. **Priority 1**: BP Baseline (oldest) vs latest Working/Customer Update
2. **Priority 2**: Latest two snapshots (sorted by createdAt)

### 6. Enhanced Create Modal

New fields (all optional):
- Version Type (SnapshotKind)
- Period Label (free text)
- Review Status (SnapshotReviewStatus)
- Note (free text)

Immutable warning displayed: "Versions are immutable after creation. To change metadata, delete and recreate."

### 7. Enhanced Version List

Displays:
- Kind tag (color-coded)
- Review status tag
- Period label
- Note (if present)
- Created time
- Created by
- App version
- Summary stats (SKU count, revenue, shortage months)

## Implementation

### New Files

- `frontend/src/core/snapshotMetadata.ts` — Pure helper functions
- `frontend/src/core/snapshotMetadata.test.ts` — 28 tests

### Modified Files

- `frontend/src/types/snapshot.ts` — Added SnapshotKind, SnapshotReviewStatus, SnapshotMetadata
- `frontend/src/services/snapshotService.ts` — Added metadata support, v1.24.0
- `frontend/src/pages/CalculationResults.tsx` — Enhanced UI with filters, tags, recommended pairs
- `frontend/src/i18n/en.ts` — Added Phase 6.2 strings
- `frontend/src/i18n/zhTW.ts` — Added Phase 6.2 strings
- `frontend/package.json` — v1.24.0
- `frontend/src/App.tsx` — v1.24.0

### Helper Functions

```typescript
// Label mapping
getKindLabel(kind: SnapshotKind | undefined): string
getReviewStatusLabel(status: SnapshotReviewStatus | undefined): string

// Color mapping
getKindColor(kind: SnapshotKind | undefined): string
getReviewStatusColor(status: SnapshotReviewStatus | undefined): string

// Filtering
snapshotMatchesFilter(snapshot, filterKind): boolean
filterSnapshotsByKind(snapshots, filterKind): SnapshotListItem[]

// Recommended pairs
getRecommendedComparePair(snapshots): RecommendedComparePair

// Utilities
hasMetadata(snapshot): boolean
getEffectiveKind(snapshot): SnapshotKind | undefined
getEffectiveReviewStatus(snapshot): SnapshotReviewStatus
getPeriodLabel(snapshot): string
```

## Constraints Upheld

- No Firestore rules changes
- No Firestore schema required field changes
- No Cloud Functions
- No AI API
- No Refine restoration
- No capacity/BP/currency formula changes
- No large UI redesign
- No Firestore rules deployment
- Snapshots remain immutable (no update allowed)

## Tests

28 tests in `snapshotMetadata.test.ts`:
- Kind label mapping (7 tests)
- Kind color mapping (7 tests)
- Review status label mapping (5 tests)
- Review status color mapping (5 tests)
- Filter matching (4 tests)
- Filter by kind (2 tests)
- Recommended compare pair (5 tests)
- Metadata helpers (7 tests)

## i18n

All new strings added to both `en.ts` and `zhTW.ts`:
- Version type labels (`versionKind.*`)
- Review status labels (`reviewStatus.*`)
- Filter labels (`changeReview.filter*`)
- Modal labels (`changeReview.versionType`, `periodLabel`, `reviewStatus`, `note`)
- Immutable warning (`changeReview.immutableWarning`)
- Recommended pair labels (`changeReview.recommendedPair`, `applyRecommended`)

## Future Considerations

- Email-link invites for workspace collaboration
- Monthly BP target input
- Real-time collaboration (Firestore listeners)
- Multi-project UI
- Per-month working days configuration
