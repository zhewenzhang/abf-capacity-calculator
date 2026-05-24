# Phase 6.2 Forecast Version History Workflow 体验验收卡

本文件定义了 **ABF Capacity Calculator** 在 **Phase 6.2 Forecast Version History & Workflow** 阶段的 **UX 质量与安全验收标准**。本验收卡旨在为协同开发团队 (CC) 后续针对多版本工作流的前端开发与交互优化提供精确、硬性的交付质量基准，以便在 `v1.24.0` 完工后进行严密审计。

---

## 一、 核心产品目标与用户故事

### 🎯 产品目标
将原本“零散保存与比对”的快照机制，正式升级为体系化的 **Forecast Version History Workflow (预测版本工作流)**。用户能够通过清晰的版本类别元数据（Metadata）、直观的过滤器、以及系统提供的确定性比对对（Compare Pairs）推荐，极其自然地管理、筛选和追溯不同历史周期和模拟情境下的预测版本，实现高品质的精细化版本追溯。

### 👥 核心使用者故事 (User Stories)
- **Sales (业务人员)**：
  - “当客户在季度中提出新的采购需求调整时，我需要将当前的预测保存为一个‘客户更新版 (Customer Update)’并清晰标注针对的周期标签（如 `2026-Q3 Adjust`），方便我后续迅速调出它与‘BP 基準版 (BP Baseline)’进行 Delta 比较。”
- **Capacity Planner (产能规划专家)**：
  - “当我要进行不同情境下的设备采购可行性论证时，我需要把不同的产能配置结果保存为‘模拟情境版 (Scenario)’快照，从而在列表中快速过滤出这组模拟方案，并向决策层汇报其带来的瓶颈变化。”
- **Executive (决策层/项目管理员)**：
  - “我需要在版本大盘中一眼辨别出当前最新的‘工作版 (Working Version)’与去年的‘BP 基準版 (BP Baseline)’，且必须拥有安全锁死和防伪造的审计底档，拒绝对已冻结资产的二次篡改。”

---

## 二、 Snapshot Metadata (快照元数据) 验收标准

1. **结构化字段完整性**：
   - 每一条新保存的快照必须可选择地挂载以下结构化元数据：
     - **版本种类 (SnapshotKind)**：明确区分 `working` (工作版)、`bpBaseline` (BP 基準版)、`customerUpdate` (客戶更新版)、`capacityReview` (產能評估版)、`scenario` (情境模擬版)、`archive` (封存版)。
     - **周期标签 (PeriodLabel)**：支持手动录入的文本（如 `2026 BP`, `2026-Q3 Update`），用以精确定位所属年份或业务节点。
     - **审核状态 (ReviewStatus)**：默认初始化为 `draft`，支持展示 `draft` (草稿)、`reviewed` (已評審)、`locked` (已鎖定)、`archived` (已封存) 等全周期标签。
     - **备注描述 (Note)**：长文本备注，用于记录快照建立时的特别假设或背景。
2. **向后兼容性 (Backward Compatibility)**：
   - 对于系统内既有的旧版本快照（无这些新元数据字段），**列表展示和比对引擎必须完美 fallback，不得抛出未定义错误或渲染崩溃**。
   - 缺失 `kind` 的快照应在列表默认不展示 Kind Tag 或显示为“未指定”；缺失 `reviewStatus` 的快照默认安全降级展示。

---

## 三、 Create Snapshot Modal (创建弹窗) 验收标准

1. **表单控件高美感集成**：
   - 在 Calculation Results 或各编辑页呼出「保存快照」弹窗时，表单必须包含：
     - 版本种类 (Version Type)：下拉单选 (Select) 组件。
     - 周期标签 (Period Label)：输入框 (Input) 组件，带有轻量 Placeholder 引导（例如 `e.g. 2026 BP`）。
     - 审核状态 (Review Status)：下拉单选或单选组合，且新建时默认预设为 `draft` (草稿)。
     - 备注 (Note)：多行文本域 (TextArea)。
2. **非阻塞式快速建立 (Optional Control)**：
   - **所有新增的元数据表单项必须为 optional (可选)**！用户只需填写基础的快照名称，即可直接点击「确认保存」快速建立快照。严禁强制用户填写全部元数据而阻塞核心工作流。

---

## 四、 Snapshot List & Filter (列表与过滤器) 验收标准

1. **高精细度表格列展示**：
   - 快照列表除 v1.23.0 已有的名称、创建时间、创建者等字段外，必须集成展示以下高品质列元素：
     - **Kind Tag**：针对不同的 `SnapshotKind` 使用高对比度、低饱和度的语义化彩色 Tag（如：`working` 蓝 tag，`bpBaseline` 紫 tag，`scenario` 橙 tag，`archive` 灰 tag 等）。
     - **Review Status Tag**：展示为清爽的轻量 Tag，或在名称旁加注小徽章。
     - **Period Label**：单独列或作为名称的紧凑附属副标题展示，溢出时 tooltip 提示。
2. **轻量化快速筛选器 (Segmented / Select Filter)**：
   - 列表上方必须配备极其清爽的分类筛选器，允许用户在 `All` (全部)、`Working`、`BP Baseline`、`Customer Update`、`Capacity Review`、`Scenario`、`Archive` 之间快速一键切分。
   - 过滤器的切换加载必须流畅、无闪烁，并配合优雅的表格 Spin 等待动画。

