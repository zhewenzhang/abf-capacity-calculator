# Phase 7.1: Forecasts Spreadsheet Lab

## Overview

**Forecasts Spreadsheet Lab** is an experimental page for Excel-like horizontal forecast input. It does NOT replace the official Forecasts page (`/forecasts`).

**Route**: `/forecasts-lab`

**Navigation Name**:
- English: `Forecasts Lab`
- 繁中: `預測實驗表`

## Features

### Year Selector

- Dropdown at the top of the page
- Range: 2026-2040 (15 years)
- Default: Current year if within range, otherwise 2026
- Switching years reloads the data for that year

### Table Structure

Uses `react-datasheet-grid` with the following columns:

| Column | Editable | Description |
|--------|----------|-------------|
| SKU Code | No | Read-only identifier |
| Customer | No | Read-only, from SKU data |
| Jan | Yes | Forecast PCS for January |
| Feb | Yes | Forecast PCS for February |
| ... | Yes | ... |
| Dec | Yes | Forecast PCS for December |

Total: 14 columns (2 read-only + 12 editable months)

### Excel-like Interaction

- **Single cell edit**: Click and type directly
- **Paste from Excel**: Supports both single row and multi-row paste
- **Dirty state**: Changed cells are highlighted in orange
- **Save**: Batch save all changed cells
- **Discard**: Revert to last saved/loaded state

### Data Validation

- Forecast PCS must be non-negative integers
- Negative values are rejected with error message
- Empty/zero values are skipped during save (not deleted from Firestore)
- Non-numeric input is handled by react-datasheet-grid's intColumn

### Save / Discard

- **Save button**: Shows count of changed cells, disabled when no changes
- **Discard button**: Reverts all changes to last saved state
- **No autosave**: Users must explicitly save

## Permissions

### Workspace Mode

| Role | Can Edit | Can Save |
|------|----------|----------|
| Owner | Yes | Yes |
| Editor | Yes | Yes |
| Viewer | No | No (read-only) |

### Personal Mode

- User can edit and save their own data

Uses existing `canEdit(scope.role)` helper from `projectScope.ts`.

## Data Flow

1. **Load**: Fetch SKUs via `getSKUs(scope)` and forecasts via `getForecasts(scope)`
2. **Build rows**: Create one row per SKU, initialize months to 0, fill existing forecasts
3. **Edit**: User modifies cells, dirty set tracks changes
4. **Save**: Build update payload from dirty set, call `batchSaveForecasts(scope, updates)`
5. **Reload**: Refresh data after successful save

## Data Storage

- Uses existing `forecasts` Firestore collection
- No schema changes
- Month format: `YYYY-MM` (e.g., `2026-01`)
- Forecast document includes: `skuId`, `month`, `forecastPcs`, `unitPrice`, `unitPriceCurrency`

## Downstream Compatibility

After save:
- Dashboard uses new forecast data
- Results page calculations include new forecasts
- BP analysis reflects updated forecasts
- No changes to core formulas or capacity calculations

## Known Limitations

1. **Year-by-year only**: Cannot view/edit multiple years at once
2. **No delete support**: Setting value to 0 skips save; existing forecast is not deleted
3. **No unit price editing**: Price is preserved from existing forecast or defaults to 0
4. **No Excel export**: Paste-in only, no copy-out formatting
5. **Limited mobile support**: Horizontal scroll required on narrow screens

## Future Considerations

### TanStack Table + Virtual

For larger datasets (100+ SKUs), consider migrating to TanStack Table with virtualization:
- Better performance for large grids
- More flexible column configuration
- Built-in sorting and filtering

### Multi-year View

Future version may support viewing multiple years simultaneously with column groups.

### Bulk Delete

Consider adding bulk delete functionality for clearing forecasts.

## Testing

See `frontend/src/core/forecastsLabHelpers.test.ts` for unit tests covering:
- Month key conversion helpers
- Dirty set computation
- Payload building logic

## References

- Task prompt: `task/CC_V1_26_0_FORECASTS_SPREADSHEET_LAB_PROMPT.md`
- Similar implementation: `CapacitySpreadsheet.tsx`, `ProductsSpreadsheetLab.tsx`
