# v1.48 Safe Demo Workspace + Browser QA + Demo Data 只读验收审查报告

**版本**: v1.0
**日期**: 2026-05-29
**审查人**: Antigravity (AGY) 智能审查代理
**审查分支**: `agy/v1-48-demo-workspace-seed-review`
**比对基准**: `origin/main` (commit: `1e5839dfc3aac3b7e146aed9552ed484d86d2d5f`)
**被审查分支**: `origin/xiaomi/v1-48-safe-demo-workspace-browser-qa` (commit: `7aea97b0827bd997c9f2181b834ca61eadd216ac`)

---

## 一、最终结论与建议

> [!CAUTION]
> **最终评估结论：Fail (不通过)**
> **是否可以 merge main：否**
> **是否可进入真实 Demo Workspace 导入：否，必须先修复 5 个 JSON 数据文件及相关文档。**

### 核心原因摘要

虽然 MiMo/Qwen 在**隔离协议规范**、**导入 SOP**、**Browser QA 测试清单**和**Demo Story 执行手册**等**文档层面**完成了 100% 的高标准交付，但在**底层核心 Demo Seed 数据自洽性与业务一致性**上存在极其严重的**P1 级数据硬伤**：
1. **Forecast 记录条数对不上**：数据中真实只有 87 条，而文档中多处宣称 103 条。
2. **2026年营业额与 BP 达成率出现天量偏差**：基于真实预测数据算出的 2026 预测年营收仅为 **4.35 亿 TWD**，达成率仅 **13.60%**。而文档中所有 story 与 summary 均宣称预测营收为 28 亿 TWD，达成率为 **87.5%**，BP 缺口为 4 亿 TWD。
3. **关键 DQ 警告数据不支持**：声称 2026-07 Customer A 订单消失，但数据在该月依然包含 3 个 SKU 合计 8.6 万 Pcs 的预测；声称 2026-11 客户 C 预测暴涨 50%，但数据仅显示温和的阶梯线性增长；声称 2026-07~10 出现 Core Panel 产能瓶颈，利用率达 95%，但实际算出的利用率仅为 **2.03% ~ 2.10%** 左右。

这表明数据完全**无法支撑**所声称的 3 个 Demo Story 演示。如果直接导入运行，系统会产生巨大的业务指标错乱与不合理数据，导致演示失败。

---

## 二、三项指标范围核对

### 1. 范围检查（Scope Check）

- **是否只修改 `docs/demo/` 和 `docs/qa/`**：✅ **是**。`git diff --name-status` 显示仅有 11 个文件被修改/新增，全在上述两个目录下。
- **是否未修改 `frontend/src`**：✅ **是**。未动及任何前端代码。
- **是否未修改 `firestore.rules`**：✅ **是**。安全规则未作修改。
- **是否未修改 package 文件**：✅ **是**。无包管理配置改动。
- **是否未写 Firebase**：✅ **是**。仅包含只读审查，未有任何 Firebase 数据写入。
- **是否未 deploy**：✅ **是**。无部署行为。
- **是否没有 node_modules / .claude / 临时文件**：✅ **是**。工作树完全干净。

### 2. 文件存在性检查

以下 11 个交付文件存在且非空：

| 文件路径 | 状态 | 字节大小 | 简评 |
|---------|------|---------|------|
| `docs/demo/SAFE_DEMO_WORKSPACE_PROTOCOL.md` | ✅ 存在 | 7.70 KB | 隔离协议描述极其完整优秀 |
| `docs/demo/DEMO_SEED_PRODUCTS.json` | ✅ 存在 | 13.75 KB | 34 个 SKU, 包含 5 个客户和预植的错误单价、错误币种 |
| `docs/demo/DEMO_SEED_FORECASTS.json` | ✅ 存在 | 13.73 KB | 包含 87 条月度预测及 3 条孤儿预测 |
| `docs/demo/DEMO_SEED_CAPACITY.json` | ✅ 存在 | 5.37 KB | 包含 3 个工厂的产能配置，缺失 F2 2026-09 |
| `docs/demo/DEMO_SEED_PARAMETERS.json` | ✅ 存在 | 2.03 KB | 面板尺寸、汇率、良率矩阵配置 |
| `docs/demo/DEMO_SEED_BP_TARGETS.json` | ✅ 存在 | 1.55 KB | 2026/2027 年 BP 目标配置 |
| `docs/demo/DEMO_IMPORT_SOP.md` | ✅ 存在 | 6.99 KB | 导入步骤十分严密，包含未来自动导入脚本设计 |
| `docs/demo/DEMO_STORY_EXECUTION_RUNBOOK.md` | ✅ 存在 | 11.25 KB | 包含了 3 个演示故事的完整操作流程与讲解重点 |
| `docs/demo/DEMO_SEED_VALIDATION_REPORT.md` | ✅ 存在 | 8.52 KB | 静态自洽性报告（但部分静态指标存在虚报） |
| `docs/demo/V1_48_DEMO_READINESS_EXECUTIVE_SUMMARY.md` | ✅ 存在 | 5.20 KB | 执行摘要文件 |
| `docs/qa/V1_48_BROWSER_QA_EXECUTION_CHECKLIST.md` | ✅ 存在 | 10.17 KB | 包含了 93 个测试用例的超详细 Checklist |

