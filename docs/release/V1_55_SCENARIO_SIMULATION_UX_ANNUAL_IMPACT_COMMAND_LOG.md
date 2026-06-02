# V1.55 Scenario Simulation UX + Annual Impact Redesign — Command Log

## 需求理解

将情境模拟页面从简单的 4 滑块 + MetricCard 改版为支持年度倍率矩阵、全局批量调整、模式切换结果表、趋势折线图、摘要 KPI 卡片的业务分析工具。

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `frontend/src/core/scenarioEngine.ts` | 新增年度倍率支持：`AnnualMultipliers` 类型、`applyAnnualMultipliers()`、`aggregateByYear()`、`YearlyResult` 类型、`computeAnnualScenarioComparison()` |
| `frontend/src/pages/ScenarioPlanning.tsx` | 完全重写：全局倍率调整 + 预设、年度倍率矩阵、KPI 卡片、趋势折线图、模式切换结果表、空状态 |
| `frontend/src/i18n/en.ts` | 新增 ~30 个 v1.55 i18n keys |
| `frontend/src/i18n/zhTW.ts` | 同上繁中翻译 |
| `docs/release/V1_55_SCENARIO_SIMULATION_UX_ANNUAL_IMPACT_COMMAND_LOG.md` | 本日志 |

## 设计取舍

### 1. 年度倍率 vs 全局倍率
- 保留全局批量调整（输入百分比一键套用到所有年份）
- 新增年度矩阵，允许逐年微调
- 全局调整是「套用到全部年份」的快捷方式，不覆盖已有微调

### 2. scenarioEngine 扩展策略
- 不修改 `calculationEngine.ts`（红线）
- 在 scenarioEngine.ts 中新增 `applyAnnualMultipliers()`，按月份提取年份套用对应倍率
- `aggregateByYear()` 从 monthlySummaries 聚合出年度结果
- SKU unitPrice 使用第一个年份的倍率（SKU 无月份属性）

### 3. 结果表从宽表改为模式切换
- 原始模式：显示 baseline 值
- 模拟模式：显示 scenario 值
- 变化模式：显示 delta（营收用金额、BP 用 pp、利用率用 pp）

### 4. 图表使用 recharts
- 项目已有 recharts 依赖，不新增 npm dependency
- 三个图表：营收趋势、BP 达成率、利用率（含 100% reference line）

### 5. UI 风格
- 白底大圆角卡片、轻边框、低阴影
- mint green (#34d399) 作为 accent
- 表格 sticky 第一列、轻边线
- 被改动格子短暂高亮（mint bg）

## test / lint / build

| 检查 | 结果 |
|------|------|
| `npm run test -- --run` | ✅ 59/59 文件，1442/1442 测试通过 |
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ built in 1.23s |

## 安红线

| 检查 | 结果 |
|------|------|
| firestore.rules | ✅ 无修改 |
| calculationEngine.ts | ✅ 无修改 |
| DeepSeek API key | ✅ 未触碰 |
| Firebase Auth | ✅ 未触碰 |
| 新 npm dependency | ✅ 未新增 |

## Git

- Branch: `xiaomi/v1-55-scenario-simulation-ux-annual-impact`
- Commit: 待提交
