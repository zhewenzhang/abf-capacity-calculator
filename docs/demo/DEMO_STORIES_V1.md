# ABF Capacity Calculator — Demo Stories V1

**版本**: v1.0
**日期**: 2026-05-29
**用途**: 产品演示脚本，每个故事 5-8 分钟

---

## 概述

本文档设计了 3 个可演示的业务故事，覆盖产品最核心的决策场景。每个故事都围绕一个真实的业务问题展开，展示从"发现问题"到"做出决策"的完整路径。

### 演示原则

1. **从问题开始，不从功能开始** — 用户带着问题来，不是来看功能
2. **数据要真实感** — 使用有意义的数字，不要 123、456
3. **每一步都有发现** — 不要空转，每个页面都要看到关键信息
4. **结束时有结论** — 演示结束时要能回答"所以怎么办？"
5. **Copilot 是加分项** — AI Copilot 是锦上添花，不是必须

---

## 故事 1: "为什么本季度 BP 不达标？"

### 目标用户角色

- **角色**: BU Head / Sales VP
- **痛点**: 每季度被 CFO 追问"为什么 BP 差这么多？"，但没有数据支撑的归因分析
- **当前工作方式**: 手动从 Excel 拉数据，找 Sales 问客户情况，找 Planning 问产能，然后自己拼凑一个解释

### 初始业务问题

> "Q2 的 BP 目标是 8.5 亿 TWD，但目前预测只到 7.2 亿，差了 1.3 亿。到底是谁造成的？是量不够还是价不够？我该去找 Sales 还是找 Planning？"

### 使用页面路径

```
Dashboard → Results (BP Analysis) → Results (Key Findings) → AI Copilot
```

### 使用数据

- **BP 目标**: 2026 年 32 亿 TWD (Q2: 8.5 亿)
- **当前预测营收**: 约 28 亿 TWD (Q2: 7.2 亿)
- **缺口**: 约 4 亿 TWD (Q2: 1.3 亿)
- **客户分布**: Customer A 占 40%、Customer B 占 25%、Customer C 占 20%、其他 15%

### 操作步骤

| 步骤 | 页面 | 操作 | 预期发现 |
|------|------|------|---------|
| 1 | Dashboard | 打开 Dashboard，查看 BP 达成卡片 | 看到 2026 年 BP 达成率 87.5%，缺口 4 亿 TWD |
| 2 | Dashboard | 查看营收趋势图 | 发现 Q2 营收明显低于 Q1，呈下降趋势 |
| 3 | Results | 切换到 BP Analysis Tab | 看到年度/季度/月度 BP 达成矩阵 |
| 4 | Results | 查看 Customer Contribution 表 | 发现 Customer A 贡献了 60% 的 BP 缺口 |
| 5 | Results | 查看 SKU Contribution 表 | 发现 SKU-003 (高价值 16L) 预测大幅下降 |
| 6 | Results | 切换到 Key Findings Tab | 看到 Top 5 优先发现，第一条就是 BP 缺口 |
| 7 | AI Copilot | 输入"为什么 BP 不达标？" | Copilot 返回结构化归因：Customer A 砍单 + SKU-003 价格下调 |
| 8 | AI Copilot | 输入"Customer A 的预测变化趋势" | Copilot 展示 Customer A 近 6 个月预测变化 |

### 预期发现

1. **BP 缺口主要来自 Customer A** — 占总缺口的 60%
2. **核心 SKU-003 预测下降 15%** — 客户调整了产品路线图
3. **价格因素贡献了 30% 的缺口** — 单价从 $2.5 降到 $2.2
4. **产能不是瓶颈** — Core 利用率只有 72%，有余量

### 管理层结论

> "BP 缺口主要来自 Customer A 的 SKU-003 预测下调。建议 Sales 与 Customer A 确认 Q3-Q4 是否有回升空间，同时考虑是否需要调整 BP 目标。产能端没有瓶颈，不需要额外投资。"

### 可向 Copilot 提问的问题

1. "为什么本季度 BP 不达标？"
2. "Customer A 的预测变化趋势是什么？"
3. "哪些 SKU 对 BP 缺口影响最大？"
4. "如果 Customer A 恢复到年初预测水平，BP 达成率会变成多少？"
5. "产能利用率如何？是否有瓶颈？"

### 可触发的 Scenario / Report

- **Scenario**: 运行 "Customer A 恢复 +10% 预测" 场景，看 BP 达成率变化
- **Report**: 生成每日管理报告，包含 BP 达成分析章节

---

## 故事 2: "如果客户砍单 20%，营收和产能风险如何变化？"

