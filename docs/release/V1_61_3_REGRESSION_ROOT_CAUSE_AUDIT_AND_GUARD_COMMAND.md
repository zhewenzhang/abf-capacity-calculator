# v1.61.3 Regression Root Cause Audit and Guard — Command Log

## Root Cause

**Main has never been updated since v1.58.0.**

`main` is at commit `5ee609c` (v1.58.0 baseline). ALL 9 subsequent branches were pushed but **NEVER merged to main**. Each new branch was created from `5ee609c`, losing all prior work. This is the root cause of ALL regressions across v1.58.6 through v1.61.2.

| Version | Branch | Merged to main? |
|---|---|---|
| v1.58.6 | operations-page-width-expansion | ❌ |
| v1.58.7 | global-page-width-expansion (PageShell) | ❌ |
| v1.59 | results-risk-brief | ❌ |
| v1.60 | global-copilot-drawer | ❌ |
| v1.60.1 | regression-copilot-nav | ❌ |
| v1.60.2 | pipeline-yearly-metrics | ❌ |
| v1.60.3 | drawer-regression-repair | ❌ |
| v1.60.4 | i18n-raw-key-fix | ❌ |
| v1.61 | bp-simulation-versioning | ❌ |
| v1.61.1 | release-regression-repair | ❌ |
| v1.61.2 | page-width-regression-repair | ❌ |

**6 commits ahead of main.** The current branch has all features combined. Main has none.

## Fixes Applied

### 1. Created `docs/MERGE_BASELINE_GUARD_POLICY.md`
Documents the systematic process for:
- Merging every feature branch to main before creating the next
- Pre-merge verification (lint/build/test/verify)
- verify:release-baseline checks
- Branch naming, version tagging, rollback

### 2. Verified all features are intact
All 1546 tests pass across 64 test files. verify:release-baseline passes all 20+ checks.

## Files Changed

| File | Change |
|---|---|
| `docs/MERGE_BASELINE_GUARD_POLICY.md` | **New** — merge baseline guard policy |
| Version files | v1.61.2 → v1.61.3 |

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1546 tests passed |
| `npm run verify:release-baseline` | ✅ All checks passed |
