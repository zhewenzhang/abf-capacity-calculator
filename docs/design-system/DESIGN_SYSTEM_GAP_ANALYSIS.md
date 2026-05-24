# 设计系统差距分析 (Design System Gap Analysis)

本差距分析对项目当前 UI 系统的 12 个交互设计与视觉维度进行了多维度的量化评估，旨在定位阻碍系统跃升为商业级成熟产品的核心技术与 UX 缺口。

---

## 📊 12 个设计维度量化评分表

| 评估维度 | 现状评分 (1-10分) | 核心短板概述 | 优先级 |
| :--- | :---: | :--- | :---: |
| **Layout consistency (布局一致性)** | **7.5** | 卡片阴影与内边距在不同配置页有细微视觉差。 | P2 |
| **Table consistency (表格一致性)** | **5.5** | AntD Table 与 Grid 两套引擎的表头风格、行高、聚焦边框割裂。 | **P0** |
| **Form/input consistency (输入一致性)** | **6.0** | 高频 Spreadsheet 录入（脏状态判定）与低频 Parameters（即时保存）逻辑割裂。 | **P1** |
| **Empty state consistency (空状态一致性)** | **5.0** | 缺乏统一的引导空状态，多处直接呈秃顶空表头。 | **P1** |
| **Loading/error consistency (加载遮罩一致性)** | **7.0** | 全局 Spin 与局部网格骨架屏未作统一过渡。 | P3 |
| **Button/action consistency (按钮布局一致性)** | **6.5** | 保存按钮有些在页头，有些在表单底部，有些在页签最下方。 | **P1** |
| **Tag/status color consistency (语义色一致性)** | **7.0** | 产能超载（利用率标红）的阈值逻辑在 Dashboard 与 Capacity 不统一。 | P2 |
| **Unit/currency labeling (单位标示一致性)** | **5.0** | 财务表格缺失统一的 `(Million TWD)` 或 `(SKU Count)` 单位标示，甚至裸露 NaN。 | **P0** |
| **i18n completeness (国际化完整度)** | **8.5** | 翻译包完整度较好，但 Results 子表有局部硬编码。 | P2 |
| **Mobile resilience (窄视口自适应)** | **4.0** | 宽表横向未作统一的滚动包裹，在窄屏幕下表头挤压折行。 | P3 |
| **Workspace permission UX (权限清晰度)** | **5.5** | Viewer 角色虽然隐藏了保存，但未在网格级做硬性 `readOnly` 物理禁用。 | **P0** |
| **Analysis trust presentation (可信度提示)** | **4.5** | AI 报告头部缺乏免责警示水印，且 Proportional Attribution 误表述为强因果。 | **P1** |

---

## 🔍 12 个维度的深度剖析与修补建议

### 1. Table consistency (表格一致性) — 🚨 P0 最优先治理
* **现状评分**：`5.5 / 10`
* **问题例子**：`ProductsSpreadsheetLab` 的 Grid 表格聚焦时是原生粗黑色粗边框，而 Results 下的 `BP Analysis` 表格聚焦时是 AntD Table 的温和淡蓝色。
* **为什么影响成熟度**：在一个系统里共存风格完全相反的两种网格，会给用户强烈的“拼凑山寨”感，无法让企业客户为设计的高溢价埋单。
* **建议解法**：通过 CSS 重写 `react-datasheet-grid` 原生样式，将其表头底色、边框线、悬浮行背景及激活边框与 Ant Design 100% 对齐。

### 2. Form/input consistency (表单/输入一致性) — ⚠️ P1 治理
* **现状评分**：`6.0 / 10`
* **问题例子**：在 `Forecasts` 页面修改数值失焦即触发本地 State 变更，通过页面底部的 [Save] 一次性写入；而在 `Parameters` 页面修改汇率时，部分表单修改直接更新，无需脏状态提示。
* **为什么影响成熟度**：用户无法预测什么时候修改会丢失，什么时候会即时生效，缺乏交互安全感。
* **建议解法**：规范两类录入机制：
  - 高频二维网格录入（Forecasts, BP, Capacity）：强制使用统一的 `DirtyStateActionBar` 和 Discard/Save 打包提交。
  - 低频参数配置（Settings）：即时表单验证，在卡片右上角放置明晰的 [更新 (Update)]。

### 3. Empty state consistency (空状态一致性) — ⚠️ P1 治理
* **现状评分**：`5.0 / 10`
* **问题例子**：当工作空间内没有任何 SKU 销售预测时，`Forecasts` 直接渲染出一个大空行，没有“前往 [Products] 页面添加 SKU”的文字引导。
* **为什么影响成熟度**：首次进入系统（Cold Start）的白屏与空洞会直接劝退业务用户，降低产品的转化率与亲和力。
* **建议解法**：封装统一的 `EmptyState` 组件，传入针对性文案及 [一键跳转 (Go to Action)] 按钮，优雅引导用户跑通首期配置闭环。

### 4. Unit/currency labeling consistency (单位与空值标示) — 🚨 P0 最优先治理
* **现状评分**：`5.0 / 10`
* **问题例子**：Results 下 `BP Analysis` 的 `BP Target` 列，未设置目标的年份单元格直接显示空字符串，有时由于折算公式读取空值导致抛出 NaN 裸露。
* **为什么影响成熟度**：财务决策的最高要求是“精确”和“零歧义”。缺失单位（百万新台币 vs 元）极易发生严重汇率对账事故，NaN 裸露则暴露了代码健壮度不足。
* **建议解法**：
  - 强制全站表格凡是 `ProjectParameters.bpTargets` 的地方全部在表头标示 `(百万新台币)`。
  - 全局捕获 NaN，将 `null` 统一重绘为中性的 `—`。

### 5. Workspace permission UX clarity (权限清晰度 UX) — 🚨 P0 最优先治理
* **现状评分**：`5.5 / 10`
* **问题例子**：Viewer 角色在 `Capacity Lab` 页面中，虽然隐藏了底部的保存，但双击额定产能格子仍能弹起输入光标、允许键盘改字，只是无法点击保存。
* **为什么影响成熟度**：严重违反数据多租户隔离规范。Viewer 误以为自己修改成功了，但刷新后数据复原，造成系统保存故障的严重误解。
* **建议解法**：通过 `UserRole === 'Viewer'` 在 React 网格外层硬性绑定 `readOnly` 属性，在 DOM 层面物理掐断任何聚焦和编辑机制。

### 6. Analysis trust/caveat presentation (可信度与 Caveat 展示) — ⚠️ P1 治理
* **现状评分**：`4.5 / 10`
* **问题例子**：在 AI 风险简报导出（AI Brief Export）时，直接展示了 AI 的文本分析，没有任何“比例分摊数学归因不等于因果因果”的 caveats 水印警告。
* **为什么影响成熟度**：用户容易过度迷信 AI 的归因报告并代替管理层决策，一旦出现投资失误会引来巨大的合规和诉讼纠纷。
* **建议解法**：
  - 统一在分析卡片和 AI 报告头部放置优雅但显眼的 `DataCaveatAlert` (免责和置信度提示框)。
  - UI 全面规范化，将强因果语意（Because of...）换装为客观的数学归因（Contribution Area）。
