# v1.58.5 Operations KPI Replace Total Revenue With 5-Year Revenue CAGR

## 1. Baseline Commit

```
5ee609c docs: add v1.58 AI assistant conversational analytics command log
```

Branch: `xiaomi/v1-58-5-operations-kpi-revenue-cagr`

---

## 2. Problem

The "Executive KPIs" strip in the Operations Workbench shows:
- 總營收: 112,014.1 M NTD

This is the sum of all years' revenue, which has no business meaning.

## 3. Solution

Replace with: 5 年營收 CAGR (5Y Revenue CAGR)

Formula: CAGR = (lastYearRevenue / firstYearRevenue) ^ (1 / numberOfPeriods) - 1

Using the analytics model's `yearlyHealth[].revenue` (in USD, converted to TWD via `convertFromUsd`).

Window: 5 years from earliest available year (typically 2026–2030)
Periods: 4 (2026→2030)

## 4. Modified Files

| File | Change |
|------|--------|
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Replace first KPI cell with CAGR |
| `frontend/src/i18n/zhTW.ts` | Add CAGR i18n key |
| `frontend/src/i18n/en.ts` | Add CAGR i18n key |
| `frontend/src/App.tsx` | Version v1.58.5 |
| `frontend/src/services/snapshotService.ts` | Version v1.58.5 |
| `frontend/package.json` | Version v1.58.5 |
| `docs/release/...` | This file |

## 5. Test / Lint / Build

```
Build:     ✅ tsc -b && vite build — success
Lint:      ✅ eslint . --quiet — clean (0 errors)
Tests:     ✅ 1531 passed, 1 pre-existing timeout (DailyOperationsWorkbench dynamic import), 61 test files
```

## 6. Redline

| File | Status |
|------|--------|
| `firestore.rules` | ✅ Unchanged |
| `calculationEngine.ts` | ✅ Unchanged |
| v1.52.0 references | ✅ Only in comments |
| M TWD / M CNY / NT$ / ¥ | ✅ No new violations (existing i18n keys only) |
| 問題摘要 / 今日行動建議 | ✅ Not modified |

## 7. Deploy

```
Hosting URL: https://abf-capacity-calculator.web.app
Status:      ✅ Deploy complete
Functions:   Not modified
```

## 8. Commit

```
Commit hash: 10145ea
Branch: xiaomi/v1-58-5-operations-kpi-revenue-cagr
```
