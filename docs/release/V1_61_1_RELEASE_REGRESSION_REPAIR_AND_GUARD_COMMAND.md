# v1.61.1 Release Regression Repair & Guard — Command Log

## Baseline
- **Branch:** `xiaomi/v1-61-1-release-regression-repair`
- **Baseline commit (main):** `5ee609c`

---

## Root Cause

**Systemic problem: ALL previous feature branches were pushed but NEVER merged to main.**

| Branch | Features | Merged to main? |
|---|---|---|
| v1.58.7 | PageShell wide layout | ❌ Never merged |
| v1.59 | Risk brief redesign | ❌ Never merged |
| v1.60 | Global AI drawer | ❌ Never merged |
| v1.60.1 | Risk brief restore + nav cleanup | ❌ Never merged |
| v1.60.2 | Pipeline cleanup + yearly KPIs | ❌ Never merged |
| v1.60.3 | Drawer regression repair | ❌ Never merged |
| v1.60.4 | i18n raw key fixes | ❌ Never merged |
| v1.61 | BP simulation + versioning | ❌ Never merged |

Each new branch started from `5ee609c` (main), losing ALL previous work. v1.61 deployed with only BP simulation, wiping out v1.58.7 through v1.60.4 features.

## Fix Applied

1. **Reset to v1.60.4** (`6ad735c`) — the last branch with ALL features combined
2. **Cherry-picked v1.61 BP simulation** (`536d15b`) on top
3. **Resolved version conflicts** (package.json, package-lock.json, App.tsx, snapshotService.ts)
4. **Updated version to v1.61.1**

### Features now combined
- ✅ **v1.58.7**: PageShell wide layout (abf-page-shell classes)
- ✅ **v1.59**: Risk brief executive summary redesign
- ✅ **v1.60**: Global AI drawer + topbar button
- ✅ **v1.60.1**: Nav cleanup (AI removed from PRIMARY_NAV)
- ✅ **v1.60.2**: Pipeline readiness cleanup + yearly metrics
- ✅ **v1.60.3**: Drawer regression repair
- ✅ **v1.60.4**: i18n raw key fixes
- ✅ **v1.61**: BP simulation + version history

### New: verify:release-baseline script
Created `scripts/verify-release-baseline.cjs` and added npm script:
```
npm run verify:release-baseline
```
Checks:
- Version ≥ v1.60.x
- CopilotDrawerProvider/Button/GlobalCopilotDrawer exist
- Risk brief (executiveConclusion, planStatus) exists
- Yearly metrics (metricsYear, annualRevenue) exist
- BP simulation (simActive, handleSaveVersion) exists
- AI NOT in PRIMARY_NAV
- No 問題摘要 / 今日行動建議 regressed content

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Restored all features; version v1.60.4 → v1.61.1 |
| `frontend/src/pages/BpTargets.tsx` | Cherry-picked BP simulation from v1.61 |
| `frontend/src/i18n/zhTW.ts` | Cherry-picked BP simulation keys from v1.61 |
| `frontend/src/i18n/en.ts` | Cherry-picked BP simulation keys from v1.61 |
| `frontend/package.json` | Added `verify:release-baseline` script; version 1.60.4 → 1.61.1 |
| `frontend/package-lock.json` | Version 1.60.4 → 1.61.1 |
| `frontend/src/services/snapshotService.ts` | Version v1.60.4 → v1.61.1 |
| `scripts/verify-release-baseline.cjs` | **New** — release baseline verification script |
| `docs/release/V1_61_1_..._COMMAND.md` | **New** — this file |

## Verification Results

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ Pass |
| `npm run build` | ✅ Pass (901ms) |
| `npm test -- --run` | ✅ 63 files, 1539 tests passed |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Deployment

```
firebase deploy --only hosting
```
