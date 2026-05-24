# 全页面 UI 资产盘点 (UI Inventory - 2026/05/25)

本盘点报告对 ABF 产能计算器当前现存的 11 个页面与核心区块进行了全方位的 UI 与交互审计，用以明确视觉和操作的一致性现状。

---

## 📋 11 个页面/区块 UI 盘点矩阵

### 1. Dashboard (仪表盘大屏)
- **页面目的**：提供工作空间级的高管鸟瞰视角，汇聚总体营收达成率、核心制程瓶颈利用率以及快照摘要。
- **使用者角色**：Workspace Owner / Editor / Viewer
- **主要组件**：
  - Metric 汇总指标卡片 (Card + Statistic)。
  - 核心瓶颈产能柱状图/雷达图 (Chart)。
  - 快速入口跳转卡。
- **使用的表格/输入形态**：只读静态数据。无输入。
- **loading / empty / error 状态**：
  - 加载时：AntD `Spin` 局部遮罩。
  - 数据为空时：渲染默认空白折线图及零值。缺乏精致引导。
- **主要操作按钮**：[创建新快照 (Create Snapshot)] 按钮。
- **是否有 dirty state**：无（纯只读汇总）。
- **是否有 i18n 风险**：极低（图表 Legend 与 Title 已提取至 `zhTW.ts` / `en.ts`）。
- **最大 UI 不一致问题**：指标卡片（Card）的阴影（box-shadow）和内边距（padding）与 Parameters 页面的 Card 参数配置卡片不一致，视觉呈现碎裂感。

---

### 2. Products (产品主页)
- **页面目的**：管理和配置工作空间内的 SKU 字典，包括 SKU 编号、良率参数（Yield %）及工艺制程消耗。
- **使用者角色**：Workspace Owner / Editor / Viewer (Viewer 只读)
- **主要组件**：
  - SKU 列表大表 (AntD Table)。
  - [添加 SKU] 与 [编辑] 的浮动抽屉/模态框 (Drawer / Modal)。
- **使用的表格/输入形态**：Ant Design Table 展示，表单 Input 进行散装添加/修改。
- **loading / empty / error 状态**：
  - 数据为空时：使用 AntD 原生 `Empty` 占位，文案无针对性。
- **主要操作按钮**：[添加产品 (Add Product)]、[编辑]、[删除]。
- **是否有 dirty state**：无（抽屉/模态框内为即时表单校验，无全页未保存脏状态）。
- **是否有 i18n 风险**：中等（Drawer 内的工艺制程消耗标签有些直接裸露为英文）。
- **最大 UI 不一致问题**：SKU 的良率输入在 Products 主页采用模态框单项录入，而在 Products Spreadsheet Lab 中采用 react-datasheet-grid 录入，两边缺乏数据修改时的交互对齐。

---

### 3. Products Spreadsheet Lab (产品录入实验页)
- **页面目的**：提供类似 Excel 的高频批量 SKU 售价与良率参数录入终端。
- **使用者角色**：Workspace Owner / Editor (Viewer 禁写)
- **主要组件**：
  - Excel 二维网格大表 (react-datasheet-grid)。
- **使用的表格/输入形态**：Spreadsheet 电子表格输入。
- **loading / empty / error 状态**：
  - 局部加载时呈现网格空白骨架。
- **主要操作按钮**：[保存修改]、[放弃更改]。
- **是否有 dirty state**：**有**。修改任何格子都会亮起顶部未保存提示。
- **是否有 i18n 风险**：中等（脏状态提示文案在早期小版本中有部分硬编码）。
- **最大 UI 不一致问题**：网格高亮边框呈原生深黑色，与 Ant Design 聚焦的蓝色高亮（`#1677ff`）严重割裂；且只读状态下虽然隐藏了保存按钮，但 Viewer 仍可双击选表格。

---

### 4. Forecasts (销售预测主页)
- **页面目的**：录入与展示 SKU 的多币种年度/月度销售预测数，向下游输入需求。
- **使用者角色**：Workspace Owner / Editor / Viewer (Viewer 只读)
- **主要组件**：
  - 年份筛选下拉框。
  - SKU 预测输入卡片列表。
- **使用的表格/输入形态**：折叠面板 (Collapse) 内套散装 Input，按月份纵向单列排开。
- **loading / empty / error 状态**：
  - 空状态下显示“暂无预测数据，请先录入产品”。
- **主要操作按钮**：[保存 (Save)]。
- **是否有 dirty state**：无（采用散装表单即时性修改）。
- **是否有 i18n 风险**：中等（折叠面板内部的月份直接硬编码为 Jan, Feb 等英文）。
- **最大 UI 不一致问题**：月份录入采用纵向折叠表单，排版极度拉长，财务人员在一屏内无法横向对比 1-12 月，且操作按钮直接摆在表单底部，在大数据量下极难滚动寻找。

---

### 5. Capacity (产能负载主页)
- **页面目的**：计算并展示瓶颈设备的产能负载利用率（Utilization %）及缺口状况。
- **使用者角色**：Workspace Owner / Editor / Viewer
- **主要组件**：
  - 设备利用率汇总大表 (AntD Table)。
  - 利用率超载预警卡。
- **使用的表格/输入形态**：Ant Design Table，包含自定义的进度条（Progress）渲染瓶颈。
- **loading / empty / error 状态**：
  - 数据计算中：全局 `Spin` 遮罩。
- **主要操作按钮**：无（主要为只读分析视图）。
- **是否有 dirty state**：无。
- **是否有 i18n 风险**：低。
- **最大 UI 不一致问题**：超载百分比的判定色（阈值判定）在 Capacity 表格中是 `>90%` 标红，而在 Dashboard 的瓶颈预警中是 `>85%` 标红，商业逻辑判断尺度割裂。

