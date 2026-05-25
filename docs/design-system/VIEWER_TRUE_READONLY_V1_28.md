# Viewer True Read-only (v1.28.0)

## Overview

This document describes the viewer read-only enforcement improvements made in v1.28.0. This is a **UI/interaction-only** release that ensures Workspace Viewers cannot edit cells or paste data into spreadsheet grids, not just that they cannot save.

## Problem Statement

Prior to v1.28.0, the read-only enforcement was inconsistent:
- Save buttons were disabled, but viewers could still edit cells locally
- Paste operations could change local state (even if not persisted)
- Some spreadsheet columns were not marked as disabled for viewers

## Pages Modified

### 1. Products Spreadsheet Lab (`ProductsSpreadsheetLab.tsx`)

| Protection | Implementation |
|------------|----------------|
| Column disabled | All editable columns have `disabled: !writable` |
| onChange guard | `handleChange` returns early if `!writable` |
| Read-only warning | Alert component shown when `!writable` |
| Button disabled | Save, Add Rows buttons disabled when `!writable` |

### 2. Capacity Lab (`CapacitySpreadsheet.tsx`)

| Protection | Implementation |
|------------|----------------|
| Column disabled | All month columns have `disabled: !writable` |
| onChange guard | Both `handleCoreRowsChange` and `handleBuRowsChange` return early if `!writable` |
| Read-only warning | Alert component shown when `!writable` |
| Spreadsheet wrapper | Both Core and BU grids wrapped in `.spreadsheet-wrapper` |
| Button disabled | Save button disabled when `!writable` |

### 3. Forecasts Lab (`ForecastsSpreadsheetLab.tsx`)

| Protection | Implementation |
|------------|----------------|
| Column disabled | Month columns already had `disabled: !writable` |
| onChange guard | `handleRowsChange` now returns early if `!writable` |
| Read-only warning | Alert component already shown when `!writable` |
| Button disabled | Save button already disabled when `!writable` |

### 4. BP Targets Page

**Status: Not yet implemented in main branch**

BP Targets page will be created in a future version. When implemented, it should follow the same read-only enforcement patterns documented here.

## Implementation Pattern

### Column Disabled Pattern

```tsx
const columns = useMemo(() => {
  return [
    keyColumn<RowType, 'fieldName'>('fieldName', {
      ...columnType,
      title: 'Column Title',
      disabled: !writable,  // Key: disable column for viewers
    }),
    // ... other columns
  ];
}, [writable]);  // Dependency on writable
```

### onChange Guard Pattern

```tsx
const handleChange = useCallback((newRows: RowType[]) => {
  // Guard: Prevent state changes for viewers
  if (!writable) return;
  setRows(newRows);
}, [writable]);
```

### Read-only Warning Pattern

```tsx
{!writable && (
  <Alert
    message={t('common.readOnlyMode')}
    description={t('common.readOnlyDesc')}
    type="warning"
    showIcon
    style={{ marginBottom: 8 }}
  />
)}
```

## What Was NOT Changed

Per task constraints, the following were deliberately NOT modified:

1. **Services** - No changes to any `*Service.ts` files
2. **Core Logic** - No changes to calculation engine, formulas, or business logic
3. **Firestore Rules** - No changes
4. **Data Semantics**:
   - empty / null / 0 / missing meanings unchanged
   - unitPrice fallback unchanged
   - forecast save/delete behavior unchanged
   - BP target logic unchanged
   - Workspace role judgment unchanged (still uses `canEdit(scope.role)`)

## Testing

### Automated Tests

- Added `readOnlyGuard.test.ts` for UI helper tests
- Tests verify onChange guard behavior

### Manual Smoke Test Checklist

For each lab page (Products, Capacity, Forecasts):

1. [ ] Login as Workspace Viewer
2. [ ] Navigate to lab page
3. [ ] Verify read-only warning is displayed
4. [ ] Try clicking a cell - should not enter edit mode
5. [ ] Try pasting data (Ctrl+V) - should not change state
6. [ ] Verify Save button is disabled
7. [ ] Verify no dirty cells appear after interaction attempts

## Future Work

1. **BP Targets Page** - When created, apply same read-only patterns
2. **Visual Cell Indication** - Consider stronger visual indication that cells are read-only (cursor: not-allowed)
3. **Paste Prevention Toast** - Consider showing a toast when viewer attempts to paste

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/ProductsSpreadsheetLab.tsx` | Added column disabled, onChange guard, read-only warning |
| `frontend/src/pages/CapacitySpreadsheet.tsx` | Added column disabled, onChange guard, read-only warning, spreadsheet-wrapper |
| `frontend/src/pages/ForecastsSpreadsheetLab.tsx` | Added onChange guard |
| `frontend/package.json` | Version 1.28.0 |
| `frontend/package-lock.json` | Version 1.28.0 |
| `frontend/src/App.tsx` | Version v1.28.0 |
| `frontend/src/services/snapshotService.ts` | APP_VERSION v1.28.0 |
| `README.md` | Feature list update |
