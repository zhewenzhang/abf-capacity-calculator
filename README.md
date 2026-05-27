# ABF Capacity Calculator

A browser-based ABF (Ajinomoto Build-up Film) substrate capacity planning tool backed by Firebase.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Ant Design 6
- **Charts**: @ant-design/charts
- **Backend**: Firebase (Auth + Firestore + Hosting)
- **Testing**: Vitest
- **Routing**: React Router v7
- **SPREADSHEET**: react-datasheet-grid (Products Sheet Lab — preferred SKU input direction)

## Features

1. **Product/SKU Management** — Create, edit, and delete SKUs with chip dimensions, layer count, size category, and pricing.
2. **Monthly Forecasts** — Enter, import, batch-generate, and extend sales forecasts by SKU and month (2026–2040), including empty-year generation from prior-year monthly SKU demand using a fixed annual growth rate.
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
12. **Analytics Layout** — Yearly analysis tables read horizontally (metrics as rows, years left-to-right), Dashboard KPI cards with consistent height, unified table styling across pages.
13. **Decision-Grade Risk Brief** — Calibrated risk brief with clear sections: Executive Summary, Facts, Top Risk Periods (scored), Driver Analysis (revenue/core/BU/shortage/BP with share %), BP Risk, Data Confidence & Caveats (top 5), Assumptions, Role-Based Attention. Deterministic, no AI.
14. **Risk Driver Attribution (v1.17.0)** — Shortage-month attribution layer separating "who is biggest overall" from "who drives pressure during shortage months." Aggregates demand by customer / SKU / size / application / layer bucket / product grade restricted to shortage months. Includes SKU Health Signals MVP (`strategicGrowth` / `cashCow` / `capacityDrainer` / `lowValueHighLoad` / `watchList` / `dataIncomplete`) with documented thresholds (`HIGH_SHARE = 15%`, `LOW_SHARE = 5%`). Deterministic, no AI.
15. **Decision Analysis Depth (v1.20.0)** — Deepens deterministic analysis without any AI integration: **Weighted Pressure Index** (Core×1.3 + BU×1.0 ranking, analysis-only — does not change demand/revenue formulas), **BP Gap Attribution** (proportional, not causal — shows who carries what % of BP miss by customer/SKU/size/application), **Price Impact Analysis** (read-only ±5%/±10% scenarios re-running `runCalculation` on cloned inputs), **Capacity Improvement Impact** (read-only +10% Core/BU/Both scenarios showing shortage-month resolution and utilization shifts), **Key Findings** (deterministic top-5 priority queue across data quality / capacity / BP / price / SKU health), and **Analysis Contract v1.1** exposing all of the above in a single payload. Data Quality issues now carry a `decisionImpact: high|medium|low` tag (id-pattern derived, severity-fallback). All new analysis strings ship in EN + zh-TW.
16. **AI Brief Export / Prompt Pack (v1.21.0, hardened v1.21.1)** — Export sanitized analysis data for external AI tools (Gemini, Claude, ChatGPT). Features: **Copy AI Brief Pack** (Chinese prompt + sanitized JSON), **Copy Prompt**, **Copy JSON**, **Download JSON** (with UTF-8 BOM). Built-in guardrails prevent AI from modifying formulas, supplementing missing data, confusing USD/TWD/BP units, or misinterpreting proportional attribution as causation. v1.21.1 hardening: F-A-I-R classification (Fact/Assumption/Inference/Recommendation), Weighted Pressure boundary warning, blocked/low confidence handling, Key Findings message params preservation. Data stays local — users manually paste to external AI. See [docs/AI_BRIEF_EXPORT.md](docs/AI_BRIEF_EXPORT.md).
17. **Shared Workspace Collaboration (v1.18.0)** — Two or more Google accounts can share a single ABF dataset. Roles: `owner` / `editor` / `viewer`. Workspace switcher lives in the header; UID-based invite (no email magic link). Personal data path (`users/{uid}/...`) is preserved; shared data lives under `workspaces/{wid}/projects/{projectId}/...`. See [docs/WORKSPACE_COLLABORATION.md](docs/WORKSPACE_COLLABORATION.md).
18. **Forecast Versioning & Change Impact Review (v1.22.0)** — Save named snapshots of forecast data for comparison. Compare any two snapshots to see revenue/BP/utilization deltas, top changed customers/SKUs/months, and price vs quantity attribution. Export Change Impact Pack (sanitized JSON + Chinese prompt) for external AI analysis (DeepSeek V4-Flash). All attribution is proportional (NOT causal). Permission model: viewers can view snapshots; editors can create/delete own; owners can manage all. Deterministic, no AI API.
19. **Snapshot Change Review UX Polish (v1.23.0)** — Enhanced Change Review UX for better decision-support readiness: **Enhanced Snapshot List** (shows createdByName, sourceAppVersion, SKU count, revenue, shortage months), **Clear Compare Direction** (Base=old, Target=new, direction indicator, same-snapshot warning), **Organized Impact Sections** (Revenue Impact, BP Impact, Capacity Risk Impact, Top Changes with clear descriptions), **Enhanced Top Changed Tables** (base/compare/delta/delta% columns with trend tags), **Improved DeepSeek Prompt** (snapshot compare direction, F-A-I-R classification enforcement, currency/BP unit warnings, no-formula-modification rules, suggested output format). All new strings in EN + zh-TW.
20. **Forecast Version History Workflow (v1.24.0)** — Upgraded snapshots from scattered saves to a mature version management workflow: **Optional Metadata** (kind, periodLabel, reviewStatus, note) with backward-compatible fallback; **Version Type Tags** (Working, BP Baseline, Customer Update, Capacity Review, Scenario, Archive) with color-coded display; **Review Status Tags** (Draft, Reviewed, Locked, Archived); **Simple Filtering** (All/Working/BP Baseline/Customer Update/Capacity Review/Scenario/Archive); **Recommended Compare Pairs** (BP Baseline vs latest Working/Customer Update, otherwise latest two); **Enhanced Create Modal** with metadata fields and immutable warning; **Enhanced Version List** showing kind/status tags, period label, note, and summary stats. All new strings in EN + zh-TW. Deterministic, no AI API.
21. **Forecasts Spreadsheet Lab (v1.26.0, hotfixed v1.26.1)** — Experimental Excel-like horizontal forecast input page: **Year Selector** (2026-2040, default current year); **Spreadsheet Grid** using react-datasheet-grid with SKU Code, Customer (read-only), and Jan-Dec editable columns; **Excel Paste Support** for single/multi-row data; **Dirty State Tracking** with orange highlighting and change count; **Save/Discard** pattern (no autosave); **Workspace Viewer Read-only** enforcement; **Unit Price Inheritance** from SKU when creating new forecasts; **Delete Support** for clearing forecasts (setting to 0 deletes existing forecast). Does NOT replace the official Forecasts page. No Firebase schema changes. All new strings in EN + zh-TW.
22. **UI Visual Consistency (v1.27.0)** — Low-risk visual polish: **Spreadsheet Grid Unification** (header background matches Ant Design Table, active cell uses primary blue, dirty cell uses warning color, consistent scrollbar styling); **EmptyState Component** (reusable empty state component applied to Forecasts Lab and Capacity Lab); **PageLoading Unification** (consistent loading state across lab pages); **CSS Organization** (spreadsheet-wrapper class, organized stylesheet sections). Style-only release with no data/service/logic changes.
23. **Viewer True Read-only (v1.28.0)** — Workspace Viewer protection: **Column Disabled** (all editable columns marked disabled for viewers); **onChange Guard** (state changes blocked for viewers, preventing paste/edit); **Read-only Warning** (Alert shown on all lab pages for viewers); **Capacity Lab Wrapper** (spreadsheet-wrapper applied to both Core and BU grids). BP Targets page not yet in main; will apply same patterns when created. UI/interaction-only release with no service/core/formula changes.
24. **BP Targets Page (v1.29.0)** — Dedicated business target page: **Excel-like Horizontal Layout** (years 2026-2040 side-by-side); **Independent Management** (removed from Parameters page to prevent overwrite); **Viewer True Read-only** (locked grid cells and save guard); **Validation Rules** (negative/non-numeric blocked with dynamic translation); **Empty Target Safe Removal** (clearing values removes the year from DB record safely without NaN).
25. **UI System Foundation (v1.30.0)** — Standardized UI utilities and common components: **CSS Utilities** (abf-page, abf-section, abf-toolbar, abf-text-muted, etc.); **New Components** (ActionBar, UnitText for consistent toolbar and unit display); **Component Props Passthrough** (PageHeader, EmptyState now support className/style); **Pilot Pages** (BpTargets, ForecastsSpreadsheetLab updated with new patterns); **UI Documentation** (ABF_UI_SYSTEM_FOUNDATION_V1_30.md, UI_CONSISTENCY_ROADMAP.md). UI-only release with no data/service/formula changes.
26. **Dashboard & Results UI Unification (v1.31.0)** — Applied v1.30 UI System to core analytics pages: **Dashboard** (abf-page container, standardized Alert classes, PageLoading component); **CalculationResults** (abf-page container, responsive KPI cards with xs/sm/md breakpoints, PageLoading component, viewer read-only alert in Change Review); **Removed unused Spin import** from Dashboard. Presentation-layer-only release with no core/services/formula/AI-export/snapshot-handler changes.
27. **Core Input Pages UI Standardization (v1.32.0)** — Applied v1.30 UI System to core data entry pages: **Products** (abf-page container, PageHeader with Add button, abf-section for table Card, responsive Modal form layout); **Forecasts** (abf-page container, PageHeader, ActionBar with batch actions, abf-section for tabs and table, abf-text-muted for hints); **CapacityPlan** (abf-page container, PageHeader, ActionBar with view mode switcher, abf-section for grid and charts); **Removed unused imports** across all three pages. Presentation-layer-only release with no core/services/formula changes.
28. **Number Display Standardization (v1.33.0)** — Unified number formatting across the app: **formatNumber utility** (consistent thousand separators via toLocaleString); **formatCurrency utility** (currency display with proper suffix); **formatPercent utility** (percentage display with 1 decimal); **Applied to Dashboard KPIs, Results tables, BP analysis tables**; **No NaN Protection** (handles null/undefined gracefully with '-' fallback). Presentation-layer-only release with no core/services/formula changes.
29. **UI System Phase 1 Closure (v1.34.0)** — Completed UI standardization for remaining pages: **Parameters** (abf-page container, ActionBar with Save/Restore buttons, abf-section for cards, abf-alert-page for warnings); **LoginPage** (abf-page wrapper, preserved login flow); **SetupPage** (abf-page wrapper with maxWidth, preserved setup instructions). Final low-risk polish marking the closure of v1.30-v1.34 UI System Phase 1. Presentation-layer-only release with no core/services/formula changes.
30. **Data Quality Visibility (v1.35.0)** — Shift-left DQ diagnostics from Results to input pages: **DataQualityBadge component** (inline cell-level indicators with severity icons); **DataQualityAlert component** (page-level warning banners); **Products page integration** (SKU missing attributes, zero price, unsupported currency badges); **Forecasts page integration** (orphan SKU badges, partial year warnings); **Capacity page integration** (missing capacity config alerts, BU zero capacity warnings); **BP Targets page integration** (year header indicators for zero forecast/missing target); **Parameters page integration** (currency rate warnings on settings card). All DQ issues now visible during data entry, not just at analysis time. UI-only release with no core/services/formula changes.
31. **Data Quality Remediation Entry Points (v1.36.0)** — MVP remediation workflow making DQ badges clickable: **Products Quick Fix Drawer** (click badge to open drawer, fix missing SKU attributes like unitPrice/currency/layerCount); **BP Targets Quick Fix Popover** (click year header warning to enter BP target inline); **Parameters Exchange Rate Quick Fix Popover** (click currency warning to enter missing TWD/CNY rate); **Forecasts Guided Fix Modal** (click orphan forecast alert to see remediation paths: create SKU / edit forecast reference); **Capacity Navigation Fix** (URL params `?focusMonth=YYYY-MM` for navigation with focus hint); **Viewer Gate** (all fix actions blocked for viewers, read-only tooltips only); **CSS Highlight Animation** (`remind-flash` class for remediation focus). No new Firestore collections, no schema changes, no formula changes. All new strings in EN + zh-TW.

