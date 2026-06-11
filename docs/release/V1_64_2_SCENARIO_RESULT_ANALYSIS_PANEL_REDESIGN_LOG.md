# v1.64.2 Scenario Result Analysis Panel Redesign — Command Log

## 开始 / 结束 / 耗时

| 阶段 | 时间 |
|---|---|
| 开始 | 13:50 |
| 结束 | 14:25 |
| 总耗时 | ~35 分钟 |

## Baseline Commit

`8324b89` — main branch before v1.64.2 branch creation.

## 执行命令记录

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only origin main`
- `cd frontend && npm run verify:release-baseline` ✅
- Create branch: `xiaomi/v1-64-2-scenario-result-analysis-panel-redesign`
- npm run lint → 0 errors
- npm run build → ✅ 867ms
- npm test → ✅ 64 files, 1550 tests
- npm run verify:release-baseline → ✅ ALL CHECKS PASSED
- cd ../functions && npm run build → ✅

## 根因总结

### 截图 6 项问题修复

| # | 问题 | 根因 | 修复 |
|---|---|---|---|
| 1 | 数据品质只有黄色 highlight | Alert 仅用简单文字 + warning 类型，无问题说明 | 改为显示 issue 数量、首位问题描述、影响说明、「查看资料问题」按钮 |
| 2 | 短缺变化 unclear | 数值 + 百分比无单位/对比说明 | 改为 `+3 个月` + `原始：35 个月` + tooltip 解释 |
| 3 | 产能缺口 `OK Panel PNL` | `totalCapGap/1000` + `K` 缩写 + `PNL` 错误拼接 | 采用 `toLocaleString()` + `panels`；0 值显示 `0 panels` + OK badge |
| 4 | 风险营收是 total | 仅展示总金额，无年度分解 | 展示影响最大年份 + 合计数值；新增年度风险营收明细表 |
| 5 | BU 利用率趋势难读 | 仅 100% 参考线，tooltip 无 delta | 新增 85% 参考线 + delta 在 tooltip；样式优化 |
| 6 | 产能缺口图空白 | gapPct 柱状图在零值时显示空白网格 | 无缺口时显示解释卡片；有缺口时显示面板数柱状图 |

### 架构改进

- 创建 `frontend/src/core/scenarioResultPresentation.ts` 辅助模块
- 将业务推导逻辑从 `ScenarioPlanning.tsx` 提取到 7 个 builder 函数
- ScenarioPlanning.tsx 主要渲染预生成的 presentation model

## 设计改动摘要

### 1. Data Quality Warning
- 从 `<Alert message="..." />` 改为结构化警告
- 显示 issue 数量、首位问题、影响说明、查看资料问题按钮

### 2. KPI Row (4 business KPIs)
- 使用 `resultPresentation.kpis` 循环渲染 4 个 KPI 卡片
- 新增 `state` (default/success/warning/danger) 控制颜色
- 新增 `badge` (OK 标签) 独立于主值
- 新增 `tooltip` 解释含义

### 3. Yearly Risk Revenue
- 新增年度风险营收明细表
- 列: 年度 / 风险营收(M NTD) / 短缺月份 / 主要客户

### 4. BU 利用率 Chart
- 新增 85% 橙色虚线参考线
- Tooltip 包含 delta pp（自动计算）
- 保留 100% 红色警戒线

### 5. 产能缺口 Chart
- 无缺口时：展示解释卡片「未产生产能缺口」+ 说明文字
- 有缺口时：展示 `gapPanels` 柱状图，数值用 `toLocaleString()` 千分号

## 修改文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `frontend/src/core/scenarioResultPresentation.ts` | 新建 | 7 个 builder 函数 + types |
| `frontend/src/pages/ScenarioPlanning.tsx` | 修改 | 引入 helper module，替换 KPI/chart/DQ alert |

## 红线文件检查

| 文件 | 是否修改 |
|---|---|
| `firestore.rules` | ❌ 未触碰 |
| `frontend/src/core/calculationEngine.ts` | ❌ 未触碰 |
| DeepSeek Secret / API key | ❌ 未触碰 |
| Firebase Auth 逻辑 | ❌ 未触碰 |

## 验证结果

| 检查项 | 结果 |
|---|---|
| `npm run lint` | ✅ 0 errors, 196 warnings |
| `npm run build` | ✅ 867ms |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |
| `cd ../functions && npm run build` | ✅ tsc OK |

## Commit Hash

(待提交后补充)

## Push Branch

(待推送后补充)

## 是否建议 AGY 验收

✅ **建议 AGY 验收** — 6 项截图问题均已修复，CI 全部通过，无红线文件变更。新增辅助模块 `scenarioResultPresentation.ts` 隔离业务推导逻辑。
