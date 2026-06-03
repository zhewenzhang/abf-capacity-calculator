# V1.56.5 BP Revenue Analysis Formatting + Chart Baseline Fix — Command Log

## Baseline

- **Baseline commit**: `7b4619390787ab2d37e502cb5be29b3ff59c5407`
- **Branch**: `main` (already merged)

## Anti-Regression Checklist

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `7b46193` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present |
| Version | ✅ v1.56.5 |

## Root Cause

### BP 总目标显示 0.1 M NTD 的根因

**`formatPlainMoney` 重复除以百万。**

- BP 目标存储单位是百万 TWD（如 `11076` = 11,076 M TWD）
- `formatPlainMoney` 默认除以 1e6 转换为百万
- 导致 `11076 / 1e6 = 0.011076`，显示为 `0.1 M NTD`

### 预测总营收显示问题

**单位不匹配。**

- `analyticsModel.totalRevenue` 是原始 USD
- BP 目标是百万 TWD
- 之前混用导致显示异常

## 修复方案

### 1. 新增 `alreadyMillions` 参数

在 `formatPlainMoney` 中新增 `alreadyMillions` 选项：

```typescript
export function formatPlainMoney(
  value: number | null | undefined,
  currency: string = 'TWD',
  options?: { maximumFractionDigits?: number; signed?: boolean; alreadyMillions?: boolean }
): string {
  // ...
  const displayValue = alreadyMillions ? abs : abs / 1e6;
  // ...
}
```

### 2. BP KPI 使用 `alreadyMillions: true`

```typescript
formatPlainMoney(kpi.totalTargetMillionTwd, 'TWD', { alreadyMillions: true })
formatPlainMoney(kpi.totalForecastMillionTwd, 'TWD', { alreadyMillions: true })
```

### 3. 营收趋势图新增 BP 月均目标线

- 预测营收：`revenue / 1e6`（原始 USD 转百万）
- BP 月均目标：`yearlyTarget / 12`（年度目标除以 12）

### 4. 图表格式化

- Y 轴：千分号 + M 单位
- Tooltip：千分号 + M NTD
- X 轴：缩写格式减少拥挤

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Update APP_VERSION to v1.56.5 |
| `frontend/src/core/formatters.ts` | Add `alreadyMillions` option to `formatPlainMoney` |
| `frontend/src/core/formatters.test.ts` | Add tests for `alreadyMillions` option |
| `frontend/src/i18n/en.ts` | Add `dashboard.forecastRevenue`, `dashboard.monthlyBpTarget` |
| `frontend/src/i18n/zhTW.ts` | Add `dashboard.forecastRevenue`, `dashboard.monthlyBpTarget` |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Fix BP KPI formatting, add BP monthly target line |

## 汇总口径

| 指标 | 计算方式 | 单位 |
|------|---------|------|
| BP 总目标 | `Σ(yearlyTargetMillionTwd)` | M NTD |
| 预测总营收 | `Σ(yearlyForecastMillionTwd)` | M NTD |
| 总达成率 | `totalForecast / totalTarget` | % |
| 总差距 | `totalForecast - totalTarget` | M NTD |

## Chart 单位口径

| 数据 | 原始单位 | Chart 单位 |
|------|---------|-----------|
| 预测营收 | USD | M (÷1e6) |
| BP 月均目标 | M TWD/年 | M TWD/月 (÷12) |

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
| `/operations` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.56.5`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Main commit**: `7b46193`
- **Push**: ✅ origin/main
