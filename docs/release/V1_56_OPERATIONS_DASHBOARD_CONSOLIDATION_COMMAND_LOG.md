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
- Add `formatPlainMoney` helper
