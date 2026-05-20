# ABF Capacity Calculator

A browser-based ABF (Ajinomoto Build-up Film) substrate capacity planning tool backed by Firebase.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Ant Design 5
- **Charts**: Recharts
- **Backend**: Firebase (Auth + Firestore + Hosting)
- **Testing**: Vitest
- **Routing**: React Router v7

## Features

1. **Product/SKU Management** — Create, edit, and delete SKUs with chip dimensions, layer count, size category, and pricing.
2. **Monthly Forecasts** — Enter or bulk-generate sales forecasts by SKU and month (2026–2040).
3. **Capacity Planning** — Excel-style grid with:
   - **Factory management**: Add, rename, and remove factories dynamically
   - **Batch operations**: Set values by year or quarter across selected factories
   - **Fill Forward (→→)**: Copy a month's values to all subsequent months in one click
   - **View modes**: Month / Quarter / Year with auto-aggregation
   - **Working Days**: Configurable default (28 days/month) in Parameters
4. **Yield & Panel Parameters** — Edit yield rate matrix and panel layout parameters.
5. **Calculation Engine** — Deterministic TypeScript calculation of panel demand, utilization, shortages, and revenue.
6. **Dashboard** — Real-time metrics: total SKUs, forecast PCS, revenue, max utilization, shortage months. Revenue display in USD or TWD with trend charts.
7. **Results** — Detailed SKU-month breakdown and monthly capacity summary with bottleneck identification. Organized into Sales / Product Planning / Capacity / Raw tabs.
8. **Capacity Trend Charts** — Three chart tabs: Core Panel/Day, BU Panel/Day, Monthly Capacity
9. **Version History** — Save, restore, and delete named snapshots of the entire capacity plan
10. **Currency Conversion** — USD/TWD display switching with constant or yearly exchange rate settings in Parameters.
11. **Bilingual UI** — English / Traditional Chinese (繁中) with language switch in the header.

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** with Google sign-in.
3. Enable **Firestore Database** (test mode for development).
4. Enable **Hosting**.
5. Copy your web app config into `frontend/.env.local`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **No `.env.local`?** The app shows a setup screen with instructions.

## Local Development

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

## Testing & Build

```bash
npm run test       # Run Vitest (31 tests)
npm run test:watch # Watch mode
npm run build      # TypeScript + Vite production build
```

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase use abf-capacity-calculator   # ensure correct project
cd frontend && npm run build
firebase deploy --only hosting
```

**⚠️ Important**: This is an independent project. Never deploy to `homebox-hosting` or any other Firebase project from this repository.

## Core Calculation Formulas

### Layer → Yield Bucket Mapping

| Layers | Bucket |
|--------|--------|
| 2–8    | 4-8L   |
| 10–14  | 10-14L |
| 16–20  | 16-20L |
| 21+    | 20L+   |

### Panel Layout

```
usableLength = panelLength - marginLength × 2
usableWidth  = panelWidth  - marginWidth  × 2
effectiveChipLength = chipLength + tolerance
effectiveChipWidth  = chipWidth  + tolerance
pcsPerPanel = floor(usableLength / effectiveChipLength) × floor(usableWidth / effectiveChipWidth)
```

Default panel: 244.1 × 246.2 mm, margins: 10 / 5.3 mm, tolerance: 0.

### Core / BU Steps

```
coreSteps = 1 (fixed)
buSteps   = max(layerCount / 2 - 1, 0)
```

Examples: 2L → Core 1, BU 0 | 4L → Core 1, BU 1 | 8L → Core 1, BU 3

### Per-SKU Monthly Calculation

```
yieldRate        = lookupYieldRate(sizeCategory, layerCount)
requiredInputPcs = ceil(forecastPcs / yieldRate)
requiredPanels   = ceil(requiredInputPcs / pcsPerPanel)
corePanelDemand  = requiredPanels × coreSteps
buPanelDemand    = requiredPanels × buSteps
revenue          = forecastPcs × unitPrice
```

### Monthly Capacity Summary

```
coreCapacity    = corePanelPerDay × workingDays
buCapacity      = buPanelPerDay  × workingDays
coreUtilization = totalCoreDemand / coreCapacity  (or null if capacity=0, demand>0)
buUtilization   = totalBuDemand   / buCapacity    (or null if capacity=0, demand>0)
coreShortage    = max(totalCoreDemand - coreCapacity, 0)
buShortage      = max(totalBuDemand   - buCapacity,   0)
bottleneck      = Core / BU / None
```

**Important**: If BU capacity is 0 and BU demand > 0, BU shortage is shown clearly. No division by zero.

## Default Capacity Plan

| Year | Core Panel/Day | BU Panel/Day |
|------|---------------|--------------|
| 2026 | 6,000 (flat)  | 0 (flat)     |
| 2027 | +650/quarter  | +3,000/quarter |
| 2028–2040 | Core +1,800/yr from 2027 exit | BU +10,000/yr from 2027 exit |

## Firestore Data Model

```
users/{userId}/projects/{projectId}/
  skus/{skuId}
  forecasts/{forecastId}
  capacityPlans/{month}-{factoryId}
  parameters/default
  capacityVersions/{versionId}
