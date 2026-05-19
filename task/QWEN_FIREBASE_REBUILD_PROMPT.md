# Qwen Code Task: Rebuild ABF Capacity Calculator With Firebase

You are taking over this local project:

```text
D:\abf-capacity-calculator
```

GitHub repository:

```text
https://github.com/zhewenzhang/abf-capacity-calculator
```

Please work directly inside the existing project folder. First inspect the current files, README, git history, frontend, backend, and deployment workflow. Then rebuild or reorganize the project into a usable ABF capacity calculator backed by Firebase.

Do not only provide a plan. Implement, test, commit, push, and deploy if credentials and project access are available.

## Current Situation

The current repository is not yet a real capacity calculator.

Known issues:

1. `frontend/src/api/index.ts` returns mock data and random calculation results.
2. `frontend/src/pages/Dashboard.tsx` uses hardcoded business numbers.
3. `frontend/src/pages/Calculation.tsx` has only a period selector and does not calculate from real SKU/forecast/capacity inputs.
4. The Python backend contains syntax errors, corrupted files, duplicated placeholder modules, and broken dependencies.
5. `database/init.sql` contains SQL spelling errors and corrupted text.
6. The current project is closer to a demo shell than a production-ready tool.

## Product Goal

Build a browser-based ABF capacity calculator that can:

1. Manage SKU/product data.
2. Manage monthly sales forecasts.
3. Manage monthly Core and BU capacity plans.
4. Manage yield and panel layout parameters.
5. Calculate monthly Core/BU panel demand.
6. Compare demand against available capacity.
7. Show capacity utilization, shortage months, bottlenecks, and revenue.
8. Persist user data in Firebase.
9. Deploy as a hosted web app.

## Recommended Architecture

Use a Firebase-backed static web app.

Recommended stack:

- React
- TypeScript
- Vite
- Ant Design
- Firebase Auth
- Firestore
- Firebase Hosting
- Vitest for core calculation tests

Important decision:

Remove or archive the broken FastAPI/PostgreSQL backend unless you choose to fully repair and deploy it. For this version, prefer Firebase + frontend calculation because the main goal is a working deployable tool.

The core calculation logic should live in pure TypeScript modules, not inside React components and not inside Firestore service functions.

Suggested structure:

```text
frontend/src/core/calculationEngine.ts
frontend/src/core/yieldMatrix.ts
frontend/src/core/panelLayout.ts
frontend/src/core/defaults.ts
frontend/src/types/index.ts
frontend/src/firebase/config.ts
frontend/src/services/skuService.ts
frontend/src/services/forecastService.ts
frontend/src/services/capacityService.ts
frontend/src/services/parameterService.ts
frontend/src/services/projectService.ts
frontend/src/pages/Dashboard.tsx
frontend/src/pages/Products.tsx
frontend/src/pages/Forecasts.tsx
frontend/src/pages/CapacityPlan.tsx
frontend/src/pages/Parameters.tsx
frontend/src/pages/CalculationResults.tsx
```

## Firebase Requirements

Use Firebase for:

1. Authentication.
2. Firestore persistence.
3. Hosting deployment.

If Firebase credentials are not available in the environment, implement Firebase config through environment variables and document the required `.env` values.

Required `.env.example`:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Do not commit real secrets.

## Firestore Data Model

Use a single-user-first structure, but keep it easy to evolve into multi-project support.

Recommended structure:

```text
users/{userId}
  email
  displayName
  createdAt
  updatedAt

users/{userId}/projects/{projectId}
  name
  createdAt
  updatedAt

users/{userId}/projects/{projectId}/skus/{skuId}
  skuCode
  customer
  deviceName
  osat
  application
  productGrade
  sizeCategory
  chipLengthMm
  chipWidthMm
  layerCount
  unitPrice
  createdAt
  updatedAt

users/{userId}/projects/{projectId}/forecasts/{forecastId}
  skuId
  month
  forecastPcs
  unitPrice
  createdAt
  updatedAt

users/{userId}/projects/{projectId}/capacityPlans/{month}
  month
  workingDays
  corePanelPerDay
  buPanelPerDay
  createdAt
  updatedAt

users/{userId}/projects/{projectId}/parameters/default
  yieldMatrix
  panelLengthMm
  panelWidthMm
  marginLengthMm
  marginWidthMm
  toleranceMm
  updatedAt
```

