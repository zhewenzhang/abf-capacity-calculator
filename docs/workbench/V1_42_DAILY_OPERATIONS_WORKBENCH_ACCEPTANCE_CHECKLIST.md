# v1.42.0 Daily Operations Workbench -- Acceptance Checklist

**Date**: 2026-05-28
**Branch**: `xiaomi/v1-42-daily-operations-workbench`
**Page**: `frontend/src/pages/DailyOperationsWorkbench.tsx`
**Route**: `/operations`
**Core module**: `frontend/src/core/workbench.ts`

---

## 1. Route and Navigation

- [ ] `/operations` route is accessible (returns 200, renders page)
- [ ] Menu item "Operations" / "營運工作台" is visible in sidebar
- [ ] Menu item navigates to `/operations` on click
- [ ] Direct URL navigation to `/operations` works
- [ ] Unknown routes still redirect to `/dashboard` (not `/operations`)

## 2. Workflow Stage Stepper

- [ ] Workflow stage stepper renders with 6 stages (products, forecasts, capacity, parameters, bpTargets, analysis)
- [ ] Each stage displays its I18n label correctly
- [ ] Each stage shows the correct status indicator:
  - [ ] `ready` -- green/success indicator
  - [ ] `warning` -- orange/warning indicator
  - [ ] `blocked` -- red/error indicator
  - [ ] `notStarted` -- grey/disabled indicator
- [ ] CTA buttons render for stages that have a non-null `cta` route
- [ ] CTA buttons navigate to the correct pages:
  - [ ] Products stage CTA -> `/products`
  - [ ] Forecasts stage CTA -> `/forecasts`
  - [ ] Capacity stage CTA -> `/capacity`
  - [ ] Parameters stage CTA -> `/parameters`
  - [ ] BP Targets stage CTA -> `/bp-targets`
  - [ ] Scenario stage CTA -> `/scenario`

## 3. Abnormality Summary

- [ ] Abnormality summary section renders
- [ ] Issues are grouped by domain (data, capacity, sales, bp, scenario)
- [ ] Issues are sorted by severity (critical first, then warning, then info)
- [ ] Each issue shows title, detail, severity badge, and source page link
- [ ] Maximum 10 abnormalities displayed

## 4. Look-Ahead Focus Table

- [ ] Look-ahead focus table renders
- [ ] Shows next 6 months (or fewer if data ends sooner)
- [ ] Each row shows month, Core utilization, BU utilization, bottleneck, shortage flag
- [ ] Months with utilization > 85% or shortage are highlighted
- [ ] Empty state handled gracefully when no future data exists

## 5. Revenue / BP Summary

- [ ] Revenue/BP summary section renders
- [ ] Shows current forecast revenue vs BP target
- [ ] Shows attainment percentage
- [ ] Shows gap (forecast - target)
- [ ] Status badge shows correct status: met / watch / miss / no-target

## 6. Scenario Shortcuts

- [ ] Scenario shortcut cards render (5 presets)
- [ ] Each shortcut shows label and description
- [ ] Clicking a scenario shortcut navigates to `/scenario` with appropriate params
- [ ] All 5 presets are present: volume-up-10, volume-down-10, capacity-up-20, price-up-5, stress-test

## 7. Copilot Quick Actions

- [ ] Copilot quick action link renders
- [ ] Clicking navigates to `/copilot`

## 8. Role-Based Access

- [ ] Viewer role: page renders in read-only mode
- [ ] Viewer role: no edit/save/modify buttons visible
- [ ] Viewer role: CTA navigation buttons still work (read-only navigation is allowed)
- [ ] Editor/Owner role: all interactive elements are enabled

## 9. Internationalization (i18n)

- [ ] English (EN) locale: all labels display correctly
- [ ] Traditional Chinese (zh-TW) locale: all labels display correctly
- [ ] All `workbench.*` keys exist in both `en.ts` and `zhTW.ts`
- [ ] No missing translation keys (fallback to raw key string)
- [ ] No mojibake or encoding issues in zh-TW strings

## 10. Responsive Layout

- [ ] Desktop 1920px: full layout renders correctly
- [ ] Tablet 768px: layout adapts (stacked or reflowed)
- [ ] Mobile 375px: layout is usable (no horizontal overflow, readable text)
- [ ] Sidebar collapses on mobile breakpoint

## 11. Console and Network Hygiene

- [ ] No console errors (red) on page load
- [ ] No console warnings related to missing keys or undefined values
- [ ] No Firestore write operations triggered by page load (read-only aggregation)
- [ ] No external AI API calls triggered by page load
- [ ] No unhandled promise rejections

## 12. Performance

- [ ] Page loads within 2 seconds on typical data set (< 100 SKUs, 12 months forecast)
- [ ] No visible layout shifts after initial render
- [ ] Loading spinner shown during async data fetch

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | Agent 7 | 2026-05-28 | Pending |
| Dev | Agent 4 | -- | Pending |
| Review | Agent 1 | -- | Pending |
