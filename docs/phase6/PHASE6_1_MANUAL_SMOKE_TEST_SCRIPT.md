# Phase 6.1 快照变更比对与越权隔离手动冒烟测试脚本 (v1.0)

本测试脚本用于对 **ABF Capacity Calculator** 的 **Phase 6.1 Forecast Versioning & Change Impact Review**（快照变更影响审查大盘）在发版部署前后进行**手动的端到端冒烟测试 (Manual Smoke Test)**。本脚本特别针对多用户共享工作区（Shared Workspace）下的不同角色边界和 v1.22.2 Firestore 安全加固红线，提供了严密的测试流和预期成功/拦截校验对账表。

---

## 一、 手动冒烟测试核心步骤 (Step-by-Step Test Flows)

### 阶段 1：快照建立与 CreatedBy 防伪造测试
- **目的**：测试用户能否正常创建快照，并验证 `createdBy` 字段是否与当前登录用户的 UID 强绑定（防篡改与伪造）。
- **操作路径**：
  1. 登录系统，进入 **Forecasts**（销售预测页）或 **Parameters**（BP目标参数设置页）。
  2. 确认当前数据非空。打开侧边栏，点击「版本快照」或在设置面板中找到「保存当前预测为快照」。
  3. 输入快照名称 `snap-test-01`，输入快照描述 `Test snapshot by tester`，点击「确认保存」。
  4. **只读拦截校验**：若是 Viewer 访客身份，按钮应处于灰度禁用状态；如通过黑客手段强行绕过前端发送 `create` 请求，由于 Firestore 规则限制，控制台应直接抛出 `FirebaseError: PERMISSION_DENIED` 错误。

### 阶段 2：变更比对 (Base vs Compare) 选择交互测试
- **目的**：测试比较大盘对 Base 和 Compare 快照的选择，验证 Delta 差值的正向方向性一致性。
- **操作路径**：
  1. 在系统中进入 **Calculation Results**（计算大盘页），点击 **Change Impact Review**（变更影响审查）新标签页。
  2. 确认在 **Base Snapshot (比较基准)** 下拉框中，能且仅能看到当前活跃项目下的历史快照列表，选择 `snap-test-01`。
  3. 确认在 **Compare Snapshot (比较目标)** 下拉框中选择最近新建的快照 `snap-test-02`。
  4. 检查 Delta 大盘计算数值：
     - 验证公式：`Delta = Compare (新快照值) - Base (旧快照值)`。
     - 若 Compare 营收大于 Base，数字必须显示为正数（如 `+1,500,000 USD`），字体颜色为象征正向的绿色；若降幅，显示负数（`-200,000 USD`），字体为橙红色。
  5. 检查 **Attribution 比例分摊区域**：验证表头带有“比例分摊 / Proportional”的显著 Guardrails 提示。

### 阶段 3：DeepSeek AI 导出包与 JSON 下载脱敏测试
- **目的**：验证 sanitization 脱敏机制，核对 AI 分析提示词以及下载 JSON 文件中 BOM 头的防乱码情况。
- **操作路径**：
  1. 在变动比较面板底部，找到 **Export for AI**（AI 分析导出）区域。
  2. 点击「Copy AI Brief Pack / 复制 AI 提示包」按钮，成功弹出“已复制到剪贴板”的 Toast 提示。
  3. 将剪贴的内容粘帖到文本编辑器中，仔细核对：
     - 是否含有 `F-A-I-R` 的前缀要求。
     - JSON 中的客户名称、产品名称是否已按脱敏规范被过滤/模糊（Sanitized）。
     - 提示词中是否明确带有“严禁大模型把比例归因说成因果关系”的高阻断性字句。
  4. 点击「Download JSON / 下载快照比较包」按钮，成功在本地保存 JSON 文件。
  5. 双击直接在 Excel 等软件中打开该 JSON 文件，**确认中文字符、符号（如 營收、載板 等繁体字）100% 渲染正常，绝无任何乱码/mojibake 现象**（验证 `\uFEFF` UTF-8 BOM 确实写入成功）。

