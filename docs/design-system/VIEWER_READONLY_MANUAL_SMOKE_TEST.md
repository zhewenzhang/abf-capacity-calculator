# Viewer 只读权限手动 Smoke Test 测试手册 (Viewer Read-only Smoke Test Runbook)

本手册专为验证 **Viewer 角色在工作区中的真实只读 (True Read-only) 权限**而设计，适用于 v1.28.0 发布后的阶段验收与回归测试。本测试的核心目标是验证：**Viewer 用户不仅不能向后端保存修改，而且在 UI 层也绝对被禁止进行任何本地单元格双击、输入、粘贴以及批量导入操作。**

---

## 预置测试条件 (Prerequisites)

进行本测试前，请准备两个处于登录状态的不同浏览器账户（或一个正常浏览器，一个无痕窗口浏览器）：
1. **测试浏览器 A (Owner/Editor 视角)**：登录拥有该工作区 `Owner` 权限的账户。
2. **测试浏览器 B (Viewer 视角)**：登录被邀请为 `Viewer` 权限的账户。

---

## 详细测试步骤 (Test Procedures)

### 阶段一：建立测试基准数据 (Owner / Editor 视角)

1. 打开**浏览器 A**，进入主项目 Dashboard，点击进入您的测试工作区。
2. 确认您的当前角色显示为 **Workspace Owner** 或 **Workspace Editor**。
3. **进入 Products Spreadsheet Lab**：
   * 至少新增或保留 1 个 SKU。例如：
     * SKU Code: `SKU-SMOKE-01`
     * Customer: `Customer-Alpha`
     * Price: `150`
   * 点击右上角 **Save**，确认保存成功。
4. **进入 Capacity Lab**：
   * 新增或保留 1 个工厂（Factory）。例如：`Factory-South-01`。
   * 为其配置一些基础月度 Panel 产能值。
   * 点击 **Save All** 确认保存。
5. **进入 Forecasts Lab**：
   * 确认能够显示 `SKU-SMOKE-01` 对应的月度预测行。
   * 任意配置几个月份（如 1月、2月）的预测数量。
   * 点击 **Save** 确认保存。

---

### 阶段二：配置并邀请 Viewer 账户

1. 在**浏览器 A** 中打开该工作区的成员管理或参数面板。
2. 将**浏览器 B** 的账户邀请至当前测试工作区，并显式指定其角色为 **Viewer**（只读观察员）。
3. 保存成员配置。

---

### 阶段三：Viewer 权限 UI 隔离与无损操作校验 (Viewer 视角)

切换到**浏览器 B**（Viewer 视角账户），进入该工作区，依次执行以下模块的破坏性与锁定性测试：

#### 1. Products Spreadsheet Lab (产品网格只读验收)
*   **1.1 顶栏行为审计**：
    *   检查右上角的工具卡片，确认 **Add Row**、**Save**、**Discard Changes**、**Import CSV** 等所有数据变更类按钮**已全部被禁用 (Disabled) 或隐藏 (Hidden)**。
    *   唯一允许点击的只有 **Export CSV** (导出) 和 **Reload** (刷新) 按钮。
*   **1.2 单元格双击交互测试 (防输入)**：
    *   将光标移动到 `skuCode` 为 `SKU-SMOKE-01` 的单元格，双击该单元格。
    *   **预期结果**：单元格**不能**进入文本编辑状态，光标没有闪烁，键盘敲击任何英文字母、数字均无法修改该格内的字符。
*   **1.3 键盘删除测试 (防篡改)**：
    *   单选选中某一整行，或选中 `deviceName` 所在的单个单元格，按下键盘的 `Backspace` 或 `Delete` 键。
    *   **预期结果**：单元格内的文字依然保持原样，本地 state 没有发生任何删除性修改。
*   **1.4 粘贴行为测试 (防批量覆写)**：
    *   在记事本中复制任意文本（如 `HACKED`），回到网页中选中某一单元格（如 `application` 列），按下 `Ctrl + V`。
    *   **预期结果**：单元格文字无任何改变，本地不应产生“脏数据”的高亮颜色高亮标识。

#### 2. Capacity Lab (产能网格只读验收)
*   **2.1 UI 锁定审计**：
    *   确认顶部的 **Save All** 和 **Discard All** 按钮处于 **Disabled (禁用)** 态。
    *   在 Capacity Lab 的 **Core Panel** 和 **BU Panel** 两个网格选项卡中，寻找 **Read-only Warning 警告 Banner**（如：*“您目前是 Viewer 角色，所有数据为只读”*），确认其赫然醒目。
*   **2.2 单元格操作审计**：
    *   尝试双击 `Factory-South-01` 的 1 月份或 2 月份 Panel 单元格。
    *   尝试在其上按下 `Backspace` 或进行 `Ctrl + V` 粘贴。
    *   **预期结果**：所有月份的数值**纹丝不动**，本地数据未被破坏。
*   **2.3 横向水平滚动检验**：
    *   检查在 Core Panel 和 BU Panel 两个子表格外侧，是否存在平滑的水平滚动条（针对低分辨率视窗），确认其已使用 `.spreadsheet-wrapper` 统一容器封装。

#### 3. Forecasts Lab (预测网格只读验收)
*   **3.1 权限限制审计**：
    *   确认顶部的 **Save**、**Discard** 按钮处于 **Disabled (禁用)** 状态。
    *   确认左侧的删除（Delete）或清空操作隐藏或置灰。
*   **3.2 单元格双击与键盘输入审计**：
    *   双击任意一个月份（如 Jan、Feb 等）的预测数值单元格。
    *   尝试在此处输入新的预测 PCS 值，或者清空数字，或通过 `Ctrl + V` 覆盖。
    *   **预期结果**：单元格完全处于非响应状态（`disabled: true`），无法变更数值，表格没有任何橙色脏标记（dirty-cell）呈现。

#### 4. BP Targets 页面 (若 v1.28.0 已实现)
*   **4.1 UI 锁定审计**：
    *   进入 BP Targets 页面，确认任何输入框（Input）、选择器（Select）、滑块（Slider）均置灰，且没有任何可以提交修改的保存按钮。
    *   确认其渲染的数据完全来自于只读拉取，不提供交互变更入口。

---

## 阶段四：数据无篡改最终检验 (Owner 最终确认)

1. 回到**浏览器 A** (Owner / Editor 视角)。
2. 刷新页面，依次检查 Products Lab、Capacity Lab 和 Forecasts Lab。
3. **预期结果**：
   * 之前建立的基准测试数据（如 `SKU-SMOKE-01`，`150`，`Factory-South-01` 等）**完整无缺，没有发生任何哪怕 1 字符的移位或篡改**。
   * 工作区后台的 Firestore 数据库版本依然一致，无脏提交产生的快照版本。

## 测试评定标准 (Pass / Fail Criteria)

*   **PASS (通过)**：以上四个模块中的所有单元格均完全无法编辑/双击/输入/粘贴，所有变更类按钮均被禁用或隐藏，Owner 最终核验数据完全一致，UI 具有醒目的 Read-only 提示。
*   **CONDITIONAL PASS (条件性通过)**：数据无法被向后端保存，但 Viewer 在某些特定的 Spreadsheet 页面本地仍能双击格并输入内容，虽然最终无法保存，但在 UI 体验上存在滞后和误导。
*   **FAIL (失败)**：Viewer 账户可以通过粘贴、回车或者某种操作将修改绕过前端验证并成功提交持久化至 Firestore 后端。
