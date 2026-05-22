# Smoke Test Checklist

Use this checklist before Firebase Hosting release when product-risk tests or release code changes land.

## Dashboard

- [ ] Page loads after Google sign-in without setup/config errors.
- [ ] KPI cards show current SKU, forecast PCS, revenue, utilization, and shortage values.
- [ ] Currency switch changes revenue display between USD and TWD without stale values.
- [ ] Language switch changes visible labels between English and Traditional Chinese.
- [ ] BP attainment section shows target, forecast revenue, attainment, gap, and no-target rows correctly.
- [ ] Empty SKU or forecast data does not leave old Dashboard model/highlight/BP values visible.

## Products

- [ ] Create a SKU with chip dimensions, layer count, size category, customer, application, grade, OSAT, and price.
- [ ] Edit the SKU and confirm derived/display fields remain valid.
- [ ] Delete the SKU only after confirmation.
- [ ] Products Spreadsheet Lab opens and supports paste/edit/save path for SKU rows.

## Forecasts

- [ ] Forecast grid loads SKU rows and month columns.
- [ ] Edit one monthly forecast cell, save, reload, and confirm the saved value persists.
- [ ] Batch yearly growth generates only empty target years from previous-year monthly SKU demand.
- [ ] Growth rate 0%, positive, and negative cases produce expected PCS changes.
- [ ] Existing target-year SKU data is not overwritten by growth generation.
- [ ] After save/generation/reload, old unsaved editing state is not visible.

## Capacity

- [ ] Capacity grid loads factory/month data.
- [ ] Edit Core and BU panel/day values, save, reload, and confirm persistence.
- [ ] Fill Forward copies a selected month to subsequent months.
- [ ] Month, quarter, and year views aggregate consistently.
- [ ] Capacity trend charts render Core, BU, and monthly capacity without console errors.

## Results

- [ ] Results page loads with SKU-month detail and monthly capacity summary.
- [ ] Sales, Product Planning, Capacity, Raw, and BP Analysis tabs render.
- [ ] BP Analysis year/quarter/month views show ascending periods and correct target allocation.
- [ ] BU capacity zero with BU demand shows shortage clearly instead of division-by-zero output.
- [ ] Empty SKU or forecast data does not leave old Results model/BP values visible.

## Settings

- [ ] Yield matrix edits save and reload.
- [ ] Panel parameter edits save and reload.
- [ ] Working days edits affect capacity summary after recalculation.
- [ ] Currency settings save and affect TWD conversion with constant/yearly exchange rates.
- [ ] BP targets are entered and persisted in million TWD.

## Release Gate

- [ ] `npm run test` passes.
- [ ] `npm run lint -- --quiet` has 0 errors.
- [ ] `npm run build` succeeds.
- [ ] Version is consistent in `frontend/package.json`, `frontend/src/App.tsx`, and `README.md`.
- [ ] Firebase project is `abf-capacity-calculator` before deploy.
