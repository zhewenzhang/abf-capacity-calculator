# v1.58.6 Operations Page Width Expansion — Command Log

## Baseline
- **Branch:** `xiaomi/v1-58-6-operations-page-width-expansion`
- **Baseline commit (main):** `5ee609c` — docs: add v1.58 AI assistant conversational analytics command log
- **Author:** zhewenzhang

---

## Problem

Operations workbench content area too narrow (constrained by global `max-width: 1280px` on `.twk-main`). On 1920px screens, around 320px of whitespace appears on each side. Pipeline Readiness, Executive KPIs, BP Analysis, Utilization charts, and Operational Drivers cards are all constrained to the narrow middle column, wasting available horizontal space.

---

## Solution

Added a local CSS class `twk-page--wide` on the Operations page root div, scoped via CSS `:has()` selector to conditionally widen the parent `.twk-main` layout only when the Operations page is active.

### Width strategy

| Property | Before | After |
|---|---|---|
| `.twk-main` max-width (global) | `1280px` | `1280px` (unchanged for all other pages) |
| `.twk-main:has(.twk-page--wide)` max-width | — | `1560px` |
| `.twk-main:has(.twk-page--wide)` width | — | `min(100% - 48px, 1560px)` |

### Responsive padding (`.twk-main:has(.twk-page--wide)` only)

| Breakpoint | padding-inline |
|---|---|
| ≥1600px (large desktop) | `32px` |
| Default (desktop) | inherited (unchanged global padding) |
| ≤768px (tablet) | `20px` |
| ≤480px (mobile) | `12px` |

### Pipeline Readiness grid

Updated `minmax()` from `160px` to `180px` to better utilize the wider layout:

```diff
- grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
+ grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
```

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/styles/tweakcnTheme.css` | Added `.twk-page--wide` class, `.twk-main:has(.twk-page--wide)` override, responsive padding rules; updated readiness grid min-width to 180px |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Added `twk-page--wide` to root div (3 states: render, error, empty) |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Added 4 new tests for wide layout class, old sidebar/issue-summary regression guards; fixed currency mock to use actual implementation; increased timeout for dynamic import test |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.58.6` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.58.6` |
| `frontend/package.json` | Version `1.54.0` → `1.58.6` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.58.6` |

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
→ ✓ built in 1.60s
```

### Test
```
npm test -- --run
Test Files  61 passed (61)
Tests       1536 passed (1536)
```

### Redline checks

| Check | Result |
|---|---|
| `firestore.rules` not modified | ✅ |
| `frontend/src/core/calculationEngine.ts` not modified | ✅ |
| Version not reverted to `v1.52.0` | ✅ (only in code comments) |
| No `M TWD` / `M CNY` / `K TWD` / `B TWD` / `NT$` / `¥` as default display | ✅ (only in BP-specific i18n contexts) |
| No 問題摘要 / 今日行動建議 regression | ✅ (only in test assertions confirming absence) |
| Topbar still `ABF CSS` horizontal nav | ✅ (not modified) |
| No old dark sidebar restored | ✅ (test confirms) |

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
git commit -m "fix: expand operations page content width"
git push origin xiaomi/v1-58-6-operations-page-width-expansion
```

### Commit hash
(To be filled after commit)

### Push branch
`xiaomi/v1-58-6-operations-page-width-expansion`

---

## AGY Verification Recommendation

✅ 建议 AGY 验收，重点：
1. 1920px 宽屏下左右空白明显减少
2. Pipeline Readiness 卡片分布更合理
3. BP chart / 营运指标 / 风险雷达更宽
4. Mobile 375px 无横向溢出
5. 仅 Operations 页面受影响，其他页面不变