### 目标用户角色

- **角色**: Sales Operations / Capacity Planning Manager
- **痛点**: 大客户传来砍单风声，需要快速评估影响，但 Excel 模型太慢且容易出错
- **当前工作方式**: 用 Excel 做 What-if，每次改一个假设要等 5 分钟重算，而且版本混乱

### 初始业务问题

> "Customer B 刚通知可能要砍单 20%，大约影响下个季度的订单。我需要知道：(1) 营收影响多大？(2) 产能利用率怎么变？(3) 会不会造成产能闲置？(4) 我需要告诉 Planning 什么？"

### 使用页面路径

```
Operations (Look-Ahead) → Scenario → Results (对比) → AI Copilot
```

### 使用数据

- **Customer B 当前预测**: 每月约 50K pcs，占总预测 25%
- **砍单幅度**: -20%
- **影响 SKU**: 主要影响 SKU-005 和 SKU-008 (中等层数，消费电子)
- **当前 Core 利用率**: 85%
- **当前 BU 利用率**: 78%

### 操作步骤

| 步骤 | 页面 | 操作 | 预期发现 |
|------|------|------|---------|
| 1 | Operations | 打开运营工作台，查看 Look-Ahead | 看到未来 6 个月 Core 利用率 85-90%，接近瓶颈 |
| 2 | Operations | 查看异常诊断列表 | 看到 "Customer B 预测集中度" 警告 |
| 3 | Scenario | 点击 "Customer Cut" 预设场景 | 进入场景配置页面 |
| 4 | Scenario | 设置 Customer B 预测 -20% | 参数配置完成 |
| 5 | Scenario | 点击 "运行场景" | 生成对比结果 |
| 6 | Scenario | 查看 Revenue Impact | 营收下降约 5.2 亿 TWD (年化) |
| 7 | Scenario | 查看 Capacity Impact | Core 利用率从 85% 降到 68%，BU 从 78% 降到 62% |
| 8 | Scenario | 查看 Customer/SKU Impact | Customer B 贡献了 100% 的营收下降 |
| 9 | AI Copilot | 输入"Customer B 砍单 20% 的全面影响" | Copilot 返回结构化影响分析 |
| 10 | AI Copilot | 输入"有哪些缓解措施？" | Copilot 建议：寻找替代客户、调整产能计划、谈判价格 |

### 预期发现

1. **年化营收影响约 5.2 亿 TWD** — 占总营收 18%
2. **Core 利用率从 85% 降到 68%** — 从接近瓶颈变成有余量
3. **BU 利用率从 78% 降到 62%** — 同样有余量
4. **不造成产能短缺** — 反而释放了产能空间
5. **SKU-005 和 SKU-008 受影响最大** — 需要关注库存

### 管理层结论

> "Customer B 砍单 20% 会导致年化营收减少 5.2 亿 TWD，但不会造成产能瓶颈。相反，这释放了约 17% 的 Core 产能，可以用来承接新客户订单。建议：(1) Sales 加速新客户导入；(2) Planning 不需要调整产能扩张计划；(3) Finance 更新 Q3-Q4 预算。"

### 可向 Copilot 提问的问题

1. "Customer B 砍单 20% 对营收的影响有多大？"
2. "砍单后产能利用率会怎么变化？"
3. "哪些 SKU 受影响最大？"
4. "有没有其他客户可以弥补这个缺口？"
5. "如果同时 Customer A 增长 10%，整体影响如何？"

### 可触发的 Scenario / Report

- **Scenario**: 运行 "Customer B -20%" 场景，查看完整对比
- **Scenario**: 运行 "Customer B -20% + Customer A +10%" 组合场景
- **Report**: 生成场景对比报告，导出给管理层

---

## 故事 3: "下 6 个月最危险的产能瓶颈在哪里？"

### 目标用户角色

- **角色**: Factory Operations Planner / BU Head
- **痛点**: 每月初被追产能数据，不知道哪个月会出问题，总是被动应对
- **当前工作方式**: 用 Excel 按月算产能，手动对比预测，经常发现时已经来不及调整

### 初始业务问题

> "我需要知道未来 6 个月哪个月会最先爆产能？是 Core 还是 BU？严重程度如何？我应该提前准备什么？"

### 使用页面路径

```
Operations (Look-Ahead) → Results (Risk Brief) → Results (Capacity Impact) → Capacity
```

### 使用数据

- **2026-07**: Core 利用率 92%，接近瓶颈
- **2026-08**: Core 利用率 95%，严重瓶颈
- **2026-09**: BU 利用率 88%，开始紧张
- **2026-10**: Core 和 BU 都超 90%
- **2026-11**: 预测暴涨 30%（Customer C 新品导入）
- **2026-12**: BP 目标冲刺月

