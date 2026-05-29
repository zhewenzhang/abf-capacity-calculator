# v1.42.0 Daily Operations Workbench -- Smoke Test Script

**Version**: 1.42.0
**Page**: Daily Operations Workbench
**Route**: `/operations`
**Prerequisites**: App is running locally (`npm run dev`), user is authenticated

---

## Pre-Test Setup

1. Start the dev server: `cd D:\abf-capacity-calculator\frontend && npm run dev`
2. Open browser to `http://localhost:5173`
3. Sign in with Google authentication
4. Open browser DevTools (F12) -> Console tab (keep open throughout test)
5. Ensure you have demo data loaded (Dashboard -> Load Demo Data) OR have real data

---

## Test 1: Route Accessibility

**Steps**:
1. Navigate to `http://localhost:5173/operations`
2. Verify the page renders (not a blank page or 404)
3. Verify the URL stays at `/operations` (no redirect to `/dashboard`)

**Expected**: Page renders the Daily Operations Workbench content.

**Pass/Fail**: ____

---

## Test 2: Sidebar Menu Item

**Steps**:
1. Look at the left sidebar menu
2. Find the "Operations" / "營運工作台" menu item
3. Click on it
4. Verify navigation to `/operations`

**Expected**: Menu item is visible, clickable, and navigates correctly.

**Pass/Fail**: ____

---

## Test 3: Workflow Stage Stepper

**Steps**:
1. On the `/operations` page, locate the workflow stage stepper
2. Count the number of stages displayed
3. Verify each stage has a status indicator (colored dot/icon)

**Expected**: 6 stages displayed with appropriate status colors.

**Pass/Fail**: ____

---

## Test 4: Stage Status Accuracy

**Steps**:
1. With demo data loaded, check each stage status:
   - Products: should be `ready` (demo data has SKUs)
   - Forecasts: should be `ready` (demo data has forecasts)
   - Capacity: should be `ready` (demo data has capacity plans)
   - Parameters: should be `ready` (demo data has params)
   - BP Targets: should be `ready` or `warning` (depending on BP config)
   - Analysis: should be `ready` or `warning` (if shortage months exist)

**Expected**: Status indicators match the data state.

**Pass/Fail**: ____

---

## Test 5: CTA Button Navigation

**Steps**:
1. Click the Products stage CTA button
2. Verify navigation to `/products`
3. Navigate back to `/operations`
4. Click the Forecasts stage CTA button
5. Verify navigation to `/forecasts`
6. Repeat for Capacity (`/capacity`), Parameters (`/parameters`), BP Targets (`/bp-targets`)

**Expected**: Each CTA navigates to the correct page.

**Pass/Fail**: ____

---

## Test 6: Abnormality Summary

**Steps**:
1. Scroll to the abnormality summary section
2. Verify issues are present (if data has quality issues or shortages)
3. Verify issues are grouped by domain
4. Verify severity badges are colored correctly (red=critical, orange=warning, blue=info)

**Expected**: Abnormalities display correctly with proper grouping and severity.

**Pass/Fail**: ____

---

## Test 7: Look-Ahead Focus Table

**Steps**:
1. Locate the look-ahead focus table
2. Verify it shows upcoming months
3. Check that months with high utilization (>85%) or shortage are highlighted
4. Verify bottleneck column shows "Core", "BU", or "None"

**Expected**: Table shows up to 6 months with correct utilization data.

**Pass/Fail**: ____

---

## Test 8: Revenue / BP Summary

**Steps**:
1. Locate the Revenue/BP summary section
2. Verify it shows:
   - Current forecast revenue (number)
   - BP target (number or "No Target")
   - Attainment percentage
   - Gap amount
   - Status badge (Met/Watch/Miss/No Target)

**Expected**: All fields display correctly with appropriate formatting.

**Pass/Fail**: ____

---

## Test 9: Scenario Shortcuts

