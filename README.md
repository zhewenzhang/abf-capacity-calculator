# ABF Capacity Calculator

A browser-based ABF (Ajinomoto Build-up Film) substrate capacity planning tool backed by Firebase.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Ant Design 5
- **Backend**: Firebase (Auth + Firestore + Hosting)
- **Testing**: Vitest
- **Routing**: React Router v7

## Features

1. **Product/SKU Management** — Create, edit, and delete SKUs with chip dimensions, layer count, size category, and pricing.
2. **Monthly Forecasts** — Enter or bulk-generate sales forecasts by SKU and month (2026–2028).
3. **Capacity Planning** — Manage monthly Core/BU panel-per-day capacity and working days with default generation.
4. **Yield & Panel Parameters** — Edit yield rate matrix and panel layout parameters.
5. **Calculation Engine** — Deterministic TypeScript calculation of panel demand, utilization, shortages, and revenue.
6. **Dashboard** — Real-time metrics: total SKUs, forecast PCS, revenue, max utilization, shortage months.
7. **Results** — Detailed SKU-month breakdown and monthly capacity summary with bottleneck identification.

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** with Google sign-in.
3. Enable **Firestore Database**.
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
firebase use --add           # Select your Firebase project
cd frontend && npm run build
firebase deploy --only hosting
```

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
| 2028 | +1,800/yr from 2027 exit | +10,000/yr from 2027 exit |

## Firestore Data Model

```
users/{userId}/projects/{projectId}/
  skus/{skuId}
  forecasts/{forecastId}
  capacityPlans/{planId}
  parameters/default
```

## Project Structure

```
frontend/src/
  core/
    calculationEngine.ts        # Main calculation logic
    yieldMatrix.ts              # Yield rate lookup
    panelLayout.ts              # Pcs per panel calculation
    defaults.ts                 # Default yield matrix, panel params, capacity generator
    validation.ts               # Input validators
    calculationEngine.test.ts   # 31 Vitest tests
  firebase/
    config.ts                   # Firebase initialization
    auth.ts                     # Google sign-in helpers
  services/
    skuService.ts               # Firestore CRUD for SKUs
    forecastService.ts          # Firestore CRUD for forecasts
    capacityService.ts          # Firestore CRUD for capacity plans
    parameterService.ts         # Firestore CRUD for parameters
    projectService.ts           # Firestore CRUD for projects
  pages/
    SetupPage.tsx               # Firebase setup guidance
    LoginPage.tsx               # Google sign-in
    Dashboard.tsx               # Real-time metrics + summary table
    Products.tsx                # SKU CRUD
    Forecasts.tsx               # Forecast CRUD + bulk generation
    CapacityPlan.tsx            # Capacity plan CRUD + default generation
    Parameters.tsx              # Yield matrix + panel parameter editor
    CalculationResults.tsx      # Detailed results with tabs
  types/index.ts                # All TypeScript types
  App.tsx                       # Auth routing + sidebar layout
  main.tsx                      # Entry point
```

## Known Limitations

- Single default project per user (multi-project UI not yet implemented).
- No data export/import (CSV, Excel).
- No real-time collaboration (Firestore listeners not used).
- Firebase credentials required for full functionality; no mock data mode yet.
- Working days are hardcoded averages per month.

## License

Private.
