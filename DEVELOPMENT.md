# Development Guide

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Ant Design 5
- **Charts**: @ant-design/charts (Recharts-based)
- **Backend**: Firebase Auth + Firestore + Hosting
- **State**: React Context (AppPreferencesContext for language/currency)
- **Data flow**: Firestore → Service layer → Calculation engine → Analytics → UI

## Data Flow

```
Firestore (Products/Forecasts/Capacity/Parameters)
  ↓
Service layer (skuService, forecastService, etc.)
  ↓
runCalculation() — deterministic calculation engine
  ↓
buildAnalyticsModel() — builds Dashboard/Results analysis structures
  ↓
UI pages (Dashboard, CalculationResults)
  ↓
Currency/i18n helpers — display-layer only
```

## Core Files

| File | Purpose |
|------|---------|
| `core/calculationEngine.ts` | Yield matrix, panel layout, Core/BU steps, per-SKU monthly calculations |
| `core/analytics.ts` | Builds analysis structures: yearly health, dimension matrices, shortage exposure |
| `core/currency.ts` | USD/TWD conversion, formatting (display-layer only) |
| `i18n/` | English / Traditional Chinese translation dictionaries |
| `components/analytics/` | Shared table components (TimeMatrixTable, YearlyHealthMatrix) |

## Development Rules

### Do NOT change casually

1. **Calculation formulas** — `runCalculation()` produces deterministic results. Do not modify without explicit approval and test coverage.
2. **Unit price input** — always in USD. Currency conversion is display-layer only.
3. **Core page logic** — Products, Forecasts, Capacity pages have working flows. Do not refactor without specific task.

### Display-layer conventions

1. **Currency conversion is display-only** — all input/storage is USD. `formatCurrency()` and `convertCurrency()` handle display conversion.
2. **Analysis tables use time horizontally** — rows are metrics/dimensions, columns are time periods (years left-to-right).
3. **No hardcoded currency symbols** — amounts display as plain numbers (e.g., `1,234.57`, `32,000`). No `$` or `NT$` prefixes.
4. **Use i18n keys** — never hardcode visible English labels if the page uses `t()`.

### Component conventions

1. **YearlyHealthMatrix** — shared component for yearly health analysis (metrics as rows, years as columns). Uses `metricType` for cell formatting (revenue, utilization, shortage, bottleneck).
2. **TimeMatrixTable** — generic matrix table (dimensions as rows, time as columns). Accepts `metricType` on rows for future extension.
3. **Table CSS classes** — `analysis-table`, `matrix-table`, `data-table` for consistent styling.

## Experimental Pages

- **Capacity Lab** (`CapacitySpreadsheet`) — spreadsheet-based capacity editing. Preserved for evaluation. Do not invest further development without approval. Multi-cell copy/paste has limited support.
- Marked with warning banner and "EXPERIMENT" tag.

## Test / Build / Deploy

```bash
cd frontend
npm run test       # Vitest — calculation engine + currency tests
npm run build      # tsc + vite production build
firebase deploy --only hosting   # Deploy to abf-capacity-calculator project
```

## Versioning

- Version displayed in sidebar footer and App.tsx `APP_VERSION` constant.
- Update `README.md` Version History on each release.
- Follow semver: MAJOR.MINOR.PATCH.

## Firebase Project

- Project ID: `abf-capacity-calculator`
- **CRITICAL**: Never deploy to `homebox-hosting` or any other Firebase project.
- Always verify: `firebase use abf-capacity-calculator` before deploying.
