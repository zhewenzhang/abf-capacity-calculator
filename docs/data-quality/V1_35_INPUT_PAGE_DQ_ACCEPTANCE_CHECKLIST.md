# v1.35.0 Input Page Data Quality Acceptance Checklist

本清单用于在 CC 完成 v1.35.0 数据质量前移 (Data Quality Shift-Left) 的开发工作后，进行无死角的最终只读验收。

## 一、 安全与架构红线校验 (Gatekeeper Rules)

在进行任何页面走查之前，必须确保没有发生任何技术侵入或数据安全倒退：

- [ ] **红线 1：未修改底层计算公式与算法**
  - `frontend/src/core/calculationEngine.ts` 及其产出逻辑 100% 原始。
- [ ] **红线 2：数据保存 semantics 无任何变动**
  - 产品数据、预测需求数据、产能规划数据在保存至 Firestore 的过程中，其字段类型、结构不发生任何变化，无任何“为了满足 DQ 展示而在保存数据时追加冗余属性”的现象。
- [ ] **红线 3：未重写 `dataQuality.ts` 核心逻辑**
  - 所有输入页面的 DQ 检测全部直接调用 `core/dataQuality.ts` 的 `buildDataQualitySummary`，严禁在页面组件中手写 ad-hoc 的数据质量检测逻辑。
- [ ] **红线 4：安全规则与版本对齐**
  - `firestore.rules` 维持原样；`package.json` 及 `package-lock.json` 版本号成功同步递增为 `"1.35.0"`。

---

## 二、 页面级 Data Quality Visibility 验收清单

### 1. Products.tsx (产品 SKU 页)
- [ ] **行级/单元格级 Error 图标**：
  - 导入了生产属性不完整的 SKU 时，表格在对应 SKU 行渲染红色的 `<ExclamationCircleOutlined />` 错误图标。
  - Tooltip 中包含具体的缺失属性（如：`chipLengthMm`, `layerCount` 等）。
- [ ] **零价格警告 (Warning)**：
  - 单价为 `0` 的 SKU 在表格单价单元格渲染黄色警告图标，Tooltip 包含“价格为 0”的警示描述。
- [ ] **不支持的币别 (Warning)**：
  - 录入非 `USD`、`TWD`、`CNY` 的 SKU 时，表格呈现黄色警告图标。

### 2. Forecasts.tsx / ForecastsSpreadsheetLab.tsx (需求预测页)
- [ ] **孤儿预测高亮 (Error)**：
  - 输入的预测数据关联的 `skuId` 缺失时，表格行底色渲染为浅红色，并标注红色 Error 图标，Tooltip 指明该 SKU 缺失。
- [ ] **不完整年份警告 (Warning)**：
  - 某个 SKU 在特定年份的月度数据少于 12 个时，年份切换器旁或该 SKU 首列渲染黄色警告提示。
- [ ] **零价格预测警告 (Warning)**：
  - 录入月份单价为 0 的预测时，对应单元格或行渲染黄色警告图标。

### 3. CapacityPlan.tsx / CapacitySpreadsheet.tsx (产能规划页)
- [ ] **产能配置缺失大 Alert (Error)**：
  - 系统在存在预测需求月份而缺少产能数据时，ActionBar 下方展示醒目的红色 Alert，罗列出所有缺失产能的月份（如 2026-03）。
- [ ] **BU 产能严重缺失 (Error)**：
  - 当前月有高层数 (layerCount >= 4) SKU 需求但 `buPanelPerDay` 总产能配置为 0 时，对应月的 BU 单元格显示红色警告边框与图标，Tooltip 给出瓶颈说明。
- [ ] **无预测需求配置提示 (Info)**：
  - 某月有产能配置但预测需求为 0 时，显示蓝色 Info 图标。

### 4. BpTargets.tsx (营业目标页)
- [ ] **目标与需求脱节警告 (Warning)**：
  - 某年份设置了大于 0 的 BP Target 却无任何预测需求时，该年份行渲染黄色 Warning 图标，Tooltip 提示“营业额目标脱节”。
- [ ] **需求存在但缺失目标警告 (Warning)**：
  - 某年份有预测需求但营业目标为 0 或未设置时，页面 ActionBar 下方展示黄色 Alert 警示。

### 5. Parameters.tsx (参数设定页)
- [ ] **汇率缺失警告 (Error)**：
  - 在 SKU 或预测中使用了 TWD/CNY 但 constant/yearly 汇率未正确配置时，币别与汇率设定 Card 内对应输入框或标题旁显示红色 Error 图标。

---

## 三、 多人协作 Viewer 模式只读防线验收

- [ ] **完全知情呈现**：
  - 使用 Viewer 权限登录，在访问上述 Products、Forecasts、Capacity、BP Targets、Parameters 五大页面时，所有的 Error 红色图标、Warning 黄色图标、Info 蓝色图标、Alert 横幅以及 Tooltip 鼠标悬浮详细文案 **必须能 100% 完整显示**。
- [ ] **绝对禁止编辑**：
  - Viewer 在看到这些 DQ 警示时，所有的 Input 输入框、Table 可编辑单元格、保存、还原等修正按钮 **一律维持强置灰 (disabled)**，无法做出任何修改保存。