### 3. JSON 语法与 Parse 验证

通过 Node.js 专业 JSON.parse 引擎进行 5/5 全量解析测试：
- `DEMO_SEED_PRODUCTS.json`：✅ **Pass** (有效 JSON)
- `DEMO_SEED_FORECASTS.json`：✅ **Pass** (有效 JSON)
- `DEMO_SEED_CAPACITY.json`：✅ **Pass** (有效 JSON)
- `DEMO_SEED_PARAMETERS.json`：✅ **Pass** (有效 JSON)
- `DEMO_SEED_BP_TARGETS.json`：✅ **Pass** (有效 JSON)

> [!NOTE]
> 在 Windows PowerShell 5.1 环境下如果直接使用 `Get-Content` 管道读取并解析中文字符可能会因为控制台的编码局限（需手动配置 `-Encoding UTF8`）导致 `ConvertFrom-Json` 失败，此非 JSON 本身语法缺陷。

---

## 三、Demo Data 业务一致性 & DQ 植入验证

为了查出绝对精确的物理事实，我们通过编写 Node.js 业务引擎进行了深度核对：

| 文档声称指标 / DQ 问题 | 数据是否真实支持 | 物理事实数据与分析 | 严重度级别 |
|----------------------|----------------|------------------|-----------|
| **Products 约 34 个 SKU** | ✅ **支持** | 真实解析出恰好 34 个 SKU 记录，归属于 5 个不同的客户。 | — |
| **Forecasts 约 103 条** | ❌ **不支持** | **实际仅包含 87 条有效记录**。少于宣称的 103 条。 | **P1** |
| **Capacity 约 36 条** | ✅ **支持** | 实际包含 35 条记录，其中 Factory F2 在 2026-09 故意缺失。 | — |
| **汇率设定 (USD/TWD/CNY)** | ✅ **支持** | 设定基准为 USD。`constantUsdToTwdRate` = 32.5，`constantUsdToCnyRate` = 7.25。 | — |
| **Missing Unit Price: `A-NO-PRICE`** | ✅ **支持** | 存在 SKU `A-NO-PRICE` 且 unitPrice = 0。 | — |
| **Unsupported Currency: `B-EUR-001`** | ✅ **支持** | 存在 SKU `B-EUR-001` 且单价币种为 EUR。 | — |
| **Orphan Forecast: `C-ORPHAN`** | ✅ **支持** | `DEMO_SEED_FORECASTS.json` 中包含 3 条 `sku-c-orphan` 的预测，而 Products 种子中完全没有该 SKU。 | — |
| **Missing Capacity: F2 2026-09** | ✅ **支持** | 工厂 F2 在 2026-09 没有任何产能记录。 | — |
| **Missing BP Target: 2028** | ✅ **支持** | 2026/2027 具备目标，2028 年目标缺失。 | — |
| **Order Disappearance (Customer A 2026-07)** | ❌ **不支持** | **数据根本没有消失**。Customer A 在 2026-07 月份包含了 3 个 SKU（A-16L-001, A-16L-002, A-20L-001）合计 8.6 万 Pcs 的正常预测记录。 | **P1** |
| **Capacity Delay: F2 2026-07/08** | ✅ **支持** | F2 的 Core 产能在这两个月为 3000 Panel/day，到 10 月才升为 3500。数据层支持。 | — |
| **Forecast Surge (Customer C 2026-11)** | ❌ **不支持** | **无任何激增**。客户 C 在 10、11、12 月的预测总量分别为 30,000、35,000、40,000 Pcs，完全呈平滑的月增 5,000 线性变化。 | **P1** |
| **BP Miss (2026年达成率 87.5%)** | ❌ **不支持** | **达成率仅为 13.60%**。换算后的 2026 总预测营业额仅有 **4.35 亿 TWD**，而宣称目标是 32 亿，宣称达成额为 28 亿。大量 SKU 预测直接缺席造成天量缺口。 | **P1** |
| **Utilization Bottleneck (Core 2026-07~10)** | ❌ **不支持** | **实际利用率仅 2.03% ~ 3.15% 左右**。由于总订单量太小（几万片 chip），而工厂月产能高达 25 万 panel，利用率连 5% 都达不到，根本没有所谓的 95% 瓶颈！ | **P1** |

---

## 四、Demo Story 与 Browser QA 评估

### 1. 故事可执行性（Demo Story Executability）

- **Story 1 (BP 缺口归因)**：**不可执行**。实际换算达成率仅 13.6%，系统界面呈现出的图表将会是毁灭性的悬崖，BP 归因图表中的客户缺口数也与 Executive Summary 宣称的完全对不上。
- **Story 2 (砍单 20% 场景模拟)**：**部分可执行**。虽然数据在结构上支持 What-if 改变参数，但由于原始基准太差（只占 13% 达成率），模拟结果的业务常理度极低。
- **Story 3 (6个月产能瓶颈诊断)**：**不可执行**。在 Core 产能计算中，由于利用率最高仅为 3.15% (即 2026-09 F2 缺失时)，系统根本不可能给出任何“产能高载超负荷”的诊断。

