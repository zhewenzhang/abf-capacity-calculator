# v1.60.4 i18n Raw Key Audit and Fix — Command Log

## Baseline
- **Branch:** `xiaomi/v1-60-3-global-copilot-drawer-regression-repair` → renamed to `xiaomi/v1-60-4-i18n-raw-key-audit-fix`
- **Baseline commit (main):** `5ee609c`

---

## Root Cause

v1.60.3 restored i18n files from v1.60.1, which overwrote the `dashboard.annualRevenue` and `dashboard.yearlyMetricsNote` keys that were added in v1.60.2. The `t('dashboard.annualRevenue')` call in DailyOperationsWorkbench.tsx had no corresponding translation, so the raw key was displayed.

## Full Scan Results

Scanned 779 unique `t('...')` key references across all source files against 1309 keys defined in zhTW.ts and en.ts.

**18 missing keys found:**

| Key | File Where Used | Fix |
|---|---|---|
| `dashboard.annualRevenue` | DailyOperationsWorkbench.tsx | Added to both i18n files |
| `dashboard.yearlyMetricsNote` | DailyOperationsWorkbench.tsx | Added to both i18n files |
| `common.viewerReadOnly` | DailyOperationsWorkbench.tsx | Added to both i18n files |
| `results.description` | CalculationResults.tsx | Added to both i18n files |
| `results.months` | CalculationResults.tsx | Added to both i18n files |
| `products.deleteSuccess` | Products.tsx | Added to both i18n files |
| `products.invalidCurrency` | Products.tsx | Added to both i18n files |
| `products.unitPriceCurrency` | Products.tsx, DataQualityQuickFixDrawer.tsx | Added to both i18n files |
| `productsLab.title` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.description` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.save` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.total` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.rows` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.validate` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.blankRows` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.reload` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `productsLab.exportCsv` | ProductsSpreadsheetLab.tsx | Added to both i18n files |
| `parameters.usdToCny` | Parameters.tsx | Added to both i18n files |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/i18n/zhTW.ts` | Added 18 missing keys |
| `frontend/src/i18n/en.ts` | Added 18 missing keys |
| `frontend/src/App.tsx` | Version `v1.60.3` → `v1.60.4` |
| `frontend/src/services/snapshotService.ts` | Version `v1.60.3` → `v1.60.4` |
| `frontend/package.json` | Version `1.60.3` → `1.60.4` |
| `frontend/package-lock.json` | Version `1.60.3` → `1.60.4` |

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ Pass |
| `npm run build` | ✅ Pass (902ms) |
| `npm test -- --run` | ✅ 63 files, 1539 tests passed |
| zhTW.ts ↔ en.ts key parity (i18nKeys.test.ts) | ✅ Pass |

## Anti-Regression Checks

| Check | Result |
|---|---|
| v1.60/1/2/3 changes intact (global drawer, risk brief, yearly metrics) | ✅ |
| AI not in PRIMARY_NAV | ✅ |
| Topbar AI button exists | ✅ |

## Browser QA

**Browser QA 未执行** — 当前环境缺少可认证浏览器或截图能力。

## Deployment

```
firebase deploy --only hosting
```
