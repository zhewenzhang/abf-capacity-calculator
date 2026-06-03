# V1.56.1 Dashboard Analysis Migration Gap Repair — Command Log

## Baseline

- **Baseline commit**: `9defbeef4a00d84fb1c7e60ef811f800c5f3c95e`
- **Branch**: `xiaomi/v1-56-1-dashboard-analysis-migration-gap-repair`

## Anti-Regression Checklist (Pre-Development)

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `9defbee` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| Version | ✅ v1.56.0 |

## Root Cause

**v1.56.0 只迁了一行 KPI，没有迁入实际分析模块。**

v1.56.0 的 commit message 说 "Merge Dashboard high-value content"，但实际上只添加了一个 "Executive KPIs" 卡片，里面只有 6 个小数字（总营收、最大 Core 率、最大 BU 率、短缺月数、BP 达成率、DQ 信心）。

原 Dashboard 的以下分析模块完全没有迁入：
- ❌ Revenue Trend Chart（月度营收折线图）
- ❌ Utilization Trend Chart（Core/BU 利用率双线图）
- ❌ BP Attainment Section（4 KPI 卡片 + 年度达成表格）
- ❌ Yearly Capacity Health Matrix（多年度产能健康矩阵）
- ❌ Top Driver Snapshots（按客户/尺寸/应用的营收分布）

## Dashboard Analysis Inventory

| 模块 | 原位置 | 数据来源 | 已迁入？ | 现状 |
|------|--------|---------|---------|------|
| Executive KPI Cards (6) | Dashboard | AnalyticsModel | ✅ 部分 | KPI Strip |
| Revenue Trend Chart | Dashboard | monthlyRevenue | ❌ | 缺失 |
| Utilization Trend Chart | Dashboard | monthlyUtilization | ❌ | 缺失 |
| BP Attainment (4 KPI + table) | Dashboard | BpAnalysisModel | ❌ | 缺失 |
| Yearly Capacity Health Matrix | Dashboard | yearlyHealth | ❌ | 缺失 |
| Top Driver Snapshots | Dashboard | revenueByCustomer etc | ❌ | 缺失 |
| Key Insights | Dashboard | highlights | ❌ | 已删除（冗余） |
| Welcome/Load Demo | Dashboard | - | ❌ | 已删除（一次性） |

## Fix Strategy

将原 Dashboard 的高价值分析模块迁入 Operations Workbench：

1. **Revenue & BP Analysis** — BP KPI 卡片 + 年度达成表格 + 营收趋势折线图
2. **Capacity Analysis** — Core/BU 利用率趋势折线图
3. **Top Driver Snapshots** — 按客户/尺寸/应用的营收分布表

删除旧的重复 Revenue/BP Summary（SECTION 4），替换为更详细的 BP Analysis。

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Update APP_VERSION to v1.56.1 |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Add Revenue/BP Analysis, Capacity Analysis, Top Driver Snapshots; remove duplicate Revenue/BP Summary |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Update test mocks (currency, bpTargets, charts, TimeMatrixTable, AppPrefsProvider) |
| `docs/release/V1_56_1_DASHBOARD_ANALYSIS_MIGRATION_GAP_REPAIR_COMMAND_LOG.md` | This log |

## Anti-Regression Checklist (Post-Development)

| Check | Status |
|-------|--------|
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| No Issues Summary block | ✅ Confirmed |
| Version | ✅ v1.56.1 |

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
| `/dashboard` | ✅ 200 (redirects) |
| `/scenario` | ✅ 200 |
| `/bp-targets` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.56.1`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `115de5d`
- **Main merge commit**: `a87ce7f`
- **Push**: ✅ origin/main and origin/xiaomi/v1-56-1-dashboard-analysis-migration-gap-repair
