# V1.57.4 Scenario Annual Impact Table Layout Fix — Command Log

## Baseline

- **Baseline commit**: `80316e28e66544510f3659086c6e661b17be9097`
- **Branch**: `xiaomi/v1-57-4-scenario-annual-impact-table-layout`

## Root Cause

**年份列没有固定宽度，导致左侧指标列被压缩。**

当前表格使用 `width: '100%'`，当有 15 个年份列（2026-2040）时，每列被压缩到很窄，导致指标列文字逐字换行。

## Wide Table Layout Rule

**项目级 UI 规则：**

当表格列太多无法完整呈现时：
1. 不要压缩关键文字列
2. 左侧关键列必须保持可读宽度（≥140px）
3. 右侧数据列允许横向滚动
4. 默认视口只需露出 4-6 个主要数据列
5. 用户通过横向滚动查看更多年份/月份
6. 不允许出现逐字换行
7. 文字最多允许自然换 1-2 行
8. 数字列保持紧凑、右对齐、不可随意折行

## 修改文件

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | 更新版本 v1.57.4 |
| `frontend/src/pages/ScenarioPlanning.tsx` | 修复年度影响表和年度倍率矩阵表布局 |

## 表格布局策略

### 年度影响结果表
- 指标列：width: 160px, minWidth: 160px, sticky, word-break: keep-all
- 年份列：width: 120px, minWidth: 120px
- 表格 minWidth：`${160 + displayYears.length * 120}px`
- 外层容器：overflowX: auto

### 年度倍率矩阵表
- 指标列：width: 140px, minWidth: 140px, sticky, word-break: keep-all
- 年份列：minWidth: 90px, width: 90px
- 表格 minWidth：`${140 + years.length * 90 + 60}px`

## 默认可见年份范围

由 `getYearsFromResults(comparison.baseline.yearly)` 决定，只包含有实际数据的年份（如 2026-2030）。

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
- `v1.57.4`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `78ec15a`
- **Main merge commit**: `ef17c8d`
- **Push**: ✅ origin/main and origin/xiaomi/v1-57-4-scenario-annual-impact-table-layout
