# Phase 8 候选待办功能库与评估矩阵 (Candidate Backlog & Matrix)

本文件详细记录了 v1.35.0 之后 Phase 8 阶段所有核心候选方向的功能特征、打分评估矩阵及具体的待办 backlog，供团队进行敏捷迭代规划。

---

## 一、 候选方向综合打分评估矩阵

我们从以下五个维度对 Phase 8 的五大主要候选方向进行深度打分评估（单项分值 0–100，分数越高代表越优）：
- **用户价值**：能否切实解决用户的日常工作痛点并换回高频使用。
- **技术风险**：开发难度、外部依赖引入、不确定性及潜在的工程崩塌隐患（分数越高代表风险越低，即越安全）。
- **衔接度**：与目前已完成的设计系统、核心计算公式、Attribution attribution 等资产的复用度和融合度。
- **成熟度提升**：能否直接让产品性质发生跃迁，提高产品的工业级说服力。
- **当前契合度**：是否符合 KISS 原则，是否适合在当前没有外部 API、只读安全限制严格的阶段立即做。

### 评估矩阵表 (Scoring Matrix)

| 候选方向 | 用户价值 | 技术风险 (安全度) | 衔接度 | 成熟度提升 | 当前契合度 | **综合总分** | 推荐优先级 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **B. Scenario Planning (沙盒多情境仿真)** | **95** | **80** (低风险) | **90** | **95** | **90** | **450** | **P0 (极力推荐)** ★★★ |
| **D. DQ Remediation (数据质量即时自愈)** | 85 | 90 (低风险) | 85 | 80 | 85 | 425 | **P1 (紧随其后)** ★★ |
| **C. Version Workflow 2.0 (版本协同审批流)** | 80 | 90 (低风险) | 80 | 85 | 80 | 415 | **P2** ★ |
| **E. Emulator security Test Infra (安全规则回归测试)** | 70 | 80 (中风险) | 75 | 80 | 70 | 375 | **P3** |
| **A. AI Brief v2 (本站本机大模型摘要)** | 80 | 30 (极高风险) | 80 | 80 | 40 | 310 | **P4 (推迟做)** |

---

## 二、 核心 Backlog 待办任务拆解

### [B] Sandbox Scenario Planning (多场景沙盒仿真模拟) — P0 级待办
- [ ] **沙盒控制中心 (Sandbox Control Drawer)**：
  - 设计顶栏的 Sandbox 开关与切换滑块，用户可一键从“正式生产环境 (Production)”切换到“沙盒工作区 (Sandbox Box)”。
- [ ] **内存级克隆与子树映射 (InMemory Sandboxed Data)**：
  - 实现本地克隆机制：在切换到沙盒时，使用 `lodash.cloneDeep` 一次性将当前工作区的 SKUs、Forecasts、Capacity 复制到 Sandbox State。
  - 支持“沙盒独占修改”：在沙盒模式下修改任何单元格，仅触发 Sandbox State 更新，拦截任何对 `parameterService` 或 `firestore` 正式路径的保存写入。
- [ ] **沙盒 vs 生产 Change Review 归因卡片**：
  - 提取沙盒数据与正式数据的差异，直接调用 `changeImpact.ts` 渲染包含收入 delta、BP 差距 delta 以及 attributions 变化的比较面板。

### [D] Data Quality Remediation Workflow (数据质量自愈流) — P1 级待办
- [ ] **警告图标点击激活拦截 (Click Actions)**：
  - 对 Products Table 的 DQBadge 绑定 onClick 事件。
  - 点击“缺失良率/尺寸”等错误警告时，阻止事件冒泡，直接在屏幕右侧拉出极简的“属性快捷补全抽屉”。
- [ ] **极简属性补全抽屉 (Quick Fix Drawer)**：
  - 在抽屉内以简易表单高亮展示缺失字段（如：良率框显示红框），用户补齐后点击“快速修复”，直接就地更新该行 SKU 数据，省去页面大跳转与重新过滤定位成本。

### [C] Forecast Version Workflow 2.0 (多人版本锁审批) — P2 级待办
- [ ] **版本强锁定机制 (Version Freeze)**：
  - 在快照列表新增“审核状态 (ReviewStatus)”筛选及变更操作。
  - 当 Owner 角色将某个 Snapshot 的状态标记为 `Locked` 时，该版本即成为“只读基准”。
- [ ] **锁定制约逻辑**：
  - 任何试图基于已锁定版本还原 Working 分支的操作均被物理拦截，且该版本无法再被 Editor 或 Owner 修改或删除。