---

## 五、 Recommended Compare Pairs (推荐比对对) 验收标准

为了辅助决策者在几十个快照中瞬间找到最有价值的对比对，Compare 区域必须提供**确定性、逻辑严密的推荐比对对算法**，且**必须为纯 deterministic (确定性逻辑)，严禁调用联机 AI API**。

1. **推荐算法物理规则**：
   - **BP 基準版 vs 最新版 规则**：如果当前项目下同时存在标记为 `bpBaseline` 的快照，以及标记为最新 `working` 或最新 `customerUpdate` 的快照，系统应在选择器侧边显著推荐：“建议比对：[BP基準版] 与 [最新工作版]”。
   - **最新两版 规则**：若上述规则未触发，且快照总数大于等于 2，系统应自动抓取创建时间 `createdAt` 最新的两条历史快照，推荐用户进行比对。
   - **空状态 规则**：当快照数量不足 2 条时，推荐卡片区展示优雅的空状态，并提示“建立 2 条以上快照以获取推荐对比对”。
2. **交互便捷度 (One-click Apply)**：
   - 推荐信息展示框侧边或下方，必须配备「应用推荐 / Apply」按钮。用户只需一键点击，系统必须**自动完成 Base Selector 与 Target Selector 的快照值填装**，大幅缩短用户点击下拉框并寻找快照的交互路径。

---

## 六、 Immutable Lifecycle (只读生命周期) 验收标准

1. **不可变防守一票否决权 (Immutable Lock)**：
   - ** snapshot immutable（快照终生只读）是系统的安全红线**！一旦快照写入云端，绝不允许再修改其任何数据。
   - **严禁提供任何“修改既有快照元数据 (Update Snapshot Status)”的按钮、API 或编辑表单**！
   - 页面或文档中必须有显著且文雅的提示文字：
     > 💡 [版本管理提示] 为了确保历史快照作为项目审计底料的强客观确定性，快照一旦建立将终生锁定（只读不可改）。如需调整快照名称、版本类型或备注等元数据，请删除该旧快照后，基于当前数据重新建立并保存。
2. **Viewer 跨角色硬性写拦截**：
   - 只读 Visitor 角色 (Viewer) 严禁创建、删除任何快照，在尝试提交时，前端必须物理灰度组件并予以抛错拦截。

---

## 七、 体验硬性“反面”红线 (Out of Scope / Anti-patterns)

在 v1.24.0 交付中，一旦包含以下任一交互设计，必须一票驳回重做：
- ❌ **直接对已有快照进行 update 操作**：提供“编辑快照状态/编辑元数据”按钮，从前端绕过安全规则并向云端 Firestore 发送 `update` 命令。
- ❌ **将 Snapshot Metadata 吹嘘为 Git 式的高级分支合并控制**：Snapshot Metadata 仅作为检索标签和工作流的辅助描述，严禁将其当成具有“Merge (合并)”、“Rebase (变基)”等高度复杂语意的真实源码分支版本控制系统进行宣传，避免对非技术用户造成巨大的交互心智负担。
- ❌ **混淆 Compare Direction (比对方向)**：比对计算中必须严格物理遵循 `Target (新版/Compare) - Base (旧版)` 运算，切勿颠倒。
- ❌ **忽略多币别与 BP Target 换算**：变动大盘中的营运收入比对可切换 `USD/TWD/CNY`，但 BP Targets 达成差距 Gap 必须强制锁死在 `Million TWD` (百万台币)，绝不允许发生币别混淆与计算重叠。

---

## 八、 Pass / Conditional Pass / Fail 判定标准

| 判定评级 | 触发条件与技术断言 | 结论与研发行动指示 |
| :---: | :--- | :--- |
| **PASS (通过)** | - 1. 新增 optional metadata 并 100% 保持 backward compatibility。<br>- 2. 快照建立 Modal 与 list 筛选器交互灵动完美。<br>- 3. 严格遵循 Target - Base 正向差值比对。<br>- 4. 完美保持快照的 Immutable 零篡改防线。<br>- 5. 1:1 双语 parity 对齐，0 硬编码文案。 | 🟢 允许发版部署，并顺畅开启 Phase 6.3 后续开发。 |
| **CONDITIONAL PASS (条件通过)** | - 1. 核心功能均完备，且未破坏快照不可变规则。<br>- 2. UI 出现 2 处以下的非核心 i18n 缺失或硬编码文案（如 Statistic title 硬编码）。<br>- 3. 推荐比对对算法运行正常，但一键 Apply 存在偶发性渲染延迟。 | 🟡 允许在独立提交 P3 翻译修补 PR 后的 24 小时内有条件进入下一阶段。 |
| **FAIL (否决)** | - 1. 越过安全红线，前端实现了 update 快照元数据的直接写入逻辑。<br>- 2. 比对大盘将比对方向算反，造成用户决策偏离。<br>- 3. 快照数量不足 2 条时 UI 出现白屏或空值报错崩溃。<br>- 4. 混淆了 USD 与 BP Targets 的 Million TWD 币别边界。<br>- 5. 出现联机 AI API 的直连代码或大模型直接代人类做扩产决策。 | 🔴 **一票否决**。必须立即打回，整改完毕并重新进行 AGY 二次只读审计。 |