---

### 6. Capacity Lab (产能录入实验页)
- **页面目的**：批量录入制程设备的额定产能（Rated Capacity）与效率衰减常数。
- **使用者角色**：Workspace Owner / Editor (Viewer 只读)
- **主要组件**：
  - 电子表格网格 (react-datasheet-grid)。
- **使用的表格/输入形态**：Spreadsheet 录入。
- **loading / empty / error 状态**：
  - 表格初始化骨架。
- **主要操作按钮**：[保存修改]、[放弃]。
- **是否有 dirty state**：**有**。
- **是否有 i18n 风险**：中等。
- **最大 UI 不一致问题**：表格列宽分配生硬，设备分类列与产能列没有对齐；未保存提示条的样式、高度、底色与 Products Spreadsheet Lab 存在微妙的 CSS 差异。

---

### 7. BP Targets (营业目标独立页 - Planned)
- **页面目的**：自 Parameters 中拆出，用于高频横向年份录入年度营业额（TWD）。
- **使用者角色**：Workspace Owner / Editor / Viewer (Viewer 只读)
- **主要组件**：
  - 横排年份网格大表 (react-datasheet-grid)。
- **使用的表格/输入形态**：Spreadsheet 横向年份铺开录入。
- **loading / empty / error 状态**：
  - 骨架屏加载，未设置时优雅显示 `—`。
- **主要操作按钮**：[保存]、[放弃]。
- **是否有 dirty state**：**有**。
- **是否有 i18n 风险**：高（必须严防翻译键裸露与中英文 parity 脱账）。
- **最大 UI 不一致问题**：此页面属于 Planned 状态。最大的技术隐患是若未在 Parameters 彻底物理隔离，会造成并发数据覆写。

---

### 8. Parameters (参数配置主页)
- **页面目的**：集中管理工作空间级全局参数，如多币种汇率、工作日天数等低频参数。
- **使用者角色**：Workspace Owner / Editor (Viewer 只读)
- **主要组件**：
  - Ant Design Tab 标签卡分类表单。
- **使用的表格/输入形态**：普通 Form + Input 输入。
- **loading / empty / error 状态**：
  - Spin 遮罩。
- **主要操作按钮**：[更新参数 (Update Parameters)]。
- **是否有 dirty state**：无（即时提交）。
- **是否有 i18n 风险**：低（配置标签已大体对齐）。
- **最大 UI 不一致问题**：保存按钮的位置位于页面最下方，且不同的 Tab 页签中有的页签有局部 [保存] 按钮，有的页签需要滚动到最底部共用一个 [更新参数] 按钮，交互逻辑极为错乱。

---

### 9. Results (Capacity Results / Revenue Results)
- **页面目的**：展示产能与营收的最终运算及 BP target 差距达成率分析。
- **使用者角色**：Workspace Owner / Editor / Viewer
- **主要组件**：
  - 只读分析表格 (AntD Table)。
  - 达成率 Gap 仪表盘 (Chart)。
- **使用的表格/输入形态**：Ant Design Table + Tab 标签分类分析。
- **loading / empty / error 状态**：
  - Spin 加载。
- **主要操作按钮**：无（纯只读分析）。
- **是否有 dirty state**：无。
- **是否有 i18n 风险**：中等（表格表头 Delta 差值字段在老版本中存在硬编码漏网）。
- **最大 UI 不一致问题**：百分比、千分位数值的右对齐规则在不同 Results 子表中不一致，部分居中、部分靠左，导致财务数据视觉凌乱，难以快速 scan 对账。

---

### 10. Snapshot Change Review / Change Impact 区域
- **页面目的**：跨历史快照（Snapshot）进行数据变更（Delta）追踪与差异高亮审计。
- **使用者角色**：Workspace Owner / Editor / Viewer
- **主要组件**：
  - Compare selector (版本对比选择下拉器)。
  - 核心改变高亮块 (Delta Highlight Panel)。
- **使用的表格/输入形态**：Ant Design Table 列出具体变动行。
- **loading / empty / error 状态**：
  - 快照不足 2 条时展示优雅的警告卡提示。
- **主要操作按钮**：[推荐版本对 (Recommended Pair)]。
- **是否有 dirty state**：无（纯只读对比）。
- **是否有 i18n 风险**：中等（推荐算法直接返回英文 reason 在 v1.24.1 修复后已收拢为 reasonKey）。
- **最大 UI 不一致问题**：对比方向（Base 与 Target 的减法方向 `Target - Base`）在 UI 的指标卡片中与在下方 Details Table 的 `Delta` 运算方向在某些场景下方向倒置，易让业务误解增长与下滑的真实语义。

---

### 11. AI Brief Export / Prompt Pack 区域
- **页面目的**：一键将快照对比与风险简报进行 AI 打包并导出，为高管决策生成自然语言 Brief。
- **使用者角色**：Workspace Owner / Editor / Viewer
- **主要组件**：
  - 一键导出按钮。
  - Prompt 展示卡片 (Card)。
- **使用的表格/输入形态**：只读 Markdown 文本卡。
- **loading / empty / error 状态**：
  - AI 接口读取局部 Spin。
- **主要操作按钮**：[导出 AI 风险简报 (Export AI Brief)]、[复制 Prompt]。
- **是否有 dirty state**：无。
- **是否有 i18n 风险**：高（导出的 Brief 报告若直接由 Prompt 返回，若未绑定用户当前系统语言，会返回全英文报告）。
- **最大 UI 不一致问题**：AI 报告导出的样式直接采用普通文本域（Textarea），缺乏精美的 Markdown 渲染，视觉体验与整体系统的 Glassmorphism 现代感极其割裂。
