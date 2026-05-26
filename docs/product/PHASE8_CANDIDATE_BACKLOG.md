# Phase 8 候选待办功能库与评估矩阵 (Candidate Backlog & Matrix)

本文件详细记录了 v1.35.0 之后 Phase 8 阶段所有核心候选方向的功能特征、打分评估矩阵及具体的待办 backlog，供团队进行敏捷迭代规划。

---

## 一、 候选方向综合打分评估矩阵 (Scoring Matrix)

为了将有限的研发资源投入到商业价值最高、风险最低的模块中，我们从以下五个维度对 Phase 8 的五大主要候选方向进行深度打分评估（单项满分 100 分，分数越高代表越优）：

* **使用者价值**：能否切实解决用户的日常工作痛点并换回高频使用。
* **技术风险 (安全度)**：开发难度、外部依赖引入、不确定性及潜在的工程崩塌隐患。**分数越高代表风险越低，即越安全。**
* **与现有能力衔接度**：与目前已完成的设计系统、核心计算公式、Attribution attribution 等资产的复用度和融合度。
* **是否能提升产品成熟度**：能否直接让产品性质发生跃迁，提高产品的工业级说服力（从计算器走向专业决策分析系统）。
* **是否适合现在做**：是否符合 KISS 原则，是否适合在当前没有外部 AI 授权、只读安全限制严格的阶段立即开展。

### 评分矩阵表

| 候选方向 | 使用者价值 | 技术风险 (安全度) | 衔接度 | 成熟度提升 | 适合现在做 | **综合总分** | 推荐优先级 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **B. Scenario Planning (沙盒多情境仿真)** | **95** | **85** (低风险) | **95** | **95** | **90** | **460** | **P0 (极力推荐)** ★★★ |
| **D. DQ Remediation (数据质量即时自愈)** | 90 | 90 (极低风险) | 90 | 85 | 90 | 445 | **P1 (紧随其后)** ★★ |
| **C. Version Workflow 2.0 (版本协同审批流)** | 85 | 90 (极低风险) | 85 | 90 | 85 | 435 | **P2** ★ |
| **E. Emulator Test Infra (安全规则测试基建)** | 75 | 80 (中低风险) | 80 | 85 | 80 | 400 | **P3** |
| **A. AI Brief v2 (本站本机大模型摘要)** | 70 | 30 (极高风险) | 80 | 75 | 40 | 295 | **P4 (无限期推迟)** |

### 评分依据阐述：
- **Scenario Planning (B)**：使用者价值与成熟度提升均为 95 分。What-If 是决策分析工具的“灵魂”，且它 100% 复用了我们现有的 Stateless 核心计算引擎和 Change Review 对比引擎，技术风险极低，最适合当前立即开发。
- **DQ Remediation (D)**：在 visibility 做完后，闭环“自愈”是极其自然且低技术风险的事情，能够瞬间闭环用户体验。
- **Version Workflow 2.0 (C)**：解决多人协同下的“防误删、防误改”基准版本问题，提升协作成熟度。
- **Emulator Test Infra (E)**：这是一笔急需补齐的安全回归技术债，确保多人协作安全规则（Rules）的安全可靠。
- **AI Brief v2 (A)**：大模型虽然新颖，但其随机性不符合产业数据严谨性要求，且直接面临企业信息机密红线，在前端跑 WebLLM 的技术风险过大（内存崩溃、长加载时间），因此打分最低，无限期推迟。

---

## 二、 核心 Backlog 待办任务拆解 (Task Breakdown)

### 1. [B] Sandbox Scenario Planning (多场景沙盒仿真模拟) ── P0 级待办

*   **[ ] 沙盒控制中心 (Sandbox Control Drawer)**
    - 在应用 Header 右侧或页面顶栏设计一个显眼的 "Sandbox Mode" 切换开关。
    - 切换为 Sandbox 后，全局主题色微调（例如增加顶部橙色边框提示或沙盒专属背景色），确保用户清晰感知当前处于非生产环境。
