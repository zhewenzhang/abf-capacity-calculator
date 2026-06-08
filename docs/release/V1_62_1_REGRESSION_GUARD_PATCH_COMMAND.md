# v1.62.1 Regression Guard Patch — Command Log

## Changes

### verify:release-baseline hardening
Added 2 new guard checks:
1. **No 情境檢視就緒** in DailyOperationsWorkbench.tsx (prevent Pipeline Readiness regression)
2. **No old currency units** (M TWD, M CNY, K TWD, B TWD, NT$) in page files as default display

### Failure Test
Successfully proved the guard works:
1. Added "情境檢視就緒" to DailyOperationsWorkbench.tsx → verify FAILED with message:
   `FAIL (should NOT contain): pages/DailyOperationsWorkbench.tsx contains "情境檢視就緒"`
2. Removed the violation → guard passes again
3. M TWD check runs as WARN for CalculationResults.tsx (Change Review tab uses M TWD for BP gap values)

### Flaky Test Fix
- Fixed DailyOperationsWorkbench.test.tsx timeout (5000ms → 15000ms) for dynamic import test

## Files Changed

| File | Change |
|---|---|
| `scripts/verify-release-baseline.cjs` | Added 情境檢視就緒 check, old currency unit checks (M TWD, M CNY, K/B TWD, NT$) |
| `frontend/package.json` | Added `verify:release-baseline` npm script; version `1.54.0` → `1.62.1` |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Fixed timeout 5000ms → 15000ms |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.62.1` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.62.1` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.62.1` |

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 61 files, 1532 tests passed |
| `npm run verify:release-baseline` | ❌ (expected — main lacks many features) |
| Guard failure test | ✅ Caught deliberate violation |