If project support makes the first version too large, create one default project automatically after login.

## Authentication

Implement Firebase Auth with at least one of:

1. Google sign-in, preferred.
2. Email/password sign-in.

The app should not require login for a local demo mode if Firebase config is missing. If config is missing, show a clear setup screen or use local demo data.

Do not block the app with a blank screen.

## Required Calculation Logic

All calculation functions must be deterministic and covered by tests.

No random numbers are allowed in business results.

### SKU Input

Each SKU must include:

```text
skuCode
customer
deviceName
osat
application
productGrade
sizeCategory: small | medium | large | xlarge
chipLengthMm
chipWidthMm
layerCount
unitPrice
```

Validation:

1. `layerCount` must be an even integer >= 2.
2. `chipLengthMm` and `chipWidthMm` must be positive.
3. `unitPrice` must be >= 0.

### Forecast Input

Each forecast row:

```text
skuId
month
forecastPcs
unitPrice
```

Validation:

1. `month` format is `YYYY-MM`.
2. `forecastPcs` must be >= 0.
3. `unitPrice` defaults to SKU unit price if omitted.

### Capacity Plan Input

Each monthly capacity row:

```text
month
workingDays
corePanelPerDay
buPanelPerDay
```

Validation:

1. `workingDays` must be >= 0.
2. `corePanelPerDay` and `buPanelPerDay` must be >= 0.

Default capacity plan:

```text
2026: Core 6000/day, BU 0/day
2027: Core +650 per quarter, BU +3000 per quarter
2028: Core +1800/year from 2027 exit level, BU +10000/year from 2027 exit level
```

Generate monthly rows for 2026-2028 and allow user edits.

### Yield Matrix

Default matrix:

| Size | 4-8L | 10-14L | 16-20L | 20L+ |
| --- | ---: | ---: | ---: | ---: |
| small | 0.98 | 0.96 | 0.94 | 0.92 |
| medium | 0.88 | 0.86 | 0.84 | 0.82 |
| large | 0.82 | 0.80 | 0.78 | 0.76 |
| xlarge | 0.75 | 0.73 | 0.71 | 0.69 |

Layer range behavior:

1. 2L should use the 4-8L bucket unless you add an explicit 2L bucket.
2. 4L through 8L use 4-8L.
3. 10L through 14L use 10-14L.
4. 16L through 20L use 16-20L.
5. Greater than 20L uses 20L+.

### Panel Layout

Default parameters:

```text
panelLengthMm = 244.1
panelWidthMm = 246.2
marginLengthMm = 10
marginWidthMm = 5.3
toleranceMm = 0
```

Formula:

```text
usableLength = panelLengthMm - marginLengthMm * 2
usableWidth = panelWidthMm - marginWidthMm * 2
effectiveChipLength = chipLengthMm + toleranceMm
effectiveChipWidth = chipWidthMm + toleranceMm
pcsPerPanel = floor(usableLength / effectiveChipLength) * floor(usableWidth / effectiveChipWidth)
```

If `pcsPerPanel <= 0`, return a validation error and do not silently calculate.

### Core / BU Layer Steps

README rule:

```text
Core itself = 2 layers, fixed 1 step
BU steps = layerCount / 2 - 1
4L = Core 1 + BU 1
8L = Core 1 + BU 3
```

Formula:

```text
coreSteps = 1
buSteps = max(layerCount / 2 - 1, 0)
```

### Per-SKU Monthly Calculation

For each SKU and month:

```text
yieldRate = lookupYieldRate(sizeCategory, layerCount)
requiredInputPcs = ceil(forecastPcs / yieldRate)
pcsPerPanel = calculatePcsPerPanel(...)
requiredPanels = ceil(requiredInputPcs / pcsPerPanel)
corePanelDemand = requiredPanels * coreSteps
buPanelDemand = requiredPanels * buSteps
revenue = forecastPcs * unitPrice
```

### Monthly Capacity Summary

Aggregate all SKU rows by month:

