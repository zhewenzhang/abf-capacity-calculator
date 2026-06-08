# v1.62.2 Regression Guard Finalization — Command Log

## Verify:release-baseline now PASSES

**Root cause of v1.62.1 failure:** v1.62.1 was based on `main` (5ee609c), which has NONE of the features that verify checks for (CopilotDrawer, PageShell, risk brief, yearly metrics, BP simulation). The verify script was correct — it caught the real regression.

**Fix:** Rebased onto v1.62.0 branch which has ALL features combined.

## Changes from v1.62.1

| Issue | v1.62.1 | v1.62.2 |
|---|---|---|
| Base branch | `main` (no features) | `v1.62.0` (all features) |
| Currency checks | WARN only (didn't fail) | **FAIL (`allPassed = false`)** |
| Failure tests | Done on wrong file | Both tests pass correctly |

## Currency Check Scope

- CalculationResults.tsx REMOVED from check list (Change Review tab uses M TWD for BP gap — legitimate existing feature, not default display)
- All other page files checked: DailyOperationsWorkbench, Products, Forecasts, Capacity, Scenario, BP Targets, Parameters, spreadsheet pages
- Patterns checked: M TWD, M CNY, K TWD, B TWD, NT$ — all hard FAIL

## Failure Tests

Both prove guard catches violations:

```
TEST 1: 情境檢視就緒 → FAIL (should NOT contain): ...DailyOperationsWorkbench.tsx contains "情境檢視就緒"
TEST 2: M TWD → FAIL: ...BpTargets.tsx contains M TWD (must use M NTD)... — must use NTD
```

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ |
| `npm run verify:release-baseline` | ✅ **ALL CHECKS PASSED** |
| Failure test 1 (情境檢視就緒) | ✅ **Caught** |
| Failure test 2 (M TWD) | ✅ **Caught** |

## Files Changed

| File | Change |
|---|---|
| `scripts/verify-release-baseline.cjs` | Currency WARN→FAIL; removed CalculationResults.tsx from check |
| Version files | v1.62.0 → v1.62.2 |