## Project Documentation

### 技術文件

| Document | Purpose |
|----------|---------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Architecture, data flow, development rules, Firebase/Ant Design strategy, service modules |
| [FIREBASE_ARCHITECTURE.md](FIREBASE_ARCHITECTURE.md) | Firestore paths, service module responsibilities, Auth/Hosting setup, security rules |
| [UI_GUIDELINES.md](UI_GUIDELINES.md) | Ant Design theme tokens, shared components, table standards, severity coloring, language/currency conventions |
| [ANALYTICS_GUIDE.md](ANALYTICS_GUIDE.md) | Dashboard/Results purpose, key metrics, matrix layout standard, AnalyticsModel structure |
| [ANALYSIS_CONTRACT.md](ANALYSIS_CONTRACT.md) | Metric registry, data quality criteria, deterministic risk brief logic, AI export policy |

### 使用手冊

| Document | Purpose |
|----------|---------|
| [docs/user-guide/README.md](docs/user-guide/README.md) | 使用手冊總覽與快速開始 |
| [docs/user-guide/PRODUCTS.md](docs/user-guide/PRODUCTS.md) | 產品管理頁面操作說明 |
| [docs/user-guide/FORECASTS.md](docs/user-guide/FORECASTS.md) | 預測管理頁面操作說明 |
| [docs/user-guide/CAPACITY.md](docs/user-guide/CAPACITY.md) | 產能規劃頁面操作說明 |
| [docs/user-guide/BP_TARGETS.md](docs/user-guide/BP_TARGETS.md) | 營業目標 BP 頁面操作說明 |
| [docs/user-guide/RESULTS_AND_RISK_BRIEF.md](docs/user-guide/RESULTS_AND_RISK_BRIEF.md) | 分析結果與風險摘要說明 |
| [docs/user-guide/WORKSPACE_COLLABORATION.md](docs/user-guide/WORKSPACE_COLLABORATION.md) | 工作區協作功能說明 |

