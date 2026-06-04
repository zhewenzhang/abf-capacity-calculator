# V1.57.3 Scenario Annual Impact Table Empty Fix — Command Log

## Baseline

- **Baseline commit**: `5ced6d9a128b102ac1c665a921827a4caf8d31a7`
- **Branch**: `xiaomi/v1-57-3-scenario-annual-impact-table-fix`

## Root Cause

**字段名不匹配。**

`YearlyResult` 接口定义的字段名是：
- `totalRevenueUsd`
- `bpAttainmentPct`
- `bpGapMillionTwd`
- `totalForecastPcs`
- `maxCoreUtilization`
- `maxBuUtilization`
- `shortageMonthCount`

但 `tableRows` 中的 metric keys 使用的是：
- `revenue` ❌
- `bpAttainment` ❌
- `bpGap` ❌
- `forecastPcs` ❌
- `maxCoreUtil` ❌
- `maxBuUtil` ❌
- `shortage` ❌

`getMetricValue()` 函数尝试访问这些不存在的属性，返回 `null`，导致所有单元格显示 `—`。

## 为什么图表有数据但表格没有

图表直接使用 `comparison.baseline.yearly` 和 `comparison.scenario.yearly` 的数据，通过正确的字段名访问。

但表格使用 `getMetricValue(bRow, m.key)` 访问，而 `m.key` 与 `YearlyResult` 的字段名不匹配，所以全部返回 `null`。

## 修改文件

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | 更新版本 v1.57.3 |
| `frontend/src/pages/ScenarioPlanning.tsx` | 修正 metric keys 与 YearlyResult 接口匹配 |

## 表格数据来源修复方式

将 metric keys 从错误的简写改为正确的 `YearlyResult` 字段名：
- `revenue` → `totalRevenueUsd`
- `bpAttainment` → `bpAttainmentPct`
- `bpGap` → `bpGapMillionTwd`
- `forecastPcs` → `totalForecastPcs`
- `maxCoreUtil` → `maxCoreUtilization`
- `maxBuUtil` → `maxBuUtilization`
- `shortage` → `shortageMonthCount`

## test / lint / build

| Check | Result |
|-------|--------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ Success |
| `npm run test -- --run` | ✅ 61/61 files, 1532/1532 tests |

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
| `/scenario` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.57.3`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `0e87943`
- **Main merge commit**: `539e979`
- **Push**: ✅ origin/main and origin/xiaomi/v1-57-3-scenario-annual-impact-table-fix