### 操作步骤

| 步骤 | 页面 | 操作 | 预期发现 |
|------|------|------|---------|
| 1 | Operations | 打开运营工作台 | 看到 7 个流程步骤状态，大部分绿色 |
| 2 | Operations | 查看 Look-Ahead Focus | 看到 2026-07 到 2026-12 的利用率热力图 |
| 3 | Operations | 查看异常诊断 | 看到 "2026-08 Core 产能瓶颈" 红色警告 |
| 4 | Results | 切换到 Risk Brief Tab | 看到风险简报：Executive Summary、Top Risk Periods |
| 5 | Results | 查看 Top Risk Periods | 2026-08 风险评分 92，2026-10 风险评分 88 |
| 6 | Results | 查看 Driver Analysis | Core 压力来自 Customer A 和 Customer C 的高层数 SKU |
| 7 | Results | 切换到 Capacity Impact Tab | 看到 Core +10% 可以解决 3 个短缺月份 |
| 8 | Capacity | 跳转到产能配置页面 | 查看 2026-08 的 Core Panel/Day 配置 |
| 9 | AI Copilot | 输入"下 6 个月最危险的产能瓶颈" | Copilot 返回时间线分析 |
| 10 | AI Copilot | 输入"如何缓解 8 月的瓶颈？" | Copilot 建议：增加 Core Panel/Day、调整排产、外协 |

### 预期发现

1. **2026-08 是最危险的月份** — Core 利用率 95%，风险评分 92
2. **Core 是主要瓶颈** — BU 相对宽松
3. **瓶颈来自高层数 SKU** — 16L 和 20L 的 Core 需求大
4. **Customer C 的新品导入加剧了瓶颈** — 11 月预测暴涨 30%
5. **Core +10% 可以解决大部分问题** — 但需要提前 2 个月准备

### 管理层结论

> "2026-08 是未来 6 个月最危险的月份，Core 利用率将达到 95%。建议：(1) 立即启动 Core 产能扩张评估；(2) 与 Customer C 协商新品导入时间表；(3) 考虑 7-8 月临时外协方案；(4) 每周监控利用率变化。"

### 可向 Copilot 提问的问题

1. "下 6 个月最危险的产能瓶颈在哪里？"
2. "2026-08 的瓶颈原因是什么？"
3. "如果 Core 产能增加 10%，能解决几个月的瓶颈？"
4. "哪些客户和 SKU 贡献了 Core 的压力？"
5. "有没有产能延迟的风险？"

### 可触发的 Scenario / Report

- **Scenario**: 运行 "Core +10%" 场景，查看瓶颈缓解效果
- **Scenario**: 运行 "Capacity Delay 3 months" 场景，查看延迟影响
- **Report**: 生成每周管理报告，包含产能利用率趋势

---

## 演示准备清单

### 数据准备

- [ ] 加载 Demo Dataset (20-50 SKU、3-5 客户、12-24 月 Forecast)
- [ ] 配置 BP Targets (2026-2028)
- [ ] 配置多币种汇率 (USD/TWD/CNY)
- [ ] 植入数据质量问题 (用于 DQ 演示)
- [ ] 植入业务异常 (用于异常诊断演示)

### 环境准备

- [ ] Firebase 部署完成
- [ ] 测试账号准备 (Owner + Viewer)
- [ ] 浏览器 Chrome 最新版
- [ ] 屏幕分辨率 1920x1080
- [ ] 网络稳定

### 演示顺序建议

1. **故事 1** (BP 归因) — 适合管理层，展示决策价值
2. **故事 2** (砍单模拟) — 适合 Sales/Planning，展示 What-if
3. **故事 3** (产能瓶颈) — 适合工厂/Planning，展示风险预警

### 常见问题预案

| 问题 | 回答 |
|------|------|
| "数据是真实的吗？" | "这是基于真实业务比例构建的 Demo 数据，实际使用时会导入您的真实数据" |
| "AI 是真的吗？" | "所有分析都是确定性计算，不依赖外部 AI。AI Copilot 提供的是结构化诊断，不是黑盒预测" |
| "能接 ERP 吗？" | "v1.52 计划支持 API 集成，目前支持 CSV/Excel 导入" |
| "多少钱？" | "我们正在寻找首批试用用户，试用期间免费" |
| "数据安全吗？" | "数据存储在您自己的 Firebase 项目中，我们不碰您的数据" |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Demo Story Agent
