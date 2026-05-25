# v1.35.0 Data Quality Visibility 旁路产品规格说明书

## 一、 业务背景与“Shift-Left”核心理念

在 ABF 产能规划系统的先前版本中，**数据质量 (Data Quality, DQ)** 的汇总诊断与置信度评估仅在分析结果页的“数据置信度与警示 (Data Confidence & Caveats)”模块以及 AI 简报导出中呈现。这导致了严重的操作滞后——用户在输入界面辛辛苦苦录入完大量数据后，必须跳转到最后的分析结果页，才能被动发现数据中存在的缺失、汇率未配或孤儿预测等致命问题。

为了彻底提升产品的信任感与录入效率，`v1.35.0` 提出 **Data Quality Visibility 前移 (Shift-Left)** 方案：
将底层的 `dataQuality.ts` 诊断引擎与各个核心输入页面相集成。在 **产品 SKU (Products)、需求预测 (Forecasts)、产能规划 (Capacity)、营业目标 (BP Targets) 以及参数设定 (Parameters)** 页面中，实现即时、显性、上下文关联的 DQ 警示与图示，让用户在数据录入的第一阶段就能对数据质量缺陷了如指掌并即时修正。

---

## 二、 页面级 DQ 前移规格定义

我们将现有的 `dataQuality.ts` 规则前移至各个输入页面，定义以下五个页面级 DQ Visibility 规格：

### 1. Products 页 (产品 SKU 管理)
在 `Products.tsx` 的 SKU 列表 Table 中，针对单个 SKU 的属性缺陷进行行级或单元格级标记：

- **SKU 属性缺失/无效 (`sku-missing-attr`)**：
  - **检测条件**：当 SKU 缺失 `chipLengthMm`、`chipWidthMm`、`layerCount`、`sizeCategory`、`unitPrice` 中的任意一项，或这些数值小于等于 0 时。
  - **UI 呈现**：在 SKU 行的首列或对应单元格上，渲染红色的 `<ExclamationCircleOutlined />` 错误图标。
  - **交互提示**：鼠标悬浮 (Tooltip) 时，动态翻译并显示具体的缺失字段（例如：“产品 SKU 缺失生产属性: chipLengthMm, layerCount”）。
  - **严重度**：`error` (高)。
- **价格为零警告 (`sku-zero-price`)**：
  - **检测条件**：当 SKU 的 `unitPrice` 恰好等于 0 时。
  - **UI 呈现**：在单价单元格上显示黄色的警告图标与浅黄底色，悬浮提示：“单价为 0，这可能会使收入估算偏低”。
  - **严重度**：`warning` (中)。
- **不支持的币别 (`sku-unsupported-currency`)**：
  - **检测条件**：SKU 单价币别不是 `USD`、`TWD`、`CNY` 中的任意一种。
  - **UI 呈现**：在币别列渲染黄色警告图标，提示币别不被支持。

---

### 2. Forecasts 页与 Lab 页 (需求预测)
在 `Forecasts.tsx` 及 `ForecastsSpreadsheetLab.tsx` 的编辑列表中，标记与 SKU 关联或时间周期相关的缺陷：

- **孤儿预测检测 (`forecast-orphan-sku`)**：
  - **检测条件**：预测条目关联的 `skuId` 在 SKU 主表中不存在。
  - **UI 呈现**：在对应的预测行高亮显示为浅红色底色，并在 SKU 编码单元格旁显示红色错误图标。悬浮提示：“预测指向的 SKU ID 不存在，此预测需求将无法在分析中被正确归类”。
  - **严重度**：`error` (高)。
- **预测价格为零 (`forecast-zero-price`)**：
  - **检测条件**：具体月份预测记录的 `unitPrice` 为 0。
  - **UI 呈现**：在表格价格单项高亮黄色警告图标。
  - **严重度**：`warning` (中)。
- **预测年份缺失部分月份 (`forecast-partial-year`)**：
  - **检测条件**：某个 SKU 在某年份录入的预测月份数在 `1` 到 `11` 个之间（非完整的 12 个月）。
  - **UI 呈现**：在 Forecasts 页的年份切换器旁，或在 Lab 页该 SKU 行的首列，展示黄色 `<InfoCircleOutlined />` 警告标志。悬浮提示：“当前年份数据不完整（仅有 X/12 个月预测），这将导致年度分析出现非意图的断崖”。

---

### 3. CapacityPlan 页与 Spreadsheet 页 (产能规划)
在 `CapacityPlan.tsx` 及 `CapacitySpreadsheet.tsx` 中，结合当前的预测需求跨表关联检测：