### 產品與開發

| Document | Purpose |
|----------|---------|
| [docs/product/PROJECT_DEVELOPMENT_REVIEW_2026_05.md](docs/product/PROJECT_DEVELOPMENT_REVIEW_2026_05.md) | 專案開發歷程回顧與未來規劃 |
| [docs/product/DEVELOPMENT_PRINCIPLES.md](docs/product/DEVELOPMENT_PRINCIPLES.md) | 開發紅線與設計原則 |

### 品質保證

| Document | Purpose |
|----------|---------|
| [docs/qa/SMOKE_TEST_MASTER_CHECKLIST.md](docs/qa/SMOKE_TEST_MASTER_CHECKLIST.md) | 完整煙霧測試檢查清單 |
| [docs/WORKSPACE_SMOKE_TEST.md](docs/WORKSPACE_SMOKE_TEST.md) | Two-account manual checklist for verifying shared workspaces end-to-end |

### 其他

| Document | Purpose |
|----------|---------|
| [docs/WORKSPACE_COLLABORATION.md](docs/WORKSPACE_COLLABORATION.md) | Workspace data model, roles, Firestore paths, invite flow, security rules |
| [docs/AI_BRIEF_EXPORT.md](docs/AI_BRIEF_EXPORT.md) | AI Brief Export feature: usage, sanitization, guardrails, security policy |
| [docs/ai-eval/README.md](docs/ai-eval/README.md) | AI analysis evaluation kit: rubric, benchmark cases, scorecards, external AI test runbook, and safety guardrails |

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
npm run test       # Run Vitest
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
# Personal (private) — unchanged backward-compatible path:
users/{userId}/projects/{projectId}/
  skus/{skuId}
  forecasts/{forecastId}
  capacityPlans/{month}-{factoryId}
  parameters/default
  capacityVersions/{versionId}
  skuVersions/{versionId}

