# v1.43 - v1.45 Smoke Test Script

**Version**: v1.43.0 - v1.45.0
**Branch**: `xiaomi/v1-42-to-v1-45-operations-ai-marathon`
**Prerequisites**: App is running locally (`npm run dev`), user is authenticated, demo data loaded

---

## Pre-Test Setup

1. Start the dev server: `cd D:\abf-capacity-calculator\frontend && npm run dev`
2. Open browser to `http://localhost:5173`
3. Sign in with Google authentication
4. Open browser DevTools (F12) -> Console tab (keep open throughout test)
5. Load demo data: Dashboard -> Load Demo Data
6. Navigate to `/operations` to confirm workbench is operational

---

## v1.43 -- Abnormality Intelligence Layer

### Test 1: Abnormality Insights Render on Workbench

**Steps**:
1. Navigate to `/operations`
2. Locate the "Abnormality Intelligence" or "Insights" section
3. Verify insights are displayed with taxonomy labels

**Expected**: Insights appear with category badges (data-integrity, capacity-constraint, revenue-risk, etc.) and severity scores.

**Pass/Fail**: ____

### Test 2: Severity Ranking Order

**Steps**:
1. On the workbench, observe the abnormality list
2. Verify critical issues appear before warning issues
3. Verify warning issues appear before info issues
4. Verify each insight shows a numeric severity score

**Expected**: Strict descending order by composite severity score.

**Pass/Fail**: ____

### Test 3: Evidence Citations

**Steps**:
1. Click or expand an abnormality insight
2. Verify "Evidence" section is present
3. Verify evidence references specific data (e.g., SKU name, month, customer)

**Expected**: Each insight has at least one evidence citation pointing to actual data.

**Pass/Fail**: ____

### Test 4: "Why It Matters Today" Narrative

**Steps**:
1. Expand an abnormality insight
2. Locate the "Why it matters" or narrative section
3. Verify the text is contextually relevant to the abnormality

**Expected**: Narrative explains business impact in plain language, references current data state.

**Pass/Fail**: __--

### Test 5: Investigation Route

**Steps**:
1. Expand an abnormality insight
2. Verify an investigation route or suggested action is present
3. If a link is provided, verify it navigates to the correct page

**Expected**: Each insight provides a clear next step for investigation.

**Pass/Fail**: ____

### Test 6: Max 20 Insights Cap

**Steps**:
1. If you have a dataset with many DQ issues, verify the insight count
2. Count the number of displayed insights

**Expected**: Maximum 20 insights displayed, even if more raw abnormalities exist.

**Pass/Fail**: ____

### Test 7: Empty State

**Steps**:
1. If possible, load a dataset with zero data quality issues
2. Verify the abnormality section shows an empty state (not an error)

**Expected**: Graceful empty state with no JavaScript errors in console.

**Pass/Fail**: ____

---

## v1.44 -- Operational What-if Scenario v2

### Test 8: Capacity Delay Scenario

**Steps**:
1. Navigate to the scenario page or workbench scenario section
2. Select "Capacity Delay" scenario type
3. Set delay to 2 months
4. Run the scenario
5. Observe the comparison output

**Expected**: Scenario shows capacity shifted forward by 2 months, baseline unchanged, deltas computed correctly.

**Pass/Fail**: ____

### Test 9: Capacity Pull-Forward Scenario

**Steps**:
1. Select "Capacity Pull-Forward" scenario type
2. Set shift to 1 month
3. Run the scenario

**Expected**: Capacity entries shifted backward by 1 month, months outside range are dropped.

**Pass/Fail**: ____

### Test 10: Forecast Adjustment (Increase)

**Steps**:
1. Select "Forecast Adjustment" scenario type
2. Set adjustment to +10%
3. Run the scenario

**Expected**: All forecastPcs values increased by 10%, comparison shows positive delta.

**Pass/Fail**: ____

### Test 11: Forecast Adjustment (Decrease)

**Steps**:
1. Select "Forecast Adjustment" scenario type
2. Set adjustment to -20%
3. Run the scenario

**Expected**: All forecastPcs values decreased by 20%, comparison shows negative delta.

**Pass/Fail**: ____

### Test 12: Order Disappearance by Customer

**Steps**:
1. Select "Order Disappearance" scenario type
2. Select a specific customer from the dropdown
3. Run the scenario

**Expected**: Forecasts for that customer are removed, other customers unaffected, revenue delta shown.

**Pass/Fail**: ____

### Test 13: Customer/SKU Impact Table

**Steps**:
1. After running any scenario, locate the impact analysis table
2. Verify per-customer and per-SKU deltas are shown
3. Verify the table is sorted by absolute delta (largest first)

**Expected**: Impact table shows customer name, SKU, baseline value, scenario value, delta, delta%.

**Pass/Fail**: ____

### Test 14: What-if Caveat Display

**Steps**:
1. Run any scenario
2. Look for a disclaimer or caveat message
3. Verify the caveat mentions "what-if projection" or similar language

**Expected**: Every scenario result includes a visible caveat that this is a projection, not a prediction.

**Pass/Fail**: ____

### Test 15: Input Clamping

**Steps**:
1. Attempt to set capacity shift to 15 months (exceeds +12 limit)
2. Attempt to set forecast adjustment to 150% (exceeds +100% limit)
3. Run the scenarios

**Expected**: Values are clamped to max limits, no errors, scenario runs with clamped values.

**Pass/Fail**: ____

### Test 16: No Baseline Mutation

**Steps**:
1. Record the current forecast values on the forecast page
2. Run a forecast adjustment scenario (+10%)
3. Navigate back to the forecast page
4. Verify original forecast values are unchanged

**Expected**: Original data is never modified by scenario operations.

**Pass/Fail**: ____

---

