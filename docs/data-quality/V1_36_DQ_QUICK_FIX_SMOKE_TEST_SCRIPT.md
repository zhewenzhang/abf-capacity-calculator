# v1.36.0 Data Quality Quick Fix 冒烟测试脚本 (Smoke Test Script)

本脚本用于指导测试人员或 CC 在本地/预发环境中进行 v1.36.0 数据质量自愈工作流的端到端冒烟测试。脚本采用 SOP 步骤设计，确保测试的可重复性与高覆盖度。

---

## 一、 测试环境与前置脏数据准备 (Mock Data Setup)

在开始测试前，必须在工作区（或本地 Firestore 模拟器）中故意录入以下“脏数据”以触发 6 大 DQ 警报：

1. **SKU 属性缺失**：在 `Products` 中创建一个 SKU `SKU-DIRTY-01`，其 `layerCount` 设为 `0` 或空，且 `unitPrice` 设为 `0`。
2. **孤儿需求预测**：在 `Forecasts` 中插入一笔预测记录，关联的 `skuId` 设为 `SKU-NON-EXIST`（此 SKU 在主库中不存在）。
3. **零单价需求预测**：在 `Forecasts` 中插入一笔有效预测，但将该月份的 `unitPrice` 设为 `0`。
4. **产能缺失与 BU 零产能**：
   - 确保 `Forecasts` 中存在 `2026-03` 月份的 SKU 预测需求，但删除 `Capacity` 库中该月份的所有工厂产能配置。
   - 在 `Products` 中配置一个 SKU `SKU-HIGH-01` 其 `layerCount` 为 `8`；在 `Forecasts` 中配置其在 `2026-04` 月份有预测需求。而在 `Capacity` 中将 `2026-04` 月份所有工厂的 `buPanelPerDay` 设为 `0`。
5. **BP Targets 营业目标缺失**：
   - 在 `Forecasts` 中录入 `2027` 年的预测需求，但在 `BP Targets` 中完全删除 `2027` 年的目标金额（或设为 null / 0）。
6. **汇率设定缺失**：
   - 在 `Products` 中创建一个 SKU `SKU-TWD-01`，其计价币别 `currency` 设为 `TWD`。
   - 在 `Parameters` 页面中，将 `TWD` 常数汇率及 2026 年度汇率设为 `0` 或空。

---

## 二、 6 大核心 DQ 自愈场景冒烟测试步骤 (SOP)

### 场景 1：Products 属性缺失快速自愈 (Quick Fix Drawer)
* **操作步骤**：
  1. 登录工作区，进入 `/products` 页面。
  2. 找到 `SKU-DIRTY-01` 这一行，验证首列渲染了红色警告 Badge，Hover 时提示 `层数(layerCount)缺失或小于等于0，单价(unitPrice)为零`。
  3. 点击该红色 `DataQualityBadge`，验证页面**不发生跳转**，且行不会被误选中。
  4. 屏幕右侧平滑拉出 `SKU Quick Fix Drawer`。
  5. 验证：`层数` 和 `单价` 输入框呈红色高亮状态，焦点自动定位在 `层数` 输入框。
  6. 输入非法值 `-5`，点击保存，验证前端拦截报错 “请输入大于 0 的有效数值”。
  7. 输入合法值 `层数: 8`，`单价: 120.00`，点击 “确认自愈”。
* **预期结果**：
  - 保存过程中显示 Loading。
  - 保存成功后 Drawer 自动收回。
  - `SKU-DIRTY-01` 行的红色错误 Badge **在 0.5 秒内自愈隐去**。
  - 无需刷新网页，全表数据及计算结果即时刷新。

### 场景 2：需求预测孤儿行引导自愈 (Orphan Forecast Guided Modal)
* **操作步骤**：
  1. 进入 `/forecasts` 需求预测页面。
  2. 找到指向 `SKU-NON-EXIST` 的预测记录行，验证该行背景呈现淡红色，SKU 单元格显示红色警告。
  3. 点击红色警告图标，验证弹出 `Orphan Forecast Guided Fix Modal`。
  4. **测试路径 A**：
     - 点击 Modal 中的 “去 Products 页面新建该 SKU” 链接。
     - 验证：系统自动跳转至 `/products` 页面。
     - 验证：自动拉出 “新增 SKU” 侧边抽屉，且 `skuId` 输入框已默认自动填入 `SKU-NON-EXIST`。
     - 补全该 SKU 的其他属性并保存。
     - 返回 `/forecasts`，验证孤儿预测行背景已自动恢复正常（警示褪去）。
  5. **测试路径 B**（需重新制造脏数据）：
     - 再次触发孤儿预测 Modal，点击 “去 Forecasts 编辑器修正此引用的 SKU” 链接。
     - 验证：Modal 关闭，该行的 SKU 选择器下拉框被激活并聚焦，从中选择一个已有 SKU（如 `SKU-DIRTY-01`）并保存。
     - 预期：淡红色背景即时恢复正常。
  6. **测试路径 C**：
     - 再次触发孤儿预测 Modal，点击 “删除此笔无主预测” 按钮。
     - 预期：该预测行就地从页面中物理删除消失。