```

## Project Structure

```
frontend/src/
  core/
    calculationEngine.ts        # Main calculation logic
    yieldMatrix.ts              # Yield rate lookup
    panelLayout.ts              # Pcs per panel calculation
    defaults.ts                 # Default yield matrix, panel params, factories, capacity generator
    validation.ts               # Input validators
    calculationEngine.test.ts   # 31 Vitest tests
  firebase/
    config.ts                   # Firebase initialization
    auth.ts                     # Google sign-in helpers
  services/
    skuService.ts               # Firestore CRUD for SKUs
    forecastService.ts          # Firestore CRUD for forecasts
    capacityService.ts          # Firestore CRUD for capacity plans (batch support)
    parameterService.ts         # Firestore CRUD for parameters (incl. factories)
    projectService.ts           # Firestore CRUD for projects
    versionService.ts           # Version save/restore/delete
    demoDataService.ts          # Demo data loader (5 SKUs, 30 forecasts, capacity)
  pages/
    SetupPage.tsx               # Firebase setup guidance
    LoginPage.tsx               # Google sign-in
    Dashboard.tsx               # Real-time metrics + summary table + demo data loader
    Products.tsx                # SKU CRUD
    Forecasts.tsx               # Forecast CRUD + bulk generation (2026-2040)
    CapacityPlan.tsx            # Excel-style grid, batch operations, Fill Forward, version management, charts
    Parameters.tsx              # Yield matrix + panel params + working days
    CalculationResults.tsx      # Detailed results with tabs
  types/index.ts                # All TypeScript types
  App.tsx                       # Auth routing + sidebar layout
  main.tsx                      # Entry point
```

## UI Formatting Standards

- **All numbers** displayed to users must include thousand separators (e.g., `12,345` not `12345`)
- Input fields show raw numbers for easy editing
- Chart tooltips and Y-axis labels use `toLocaleString()` for readability

## Known Limitations

- Single default project per user (multi-project UI not yet implemented).
- No data export/import (CSV, Excel).
- No real-time collaboration (Firestore listeners not used).
- Firebase credentials required for full functionality; no mock data mode yet.
- Working days are configurable but fixed across all months (not per-month).

## Version History

- **2026-05-21 v1.8.1**: Wired currency/i18n throughout all pages — Dashboard and Results now sync display currency with header switch, Parameters syncs currency preference to localStorage, fixed hardcoded labels in Forecasts (SKU Code/Customer/Device/Layer/UPP) and Products (OSAT), added missing i18n keys, year-aware revenue formatting for TWD yearly exchange rate mode.
- **2026-05-21 v1.8.0**: Added USD/TWD currency display switching, exchange rate settings, Traditional Chinese/English UI language support, and UI label consistency cleanup.
- **2026-05-21 v1.7.0**: Dashboard and Results analytics redesign — yearly capacity health table with red/orange/green severity, revenue and Core/BU utilization trend charts, matrix analysis tables (Revenue by Customer/Size/Application, Core/BU Demand by Size/Application/ProductGrade/LayerBucket), Dashboard answers "which year has problems / revenue trend / bottleneck", Results organized into Sales View / Product Planning View / Capacity Analysis View / Raw Detail tabs, reusable analytics.ts helper layer and TimeMatrixTable component.
- **2026-05-20 v1.2.6**: Products page — inline edit with expanded form (3-row layout with labels), download/import template with Yield Rate + Core Type + Core Thickness + ABF Type fields, fixed chip dimension column name mismatch (NaN fix), price display 1 decimal, yield display as integer percentage, sidebar optimized with sticky layout + scrollable menu + version footer.
- **2026-05-19**: Initial rebuild — Firebase-backed React + TypeScript + Ant Design frontend replacing broken Python backend. Excel-style capacity grid with factory management, batch operations, Fill Forward, view modes (Month/Quarter/Year), capacity trend charts, version save/restore, demo data loader.

## License

Private.
