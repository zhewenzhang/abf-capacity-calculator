# Phase 6.2 预测版本工作流与安全越权手动冒烟测试脚本

本测试脚本用于对 **ABF Capacity Calculator** 的 **Phase 6.2 Forecast Version History Workflow**（预测版本工作流与快照元数据大盘）在 `v1.24.0` 发版部署前实施**手动的端到端冒烟测试 (Manual Smoke Test)**。本测试特别针对工作流中版本种类的识别、智能推荐算法核算、多用户角色（Viewer / Editor / Owner）在安全权限上的物理防篡改拦截进行了多维度用例覆盖。

---

## 一、 手动冒烟测试流程 (Step-by-Step Test Flows)

### 阶段 1：快照建立与 metadata 防伪造测试 (CreatedBy 与 Kind 绑定)
- **目的**：验证用户在建立快照时能够正常装填 Metadata 字段，并确保 `createdBy` 字段防篡改，Viewer 访客被严格卡死。
- **操作路径**：
  1. 使用 **Editor** 角色账户登录系统，进入 **Forecasts** (销售预测页)。
  2. 确认当前数据存在且无误。点击侧边栏的「保存当前预测为快照」。
  3. 在弹出的 `Create Snapshot Modal` 框中：
     - 输入名称：`snap-2026-bp-01`
     - 选择 Version Type (版本种类)：`bpBaseline` (BP 基準版)
     - 输入 Period Label (周期标签)：`2026 BP`
     - 输入 Note (备注描述)：`Initial budget forecast snapshot for FY2026.`
     - 点击「确认保存」。
  4. 验证：在快照列表中看到新建立的条目，且带有明晰的紫色 `BP Baseline` 标签，周期标注为 `2026 BP`。
  5. 使用 **Viewer (只读)** 角色账户在另一个浏览器窗口登录该共享工作区。
  6. 验证：在 Forecasts 页面的快照保存入口、或者 Calculation Results 页面，「建立快照」按钮物理处于**灰度禁用状态**。
  7. **越权硬拦截校验**：如果 Viewer 强行通过 DevTools 控制台调用 Firestore SDK 执行 `create` 命令，控制台应直接抛出 `FirebaseError: PERMISSION_DENIED`，证明 Firestore 云端规则防守坚固。

---

### 阶段 2：多版本混合保存与 Filter 过滤交互测试
- **目的**：测试各种不同元数据快照的建立过程，以及列表 Filter 过滤器的响应灵敏度。
- **操作路径**：
  1. 重新切换为 **Editor** 角色，在不同时间节点继续建立以下 3 个快照：
     - **快照 B**：名称 `snap-2026-work`，Version Type 选 `working` (工作版)，Period Label 写 `2026-Q1 Work`。
     - **快照 C**：名称 `snap-tsmc-update`，Version Type 选 `customerUpdate` (客戶更新版)，Period Label 写 `TSMC Q1 Cut`。
     - **快照 D**：名称 `snap-scenario-10`，Version Type 选 `scenario` (情境模擬版)，Period Label 写 `Add core machine`。
  2. 进入 **Calculation Results** 页面的 **Change Impact Review** (变更影响审查) 大盘。
  3. 检查 **Snapshot List Filter** (版本过滤区)：
     - 一键点击过滤器中的 `BP Baseline`：列表应**仅渲染出** `snap-2026-bp-01` 这一条紫色 Tag 快照。
     - 一键点击过滤器中的 `Working`：列表应仅显示带有蓝色 `Working` 标签的 `snap-2026-work`。
     - 一键点击过滤器中的 `Scenario`：列表应仅渲染出 `snap-scenario-10`。
     - 点击 `All`：列表应无延迟、完整渲染出上述全部 4 个快照，且按创建时间 `createdAt` 降序降序排列（最新快照自动置顶）。

---

### 阶段 3：确定性推荐对比对 (Recommended Compare Pairs) 算法核算测试
- **目的**：验证系统内置的 Recommended compare pairs 推荐逻辑是否在没有 AI 的旁路隔离下完美精准运转。
- **操作路径**：
  1. 清空当前 Base 和 Target 两个选择器的选择值。
  2. 观察大盘上方 **Recommended compare pairs** 推荐展示区域：
     - **预期推荐规则 1**：由于当前同时存在 `bpBaseline` 类型的 `snap-2026-bp-01`，以及最新 `working` / `customerUpdate` 类型的 `snap-2026-work` 和 `snap-tsmc-update`。系统应在卡片中清晰推荐：“**推荐对比版本对：BP 基準版 [snap-2026-bp-01] 与 最新工作版 [snap-2026-work]**”。
  3. 点击推荐卡片右侧的 **[一键应用 / Apply]** 按钮。
  4. 检查：**Base Selector 自动装填为 `snap-2026-bp-01`，Target Selector 自动装填为 `snap-2026-work`**，不需要用户手动二次拉开下拉框进行繁杂点选。
  5. 清除这两个快照，再次建立一个名称为 `snap-test-latest` 且无任何 Metadata Kind 标注的默认快照。
  6. 观察推荐区域：
     - **预期推荐规则 2 (最新两版 Fallback)**：系统此时应识别出虽然没有 BP Baseline 满足第一匹配，但快照大于 2 个。卡片应自动抓取最新的两个快照进行配对推荐，保证比对流顺畅。

---

