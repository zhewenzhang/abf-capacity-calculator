# V1.56 Operations Dashboard Consolidation — Command Log

## Baseline

- **Baseline commit**: `db37172acb4428da00e8d75e6ab5d12fceb9f59f`
- **Branch**: `xiaomi/v1-56-operations-dashboard-consolidation`

## Anti-Regression Checklist (Pre-Development)

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `db37172` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present (5 matches) |
| BP page (YoY/CNY) | ✅ Present |
| Scenario (annualMultipliers) | ✅ Present (5 matches) |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| No Issues Summary block | ✅ Confirmed |

## Merge Strategy

- Keep `/operations` as main unified page
- Migrate Dashboard high-value content into Operations Workbench
- Make `/dashboard` redirect to `/operations`
- Remove duplicate data loading
- Remove low-value sections (Scenario v1 presets, duplicate Revenue/BP Summary)
- Keep Pipeline Readiness, Abnormality Intelligence, Look-Ahead, Scenario v2, Management Report, Copilot Actions

## Currency Format

- All currency displays: `3,500.4M TWD` (no $/NT$/Dollar icon)
- Add `formatPlainMoney` helper in `currency.ts`

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Remove dashboard from PRIMARY_NAV, update APP_VERSION to v1.56.0 |
| `frontend/src/pages/Dashboard.tsx` | Replace with redirect to /operations |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Add Executive KPI Strip, remove Scenario v1 presets |
| `frontend/src/core/currency.ts` | Add `formatPlainMoney()` function |
| `frontend/src/i18n/en.ts` | Add `dashboard.executiveKpi`, update `dashboard.title` |
| `frontend/src/i18n/zhTW.ts` | Add `dashboard.executiveKpi`, update `dashboard.title` |
| `docs/release/V1_56_OPERATIONS_DASHBOARD_CONSOLIDATION_COMMAND_LOG.md` | This log |

## What Was Migrated from Dashboard

| Content | Status |
|---------|--------|
| Executive KPI Cards (revenue, utilization, shortage) | ✅ Migrated as KPI Strip |
| Yearly Capacity Health Matrix | ❌ Not migrated (complex, low frequency) |
| BP Attainment Section | ❌ Not migrated (available at /bp-targets) |
| Revenue Trend Chart | ❌ Not migrated (available at /results) |
| Utilization Trend Chart | ❌ Not migrated (available at /results) |
| Top Driver Snapshots | ❌ Not migrated (available at /results) |
| Key Insights | ❌ Removed (redundant with KPIs) |
| Welcome/Load Demo | ❌ Removed (one-time onboarding) |

## What Was Removed from Workbench

| Content | Status |
|---------|--------|
| Scenario v1 Presets | ✅ Removed (low value, just navigation) |
| Duplicate Revenue/BP Summary | ✅ Removed (replaced by KPI Strip) |

## What Was Kept

| Content | Status |
|---------|--------|
| Pipeline Readiness | ✅ Kept as first module |
| Abnormality Intelligence | ✅ Kept |
| Look-Ahead Focus Panel | ✅ Kept |
| Scenario v2 Shortcuts | ✅ Kept |
| Management Report | ✅ Kept |
| Copilot Quick Actions (deep links) | ✅ Kept |

## Anti-Regression Checklist (Post-Development)

| Check | Status |
|-------|--------|
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present (no dashboard) |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| No Issues Summary block | ✅ Confirmed |
| Version | ✅ v1.56.0 |

## test / lint / build

| Check | Result |
|-------|--------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ Success |
| `npm run test -- --run` | ✅ 61/61 files, 1520/1520 tests |

## Red-line Checks

| File | Status |
|------|--------|
| firestore.rules | ✅ Not modified |
| calculationEngine.ts | ✅ Not modified |

## Deploy

- **Command**: `firebase deploy --only hosting`
- **URL**: https://abf-capacity-calculator.web.app

## Post-deploy Canary

| Page | HTTP Status |
|------|-------------|
| `/` | ✅ 200 |
| `/operations` | ✅ 200 |
| `/dashboard` | ✅ 200 (redirects to /operations) |
| `/bp-targets` | ✅ 200 |
| `/scenario` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.56.0`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `2e91639`
- **Main merge commit**: `b987c1d`
- **Push**: ✅ origin/main and origin/xiaomi/v1-56-operations-dashboard-consolidation
