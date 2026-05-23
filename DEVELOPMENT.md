# Development Guide

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Ant Design 5
- **Charts**: @ant-design/charts (Recharts-based)
- **Backend**: Firebase Auth + Firestore + Hosting
- **State**: React Context (AppPreferencesContext for language/currency)
- **UI System**: Ant Design is the **only** UI framework. No MUI, shadcn, Tailwind, or other UI systems.
- **Data flow**: Firestore → Service layer → Calculation engine → Analytics → UI

## Platform Decisions (Non-Negotiable)

1. **Firebase is the backend.** Auth + Firestore + Hosting. No Supabase. No custom backend.
2. **Ant Design is the only UI system.** No second UI framework. All styling goes through `theme/antdTheme.ts` and shared components.
3. **Calculation formulas are stable.** `runCalculation()` must not be changed without approval and test coverage.
4. **Unit price input is always USD.** Currency conversion is display-layer only.
5. **Capacity Lab is experimental.** Keep it. Do not invest further without approval.

See [FIREBASE_ARCHITECTURE.md](FIREBASE_ARCHITECTURE.md) for full Firebase details.

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

## Firestore Structure

```
users/{userId}/projects/{projectId}/
  skus/{skuId}                           ← Product/SKU definitions
  forecasts/{forecastId}                  ← Monthly demand forecasts per SKU
  capacityPlans/{month}-{factoryId}       ← Core/BU capacity per month per factory
  parameters/default                      ← Yield matrix, panel params, working days, currency
  capacityVersions/{versionId}            ← Named snapshots of capacity plans
  skuVersions/{versionId}                 ← Named snapshots of SKU definitions
```

## Service Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `projectService.ts` | Create/list/delete projects; ensure default project |
| `skuService.ts` | CRUD for SKUs; batch save |
| `forecastService.ts` | CRUD for forecasts; batch save; query by SKU |
| `capacityService.ts` | CRUD for capacity plans; batch save with month-based delete/replace |
| `parameterService.ts` | Get/save project parameters (single doc at `parameters/default`) |
| `versionService.ts` | Save/list/delete/restore capacity plan versions |
| `skuVersionService.ts` | Save/list/delete/restore SKU definition versions |
| `demoDataService.ts` | Load sample data for quick testing |

### Service Pattern

All Firestore access goes through service modules. Never call Firestore directly from React components.

## Core Files

| File | Purpose |
|------|---------|
| `core/calculationEngine.ts` | Yield matrix, panel layout, Core/BU steps, per-SKU monthly calculations |
| `core/analytics.ts` | Builds analysis structures: yearly health, dimension matrices, shortage exposure |
| `core/currency.ts` | USD/TWD conversion, formatting (display-layer only) |
| `core/defaults.ts` | Default working days, yield matrix, panel parameters |
| `core/forecastGrowth.ts` | Generates empty forecast years from prior-year monthly SKU demand using annual growth rates |
| `core/bpTargets.ts` | BP target attainment analysis: yearly/quarterly/monthly views, attainment %, gap calculation |
| `i18n/` | English / Traditional Chinese translation dictionaries |
| `theme/antdTheme.ts` | Ant Design design tokens (colors, spacing, typography) |
| `components/analytics/` | Shared analysis components (TimeMatrixTable, YearlyHealthMatrix) |
| `components/common/` | Shared UI components (MetricCard, SectionCard, AppTable, ExperimentalBanner, PageHeader, StatusTag) |

## Development Rules

### Do NOT change casually

1. **Calculation formulas** — `runCalculation()` produces deterministic results. Do not modify without explicit approval and test coverage.
2. **Unit price input** — always in USD. Currency conversion is display-layer only.
3. **Core page logic** — Products, Forecasts, Capacity pages have working flows. Do not refactor without specific task.
4. **Firebase** — do not replace with Supabase or any other backend.
5. **Ant Design** — do not replace with MUI, shadcn, Tailwind, or any other UI system.

### Forecast growth rules

1. Forecast annual growth is a Forecasts-page batch operation, not a backend job.
2. A target SKU-year is generated only when that SKU has no positive forecast data in the target year.
3. Generated values use the same SKU and same month from the previous year: `targetMonthForecastPcs = round(previousYearSameMonthForecastPcs * (1 + growthRate / 100))`.
4. Existing target-year forecast data is never overwritten by growth generation.
5. Multi-year generation may cascade: a generated 2027 can become the base for 2028 in the same operation.
6. If no SKU is selected, yearly growth applies to all SKUs with previous-year base data.
7. Generated forecast uses current SKU unitPrice/unitPriceCurrency first, and falls back to base forecast only if SKU price/currency is missing. (生成的 Forecast 优先使用当前 SKU 设定的单价与币别；仅在 SKU 单价/币别缺失时，才降级使用基准前年预测的单价与币别兜底。)

### Display-layer conventions

1. **Currency conversion is display-only** — all input/storage is USD. `formatCurrency()` and `convertCurrency()` handle display conversion.
2. **Analysis tables use time horizontally** — rows are metrics/dimensions, columns are time periods (years left-to-right).
3. **No hardcoded currency symbols** — amounts display as plain numbers (e.g., `1,234.57`, `32,000`). No `$` or `NT$` prefixes.
4. **Use i18n keys** — never hardcode visible English labels if the page uses `t()`.

### Component conventions

1. **Common components** — use `components/common/` for shared UI (MetricCard, SectionCard, AppTable, etc.).
2. **Theme tokens** — customize through `theme/antdTheme.ts` and `ConfigProvider` in App.tsx.
3. **CSS classes** — `analysis-table`, `matrix-table`, `data-table`, `app-table`, `dashboard-kpi-card` for consistent styling.
4. **YearlyHealthMatrix** — shared component for yearly health analysis (metrics as rows, years as columns). Uses `metricType` for cell formatting.
5. **TimeMatrixTable** — generic matrix table (dimensions as rows, time as columns).

### Known Technical Debt

- `capacityService.ts` parses document IDs by splitting on `-`. Works because format is `{month}-{factoryId}` but fragile.
- `capacityPlans` document IDs use composite key instead of UUIDs.

## Experimental Pages

- **Capacity Lab** (`CapacitySpreadsheet`) — spreadsheet-based capacity editing. Preserved for evaluation. Uses `ExperimentalBanner`. Do not invest further development without approval. Multi-cell copy/paste has limited support.

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
- See [FIREBASE_ARCHITECTURE.md](FIREBASE_ARCHITECTURE.md) for full architecture.
