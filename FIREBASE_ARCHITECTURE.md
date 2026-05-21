# Firebase Architecture

## Platform Decisions

**Firebase is the backend and hosting platform for this project.**

- **Firebase Auth** — Google Sign-In for user authentication.
- **Firestore** — All business data (SKUs, forecasts, capacity plans, parameters, versions) is stored here.
- **Firebase Hosting** — Static hosting for the React SPA.

### What we do NOT use

- **No Supabase** — Do not migrate to Supabase.
- **No custom backend** — No Node.js/Python/FastAPI backend server.
- **No Cloud Functions** — All computation is deterministic frontend logic.
- **No other backend-as-a-service** — Firebase is the platform.

## Firestore Data Model

All data is scoped under per-user, per-project paths:

```
users/{userId}/
  projects/{projectId}/
    skus/{skuId}                           ← Product/SKU definitions
    forecasts/{forecastId}                  ← Monthly demand forecasts per SKU
    capacityPlans/{month}-{factoryId}       ← Core/BU capacity per month per factory
    parameters/default                      ← Single document: yield matrix, panel params, working days, currency settings
    capacityVersions/{versionId}            ← Named snapshots of capacity plans
    skuVersions/{versionId}                 ← Named snapshots of SKU definitions
```

### Collection Details

| Collection | Document ID | Key Fields |
|------------|-------------|------------|
| `skus` | UUID | `skuCode`, `customer`, `deviceName`, `sizeCategory`, `layerCount`, `unitPrice`, `upp?`, `yieldEstimate?`, `application`, `productGrade`, `osat`, `coreType?`, `coreThicknessMm?`, `abfType?`, `chipLengthMm`, `chipWidthMm` |
| `forecasts` | UUID | `skuId`, `month`, `forecastPcs`, `unitPrice` |
| `capacityPlans` | `{month}-{factoryId}` | `month`, `factoryId`, `corePanelPerDay`, `buPanelPerDay`, `workingDays` |
| `parameters/default` | `default` | `yieldMatrix`, `panelParams`, `defaultWorkingDays`, `currencySettings`, `factories` |
| `capacityVersions` | `v-{timestamp}` | `versionName`, `gridData`, `factories`, `workingDays` |
| `skuVersions` | `sku-v-{timestamp}` | `versionName`, `skus[]` |

## Service Module Architecture

All Firestore access goes through service modules in `frontend/src/services/`:

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

Each service follows this pattern:

1. Import `db` from `firebase/config`.
2. Define a path helper function (e.g., `skuPath(userId, projectId)`).
3. Export CRUD functions that accept `userId` and `projectId`.
4. Use `writeBatch` for bulk operations.
5. Never call Firestore directly from React components.

### Known Technical Debt

- `capacityService.ts` batch save parses document IDs by splitting on `-` (`key.split('-')`). This works because the ID format is `{month}-{factoryId}` but is fragile if the format changes.
- `capacityPlans` document IDs use a composite key (`{month}-{factoryId}`) instead of UUIDs. This is intentional for deduplication but means the ID format is a convention, not enforced by Firestore.

## Authentication

- **Provider**: Google Sign-In only.
- **Flow**: User clicks "Sign in with Google" → popup → user object returned.
- **Persistence**: Firebase Auth default session persistence.
- **User ID**: Used as the root path for all Firestore data.

### Auth Module

```text
firebase/config.ts  — Initialize Firebase app, Auth, Firestore
firebase/auth.ts    — signInWithPopup(Google), signOut, onAuthStateChanged
```

## Hosting

- **Project**: `abf-capacity-calculator`
- **URL**: https://abf-capacity-calculator.web.app
- **Deploy**: `firebase deploy --only hosting`
- **Source**: `frontend/dist` (Vite build output)

### CRITICAL

- **Never deploy to `homebox-hosting`** or any other Firebase project.
- Always verify: `firebase use abf-capacity-calculator` before deploying.
- This project is completely independent from homebox-hosting.

## Environment Variables

Required in `frontend/.env.local` (or `frontend/.env`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=abf-capacity-calculator
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

See `frontend/.env.example` for template.

## Firestore Security Rules

Current rules allow authenticated users full read/write access to their own data:

```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Future improvement: scope rules per collection type, add validation for document schemas.

## Calculation Flow (No Backend)

```
Firestore data (SKUs, forecasts, capacity, parameters)
  ↓
runCalculation() — frontend/src/core/calculationEngine.ts
  ↓
buildAnalyticsModel() — frontend/src/core/analytics.ts
  ↓
UI pages (Dashboard, Results)
```

All computation is deterministic frontend TypeScript. No server-side computation, no Cloud Functions, no API endpoints.
