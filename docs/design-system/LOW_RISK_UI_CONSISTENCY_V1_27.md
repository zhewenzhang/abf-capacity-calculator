# Low-Risk UI Consistency (v1.27.0)

## Overview

This document describes the visual consistency improvements made in v1.27.0. This is a **style-only** release with no changes to data logic, services, or business rules.

## Scope of Changes

### What Was Changed

1. **Spreadsheet Grid Visual Unification**
   - Unified `react-datasheet-grid` styling across all lab pages
   - Header background matches Ant Design Table header (`#fafafa`)
   - Active cell selection uses Ant Design primary blue (`#1677ff`)
   - Dirty cell highlighting uses Ant Design warning color (`#faad14`)
   - Disabled/read-only cells have subtle gray background
   - Row hover effect consistent with Ant Design
   - Scrollbar styling for grid containers
   - Added `.spreadsheet-wrapper` class for horizontal scroll

2. **Empty State Component**
   - Added `EmptyState` component in `components/common/EmptyState.tsx`
   - Uses Ant Design `Empty` component
   - Applied to Forecasts Lab and Capacity Lab empty states
   - Consistent padding and typography

3. **Page Loading Component**
   - Unified `PageLoading` component usage across lab pages
   - Replaced inline loading spinners

4. **CSS Class Organization**
   - Added comprehensive stylesheet rules in `index.css`
   - Organized by component type with clear comments
   - Reusable classes: `.spreadsheet-wrapper`, `.empty-state-container`, `.toolbar-card`

### What Was NOT Changed

The following were deliberately **not** modified per task constraints:

1. **Data Services** - No changes to any `*Service.ts` files
2. **Core Logic** - No changes to calculation engine, BP targets, capacity, currency
3. **Firestore Rules** - No changes
4. **Data Semantics**:
   - `empty` / `null` / `0` / `missing` meanings unchanged
   - `unitPrice` fallback logic unchanged
   - BP target = 0 vs missing target distinction unchanged
   - Forecast delete/save behavior unchanged
   - Viewer/Editor/Owner permission logic unchanged
   - Proportional attribution vs causality wording unchanged

## Component Usage Guidelines

### Table Component Selection

| Use Case | Component | Notes |
|----------|-----------|-------|
| Dashboard / Results analysis tables | Ant Design `Table` | Read-only, analysis-grade |
| Products/Capacity/Forecasts Lab | `react-datasheet-grid` | Excel-like editing, experimental |
| Settings / Parameters | Ant Design `Form` | Low-frequency settings |
| Snapshot list | Ant Design `Table` | Standard CRUD |

### Empty State Usage

```tsx
import { EmptyState } from '../components/common';

<EmptyState
  title="No SKUs Available"
  description="Please add products first."
  actionLabel="Add Product"
  onAction={() => navigate('/products')}
/>
```

### Spreadsheet Wrapper

```tsx
<div className="spreadsheet-wrapper">
  <DataSheetGrid ... />
</div>
```

## Future Work

The following issues were identified but **deferred to future versions**:

1. **Viewer Read-Only UX**: The current read-only banner could be more prominent. Consider adding visual cues directly on disabled cells.

2. **NaN / Empty / 0 Display**: Some analysis tables may show confusing values for missing data. This requires careful semantic analysis and is out of scope for visual-only updates.

3. **Attribution Copy**: The "proportional vs causal" disclaimer could be more prominent in Results page. Requires UX research.

4. **Mobile Responsiveness**: Spreadsheet grids are not mobile-optimized. Consider alternative input methods for mobile users.

5. **Unit Price Missing Warning**: When SKU has no price, new forecasts are created with price 0. Consider adding a visual warning in the grid.

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/index.css` | Added spreadsheet grid styles, empty state styles |
| `frontend/src/components/common/EmptyState.tsx` | New component |
| `frontend/src/components/common/index.ts` | Export new components |
| `frontend/src/pages/ForecastsSpreadsheetLab.tsx` | Use unified components and styles |
| `frontend/src/pages/CapacitySpreadsheet.tsx` | Use unified components and styles |
| `frontend/src/pages/ProductsSpreadsheetLab.tsx` | Use unified components and styles |
| `frontend/package.json` | Version 1.27.0 |
| `frontend/src/App.tsx` | Version v1.27.0 |
| `frontend/src/services/snapshotService.ts` | APP_VERSION v1.27.0 |
| `README.md` | Feature list update |

## Testing

All changes are visual/CSS only. Standard test suite passes:
- `npm run test` - All tests pass
- `npm run lint -- --quiet` - No errors
- `npm run build` - Build succeeds

No new tests added since changes are purely presentational.
