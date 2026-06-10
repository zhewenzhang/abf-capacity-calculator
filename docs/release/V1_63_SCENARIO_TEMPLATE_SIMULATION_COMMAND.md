# v1.63 Scenario Template Simulation — Command Log

## Summary

Migrated the operational scenario shortcuts from the Operations workbench to the /scenario page. Removed the old inline scenario v2 section with embedded results, replaced with a clean "Go to Scenario" navigation entry.

## Changes

### DailyOperationsWorkbench.tsx
- Removed SECTION 5B (Scenario v2 Shortcuts card with 3 buttons + result preview)
- Replaced with a simple "Go to Scenario" button linking to /scenario
- Removed unused `rawData` state, `scenarioV2Loading/scenarioV2Result` state
- Removed `handleRunScenarioV2` handler and related imports
- Cleaned up unused type imports (SKU, Forecast, CapacityPlan, ProjectParameters)

### i18n
- Added `workbench.scenario.templates` key to zhTW.ts and en.ts

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ |
| `npm run build` | ✅ |
| `npm test -- --run` | ✅ 64 files, 1546 tests |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Removed scenario v2 section; replaced with navigation button; cleaned up unused code |
| `frontend/src/i18n/zhTW.ts` | Added `workbench.scenario.templates` |
| `frontend/src/i18n/en.ts` | Added `workbench.scenario.templates` |
| Version files | v1.62.3 → v1.63.0 |

## Version

`v1.62.3` → `v1.63.0`