### 阶段 4：大盘比对结果与 DeepSeek 离线分析导出测试
- **目的**：核对大盘比对的 Delta 计算方向，验证 AI Prompt 与脱敏 JSON 的安全性。
- **操作路径**：
  1. 确认选择了 Base 为 `snap-2026-bp-01` (旧版)，Target 为 `snap-2026-work` (新版)，点击「比较」。
  2. 检查大盘卡片显示：
     - **Revenue Delta**：严格根据 `Compare (新) - Base (旧)` 进行计算。若新营收增加，数值带正号且呈绿色展示；若降，带负号且呈红色展示。
     - **BP Gap Delta**：BP Target Gap 金额**强制以 Million TWD (百万台币) 进行展示**，绝不允许发生多币别概念混淆。
     - **Capacity Risk**：Shortage Month Delta 月数增减逻辑正确（减少显示为绿，增加显示为红）。
  3. 观察 **Attribution (比例分摊) 区域**：
     - 验证表头和副标题包含地道自然的“比例分攤 / Proportional”或“Attribution”字样。
     - 验证下方常驻有警示 Alert 栏：`[安全声明] 此处的变动项目排名仅表示该项目在营收/预测的 Delta 差值中所占的账面比例最大，属于比例分摊，并不表示该项目是导致整体变动的因果源头。`。
  4. 滚动到页面底部，点击 **[复制 AI 提示包 / Copy AI Brief Pack]**。
  5. 在本地新建一个文本文件，粘帖刚才复制的内容，检查：
     - 前缀打标：是否包含 `F-A-I-R` (事实/归因/推论/建议) 的前缀硬约束。
     - 红线拦截：提示词中是否强阻断了大模型做出商业决定，严防把比例分摊说成因果关系。
     - 脱敏测试：JSON 中所有敏感的用户 UID、个人敏感组织识别名是否已被物理剥离干净。

---

### 阶段 5：快照 Immutable 不可变防线红队回归测试
- **目的**：测试并验证快照建立后绝对不提供 update 既有快照的后门，保障元数据的审计历史严肃性。
- **操作路径**：
  1. 仔细检查 Calculation Results 页面的快照列表表格。
  2. 验证：表格在每一条快照行操作列中，**仅提供「删除」动作（仅 Owner 或本人生效），绝不提供任何「编辑/修改快照元数据」的按钮或交互表单**！
  3. 页面或弹窗中必须看到显著的 Immutable 安全声明文案（指导用户若要调整元数据，请删除旧快照后重新建立保存）。
  4. **硬核 Console 破坏测试**：打开浏览器开发者工具 (F12) 控制台 (Console)，手动构造一个 update 文档请求，强行尝试将数据库内 `snapshots/snap-2026-bp-01` 文档的 `reviewStatus` 从 `draft` 改写为 `locked`：
     ```javascript
     const snapRef = doc(db, "workspaces/YOUR_WORKSPACE_ID/projects/default/snapshots/snap-2026-bp-01");
     await updateDoc(snapRef, { "reviewStatus": "locked" });
     ```
  5. **预期结果**：该 update 操作**必须在云端被彻底拒绝 (Deny)**，控制台抛出 `PERMISSION_DENIED` 越权异常！这强力捍卫了“快照终生 immutable”的安全金标准。

---

## 二、 跨角色冒烟测试校验对账单 (Cross-Role Verification Matrix)

测试人员应以三个不同的角色（Workspace Owner, Workspace Editor, Workspace Viewer）在不同的会话窗口中登录系统，按下表严格执行测试：

| 测试场景编号 (Test Case) | 演员角色类型 (Actor Role) | 验证的操作路径与安全动作 (Action under Test) | 前置条件与数据设定 (Prerequisites) | 预期成功/拦截结果与安全断言 (Expected Outcome) |
| :---: | :--- | :--- | :--- | :--- |
| **TC-01** | **Workspace Owner**<br>(工作区所有者) | - 1. 建立快照并挂载 metadata。<br>- 2. 切换 Filter 过滤器筛选列表。<br>- 3. 抓取比对对推荐进行一键 Apply。<br>- 4. 尝试 update 篡改已有快照的 note 备注。<br>- 5. 跨人删除 Editor 建立的快照。 | - 处于共享工作区模式。<br>- 快照列表存在其他成员保存的历史条目。 | 🟢 **1, 2, 3, 5 允许放行**，Owner 拥有最高的数据阅读与快照资产管理权；<br>🛑 **4 被物理拦截 (DENY)**，数据库控制台报错 `PERMISSION_DENIED`，Immutable 铜墙铁壁生效！ |
| **TC-02** | **Workspace Editor**<br>(工作区编辑者) | - 1. 建立带有 metadata 的新快照。<br>- 2. 筛选和查看大盘比对。<br>- 3. 删除**自己**建立的快照。<br>- 4. 越权尝试删除 **Owner** 建立的快照。 | - 被拉入工作区且赋予 Editor 写权限。 | 🟢 **1, 2, 3 允许放行**，Editor 拥有写及管理自身资产权；<br>🛑 **4 被安全拒绝 (DENY)**，报错权限不足，Editor 严禁越权删除他人快照。 |
| **TC-03** | **Workspace Viewer**<br>(工作区只读访客) | - 1. 一键点击过滤器筛选版本。<br>- 2. 选择两个快照进行大盘比对及 AI Export 导出。<br>- 3. 强行通过 API 发送 `create` 请求新建快照。<br>- 4. 强行通过 API 发送 `delete` 越权删除快照。 | - 被拉入工作区且设为 Viewer 只读权限。 | 🟢 **1, 2 允许放行**，只读角色可顺畅查阅与大盘比对；<br>🛑 **3, 4 被硬性拦截 (DENY)**，按钮灰度禁用，且 API 请求在云端被拒绝，报错 `PERMISSION_DENIED`！ |
