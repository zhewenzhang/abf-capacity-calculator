# v1.58.7 Global Page Content Width Expansion — Command Log

## Baseline
- **Branch:** `xiaomi/v1-58-7-global-page-width-expansion`
- **Baseline commit (main):** `5ee609c` — docs: add v1.58 AI assistant conversational analytics command log
- **Author:** zhewenzhang

---

## Problem

The v1.58.6 Operations-only width expansion pilot (unmerged) showed that reducing left/right whitespace significantly improves screen utilization. However, all other pages (Products, Forecasts, Capacity, Results, Scenario, BP, Parameters, Copilot) remained constrained to the global `max-width: 1280px`, wasting horizontal space on wide screens.

The solution needed to be extracted into a reusable PageShell pattern rather than replicated per-page.

---

## Solution

### 1. Abstracted PageShell Component

Created a reusable React component at:

```
frontend/src/components/layout/PageShell.tsx
```

**API:**
```tsx
<PageShell variant="wide|standard|narrow|full">
  {children}
</PageShell>
```

### 2. Four Variants

| Variant | max-width | Intended pages |
|---|---|---|
| `narrow` | 960px | Text-heavy / form-only (future use) |
| `standard` | 1280px | Settings pages — matches current `.twk-main` default |
| `wide` | 1560px (desktop)<br>1640px (≥1800px screen) | Table / chart / dashboard pages |
| `full` | none (no constraint) | Custom layouts (copilot, etc.) |

### 3. CSS Architecture

The width override uses `.twk-main:has(.abf-page-shell--wide)` to conditionally widen the parent `<main>` container **only** when a wide-variant page shell is present inside it. This means:

- Pages without PageShell or with `standard` variant → keep the current 1280px width
- Pages with `wide` variant → get 1560px–1640px width
- Pages with `full` variant → no width constraint
- Other pages (Dashboard redirect, Login, Setup) → completely unaffected

Responsive padding for wide variant on large desktops (≥1800px): `padding-inline: 32px`.

### 4. Page Assignments

| Page | Variant |
|---|---|
| `/operations` (DailyOperationsWorkbench) | `wide` |
| `/products` (Products) | `wide` |
| `/forecasts` (Forecasts) | `wide` |
| `/capacity` (CapacityPlan) | `wide` |
| `/results` (CalculationResults) | `wide` |
| `/scenario` (ScenarioPlanning) | `wide` |
| `/bp-targets` (BpTargets) | `wide` |
| `/parameters` (Parameters) | `standard` |
| `/copilot` (AiCopilot) | `full` |
| `/products-sheet-lab` (ProductsSpreadsheetLab) | `wide` |
| `/forecasts-lab` (ForecastsSpreadsheetLab) | `wide` |
| `/capacity-lab` (CapacitySpreadsheet) | `wide` |

### 5. Old Narrow Containers Removed

- Removed `maxWidth: 1200` inline style from `ScenarioPlanning.tsx` (replaced by `wide` variant)
- Removed `maxWidth: 800` inline style from `AiCopilot.tsx` (replaced by `full` variant)

### 6. Retained Narrow Containers

- `CopilotChat.tsx`: `maxWidth: 960` — this is the internal chat bubble width, independent of page layout
- New `narrow` variant CSS: `max-width: 960px` — available for future form-only pages

---

## Files Changed

### New files
| File | Description |
|---|---|
| `frontend/src/components/layout/PageShell.tsx` | Reusable page shell component with variant prop |
| `frontend/src/components/layout/PageShell.test.tsx` | 7 tests for PageShell render, variants, className |

### Modified files
| File | Change |
|---|---|
| `frontend/src/styles/tweakcnTheme.css` | Added `.abf-page-shell` CSS rules with 4 variant classes + `:has()` selectors |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Replaced 3x `<div className="twk-page">` with `<PageShell variant="wide">` |
| `frontend/src/pages/Products.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/Forecasts.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/CapacityPlan.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/CalculationResults.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/ScenarioPlanning.tsx` | Replaced inline `maxWidth: 1200` style with `<PageShell variant="wide">` |
| `frontend/src/pages/BpTargets.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/Parameters.tsx` | Replaced root div with `<PageShell variant="standard">` |
| `frontend/src/pages/AiCopilot.tsx` | Replaced `maxWidth: 800` inline style with `<PageShell variant="full">` |
| `frontend/src/pages/ProductsSpreadsheetLab.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/ForecastsSpreadsheetLab.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/pages/CapacitySpreadsheet.tsx` | Replaced root div with `<PageShell variant="wide">` |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.58.7` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.58.7` |
| `frontend/package.json` | Version `1.54.0` → `1.58.7` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.58.7` |

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
→ ✓ built in 915ms
```

### Test
```
npm test -- --run
Test Files  62 passed (62)  (+1 new PageShell test file)
Tests       1539 passed (1539)  (+7 new PageShell tests)
```

### Redline checks

| Check | Result |
|---|---|
| `firestore.rules` not modified | ✅ |
| `frontend/src/core/calculationEngine.ts` not modified | ✅ |
| Version not reverted to `v1.52.0` | ✅ (only in code comments) |
| No `M TWD` / `M CNY` / `K TWD` / `B TWD` / `NT$` / `¥` as default display | ✅ (only in BP-specific i18n/calc contexts) |
| No 問題摘要 / 今日行動建議 regression | ✅ (only in i18n key definition) |
| Topbar still `ABF CSS` horizontal nav | ✅ (not modified) |
| No old dark sidebar restored | ✅ |
| Old narrow containers (960/1000/1080) | ✅ Only CopilotChat bubble width remains (intentional); narrow variant CSS is new |

### PageShell verification

```
rg "PageShell|abf-page-shell" frontend/src
→ 13 page files use PageShell, CSS defines all 4 variants
```

---

## Browser QA

**Browser QA 未执行**，原因是当前环境缺少可认证浏览器或截图能力。
本次仅以 test / lint / build 与代码级检查替代，仍建议 AGY 或人工浏览器复验。

---

## Deployment

```
firebase deploy --only hosting
```

---

## Deploy URL

`https://abf-capacity-calculator.web.app`

---

## Commits

```
git add .
git commit -m "feat: expand global page content width"
git push origin xiaomi/v1-58-7-global-page-width-expansion
```

### Commit hash
(To be filled after commit)

### Push branch
`xiaomi/v1-58-7-global-page-width-expansion`

---

## AGY Verification Recommendation

✅ 建议 AGY 验收，重点：
1. 所有 wide 页面（/operations, /products, /forecasts, /capacity, /results, /scenario, /bp-targets）1920px 下左右空白明显减少
2. /parameters 使用 standard variant，不过宽
3. /copilot 不受 PageShell 影响
4. Mobile 375px 无横向溢出
5. 无页面级横向滚动条
6. 顶栏导航不受影响
