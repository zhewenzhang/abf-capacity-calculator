# Phase 7 Excel-like High-Frequency Input 架构调研报告

本报告针对 **ABF Capacity Calculator (载板产能与产品规划沙盒系统)** 的 **Phase 7 高频数据输入与类 Excel 工作流** 进行了深入的架构对比与选型评估。旨在通过穿透性对比主流数据表格框架，为后续迭代提供兼具高性能、法务安全性、React 19 兼容性及完美视觉一致性的高频输入技术解法。

---

## 一、 Phase 7 产品目标与用户高频输入场景

### 🎯 产品目标
在不破坏既有数据物理完整性和系统安全加固的前提下，为用户提供极其流畅、符合 Microsoft Excel 使用直觉的高频、多维表格式录入体验。打通外部表格工具（如 Excel）与系统的物理剪贴板复制粘贴（Copy/Paste）通路，支持跨行列的填充柄（Fill Handle）快速平刷与拉动复制，极大降低产能规划与业务运营人员的日均录入心智负荷。

### 👥 典型高频输入场景
- **Products 页面场景**：
  - 录入或新增几十个 SKU 的基本物理参数（芯片长度/宽度、ABF材质、层数等）。
  - 为不同 SKU 分别指定对应的 OSAT、应用场景和基准单价。
- **Forecasts 页面场景 (横向月份多维录入)**：
  - 针对具体的 SKU，在横向的 12-24 个月度格子内，高频录入每个月的销售 Forecast 预测片数 (pcs) 或价格。
  - 需要快速将某月的预测值，向右平刷填充（Fill Right）到全年各月份。
- **Capacity Plan 页面场景**：
  - 针对上百条机台设备线，高频录入其月度稼动上限、良率参数。
  - 需要在外部 Excel 软件里计算好设备月度产能参数后，一键复制上万个单元格，瞬间无缝粘贴进系统的排产表格中。

---

## 二、 目前产品的输入痛点与页面价值剖析

### 1. 当前输入痛点
- **零散输入效率低**：目前的常规表单多采用 AntD 原生的 `<Form>` 或一格一格的双击渲染模式，操作繁杂，无法使用 Tab/Arrow 键进行如行云流水般的键盘导向录入。
- **实验表格生态薄弱**：虽然 Products 和 Capacity 页面各自配备了 `ProductsSpreadsheetLab.tsx` 和 `CapacitySpreadsheet.tsx` 实验页，并引入了 `react-datasheet-grid` 框架。但其功能相当局限，不支持 Fill Handle（填充柄）这一排产人员的“灵魂操作”，且与 Ant Design 视觉一致性的整合成本极高，常出现由于原生换行符粘贴解析瑕疵而导致的格式错乱。

### 2. 哪些页面最需要类 Excel 工作流 (按业务价值排序)
1. **Forecasts 页面**：★★★★★ (最迫切)
   - *原因*：销售预测具有强烈的“时间序列横向属性”，需横向按月平刷，数据频度最高，最急需 Fill Right 和 Clipboard copy/paste 填充。
2. **Capacity Plan 页面**：★★★★★
   - *原因*：设备产能数据笔数极度庞大（机台类别 x 月份维度），一格一格输入简直是灾难，极度依赖从 Excel 直接复制粘贴成千上万条记录。
3. **Products 页面**：★★★☆☆
   - *原因*：新产品的物理规格参数为一次性或低频录入，对类 Excel 平刷填充的依赖度稍低，但仍需流畅的 Tab/Arrow 键盘导航录入。

---

## 三、 六大候选框架架构穿透与评估

我们对以下 6 个主流表格方案进行了源码级与技术指标的穿透横向评测：

### 1. AG Grid React (Enterprise vs Community)
- **React 19 兼容性**：完美兼容（v34+ 官方正式原生支持 React 19）。
- **License 协议**：
  - *社区版 (Community)*：MIT 协议，完全免费。
  - *企业版 (Enterprise)*：**独占商业收费协议**。
