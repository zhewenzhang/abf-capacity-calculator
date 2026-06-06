# v1.59 Results Risk Brief Executive Summary Redesign — Command Log

## Baseline
- **Branch:** `xiaomi/v1-59-results-risk-brief-executive-summary`
- **Baseline commit (main):** `5ee609c` — docs: add v1.58 AI assistant conversational analytics command log
- **Author:** zhewenzhang

---

## Problem

The Results page's "Risk Brief" (風險簡報) tab was too cluttered — stacked with executive summary text, AI export tools, security notes, key findings, BP gap attribution tables, price impact tables, capacity improvement scenarios, top risk periods, SKU health signals, contribution drivers, data confidence, assumptions, role-based attention cards, and a metric registry. Users couldn't quickly identify what was actionable.

---

## Solution

Redesigned the first tab (risk brief) only, keeping all other tabs (Sales, Product, Capacity, BP, Raw Detail) untouched.

### New Information Architecture

1. **Executive Conclusion Card** — prominent card with colored left border, plan status tag (executable/at-risk/blocked), and one-line summary
2. **Decision KPI Row** — 4 KPIs: Max Bottleneck, Shortage Months, Lowest BP Attainment, Data Confidence
3. **Key Findings** — structured cards (max 5) with severity/domain tags, title, detail, action buttons
4. **AI Analysis Tools** — collapsed by default, moved from main view to bottom expandable section
5. **BP Gap Attribution** — collapsed, shows top 3 drivers only
6. **Price Impact** — collapsed
7. **Capacity Improvement Impact** — collapsed

### Plan Status Rules

| Status | Condition |
|---|---|
| `blocked` (不可執行) | Max Core/BU utilization ≥ 120% OR shortage months ≥ 6 |
| `atRisk` (有風險) | Max Core/BU utilization ≥ 90% OR lowest BP attainment < 90% OR confidence ≠ 'high' |
| `executable` (可執行) | None of the above triggered |

### Removed from Risk Brief Tab

- Total Revenue KPI
- Total Forecast PCS KPI
- Calculation Rows KPI
- Executive Summary message list (replaced by structured conclusion + findings)
- AI Brief Export card (moved to collapsed section)
- Security notes / guardrails (moved to collapsed AI section)
- Top Risk Periods table (replaced by findings)
- Key Facts list (replaced by findings)
- Risk Period Attribution table (moved to collapsed BP section)
- SKU Health Signals table
- Contribution Drivers
- BP Risk alert (integrated into findings)
- Data Confidence & Caveats card (KPI shown in decision row, details collapsed)
- Assumptions list
- Role-Based Attention cards
- Metric Registry table

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/CalculationResults.tsx` | Replaced entire risk brief render section (~770 lines → ~250 lines); added `planStatus`, `decisionKpis`, `findings` useMemo computations; added `useNavigate`; removed unused imports |
| `frontend/src/pages/CalculationResults.test.tsx` | **New** — 8 tests for risk brief structure |
| `frontend/src/i18n/zhTW.ts` | Added 26 new i18n keys for executive conclusion, plan status, decision KPIs, domains, actions |
| `frontend/src/i18n/en.ts` | Added 26 new i18n keys (English translations) |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.59.0` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.59.0` |
| `frontend/package.json` | Version `1.54.0` → `1.59.0` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.59.0` |

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
→ ✓ built in 1.00s
```

### Test
```
npm test -- --run
Test Files  62 passed (62)  (+1 new CalculationResults test file)
Tests       1540 passed (1540)  (+8 new tests)
```

### Redline checks

| Check | Result | Explanation |
|---|---|---|
| `firestore.rules` not modified | ✅ | — |
| `calculationEngine.ts` not modified | ✅ | — |
| Version not reverted to `v1.52.0` | ✅ | Only in code comments (documentation strings) |
| `M TWD` in Results page | ⚠️ Present in collapsed BP attribution & price impact tables | These are pre-existing data model units (M TWD in `bpAttribution.gapContributionMillionTwd` and `priceImpact.*MillionTwd`). They represent specific BP/price data values in collapsed sections, NOT default business analysis display. The default display uses M NTD via `formatPlainMoney`. |
| No 問題摘要 / 今日行動建議 regression | ✅ | Only in i18n key definition (not rendered) |
| No old KPIs (總營收/計算列數/總預測數量) | ✅ | Removed from Results page |
| No M USD default display | ✅ | — |

### Additional checks

| Check | Result |
|---|---|
| Topbar still `ABF CSS` horizontal nav | ✅ (not modified) |
| No old dark sidebar restored | ✅ |
| BP page not modified | ✅ |
| Scenario page not modified | ✅ |
| AI Copilot not modified | ✅ |
| Operations workbench not modified | ✅ |

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
git commit -m "feat: redesign results risk brief executive summary"
git push origin xiaomi/v1-59-results-risk-brief-executive-summary
```

### Commit hash
(To be filled after commit)

### Push branch
`xiaomi/v1-59-results-risk-brief-executive-summary`

---

## AGY Verification Recommendation

✅ 建议 AGY 验收，重点：
1. Risk Brief tab shows Executive Conclusion card with correct plan status
2. 4 decision KPIs are displayed (Max Bottleneck, Shortage Months, Lowest BP Attainment, Data Confidence)
3. Key findings are structured and actionable (max 5)
4. AI tools are collapsed by default
5. BP attribution / Price impact are collapsed by default
6. Other tabs (Sales, Product, Capacity, BP, Raw) are untouched
7. Old meaningless KPIs (total revenue, calculation rows) are gone