### 阶段 4：快照 Immutable 不可变安全防线回归测试
- **目的**：测试快照的强 immutable 只读护栏是否在 Firestore 物理端彻底锁定。
- **操作路径**：
  1. 打开浏览器开发者控制台 (DevTools)，在 Console 控制台内，使用 Firestore JS SDK 手动构造一个 `update` 请求，尝试对刚刚建立的 `snapshots/snap-test-01` 快照文档的 `name` 属性进行篡改：
     ```javascript
     const ref = doc(db, "users/TEST_UID/projects/default/snapshots/snap-test-01");
     await updateDoc(ref, { name: "Evil Hack Name" });
     ```
  2. **预期结果**：即使是快照的拥有者本人，此 update 操作也**必须被直接 Deny**，控制台抛出 `PERMISSION_DENIED`。这证明 v1.22.2 的 Collection 白名单已物理阻断了递归通配符，快照 update update-if-false 终生锁定安全。

---

## 二、 工作区跨角色冒烟测试校验对账单 (Cross-Role Verification Matrix)

为了验证共享工作区（Workspace）下各个角色的特权及隔离效果，测试人员应登录两个不同的 Google 账号（分别作为工作区的 Owner、Editor、Viewer）在不同的浏览器窗口中按以下矩阵实施测试：

| 测试场景编号 (Test Case) | 执行角色类型 (Actor Role) | 验证的操作路径与安全动作 (Action under Test) | 前置条件与数据设定 (Prerequisites) | 预期成功/拦截结果与安全断言 (Expected Outcome) |
| :---: | :--- | :--- | :--- | :--- |
| **TC-01** | **Personal Owner**<br>(个人项目拥有者) | 对其个人快照进行：<br>- 1. 建立快照<br>- 2. 变更比较<br>- 3. 本人删除快照<br>- 4. 尝试 update 篡改快照 | - 处于个人项目模式下。<br>- 存在历史业务数据。 | 🟢 **1, 2, 3 允许放行**，本人操作正常；<br>🛑 **4 被硬性拦截 (DENY)**，报错 `PERMISSION_DENIED`，Immutable 防线成立！ |
| **TC-02** | **Workspace Owner**<br>(共享工作区所有者) | 对工作区快照进行：<br>- 1. 建立快照<br>- 2. 变更比较<br>- 3. 删除自己建的快照<br>- 4. 删除 Editor 建立的快照<br>- 5. 尝试 update 篡改快照 | - 处于工作区共享模式下。<br>- 该工作区已被邀请了 Editor 成员。 | 🟢 **1, 2, 3, 4 允许放行**，Owner 拥有最高资产管理主权；<br>🛑 **5 被硬性拦截 (DENY)**，报错 `PERMISSION_DENIED`，快照只读安全。 |
| **TC-03** | **Workspace Editor**<br>(共享工作区编辑者) | 对工作区快照进行：<br>- 1. 建立快照<br>- 2. 删除**自己**建的快照<br>- 3. 越权删除 **Owner** 建的快照<br>- 4. 尝试 update 篡改快照 | - 处于该工作区的 Editor 状态下。<br>- 拥有写权限。 | 🟢 **1, 2 允许放行**，编辑者拥有写及删除自身资产的权利；<br>🛑 **3 被硬性拦截 (DENY)**，报错 `PERMISSION_DENIED`，无法越权删除他人数据；<br>🛑 **4 被硬性拦截 (DENY)**，快照不可篡改。 |
| **TC-04** | **Workspace Viewer**<br>(共享工作区只读访客) | 对工作区快照进行：<br>- 1. 变更比较大盘读取<br>- 2. 强行发送 `create` 请求建立快照<br>- 3. 强行发送 `delete` 请求删除快照 | - 处于工作区的 Viewer 状态下。<br>- UI 上按钮已被灰度禁用。 | 🟢 **1 允许放行**，访客可正常阅读变动；<br>🛑 **2, 3 被云端安全规则强制拦截 (DENY)**，控制台抛出 `PERMISSION_DENIED`。只读防线牢不可破！ |
| **TC-05** | **Non-member Stranger**<br>(恶意外部陌生人) | 恶意通过 API 直接获取或修改该工作区的快照数据 | - 未被该工作区邀请。<br>- 属于完全无关的 Google UID 登录用户。 | 🛑 **全量请求（Read / Write / Delete）在云端直接被硬性拦截 (DENY)**，报错 `PERMISSION_DENIED`。数据隐私防线坚固。 |