- **功能测评 (Features)**：
  - **核心痛点**：类 Excel 的 `Cell Range Selection` (单元格范围选择)、`Fill Handle` (填充柄)、`Excel Export` (原生导出) **全属于企业版特权**！
  - 社区版不支持多选区和填充柄，若在社区版自建填充柄，其底层渲染树非常复杂，极其困难。
- **打包体积 (Bundle Size)**：巨大（打包后单是 AG Grid Core 就可以轻易超过 1MB 物理体积，需深度做 Code-Splitting 动态加载）。
- **AntD 整合与 Firebase 整合**：整合难度中等，需自己编写 CSS 样式包来拟合 Ant Design 的 HSL 主题色；涉及 Firebase 时，AG Grid 提供的 Row Transaction 模型与 Firebase 的 batchSave 容易发生并发重叠，维护成本高。
- **商业成本风险**：极高（如果未经采购商业授权，直接将 Enterprise 源码用于产品中，有极大侵权和法务被诉风险）。

### 2. Handsontable React
- **React 19 兼容性**：完美兼容（Handsontable v15+ 正式原生支持 React 19）。
- **License 协议**：**非商业免费 (仅用于个人/研究)，商业使用强制收费**。
- **功能测评 (Features)**：
  - 类 Excel 的绝对王者。原生自带极度丝滑的多选区、复制粘贴、填充柄、多维度公式等。
- **打包体积 (Bundle Size)**：较大（约 300KB+ gzipped，但由于自带一整套渲染，和已有 CSS 易冲突）。
- **AntD 与 Firebase 整合**：整合难度高。Handsontable 采用原生的 Table/TD 的虚拟滚动重绘模型，和 Ant Design 组件在 Cell Editor 里的交互冲突极多，易导致样式错位和事件冒泡破损。
- **商业成本风险**：极高（每个开发者每年 999 美元起，对于预算敏感型项目是极高的常态支出负担）。

### 3. Univer Sheets
- **React 19 兼容性**：完全兼容。
- **License 协议**：核心 SDK 采用 **Apache-2.0 开源协议**（免费商业友好），高级企业功能（协同、复杂导出）为 Universe Pro 商业收费。
- **功能测评 (Features)**：
  - 极度强悍的全功能电子表格引擎。它不是一个表格组件，而是一个网页版的“完整 Microsoft Excel 替代”。
- **AntD 与 Firebase 整合**：整合难度极高。Univer 自带一整套独立的 Canvas / SVG 视口渲染和顶层工具栏，这会彻底打破现有的 Ant Design 页面版面，相当于要在产品中嵌入一个独立的 Office App，体验不一致性极大。
- **总结**：**过于重型，杀鸡焉用牛刀**，极不适合作为一个录入组件嵌入到现有的排产功能页中。

### 4. Ant Design Table + 自定义 Spreadsheet 行为 (自研方案)
- **React 19 兼容性**：完美兼容。
- **License 协议**：MIT，完全免费。
- **功能测评 (Features)**：
  - 视觉一致性天花板。
  - 但当数据量极大（如上千行 SKU x 12 个月输入框，上万个输入 DOM）时，**由于 AntD Table 缺乏原生的虚拟滚动，会导致 DOM 爆炸，页面高频操作瞬间卡死**。
  - 需要开发者手写庞大的鼠标 Drag 划线多选区、键盘 Tab 事件拦截及复制粘贴换行文本拆解算法，自研工程代价极其昂贵，极易出现浏览器碎片化 bug。

### 5. TanStack Table + TanStack Virtual 自建方案 (强烈推荐)
- **React 19 兼容性**：完美兼容（MIT 协议，完全 React 19 友好）。
- **核心优势 (Features)**：
  - **Headless (无样式 / 无 UI)**：它仅负责提供表格的底层状态计算（State）、虚拟列定义，**没有任何 CSS**。允许开发者 100% 自由地使用 Ant Design 的组件和样式对其进行二次包裹，**达成完美的 100% 视觉一致性**！
  - **大数据极速虚拟化**：配合 `TanStack Virtual`，完美实现 Rows & Columns 双向虚拟滚动。即便是 1000 行 x 24 个月的巨型输入矩阵，DOM 里也仅渲染可见视口内的数十个单元格，**高频输入丝滑如飞，内存和 CPU 消耗极低**。
  - **0 成本与法务风险**：完全免费开源，绝无任何商业授权 License 暴雷隐患。