- **产能配置缺失 (`forecast-missing-capacity`)**：
  - **检测条件**：当前月份存在有效的 SKU 需求预测，但是整个系统中未在任何工厂配置该月份的产能记录。
  - **UI 呈现**：在 CapacityPlan 页面顶部的 ActionBar 或者是 Table 表头，显示醒目的红色 Alert 警示栏：“发现预测需求月份缺少产能规划（如：2026-03），请在该月份添加产能”。
  - **严重度**：`error` (高)。
- **高层数 SKU 需求 vs BU 产能为零 (`bu-demand-zero-capacity`)**：
  - **检测条件**：当前月份存在层数大于等于 4 的高层数 SKU 的有效预测，这意味着生产该 SKU 必须消耗 Build-up (BU) Panel 产能；但在该月份，所有工厂的 `buPanelPerDay` 产能配置总和却为 0。
  - **UI 呈现**：在产能配置表格中，对该月份的 `buPanelPerDay` 编辑单元格渲染红色警告框与图标。悬浮提示：“该月存在高层数产品需求，但 Build-up 产能配置为 0，这会导致 100% 的产能瓶颈”。
  - **严重度**：`error` (高)。

---

### 4. BpTargets 页 (营业目标设定)
在 `BpTargets.tsx` 中，进行年份与预测的跨表核验：

- **营业目标与预测脱节 (`bp-target-zero-forecast`)**：
  - **检测条件**：某年份配置了大于 0 的营业额目标 (BP Target)，但该年份下没有任何有效的 SKU 需求预测录入。
  - **UI 呈现**：在 BpTargets Table 对应该年份的行，首列或单元格上显示黄色的警告图标。悬浮提示：“该年份配置了营业目标，但没有录入任何预测需求，营业达成率分析将固定为 0.0%”。
  - **严重度**：`warning` (中)。
- **预测需求存在但缺失营业目标 (`forecast-missing-bp-target`)**：
  - **检测条件**：系统存在某年份的有效 SKU 需求预测，但 `bpTargets` 中该年份的营业目标未配置（为 null 或 0）。
  - **UI 呈现**：在 BpTargets 页面顶部的 ActionBar 下方展示一条警示 Alert ：“发现当前预测周期（如：2026）缺失营业目标设定，建议补充”。
  - **严重度**：`warning` (中)。

---

### 5. Parameters 页 (参数设定)
在 `Parameters.tsx` 中核验汇率状态：

- **缺失必要币别汇率 (`missing-constant-twd-rate`, `missing-yearly-twd-rate`, etc.)**：
  - **检测条件**：系统中存在 TWD 币别计价的 SKU 或 Forecast，但当前汇率设置中 constant / yearly 模式下未配置对应的 TWD 汇率或汇率小于等于 0（CNY 币别同理）。
  - **UI 呈现**：在“币别与汇率设定”Card 标题旁或者对应输入框高亮红色图标，悬浮提示：“由于存在以 TWD/CNY 计价的产品数据，必须配置该币别的汇率”。
  - **严重度**：`error` (高)。

---

## 三、 多人协作工作区角色 (Viewer) 的 DQ Visibility 行为规范

为了维持 True Read-only 安全性红线，必须规范工作区 `Viewer` 角色在此功能下的表现：

- [x] **数据质量的完整知情权**：Viewer 角色在访问各个输入页面时，**必须能够完整看到**上述所有的红色 Error 图标、黄色 Warning 图标、Alert 警示横幅以及 Tooltip 鼠标悬浮详细提示。
- [x] **禁止编辑的控制**：所有能用于修复数据质量问题的输入框 (InputNumber, Table Cell)、保存按钮、还愿预设值按钮，依然在 Viewer 状态下**保持强置灰 (disabled)**，只看不改。

---

## 四、 页面级 DQ 检测的极速前移实现模式 (Shift-Left Architecture)

为避免破坏核心公式，CC 在实现本功能时，**严禁**在每个 React 页面独立编写重复的复杂逻辑。必须采用以下设计模式：

1. **共享上下文数据拉取**：
   在 UI 输入页中，利用 React Context 或者本地已拉取的 Skus、Forecasts、CapacityPlans、Parameters 状态，在内存中直接调用 `buildDataQualitySummary({ skus, forecasts, capacityPlans, params })`。
2. **局部 Issue 过滤器**：
   在各页面渲染时，编写一个简单的 Filter 过滤出当前 Domain 的 Issues。例如：
   ```typescript
   // Products.tsx 中过滤出 products 域的 DQ issues
   const dqSummary = buildDataQualitySummary({ skus, forecasts, capacityPlans, params });
   const productIssues = dqSummary.issues.filter(i => i.domain === 'products');
   ```
3. **精准 UI 高亮**：
   在 Table 行的 `render` 函数中，通过 SkuId / PeriodYear 等关键字在过滤出的 `issues` 数组中查找是否存在对应记录。若存在，则追加图示与 Tooltip，保证极高的数据响应速度。
