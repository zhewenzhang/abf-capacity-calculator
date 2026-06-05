# V1.57.5 Global NTD Analysis Baseline — Command Log

## Baseline

- **Baseline commit**: `734a7c86db632eeb015e684789d7be39bca678d4`
- **Branch**: `xiaomi/v1-57-5-global-ntd-analysis-baseline`

## 全系统金额显示审计结果

| 文件 | 问题 | 修复方式 |
|------|------|---------|
| `DailyOperationsWorkbench.tsx` | KPI 显示 `M USD` | 转换为 `M NTD` |
| `DailyOperationsWorkbench.tsx` | 驱动因素表显示 `M USD` | 转换为 `M NTD` |
| `DailyOperationsWorkbench.tsx` | Scenario v2 delta 显示 `USD` | 转换为 `M NTD` |
| `ScenarioPlanning.tsx` | KPI 显示 `M USD` | 转换为 `M NTD` |
| `ScenarioPlanning.tsx` | 图表标题显示 `百萬美元` | 改为 `M NTD` |
| `ScenarioPlanning.tsx` | 表格营收显示 `M` 无单位 | 改为 `M NTD` |
| `i18n/en.ts` | `Revenue (M USD)` | 改为 `Revenue (M NTD)` |
| `i18n/zhTW.ts` | `營收（百萬美元）` | 改为 `營收（M NTD）` |

## 修复策略

1. **Operations 页面**: 使用 `convertFromUsd()` 将 USD 转换为 TWD 后显示
2. **Scenario 页面**: 添加 `currencySettings` 状态，所有营收显示转换为 TWD
3. **i18n**: 更新图表标题为 M NTD

## 修改文件清单

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | 更新版本 v1.57.5 |
| `frontend/src/i18n/en.ts` | 图表标题改为 M NTD |
| `frontend/src/i18n/zhTW.ts` | 图表标题改为 M NTD |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | 转换营收显示为 M NTD |
| `frontend/src/pages/ScenarioPlanning.tsx` | 转换所有营收显示为 M NTD |

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
| `/operations` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.57.5`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `98b97eb`
- **Main merge commit**: `5364bd2`
- **Push**: ✅ origin/main and origin/xiaomi/v1-57-5-global-ntd-analysis-baseline