- **局限性**：Clipboard copy/paste、Fill handle（填充柄）需要我们在容器上注册全局鼠标/键盘监听事件并轻量自写算法（大约 200 行代码即可闭环复制粘贴和简单向右平刷）。虽然有自建代价，但**完全可控、纯净且能实现 100% 的视觉对齐**。

### 6. React-Datasheet-Grid (项目现存方案)
- **React 19 兼容性**：良好。
- **License 协议**：MIT，免费开源。
- **现状与短板**：
  - 虽有虚拟滚动和基础 Excel 复制粘贴支持，但生态极薄弱。在自定义下拉框、与 AntD 深度控件集成时冲突明显。
  - **缺乏原生高级功能**：不支持 Fill Handle（填充柄）、无多选区统计、多平台剪贴板原生换行解析易出现Mojibake或错位缺陷，无法支撑 Forecast 复杂的多维月份平刷。

---

## 四、 核心推荐与选型决策结论

### 🏆 第一推荐方案：【自研可控天花板】TanStack Table / Virtual Headless 方案
- **推荐理由**：
  1. **法务 100% 安全**：MIT 协议，杜绝 Handsontable 和 AG Grid 企业版昂贵的商业授权勒索。
  2. **视觉 100% 融合**：Headless 机制使得我们可以直接嵌套 Ant Design 的样式和组件，完美呈现 Dashboard 的专业战略决策美感。
  3. **性能 100% 强悍**：双向虚拟滚动彻底告别大数据录入时的卡死与 DOM 崩溃。

### 🥈 第二推荐方案：【渐进折中方案】React-Datasheet-Grid
- **推荐理由**：项目中已存在 Products 和 Capacity 的 Spreadsheet Lab 实验页脚手架。如果预算极度紧张、且对填充柄无硬性需求，可以继续基于它打磨，但需警惕无法突破的自定义控件难看、缺少高级多选区功能的硬伤。

### 🚨 绝对不推荐方案：Handsontable 与 AG Grid React (Community / Enterprise)
- **不推荐理由**：
  - AG Grid 社区版功能过于残缺，缺少填充柄和范围选择，相当于普通 Table；企业版和 Handsontable 则带有**高悬的商业授权 License 达摩克利斯之剑**，一旦被法务起诉将面临巨额赔偿。
  - Univer Sheets 则过于重型，破坏了系统的战略沙盘一致性。

---

## 五、 导入策略 (Migration & Implementation Strategy)

我们推荐采用**“双轨并行、低侵入、高安全”**的导入方式：
1. **第一步：建立 ForecastSpreadsheetLab 实验页**：
   - 绝不直接动正式的 `Forecasts.tsx`，保持老业务的强悍健壮性。
   - 参照 `ProductsSpreadsheetLab.tsx` 的成功经验，建立 `ForecastsSpreadsheetLab.tsx` 页面。
   - 在此实验页中引入 `TanStack Table + Virtual`，开发并试验 12 个月横向录入、向右一键平刷填充（Fill Right）以及多单元格复制粘贴逻辑。
2. **第二步：引入脏状态 (Dirty State) 保护Firebase**：
   - 表格内部全部采用 React local state 进行毫秒级响应，录入时绝不调用 Firestore 接口，避免写入放大。
   - 页面顶部提供「保存 / Save」与「放弃 / Discard」按钮，配备脏状态提示。
   - 只有点击「Save」时，才通过 `batchSaveForecasts` 一键将 Sanitized 变动写入云端数据库，彻底防范网络延迟带来的高频卡顿。