## v1.45 -- Management Report Pack

### Test 17: Daily Report Generation

**Steps**:
1. Navigate to the report section (or trigger from workbench)
2. Select "Daily" report type
3. Generate the report

**Expected**: Report generates with today's date, contains executive summary, risk list, fix list, and narrative.

**Pass/Fail**: ____

### Test 18: Weekly Report Generation

**Steps**:
1. Select "Weekly" report type
2. Generate the report

**Expected**: Report generates with current week identifier (e.g., "2026-W22"), content reflects weekly aggregation.

**Pass/Fail**: ____

### Test 19: Risk List Content

**Steps**:
1. In the generated report, locate the Risk List section
2. Verify risks are sorted by severity (critical first)
3. Verify maximum 5 risks are shown

**Expected**: 1-5 risks displayed in descending severity order.

**Pass/Fail**: ____

### Test 20: Fix List Content

**Steps**:
1. Locate the Fix List section in the report
2. Verify only high-impact DQ issues are included
3. Verify low/medium issues are excluded

**Expected**: Fix list contains only actionable, high-impact items.

**Pass/Fail**: __--

### Test 21: Markdown Export

**Steps**:
1. Click "Export as Markdown" or equivalent button
2. Verify the downloaded/copied content is valid markdown
3. Verify it contains section headers, tables, and risk content

**Expected**: Valid markdown file with proper formatting, readable in any markdown viewer.

**Pass/Fail**: ____

### Test 22: JSON Export

**Steps**:
1. Click "Export as JSON" or equivalent button
2. Verify the output starts with UTF-8 BOM (for Excel compatibility)
3. Parse the JSON (after removing BOM) and verify it is valid
4. Verify keys are sorted alphabetically

**Expected**: Valid JSON with BOM prefix, sorted keys, all report sections included.

**Pass/Fail**: ____

### Test 23: Sensitive Key Stripping

**Steps**:
1. If possible, inject test data containing `apiKey: "test-value"` into a report section
2. Export the report as both markdown and JSON
3. Search the exported content for "test-value"

**Expected**: The apiKey value is stripped/masked in all export formats. The key name may appear but the value must not.

**Pass/Fail**: ____

### Test 24: Narrative Content

**Steps**:
1. Locate the Narrative section in the report
2. Verify it contains source references (citations to specific data)
3. Verify it includes a caveat about deterministic generation
4. Verify it includes key takeaways

**Expected**: Narrative is well-structured, references actual data, and disclaims its deterministic nature.

**Pass/Fail**: ____

### Test 25: Data Confidence Indicator

**Steps**:
1. Locate the executive summary section
2. Verify a data confidence level is displayed (high/medium/low/blocked)
3. Verify the confidence level matches the actual data quality state

**Expected**: Confidence badge is visible and accurately reflects data completeness.

**Pass/Fail**: ____

---

## Cross-Cutting Tests

### Test 26: i18n - English

**Steps**:
1. Set browser language to English (or switch app locale to English)
2. Navigate through workbench, scenarios, and reports
3. Verify all labels, buttons, and messages are in English

**Expected**: No raw i18n keys visible (e.g., no `workbench.title` displayed literally).

**Pass/Fail**: ____

### Test 27: i18n - Traditional Chinese

**Steps**:
1. Switch app locale to Traditional Chinese
2. Navigate through workbench, scenarios, and reports
3. Verify all labels, buttons, and messages are in Traditional Chinese

**Expected**: All strings properly translated, no English fallbacks for translated keys.

**Pass/Fail**: ____

### Test 28: Responsive - Desktop (1280px+)

**Steps**:
1. Set browser viewport to 1440px wide
2. Navigate through workbench, scenarios, and reports
3. Verify all layouts render correctly

**Expected**: Full-width layouts, no horizontal scroll, all content visible.

**Pass/Fail**: ____

### Test 29: Responsive - Tablet (768px-1279px)

**Steps**:
1. Set browser viewport to 1024px wide
2. Navigate through workbench, scenarios, and reports

**Expected**: Layouts adapt, tables are scrollable, no content overflow.

**Pass/Fail**: ____

### Test 30: Responsive - Mobile (<768px)

**Steps**:
1. Set browser viewport to 375px wide
2. Navigate through workbench, scenarios, and reports

**Expected**: Stacked layouts, touch-friendly targets, horizontal scroll on tables.

**Pass/Fail**: ____

### Test 31: Viewer Role

**Steps**:
1. Sign in as a viewer-role user (or mock viewer permissions)
2. Navigate to workbench, scenarios, and reports
3. Attempt to modify any scenario or trigger a save

**Expected**: All content is viewable, no edit/save/modify buttons visible, navigation works.

**Pass/Fail**: ____

### Test 32: Console Error Check

**Steps**:
1. Throughout all tests above, monitor the browser console
2. Count any JavaScript errors or unhandled promise rejections

**Expected**: Zero console errors during normal operation.

**Pass/Fail**: ____

### Test 33: Performance Check

**Steps**:
1. With demo data loaded, navigate to `/operations`
2. Measure page load time (DevTools Network tab)
3. Run a scenario and measure response time

**Expected**: Workbench loads within 2 seconds, scenario runs within 1 second.

**Pass/Fail**: ____

---

## Post-Test

### Cleanup
1. Close browser DevTools
2. Stop dev server (Ctrl+C in terminal)

### Results Summary

| Version | Tests | Passed | Failed | Blocked |
|---------|-------|--------|--------|---------|
| v1.43 Abnormality Intelligence | 7 | | | |
| v1.44 Operational Scenarios | 9 | | | |
| v1.45 Management Reports | 9 | | | |
| Cross-Cutting | 8 | | | |
| **Total** | **33** | | | |

### Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | | | |
| Product | | | |
| Engineering | | | |