```text
totalCorePanelDemand = sum(corePanelDemand)
totalBuPanelDemand = sum(buPanelDemand)
coreCapacity = corePanelPerDay * workingDays
buCapacity = buPanelPerDay * workingDays
coreUtilization = coreCapacity > 0 ? totalCorePanelDemand / coreCapacity : Infinity if demand > 0 else 0
buUtilization = buCapacity > 0 ? totalBuPanelDemand / buCapacity : Infinity if demand > 0 else 0
coreShortage = max(totalCorePanelDemand - coreCapacity, 0)
buShortage = max(totalBuPanelDemand - buCapacity, 0)
bottleneck = Core / BU / None
```

Important:

If BU capacity is 0 and BU demand is greater than 0, show BU shortage clearly. Do not divide by zero or hide the shortage.

## Required Pages

### 1. Login / Setup

Show Firebase sign-in if Firebase config exists.

If config is missing, show setup instructions and optionally allow local demo mode.

### 2. Dashboard

Must show real computed metrics:

1. Total SKU count.
2. Total forecast PCS.
3. Total revenue.
4. Max Core utilization.
5. Max BU utilization.
6. Number of shortage months.
7. Worst bottleneck month.

No hardcoded business values.

### 3. Products / SKU Management

Features:

1. Create SKU.
2. Edit SKU.
3. Delete SKU.
4. Table view.
5. Validation for layer count and chip size.

### 4. Forecasts

Features:

1. Enter forecast by SKU and month.
2. Generate months for 2026-2028.
3. Edit forecast PCS.
4. Edit price snapshot or default from SKU price.

### 5. Capacity Plan

Features:

1. View monthly Core/BU capacity.
2. Edit working days, Core panel/day, BU panel/day.
3. Generate default 2026-2028 capacity plan.
4. Reset to defaults with confirmation.

### 6. Parameters

Features:

1. Edit yield matrix.
2. Edit panel size and margin parameters.
3. Restore default parameters.

### 7. Calculation Results

Must include:

1. SKU-month calculation details.
2. Monthly capacity summary.
3. Core/BU utilization.
4. Shortage highlight.
5. Bottleneck source.
6. Revenue summary.

Use tables and simple charts if useful.

## Testing Requirements

Add Vitest tests for core calculation logic.

Minimum test cases:

1. Yield lookup for 2L, 4L, 8L, 10L, 14L, 16L, 20L, 22L.
2. Core/BU steps for 2L, 4L, 8L, 20L.
3. Panel layout returns expected pcs per panel for a known chip size.
4. Required input PCS uses ceiling and yield.
5. BU capacity = 0 with BU demand > 0 produces shortage and bottleneck.
6. Revenue = forecastPcs * unitPrice.

Required commands:

```text
npm run test
npm run build
```

If scripts do not exist, add them.

## Deployment

Prefer Firebase Hosting.

Required steps if Firebase CLI is available:

```text
firebase init hosting
npm run build
firebase deploy
```

Use `frontend/dist` as the hosting output if the app remains inside the `frontend` folder.

If Firebase project credentials or login are unavailable:

1. Prepare the Firebase config and hosting files.
2. Document the exact manual commands I need to run.
3. Keep GitHub Pages deployment available as a fallback only if Firebase Hosting cannot be completed.

## GitHub Requirements

After implementation:

1. Run tests.
2. Run build.
3. Commit changes.
4. Push to GitHub.
5. Deploy if possible.

If push fails because of missing credentials, report the exact command I need to run.

## README Requirements

Update README with:

1. Product purpose.
2. Tech stack.
3. Firebase setup.
4. `.env.example` instructions.
5. Local development commands.
6. Test/build/deploy commands.
7. Core calculation formulas.
8. Known limitations.

## Final Response Required From Qwen Code

When finished, report:

1. Whether you reorganized or rebuilt the project, and why.
2. Main files changed.
3. Firebase setup status.
4. Calculation formulas implemented.
5. Test results.
6. Build results.
7. Commit hash.
8. GitHub push status.
9. Deployment URL.
10. Any manual steps I still need to perform.

Start now from `D:\abf-capacity-calculator`.
