# v1.60.3 Global Copilot Drawer Regression Repair — Command Log

## Baseline
- **Branch:** `xiaomi/v1-60-3-global-copilot-drawer-regression-repair`
- **Baseline commit (main):** `5ee609c`
- **Author:** zhewenzhang

---

## Root Cause Investigation

### What happened

v1.60.2 branched from main (`5ee609c`) and did NOT include v1.60's global Copilot Drawer changes.

### Timeline of branches

| Branch | Changes | Merged to main? |
|---|---|---|
| `xiaomi/v1-59-results-risk-brief-executive-summary` | Risk brief redesign | ❌ Never merged |
| `xiaomi/v1-60-global-copilot-drawer-integration` | CopilotDrawer + topbar button | ❌ Never merged |
| `xiaomi/v1-60-1-results-risk-brief-regression-copilot-nav` | Risk brief restore + nav cleanup | ❌ Never merged |
| `xiaomi/v1-60-2-operations-pipeline-yearly-metrics` | Pipeline cleanup + yearly KPIs | ❌ Never merged |

**None of the branches were merged to main.** Each new branch started from `5ee609c` (main), losing all previous changes. This is a systemic workflow issue.

### Files lost in v1.60.2

- `frontend/src/components/copilot/CopilotDrawerContext.tsx` — missing
- `frontend/src/components/copilot/GlobalCopilotDrawer.tsx` — missing
- `frontend/src/App.tsx` — no CopilotDrawerProvider, no CopilotDrawerButton
- `frontend/src/pages/CalculationResults.tsx` — old risk brief code, no global drawer
- `frontend/src/pages/CalculationResults.test.tsx` — old test file
- `frontend/src/i18n/zhTW.ts` + `en.ts` — missing risk brief keys
- `frontend/src/core/aiCopilotContext.ts` — missing buildMinimalAiCopilotContext

### What survived from v1.60.2

- ✅ Pipeline readiness scenario removal (workbench.ts)
- ✅ Yearly metrics with year selector (DailyOperationsWorkbench.tsx)
- ✅ Stage length fixes in tests

---

## Fix Applied

Cherry-picked all missing files from `origin/xiaomi/v1-60-1-results-risk-brief-regression-copilot-nav`:

| File | Source |
|---|---|
| `frontend/src/components/copilot/CopilotDrawerContext.tsx` | v1.60.1 |
| `frontend/src/components/copilot/CopilotDrawerContext.test.tsx` | v1.60.1 |
| `frontend/src/components/copilot/GlobalCopilotDrawer.tsx` | v1.60.1 |
| `frontend/src/core/aiCopilotContext.ts` | v1.60.1 (for buildMinimalAiCopilotContext) |
| `frontend/src/App.tsx` | v1.60.1 (CopilotDrawerProvider + button, no AI in PRIMARY_NAV) |
| `frontend/src/pages/CalculationResults.tsx` | v1.60.1 (risk brief + global drawer) |
| `frontend/src/pages/CalculationResults.test.tsx` | v1.60.1 |
| `frontend/src/i18n/zhTW.ts` | v1.60.1 (risk brief keys) |
| `frontend/src/i18n/en.ts` | v1.60.1 (risk brief keys) |

Kept v1.60.2 changes intact (no overwrite):
- DailyOperationsWorkbench.tsx (yearly metrics)
- Core workbench.ts (scenario removal)
- Tests for pipeline/stages

---

## Verification Results

### Lint
```
npm run lint -- --quiet
→ No errors, no warnings
```

### Build
```
npm run build
→ ✓ built in 884ms
```

### Test
```
npm test -- --run
Test Files  63 passed (63)
Tests       1539 passed (1539)
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/copilot/CopilotDrawerContext.tsx` | Restored from v1.60.1 |
| `frontend/src/components/copilot/CopilotDrawerContext.test.tsx` | Restored from v1.60.1 |
| `frontend/src/components/copilot/GlobalCopilotDrawer.tsx` | Restored from v1.60.1 |
| `frontend/src/core/aiCopilotContext.ts` | Restored from v1.60.1 |
| `frontend/src/App.tsx` | Restored from v1.60.1; version bumped to v1.60.3 |
| `frontend/src/pages/CalculationResults.tsx` | Restored from v1.60.1 |
| `frontend/src/pages/CalculationResults.test.tsx` | Restored from v1.60.1 |
| `frontend/src/i18n/zhTW.ts` | Restored from v1.60.1 |
| `frontend/src/i18n/en.ts` | Restored from v1.60.1 |
| `frontend/package.json` | Version `1.60.2` → `1.60.3` |
| `frontend/package-lock.json` | Version `1.60.2` → `1.60.3` |
| `frontend/src/services/snapshotService.ts` | Version `v1.60.2` → `v1.60.3` |
| `frontend/src/App.tsx` | Version `v1.60.1` → `v1.60.3` |

*(v1.60.2 changes in DailyOperationsWorkbench.tsx, workbench.ts, and tests remain intact)*

---

## Anti-Regression Checks

| Check | Result |
|---|---|
| Topbar has AI drawer button (before language switcher) | ✅ |
| AI NOT in PRIMARY_NAV | ✅ |
| CopilotDrawerContext exists | ✅ |
| GlobalCopilotDrawer exists | ✅ |
| App.tsx has CopilotDrawerProvider | ✅ |
| CalculationResults has risk brief + global drawer | ✅ |
| v1.60.2 pipeline changes intact | ✅ |
| v1.60.2 yearly metrics intact | ✅ |

---

## Browser QA

**Browser QA 未执行**，原因是当前环境缺少可认证浏览器或截图能力。

---

## Deployment

```
firebase deploy --only hosting
```

---

## Deploy URL

`https://abf-capacity-calculator.web.app`
