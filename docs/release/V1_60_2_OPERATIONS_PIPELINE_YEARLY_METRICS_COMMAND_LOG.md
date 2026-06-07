# v1.60.2 Operations Pipeline Cleanup + Yearly KPI Metrics — Command Log

## Baseline
- **Branch:** `xiaomi/v1-60-2-operations-pipeline-yearly-metrics`
- **Baseline commit (main):** `5ee609c`
- **Author:** zhewenzhang

---

## Changes Summary

### Part 1 — Remove Scenario Readiness from Pipeline

Deleted the "scenario" stage from `buildWorkbenchViewModel()` in `workbench.ts` (stage id `'scenario'`, label `'workbench.stage.scenario'`). This card had a hardcoded status of `'notStarted'` and did not contribute to operational readiness assessment.

### Part 2 — Yearly Metrics

Replaced the "Executive KPIs" section (which showed multi-year aggregate values for total revenue, max utilization, shortage months) with a yearly metrics section that:
- Shows a year selector (Segmented pill) above the KPIs
- Displays 6 KPIs for the selected year only:
  - Annual Revenue (yearly revenue, NOT multi-year aggregate)
  - Max Core Utilization
  - Max BU Utilization
  - Shortage Months (year count)
  - BP Attainment
  - Data Confidence (overall)
- Amounts in M NTD
- Small footnote: "Metrics calculated for the selected year. Amounts in M NTD."

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/core/workbench.ts` | Removed scenario stage from stages array; removed `scenarioStatus` variable |
| `frontend/src/core/workbench.test.ts` | Removed 3 scenario stage tests; changed `toHaveLength(7)` → `toHaveLength(6)` |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Removed scenario from `STAGE_ICONS`; added `metricsYear` state; replaced Executive KPI strip with yearly metrics section with year selector |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Removed scenario from `makeViewModel`; changed stage length from 7→6; added timeout fix |
| `frontend/src/i18n/zhTW.ts` | Added `dashboard.annualRevenue`, `dashboard.yearlyMetricsNote` |
| `frontend/src/i18n/en.ts` | Added `dashboard.annualRevenue`, `dashboard.yearlyMetricsNote` |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.60.2` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.60.2` |
| `frontend/package.json` | Version `1.54.0` → `1.60.2` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.60.2` |

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
→ ✓ built in 1.57s
```

### Test
```
npm test -- --run
Test Files  61 passed (61)
Tests       1529 passed (1529)  (-3 scenario stage tests)
```

### Redline checks

| Check | Result |
|---|---|
| `firestore.rules` not modified | ✅ |
| `calculationEngine.ts` not modified | ✅ |
| Scenario readiness removed | ✅ (no references remain) |
| New i18n keys added | ✅ (annualRevenue, yearlyMetricsNote) |
| Old KPI keys preserved for other pages | ✅ (totalRevenue, shortageMonths still in i18n) |

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