### 场景 3：需求预测 0 价格就地修补 (Quick Fix Cell)
* **操作步骤**：
  1. 在 `/forecasts` 表格中，找到单价为 0 的月份预测单元格，验证其底色呈淡黄色，且显示黄色警告图标。
  2. 双击该单元格，使其进入就地编辑状态（或者弹出极简修补气泡）。
  3. 输入有效单价 `99.00`，按下 Enter 键或失焦。
* **预期结果**：
  - 输入非法负数应予以拦截阻止。
  - 保存完毕后，该单元格底色恢复正常，黄色警告图标即时消失。
  - 右侧/顶部的总收入预测计算结果即时更新重算。

### 场景 4：产能缺失导航定位与 BU Panel 产能自愈 (Navigation & Guided Fix)
* **操作步骤**：
  1. **测试记录缺失的导航 (Navigation Fix)**：
     - 在 CapacityPlan 页或首页分析 Dashboard 顶部，找到 “发现 2026-03 预测需求月份缺少产能规划” 红色 Alert。
     - 点击其右侧的 “去解决 (Fix)” 按钮。
     - 预期：系统平滑路由跳转至 `/capacity`，并自动过滤至 2026 年，视口平滑滚动锚定至 03 月的 `corePanel` 产能输入框，且该输入框闪烁高亮。
     - 输入产能 `1000` 并保存，验证 Alert 即时消失。
  2. **测试高层数零产能的引导 (Guided Fix)**：
     - 在 Capacity 页面或 Dashboard，针对 `2026-04` 月份的高层数产品需求 vs BU 产能为零问题，点击警告。
     - 验证：弹出 `BU Capacity Deficiency Guided Modal` 引导框，分析根本原因，并列出跳转配置产能及调整需求预测的两条超链接。
     - 点击 “路径 A：去配置产能”，跳转至 `/capacity` 且自动高亮定位 `buPanelPerDay` 单元格。
     - 输入产能保存，验证警告消除。

### 场景 5：BP Targets 营业目标行内快速自愈 (Inline Quick Fix)
* **操作步骤**：
  1. 访问 `/bp-targets` 页面或 Forecasts 页面。
  2. 定位到顶部的 Alert 提示：“2027 年预测需求存在但缺失营业目标设定”。
  3. 点击右侧的 “快速自愈 (Quick Fix)” 按钮。
  4. 验证：Alert 旁直接展开一个行内小表单，包含一个 `营业额目标` 输入框与保存按钮。
  5. 输入 `80000000` 并保存。
* **预期结果**：
  - 页面不跳转，营业目标写入成功，Alert 即时隐去。
  - 年度营业达成率分析即时重算并刷新显示。

### 场景 6：参数设定缺失汇率快捷补齐 (Popover Quick Fix)
* **操作步骤**：
  1. 访问 `/parameters` 参数设定页面。
  2. 在 “币别与汇率设定” 卡片标题旁，找到红色的匯率缺失 Badge，提示 `存在以 TWD 计价的商品，但尚未配置汇率`。
  3. 点击该红色 Badge，验证原地弹出 `Exchange Rate Quick Fix Popover` 气泡。
  4. 验证：气泡内自动算出受影响的 SKU 数量。
  5. 在汇率输入框中填入常数汇率 `0.031`，点击 “即时补全”。
* **预期结果**：
  - 输入非正数汇率应被前端拦截报错。
  - 保存成功后，氣泡关闭，汇率卡片标题旁的 Badge 变绿或消失。
  - 全站所有以 TWD 计价的 SKU/Forecast 的营收重新以新汇率重算，相关的 DQ 警示全部同步自愈隐去。

---

## 三、 多人协同 Viewer 权限硬拦截冒烟测试
* **操作步骤**：
  1. 使用 Viewer（只读）角色账户登录系统。
  2. 访问 `/products`、`/forecasts`、`/capacity`、`/bp-targets`、`/parameters` 页面。
  3. 验证：所有的红色 Error、黄色 Warning 警告 Badge 与 Tooltip **100% 完整显示**。
  4. 尝试点击这些 Badge 或 Alert 图标。
* **预期结果**：
  - 绝对不响应任何 onClick 事件。不展开任何 Drawer，不弹出任何 Popover，也不弹出 Guided Modal。
  - （或）如果弹出了 Diagnostics Detail 气泡，气泡中的所有输入框和保存按钮必须是强置灰的（disabled），不提供任何输入与保存入口。
  - 验证物理阻断：Viewer 无法通过前端 UI 触发任何自愈修改逻辑。

---

## 四、 冒烟测试通过判定准则 (Success Criteria)

1. **零数据污染**：测试结束后，在 Firestore 控制台查看原始集合，未产生任何冗余字段或新集合。
2. **零整页刷新**：所有 6 个自愈动作完成后，Badge 消除和数据重算均在 0.5 秒内物理无刷新完成。
3. **安全拦截率 100%**：只读 Viewer 无法以任何形式触发出错修改。