### 2. Browser QA Checklist 评估

- **覆盖度**：100%（涵盖 Dashboard, Operations, Products, Forecasts, Capacity, BP Targets, Results, Scenario, AI Copilot 页面以及中繁英、移动端和只读权限测试，总用例 93 项）。
- **结构与规范度**：极好。提供了具体的预期结果和通过条件，测试的步骤可操作性非常高。

---

## 五、安全与隔离机制审查（Safe Demo Workspace Protocol）

✅ **非常优秀，达到了企业级生产隔离标准**：
- **完全杜绝污染**：明确禁止在 Production Workspace 导入测试数据。
- **物理与命名隔离**：要求命名统一包含 `[DEMO]` 前缀，明确定义了 Owner、Editor、Viewer 的测试邮箱与独立角色分工。
- **清理策略完整**：定义了演示完成后标记过期、1 周清空数据、1 个月彻底删除的销毁闭环。
- **说明不自动写入 Firebase**：全部 SOP 与 Summary 中均明确指出导入需要人工进行安全检查并由管理员手动导入，绝不自动操作。

---

## 六、P0 / P1 / P2 问题一览表

### P0 级严重破坏性问题 (0 个)
- 本次分支无任何产品代码侵入，未对 Firebase 或其他线上环境进行任何污染行为，安全度极高。

### P1 级业务自洽性缺陷 (5 个)
- **P1-01 (条数虚报缺陷)**：`DEMO_SEED_FORECASTS.json` 真实包含的预测记录为 87 条，而文档中多处（Validation Report、Readiness Executive Summary）虚报有 103 条。
- **P1-02 (年营收天量偏离误差)**：换算出的 2026 Forecast 年营收仅为 4.35 亿 TWD，与文档各处及 BP 分析模块中宣称的 28 亿 TWD (87.5% 达成率) 出现天量偏离，达成率直接缩水 74%。
- **P1-03 (订单消失未提供数据支持)**：文档声称 2026-07 客户 A 发生砍单/订单消失（Order Disappearance），但数据在 2026-07 完好保留了 3 个 SKU 合计 8.6 万 Pcs 预测。
- **P1-04 (暴涨未提供数据支持)**：文档声称 2026-11 客户 C 预测暴涨 50%（Forecast Surge），但数据中仅为温和递增。
- **P1-05 (利用率与瓶颈计算天量偏差)**：订单量设定过小，导致 2026-07~10 期间 Core Panel 产能计算得出的真实工厂利用率仅为 **2.03% ~ 2.10%**（瓶颈报警临界值为 90%，宣称达到了 95%）。界面上将不会呈现出任何瓶颈。

### P2 级易用性缺陷 (1 个)
- **P2-01 (PowerShell JSON 编码易错风险)**：由于 seed 文件的中文注释使用了 UTF8，在默认未指定 UTF8 编码的 Windows PowerShell 5.1 环境中读取管道会发生字符损坏并导致解析报错。应在导入 SOP 的 PowerShell 代码块中显式增加 `-Encoding UTF8` 参数。

---

## 七、导入前必须人工确认与安全策略

由于数据业务一致性测试失败，**目前必须暂停进入真实 Demo Workspace 的导入**。若未来数据修补完成后，导入时必须满足以下强制性条件：
1. **严格项目隔离**：必须在 Firebase Console 中创建一个专用的测试项目，强烈建议严禁与生产项目（`abf-capacity-calculator` 生产实例）共用同一个 Firebase Instance。
2. **人工强确认**：SOP 导入前必须由管理员在终端执行 `firebase projects:list` 并人工确认识别出该 Workspace 属于演示专用，并人工确认其 Workspace 命名包含 `[DEMO]` 标志。
3. **禁止生产读写**：一旦发现环境包含任何生产标示，必须有熔断机制，严禁进行任何 Seed 数据的导入与读写。

---

## 八、AGY 验收审查信息汇总

- **验收结论**: Fail (不通过，文档 100% 通过，数据严重不一致)
- **是否可 merge**: 否
- **是否可进入 demo workspace 导入**: 否
- **P0/P1/P2 数量**: 
  - P0: 0
  - P1: 5
  - P2: 1
- **JSON parse 结果**: 5/5 全部解析通过 (NodeJS parse)
- **基准 main commit**: `1e5839dfc3aac3b7e146aed9552ed484d86d2d5f`
- **被审查分支**: `origin/xiaomi/v1-48-safe-demo-workspace-browser-qa`
- **提交的分支**: `agy/v1-48-demo-workspace-seed-review`
- **Commit hash**: [待提交]

---
**本报告由 Antigravity 智能审查代理于 2026-05-29 18:36 签署。**