**Steps**:
1. Locate the scenario shortcut cards
2. Count the number of shortcuts (should be 5)
3. Click "Volume +10%" shortcut
4. Verify navigation to `/scenario` with volume parameter applied

**Expected**: 5 scenario shortcuts present, clicking navigates to scenario page.

**Pass/Fail**: ____

---

## Test 10: Copilot Quick Action

**Steps**:
1. Locate the copilot quick action link/button
2. Click it
3. Verify navigation to `/copilot`

**Expected**: Link navigates to the AI Copilot page.

**Pass/Fail**: ____

---

## Test 11: Internationalization (EN)

**Steps**:
1. Set language to English (EN) in the header
2. Verify all text on the `/operations` page is in English
3. Check for any raw key strings (e.g., `workbench.stage.products` instead of translated text)

**Expected**: All text displays in English, no raw keys visible.

**Pass/Fail**: ____

---

## Test 12: Internationalization (zh-TW)

**Steps**:
1. Set language to Traditional Chinese (zh-TW) in the header
2. Verify all text on the `/operations` page is in Traditional Chinese
3. Check for any raw key strings or missing translations

**Expected**: All text displays in Traditional Chinese, no raw keys visible.

**Pass/Fail**: ____

---

## Test 13: Mobile Responsive (375px)

**Steps**:
1. Open DevTools -> Toggle device toolbar (Ctrl+Shift+M)
2. Set viewport to 375px x 812px (iPhone 13 size)
3. Verify the page layout adapts:
   - No horizontal scrollbar
   - Text is readable (not truncated or overlapping)
   - Buttons are tappable (min 44px touch target)
   - Sidebar is collapsed or hidden

**Expected**: Page is usable on mobile viewport.

**Pass/Fail**: ____

---

## Test 14: Console Hygiene

**Steps**:
1. With DevTools Console open, navigate to `/operations`
2. Perform all above tests
3. Check for:
   - Red error messages
   - Uncaught exceptions
   - Firestore write operations (should be none)
   - External AI API calls (should be none)

**Expected**: No console errors, no Firestore writes, no external AI calls.

**Pass/Fail**: ____

---

## Test 15: Empty Data State

**Steps**:
1. Clear all data (or use a fresh account with no data)
2. Navigate to `/operations`
3. Verify the page handles empty state gracefully:
   - No crashes or blank pages
   - Stages show `blocked` or `notStarted` status
   - Empty state messages displayed

**Expected**: Page renders gracefully with empty data.

**Pass/Fail**: ____

---

## Test 16: Viewer Role (Read-Only)

**Steps**:
1. Sign in as a viewer role user (or mock viewer permissions)
2. Navigate to `/operations`
3. Verify:
   - Page renders normally
   - No edit/save/modify buttons visible
   - CTA navigation buttons still work
   - Read-only mode indicator visible

**Expected**: Viewer sees read-only version of the workbench.

**Pass/Fail**: ____

---

## Summary

| Test | Description | Result |
|------|-------------|--------|
| 1 | Route Accessibility | ____ |
| 2 | Sidebar Menu Item | ____ |
| 3 | Workflow Stage Stepper | ____ |
| 4 | Stage Status Accuracy | ____ |
| 5 | CTA Button Navigation | ____ |
| 6 | Abnormality Summary | ____ |
| 7 | Look-Ahead Focus Table | ____ |
| 8 | Revenue / BP Summary | ____ |
| 9 | Scenario Shortcuts | ____ |
| 10 | Copilot Quick Action | ____ |
| 11 | i18n EN | ____ |
| 12 | i18n zh-TW | ____ |
| 13 | Mobile Responsive | ____ |
| 14 | Console Hygiene | ____ |
| 15 | Empty Data State | ____ |
| 16 | Viewer Role | ____ |

**Total**: ____/16 passed

**Tester**: ____________
**Date**: ____________
**Notes**: ____________