# Shared workspaces (v1.18.0+):
workspaces/{workspaceId}                              # name, ownerId, members map
workspaces/{workspaceId}/projects/{projectId}/
  skus/{skuId}
  forecasts/{forecastId}
  capacityPlans/{month}-{factoryId}
  parameters/default
  capacityVersions/{versionId}
  skuVersions/{versionId}

# Per-user index of accessible workspaces:
userWorkspaces/{userId}/workspaces/{workspaceId}      # role, defaultProjectId
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
- Products Spreadsheet Lab (`/products-sheet-lab`) does not include SKU version history — use the main Products page (`/products`) for that feature.
- No real-time collaboration (Firestore listeners not used).
- Firebase credentials required for full functionality; no mock data mode yet.
- Working days are configurable but fixed across all months (not per-month).

## Version History

- **2026-05-27 v1.40.0**: AI Provider Adapter + BYOK Safe Pilot — Introduced pluggable provider adapter architecture with `AiProvider` interface (`providerId`, `displayName`, `capabilities`, `validateConfig`, `buildRequest`, `parseResponse`, `runCompletion`). Added mock provider for deterministic testing (no network calls) and external BYOK placeholder (interface defined, not enabled). Output Validation Layer enforces blocked patterns (save/write, data guessing, causality claims, currency confusion, formula modification). BYOK security model: session-only keys in React state, no persistence (no localStorage/sessionStorage/Firestore/URL), password input with clear button, viewer restrictions on provider configuration. Fallback mechanism: provider failures degrade to deterministic tools with caveat messages. Provider routing: deterministic tools checked first, provider second, fallback third. All new strings in EN + zh-TW. Deterministic tools remain primary analysis engine. See [docs/ai-copilot/V1_40_AI_PROVIDER_ADAPTER_ARCHITECTURE.md](docs/ai-copilot/V1_40_AI_PROVIDER_ADAPTER_ARCHITECTURE.md), [docs/ai-copilot/V1_40_BYOK_SECURITY_MODEL.md](docs/ai-copilot/V1_40_BYOK_SECURITY_MODEL.md), [docs/ai-copilot/V1_40_AI_PROVIDER_ACCEPTANCE_CHECKLIST.md](docs/ai-copilot/V1_40_AI_PROVIDER_ACCEPTANCE_CHECKLIST.md).
- **2026-05-27 v1.39.0**: AI Copilot Evaluation & Hardening — Added evaluation harness with 10 eval cases covering all 6 deterministic tools, automated eval runner with structured pass/fail reports. Red team test suite with 10 safety tests covering prompt injection, sensitive data leakage prevention, external AI call blocking, and input validation. UX hardening: tool name display on responses, confidence color coding (high/medium/low), collapsible source references, caveat warning alerts, fallback CTAs for unresolvable queries, viewer read-only messaging, loading states with tool-specific messages. Export quality: eval-friendly prompt sections, F-A-I-R labeling (Fact/Assumption/Inference/Recommendation), guardrail text in prompts, source references on data points, no-write warnings, deterministic JSON export. 60+ new tests across eval, red team, routing, viewer, prompt, and sanitize domains. All v1.38 guardrails maintained: no external AI API, no auto-save, no Firestore writes, no formula modification. See [docs/ai-copilot/V1_39_EVAL_HARDENING.md](docs/ai-copilot/V1_39_EVAL_HARDENING.md).
- **2026-05-27 v1.38.0**: AI Data Copilot Deterministic MVP — In-product AI copilot panel with 6 deterministic diagnostic tools (data quality inspection, capacity risk explanation, BP gap analysis, data fix suggestions, scenario impact analysis, look-ahead focus). Quick question buttons, free-form keyword routing, F-A-I-R tagged responses, source references, confidence/caveat display. Fix draft model with human confirmation. Viewer read-only guard. Export prompt pack for external AI. No external AI API calls — all analysis is local and deterministic.
- **2026-05-27 v1.37.0**: Scenario Planning MVP — Single-scenario in-memory sandbox for what-if analysis. Adjust forecast volume, unit price, Core capacity, BU capacity multipliers. Compare baseline vs scenario: revenue, BP attainment, capacity utilization, shortage months. DQ caveat warnings when baseline data has quality issues. Viewer read-only guard. No data pollution: all analysis is ephemeral and deterministic.
- **2026-05-25 v1.34.0**: UI System Phase 1 Closure — Completed low-risk UI standardization for Parameters / Login / Setup pages: **Parameters** (abf-page container, ActionBar with Save/Restore buttons, abf-section for yield matrix / panel params / currency settings / BP redirect cards, abf-alert-page for errors and read-only warnings); **LoginPage** (abf-page wrapper with flex centering, preserved Google sign-in flow); **SetupPage** (abf-page wrapper with maxWidth 800px, preserved Firebase setup instructions and env template). Final polish marking the closure of v1.30-v1.34 UI System Phase 1. Presentation-layer-only release with no core/services/formula/Firestore rules changes.
- **2026-05-25 v1.33.0**: Number Display Standardization — Unified number formatting across the app: **formatNumber utility** (consistent thousand separators via toLocaleString with 'en-US' locale); **formatCurrency utility** (currency display with proper suffix and thousand separators); **formatPercent utility** (percentage display with 1 decimal place); **Applied to** Dashboard KPIs, Results tables, BP analysis tables, Capacity charts; **No NaN Protection** (handles null/undefined gracefully with '-' fallback). Presentation-layer-only release with no core/services/formula changes. All new utilities in `utils/formatters.ts`.
- **2026-05-25 v1.32.0**: Core Input Pages UI Standardization — Applied v1.30 UI System to core data entry pages: **Products** (abf-page container, PageHeader with Add SKU button, abf-section for table Card, responsive Modal form with 3-row layout, removed unused Space import); **Forecasts** (abf-page container, PageHeader, ActionBar with batch actions and view mode switcher, abf-section for tabs and table, abf-text-muted for year selection hints, removed unused imports); **CapacityPlan** (abf-page container, PageHeader, ActionBar with factory management and view mode buttons, abf-section for grid Card and charts Card, removed unused Spin import). Presentation-layer-only release with no core/services/formula changes.
- **2026-05-24 v1.24.1**: Snapshot Workflow i18n Polish – Enhanced version history UX and localizations. Refactored the recommended compare pair algorithm to return localized `reasonKey` properties (`insufficientSnapshots`, `bpBaselineVsLatestUpdate`, `latestTwoVersions`) and rendered them via `t()` on the UI. Cleared 4 hardcoded UI labels on the Results Compare Tab (`BP Gap Delta`, `Max Core Util Delta`, `Core Util Delta`, `BU Util Delta`) into full translation parity. Extended `snapshotMetadata.test.ts` to assert all three `reasonKey` transitions under Vitest. No Firestore rules changes, no schema changes, snapshots remain immutable, 100% green tests.
- **2026-05-24 v1.24.0**: Forecast Version History Workflow — Upgraded snapshots from scattered saves to a mature version management workflow. Added **optional metadata** (kind, periodLabel, reviewStatus, note) to snapshots with backward-compatible fallback. Created `snapshotMetadata.ts` helper module with pure deterministic functions for label/color mapping, filtering, and recommended compare pair selection. **Version Type Tags**: Working (blue), BP Baseline (green), Customer Update (orange), Capacity Review (purple), Scenario (cyan), Archive (default). **Review Status Tags**: Draft (default), Reviewed (green), Locked (blue), Archived (default). **Simple Filtering** by kind via Segmented control. **Recommended Compare Pairs**: deterministically suggests BP Baseline vs latest Working/Customer Update, otherwise latest two versions. **Enhanced Create Modal** with all metadata fields (optional), immutable warning. **Enhanced Version List** showing kind/status tags, period label, note, created time, created by, app version, and summary stats. All new strings in EN + zh-TW. Added 28 tests in `snapshotMetadata.test.ts`. No Firestore rules changes, no schema changes, no AI API, no core formula changes. Snapshots remain immutable.
- **2026-05-24 v1.22.2**: Firestore 快照重叠安全加固 (Firestore Snapshot Rules Overlap Fix) — 修复了通用通配符递归匹配 `{document=**}` 与 snapshots 专用规则之间的 Overlap 重叠权限漏洞。将个人项目 `users/{uid}/{document=**}` 以及工作区 `workspaces/{workspaceId}/projects/{projectId}/{document=**}` 通用递归 allow write 规则彻底拆分并收紧为非快照的业务数据精确 Collection 白名单匹配 `collectionName in ['skus', 'forecasts', 'capacityPlans', 'parameters', 'capacityVersions', 'skuVersions']`；将快照 `snapshots` 彻底隔离出白名单，只通过底层的快照专用规则进行硬性保护。这确保了快照的 Immutable 属性（禁止 update）与 Editor 仅能删除自己快照的 CreatedBy 越权隔离限制在生产环境 100% 成立且不可被通用规则绕过。升级 App 整体版本号至 `v1.22.2`。在 `firestoreRules.test.ts` 中精心设计了一套「多重规则 OR 仿真评估器」，实现了 overlap 漏洞的 TS 仿真复现与修复后的权限硬性回归拦截测试，覆盖全部 7+ 项快照核心权限。运行 `npm run test` 与 `npm run lint` 全量绿色通过，生产打包成功，并顺利向 Firebase Rules 及 Hosting 发布部署。详细漏洞成因与仿真原理请见：[FIRESTORE_SNAPSHOT_RULES_HARDENING.md](docs/phase6/FIRESTORE_SNAPSHOT_RULES_HARDENING.md)。
- **2026-05-24 v1.20.0**: Decision Analysis Depth — Phase 5.3B deepening of the deterministic decision-grade foundation. Added 6 new analysis modules: (1) `core/riskAttribution.ts` extended with **Weighted Pressure Index** (`coreWeight=1.3`, `buWeight=1.0`) exposed alongside the unweighted v1.17.0 raw index; weights configurable via `PressureWeightConfig` and surfaced in `RiskAttributionModel.weightConfig`. Weighting is **analysis-only** — it does not alter `runCalculation`, capacity formulas, BP TWD conversion, or Firestore data. (2) `core/bpAttribution.ts` builds **BP Gap Attribution** at yearly/quarterly/monthly granularity by customer/SKU/size/application, with `topDrivers` (≤5) carrying `shareOfGap` and `gapContributionMillionTwd`. Attribution is **proportional, not causal** — UI and reason text say so explicitly. (3) `core/impactAnalysis.ts` adds **Price Impact Analysis** (±5%/±10% scenarios, per year base vs scenario revenue, attainment, delta, mostSensitiveYear) and **Capacity Improvement Impact** (Core+10%, BU+10%, Both+10% scenarios, resolved shortage months, max-util shifts, bestScenarioId). Both are **read-only**: SKUs/forecasts/capacity plans are deep-cloned and re-fed through `runCalculation` — no mutation of originals. (4) `core/keyFindings.ts` extracts a **deterministic top-5 priority queue** of decision-grade findings sourced from data quality (high-impact), capacity (shortage/remedy), BP (miss/top driver), price sensitivity, and SKU health drainers. Sort: severity rank → id (stable). (5) `core/dataQuality.ts` enriches every `DataQualityIssue` with `decisionImpact: 'high' | 'medium' | 'low'` via deterministic id-pattern mapping (severity-fallback). (6) `core/analysisContract.ts` bumped to **`version: '1.1'`** exposing `bpAttribution`, `priceImpact`, `capacityImpact`, `keyFindings`, with 3 new assumption lines documenting weighted/proportional/read-only semantics. UI (`pages/CalculationResults.tsx`) splits the Risk Brief tab into the existing sections plus 4 new ones: **Key Findings** list (severity + source tags), **BP Gap Attribution** table (top drivers with `shareOfGap` and proportional-not-causal note), **Price Impact** tabs (per-scenario per-year revenue/attainment/delta), **Capacity Improvement Impact** table (before/after shortage counts, max-util shifts). Added ~70 new EN keys and ~70 mirrored zh-TW keys; new `i18nOutputs.test.ts` block asserts all v1.1 analysis messages render in both languages with no `{placeholder}` leakage and no raw `.key` echo. **Hard constraints upheld**: no AI API, no AI Chat, no changes to capacity/BP/currency core formulas, no Firestore schema changes, no Workspace regressions, no Refine resurrection, no large UI redesign, Products Spreadsheet Lab not promoted, legacy English fields preserved, every new analysis string supports EN + zh-TW. **63 new/updated tests pass** (full suite green).
- **2026-05-24 v1.19.0**: 中文化 & Risk Brief i18n Localization — fixed Traditional Chinese mojibake in `zhTW.ts` (replaced corrupted bytes with proper UTF-8); introduced strict i18n parity tests (`i18nKeys.test.ts`) that enforce 1:1 key parity between `en.ts` and `zhTW.ts`, guard against mojibake / `U+FFFD` replacement characters, and reject Simplified Chinese characters in the Traditional Chinese dictionary. Refactored `core/riskBrief.ts`, `core/riskAttribution.ts`, and `core/dataQuality.ts` to emit a `LocalizedMessage = { key, params? }` shape alongside legacy English strings (dual-field, backward-compatible). `CalculationResults.tsx` and `Parameters.tsx` now render every Card title, table column header, list item, role-based attention bullet, BP gap explanation, attribution dimension/metric/classification, and error toast through `t(message)` — no hardcoded English remains on the Results page. Added `translateFor(lang, message)` helper for non-React contexts. New `i18nOutputs.test.ts` adds 8 tests covering Risk Brief executive summary, facts, drivers, role attention, confidence explanation, and Data Quality issues in both EN and zh-TW (no `{placeholder}` leakage, no raw `.key` echo, no Simplified characters). Total **235 tests pass**. No calculation formula changes, no Firebase/Firestore structure changes, no AI integration.
- **2026-05-23 v1.18.1**: Shared Workspace Hardening (no new analytics) — fixed a Firestore rules runtime bug where v1.18.0 created the workspace document and the owner's `userWorkspaces/{uid}/workspaces/{wid}` index entry in the same `writeBatch`, but the index-entry rule's `get(workspaces/{wid})` could not see same-batch writes and denied the request in production. `workspaceService.createWorkspace` now writes sequentially (workspace doc first, then owner index) with a `repairOwnerIndex()` safety net. Firestore rules gained a dedicated owner-bootstrap allow path keyed on `workspaces/{wid}.ownerId` (no member-map chicken-and-egg) plus stricter invariants: owner cannot self-demote or silently transfer ownership; viewer cannot self-promote via index self-repair; non-owner cannot inject members by writing index entries directly. New `firestoreRules.test.ts` mirrors every rule predicate in TypeScript and asserts the boolean matrix for owner-bootstrap, invite, read/write/delete, role-escalation block, owner-transfer block. `loadDemoData` now fails fast for viewer scopes. Invite UX strengthened: prominent warning that this is **UID-only, not email**, with a 4-step handshake explanation; UID input rejects strings containing `@`. New `docs/WORKSPACE_SMOKE_TEST.md` documents a 25-step two-account manual checklist. 224 tests pass.
- **2026-05-23 v1.18.0**: Shared Workspace Collaboration MVP — added shared workspace data model (`workspaces/{wid}/projects/{projectId}/...`) so multiple Google accounts can co-edit one ABF dataset; introduced roles (`owner` / `editor` / `viewer`); WorkspaceContext + WorkspaceProvider drive an active scope, with `ProjectScope` plumbed through every service signature; Workspace switcher in header (Personal vs Shared) + UID copy affordance; Workspace Settings panel on Parameters page (create-from-personal, add member by Google UID, role select, member remove); `assertCanWrite` enforces viewer read-only at service layer plus disabled buttons + read-only Alert on Products / Forecasts / CapacityPlan / Parameters / CapacitySpreadsheet / ProductsSpreadsheetLab / Dashboard; `firestore.rules` and `firebase.json` added (members read business data, owner/editor write, only owner manages members, personal path remains user-private); migration is copy-not-move (personal data preserved); no AI, no backend, no Cloud Functions, no Refine, no calculation formula changes, multi-currency / BP TWD logic intact. See [docs/WORKSPACE_COLLABORATION.md](docs/WORKSPACE_COLLABORATION.md).
- **2026-05-23 v1.17.0**: Phase 5.2 Risk Driver Attribution Upgrade — added `riskAttribution.ts` separating risk-period attribution from overall contribution; shortage-month aggregation by customer / SKU / size / application / layer bucket / product grade; introduced `capacityPressureIndex` MVP (`shortageCoreDemand + shortageBuDemand`); added SKU Health Signals MVP with deterministic classification (`strategicGrowth`, `cashCow`, `capacityDrainer`, `lowValueHighLoad`, `watchList`, `dataIncomplete`) and documented thresholds (HIGH_SHARE=15%, LOW_SHARE=5%); extended `AnalysisContractPayload.riskAttribution`; Risk Brief now exposes `attributionDrivers`, `shortageMonths`, `skuHealthSignals` and uses them in role-based attention; Results page renders three separated panels (Risk Period Attribution / SKU Health Signals / Overall Contribution); no AI integration, no formula changes, no Firebase changes, no multi-currency / BP TWD regressions, Refine not restored.
- **2026-05-23 v1.16.1**: Phase 5.1 Risk Brief Calibration — calibrated deterministic Risk Brief on Results tab with explicit Facts, Drivers, Assumptions, Data Caveats, and Role-Based Attention sections; separated Driver Analysis into revenue, Core pressure, BU pressure, shortage exposure, and BP risk groups with share %; added confidence explanation and top-caveat limit (top 5); kept AI/API integration out of scope (deterministic only); verified test/lint/build gates.
- **2026-05-23 v1.16.0**: Decision-Grade Analysis Foundation MVP — established Metric Registry defining 15 core decision KPIs; built Data Quality Checker assessing errors, warnings, and info across domains; integrated standardized AnalysisContract payload; engineered deterministic Capacity Bottleneck & BP Risk Brief on Results tab; upgraded Dashboard with live data trust Alert/Confidence tag; physically purged Refine Lab module (`/products-refine-lab`) along with related npm dependencies while maintaining Products Spreadsheet Lab as experimental; documented that generated forecast in bulk growth generation prioritizes SKU unit prices, falling back to previous year forecasts if undefined.
- **2026-05-23 v1.15.1**: Multi-Currency hotfix — purified `getUsdToTwdRate` to return the absolute USD-TWD rate without being affected by `displayCurrency` config; prevented BP targets comparison pollution under USD display currency; resolved CNY symbol mojibake using Unicode escape representation `\u00A5`; added robust unit tests for explicit currency and BP conversions; aligned and documented SKU priority logic in Forecast batch growth.
- **2026-05-23 v1.15.0**: Multi-Currency product price support — enabled SKU and Forecast unit prices to be entered in USD, TWD, or CNY; calculation engine normalizes prices to USD before revenue calculation; Dashboard and Results support displaying in USD, TWD, or CNY; BP targets comparison correctly converts USD revenue to TWD before comparing to million TWD BP target; fixed TS type compile issues and resolved Vitest unit test expectations; updated Parameters and App Header UI with CNY options.
- **2026-05-22 v1.14.9**: Phase 4.1 low-risk vendor chunk split — added manual chunks for React, Ant Design, charts, Firebase, and xlsx vendors. Reduced main index chunk from 1,281.97 kB / gzip 406.86 kB to 254.56 kB / gzip 82.76 kB, and Dashboard chunk from 1,446.87 kB / gzip 422.36 kB to 160.10 kB / gzip 44.32 kB. Verified test/lint/build gates.
- **2026-05-22 v1.14.8**: Phase 4 performance and structure optimization — added route-level lazy loading for major pages, introduced shared accessible `PageLoading` fallback, reduced initial main JS bundle from 4,306.83 kB to 1,281.97 kB (gzip 1,295.18 kB → 406.85 kB), and verified test/lint/build gates.
- **2026-05-22 v1.14.7**: Phase 3 product-risk test hardening — added BP target tests for TWD/USD conversion boundaries, annual/quarter/month allocation, empty data, and orphan SKU rows; added Forecast yearly growth tests for 0/positive/negative rates, sorted target years, and no overwrite/stale mix; added mock Firestore service tests for SKU, Forecast, and Parameters/BP target persistence; added smoke test checklist.
- **2026-05-22 v1.14.6**: Phase 2 lint gate — ESLint `no-explicit-any`/`set-state-in-effect`/`react-refresh` downgraded to warn (0 errors, 145 warnings). Fixed 4 empty catch blocks, 2 useless assignments in calculationEngine, removed unused params in bpTargets, removed unused compact prop in AppTable, deleted 58MB debug artifacts.
- **2026-05-22 v1.14.5**: Cloud Code handoff — repo hygiene (gitignore debug artifacts), fix CalculationResults stale state (clear model/bpTargets when data empty).
- **2026-05-21 v1.14.4**: Repo cleanup and Dashboard stale state fix — cleaned deploy debug artifact, clarified version history, and reset Dashboard model/BP/highlight state when source data is missing.
- **2026-05-21 v1.14.3**: Dashboard UI/UX polish — responsive KPI breakpoints (`xs/sm/md/lg/xl`), centered loading state with `role="status"`/`aria-live="polite"`, chart accessibility labels (`role="img"`/`aria-label`), KPI status icons with `title`/`aria-label`, Ant Design token colors replacing hardcoded values, typed BP Dashboard row builder (no `any`). Added 7 new i18n keys.
- **2026-05-21 v1.14.2**: Fixed i18n review findings — added `capacityLab.experimentTag` to zhTW, replaced hardcoded `Products Lab` page title with `t('menu.productsLab')`, replaced hardcoded `ABF Calc` sidebar title with `t('app.abbrev')`, added `app.abbrev` to both en/zhTW dictionaries. Added i18n key parity test (`i18nKeys.test.ts`) ensuring en and zhTW have identical keys. Confirmed `t('a')`, `t('T')`, `t('-')`, `t('-Q')` grep matches were false positives (string split/JS API, not translation calls). Confirmed `t(\`forecasts.${viewMode}\`)` is safe (viewMode strictly typed).
- **2026-05-21 v1.14.1**: Rebuilt Results → BP Analysis page — full business analysis with KPI summary row, transposed overall BP matrix (metrics as rows, periods left-to-right), Customer contribution table, SKU contribution table, status coloring (met/watch/miss/no-target). Dashboard BP section also rebuilt with same transposed layout and KPI row. `buildBpAnalysis()` uses `skuResults` as primary source (not `monthlySummaries`), generates periods even when capacity data is incomplete. Added `computeBpKpi()`, `getStatusColor()`, `formatBpGap()`. Created `BpAnalysisPanel` component. Expanded i18n with 15+ BP analysis keys. 33 bpTargets tests covering year/quarter/month, status colors, customer/SKU contribution, empty monthlySummaries.
- **2026-05-21 v1.14.0**: BP target input unit changed to million TWD — users enter targets in million TWD (e.g., 3.2 = 320万 TWD). Updated input precision to 1 decimal, support fractional values. Fixed BP analysis table year ordering — all yearly/quarterly/monthly views now consistently sorted left-to-right in ascending order. Updated data structure from `yearlyRevenueTargetsTwd` to `yearlyRevenueTargetsMillionTwd`. Updated all related tests for new unit.
- **2026-05-21 v1.13.0**: Added BP (Business Plan) Target and Attainment Analysis — yearly BP target revenue input in Parameters (2026–2040), stored in USD under `parameters/default.bpTargets`. Dashboard shows BP attainment table (Target, Forecast Revenue, Attainment %, Gap). Results page adds BP Analysis tab with Year / Quarter / Month views. Quarterly targets = annual / 4, monthly targets = annual / 12 (evenly allocated). Missing or zero targets show `-` for attainment (not treated as failure). Reserved `monthlyRevenueTargetsUsd` data structure for future monthly BP target input. Added 14 bpTargets.test.ts tests. Integrated with existing v1.12.1 forecast yearly growth feature.
- **2026-05-21 v1.12.1**: Added Forecast yearly growth generation — users can select target empty years and a fixed growth rate; the Forecasts page generates monthly SKU forecasts from the same months in the previous year, skips SKU-years that already have data, supports selected SKUs or all SKUs, and includes tested cascading year logic.
- **2026-05-21 v1.12.0**: Added Products Spreadsheet Lab (`/products-sheet-lab`) — Excel-like SKU input with multi-cell paste, batch validation, batch save, derived UPP/yield, and CSV export. Created shared `skuDerived.ts` helper for consistent UPP/yield calculation across all pages. Refine Lab was initially retained for technical comparison but subsequently removed in v1.16.0, with Products Spreadsheet Lab remaining as the preferred experimental interface. Corrected README known limitations and tech stack.
- **2026-05-21 v1.9.1**: Fixed NaN year appearing in yearly health matrix by filtering invalid year values in monthsToYears().
- **2026-05-21 v1.8.1**: Wired currency/i18n throughout all pages — Dashboard and Results now sync display currency with header switch, Parameters syncs currency preference to localStorage, fixed hardcoded labels in Forecasts (SKU Code/Customer/Device/Layer/UPP) and Products (OSAT), added missing i18n keys, year-aware revenue formatting for TWD yearly exchange rate mode.
- **2026-05-21 v1.8.0**: Added USD/TWD currency display switching, exchange rate settings, Traditional Chinese/English UI language support, and UI label consistency cleanup.
- **2026-05-21 v1.7.0**: Dashboard and Results analytics redesign — yearly capacity health table with red/orange/green severity, revenue and Core/BU utilization trend charts, matrix analysis tables (Revenue by Customer/Size/Application, Core/BU Demand by Size/Application/ProductGrade/LayerBucket), Dashboard answers "which year has problems / revenue trend / bottleneck", Results organized into Sales View / Product Planning View / Capacity Analysis View / Raw Detail tabs, reusable analytics.ts helper layer and TimeMatrixTable component.
- **2026-05-20 v1.2.6**: Products page — inline edit with expanded form (3-row layout with labels), download/import template with Yield Rate + Core Type + Core Thickness + ABF Type fields, fixed chip dimension column name mismatch (NaN fix), price display 1 decimal, yield display as integer percentage, sidebar optimized with sticky layout + scrollable menu + version footer.
- **2026-05-19**: Initial rebuild — Firebase-backed React + TypeScript + Ant Design frontend replacing broken Python backend. Excel-style capacity grid with factory management, batch operations, Fill Forward, view modes (Month/Quarter/Year), capacity trend charts, version save/restore, demo data loader.

## License

Private.