*   **[ ] 内存级克隆与状态管理 (InMemory Sandboxed Data)**
    - 实现本地克隆机制：在切换到沙盒时，使用 `lodash.cloneDeep` 一次性将当前工作区的 SKUs、Forecasts、Capacity 数据复制到前端 Sandbox 专属 State 中。
    - 拦截物理写入：在沙盒模式下，用户的所有修改操作（包括编辑 Spreadsheet 单元格）仅更新内存中的 Sandbox State，完全拦截并阻断对 `firestore` 和 `parameterService` 的写入保存请求。
*   **[ ] 沙盒 vs 生产对比卡片 (Change Review Integration)**
    - 在 Sandbox 顶栏或抽屉中，提供“运行沙盒与正式版对比 (Compare Sandbox vs Production)”一键激活。
    - 提取沙盒数据与正式数据的差异，直接调用 `changeImpact.ts` 渲染包含收入 delta、BP 差距 delta 以及 attributions 变化的比较面板。

### 2. [D] Data Quality Remediation Workflow (数据质量自愈流) ── P1 级待办

*   **[ ] 警告 Badge 点击事件绑定 (Click Actions)**
    - 对 Products、Forecasts、Capacity Table 中的 DQBadge 绑定 onClick 快捷操作。
    - 当用户点击“缺失层数”或“0单价”红色 Badge 时，阻止事件冒泡，直接在屏幕右侧拉出对应的快捷修复表单抽屉。
*   **[ ] 极简属性补全抽屉 (Quick Fix Drawer)**
    - 设计轻量级的单行数据修复抽屉，高亮显示当前 DQ 警示字段（如缺失良率，则对应的输入框呈红框高亮，并自动聚焦）。
    - 用户输入正确属性后点击“快速修复”，就地提交 Firestore 更新，全表 DQ 状态及计算结果自动刷新，省去页面大跳转与重新过滤定位成本。

### 3. [C] Forecast Version Workflow 2.0 (多人版本协同与安全审批流) ── P2 级待办

*   **[ ] 版本强锁定机制 (Version Freeze)**
    - 在快照版本列表项旁增加“审核状态 (ReviewStatus)”切换按钮，仅具有 `Owner` 权限的用户可操作。
    - 当 Owner 将某一 Snapshot 的状态标记为 `Locked` 时，该快照进入“强锁定只读基准”状态。
*   **[ ] 锁定硬制约逻辑**
    - 任何角色试图基于已锁定版本还原 Working 分支的操作将被强行拦截。
    - 已锁定的快照不允许删除，也不允许被覆盖，保障月度规划基线绝对不发生偏移。
*   **[ ] 审计日志 MVP (Audit Log)**
    - 快照元数据中新增 `lockedBy` 与 `lockedAt` 字段，并在 UI 上显著标识出“此版本由 [Owner名称] 于 [时间] 锁定”。

### 4. [E] Firebase Emulator Security Test Infrastructure (安全测试基建) ── P3 级待办

*   **[ ] 本地 Firebase 模拟器环境搭建**
    - 在项目根目录配置并集成 `firebase-tools` 的 emulators 服务。
    - 编写 `Makefile` 或 `package.json` 快捷脚本：一键启动本地 firestore 模拟器并加载 `firestore.rules`。
*   **[ ] 安全回归测试套件编写**
    - 使用 `@firebase/rules-unit-testing` 框架，编写针对多人协作的回归测试：
      - 测试用例 A：验证 `Viewer` 角色在工作区内绝无可能写入 Products 和 Snapshot。
      - 测试用例 B：验证 `Editor` 角色无法删除或覆盖被 Owner 锁定的快照版本。
      - 测试用例 C：验证未被授权的用户绝对无法跨工作区（wid）读取任何基准数据。

### 5. [A] AI Brief v2 (本站本机大模型摘要探索) ── P4 级待办（远期探索）

*   **[ ] WebLLM 运行与加载可行性调研**
    - 调研并测试 WebLLM 在 Chrome/Edge 下加载 Gemma-2b-it/Qwen-1.5-1.8B-Chat 模型的冷启动时间与内存消耗。
*   **[ ] 前端脱敏 payload 渲染与提示词组装**
    - 在本地组装 sanitized 后的 Change Review JSON payload，构建适用于本地小模型的轻量级 F-A-I-R 分析提示词模板。
