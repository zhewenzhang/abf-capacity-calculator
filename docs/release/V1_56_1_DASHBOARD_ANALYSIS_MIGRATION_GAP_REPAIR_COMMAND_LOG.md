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
