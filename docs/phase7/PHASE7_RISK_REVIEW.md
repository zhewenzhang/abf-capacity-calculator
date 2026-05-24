# Phase 7 Excel-like 输入架构多维风险评估报告

本报告针对 **ABF Capacity Calculator** 在 **Phase 7 高频类 Excel 输入架构** 演进中所面临的技术合规性、包体积开销、React 19 渲染并发冲突、以及云端数据库读写成本等关键维度，进行了深度、穿透性的多维风险盘点与评估，并出具对应的架构防御与规避策略。

---

## 一、 核心风险盘点与规避矩阵

在 Phase 7 架构演进中，我们面临以下 6 大主要技术和商业雷区：

### 1. 商业授权法务高压雷区 (License Lawsuit Risk) — 🚨 P0 级特大风险
- **风险描述**：Handsontable 与 AG Grid React Enterprise（企业版）属于**纯商业闭源授权收费**。如果为了获取“填充柄 (Fill Handle)”和“选区 (Cell Selection)”这两个排产人员最爱的高级 Excel 体验，而直接在代码中“白嫖”或绕过它们的 License 校验部署上线，一旦被厂商利用爬虫和特征检索定位，**公司将面临极高金额的版权侵权诉讼与商业索赔风险**，属于毁灭性的法务地雷。
- **防御与规避策略**：**一票否决任何收费闭源框架的引入**！强力推荐 CC 团队使用 **TanStack Table + Virtual** 这一 100% 免费开源、无任何 License 纠纷隐患的 Headless 方案，通过自写约 200 行事件监听代码完全自主可控地平替填充柄交互，从物理层杜绝一切法务雷区。

### 2. 包体积膨胀与性能劣化雷区 (Bundle Size & Loading Bloat) — 🔄 P1 级风险
- **风险描述**：引入如 Univer Sheets 这样完整的网页版 Excel 引擎，其打包后会给前端带来额外数兆 (MB) 的 JS 包体积，导致项目在弱网环境下首屏渲染速度直线下滑，且其自带的重型公式引擎会产生大量冗余的内存开销。
- **防御与规避策略**：
  - Univer Sheets 虽强，但“杀鸡用牛刀”，彻底驳回！
  - 采用 **TanStack Table**，其核心打包体积仅有数十 KB。
  - 对于表格页面，必须采用 **React 18/19 推荐的懒加载 (Lazy Loading & Code-Splitting)**：
    ```typescript
    const ForecastsSpreadsheetLab = React.lazy(() => import('./pages/ForecastsSpreadsheetLab'));
    ```
    仅在用户切入该实验页 Tab 时才动态加载，保障 Dashboard 首页的秒开体验。

### 3. React 19 并发渲染冲突雷区 (React 19 Concurrent Conflict) — 🔄 P1 级风险
- **风险描述**：有些较老的数据表格库（如早期版本的 React-Datasheet-Grid 或老旧的 React 表格组件）在底层严重依赖已被 React 19 废弃的旧生命周期函数，或者与 React 19 的并发模式（Concurrent Rendering）与 `useTransition` 的更新调度发生冲突，导致输入框输入时出现频繁的数据闪烁与页面崩溃。
- **防御与规避策略**：在升级至 `v1.24.0` 之前，必须在 Vitest CI 流水线中引入对表格组件的渲染断言。TanStack 官方对 React 19 提供原生支持，且无 Direct DOM 改写，是避开并发冲突的最优选。

### 4. 物理公式与校验脱敏破损雷区 (Formula & Validation Breaches) — 🚨 P0 级风险
- **风险描述**：类 Excel 输入最大的痛点是批量粘贴 `Ctrl + V`。如果用户直接粘贴进只读的计算格（如良率估算 yieldEstimate 或 UPP 计算），可能导致系统公式被覆盖破坏；或者粘贴了带有非法文字的脏数据，引发系统底层的 `calculationEngine.ts` 物理模型崩溃报错。
- **防御与规避策略**：
  - **物理写隔离**：在自研 Table Columns 定义中，只读列的 `cell.isEditable` 必须锁死为 `false`，任何 paste 行为只能在纯属性参数列（如 chipLength, unitPrice）中生效，派生数据列强制由计算引擎只读生成，绝不接收值覆盖。
  - **粘贴级实时校验**：表格 local state 级别绑定 `validateSKU` 方法，非法粘贴单元格瞬间变红警告，阻止脏数据强推 Firestore。

### 5. Firebase Save Model 写入放大与资费暴增雷区 (Save Cost amplification) — 🔄 P1 级风险
- **风险描述**：如果将表格设计为“失焦即保存 (Auto-save on Blur)”— 即每填完一个单元格，就往 Firestore 发送一次 `updateDoc`。当排产人员用填充柄横向拉动 24 个月份时，系统会在瞬间并发向 Firestore 发送数百次 `update` 写入命令！这会不仅导致极高频的系统请求网络卡顿，且会导致 **Firebase 写入额度瞬间耗尽，带来难以承受的云端计费暴增**。
- **防御与规避策略**：
  - **锁死自动保存，引入两级脏状态管理**：表格数据高频操作完全在 React local state 中响应。
  - 页面顶部提供显眼的「未保存修改」橙色提示徽章，只有用户录入完毕确认无误、并手动点击**「保存 / Save」**按钮时，才通过 `batchSave` 在一个 transaction 事务中一键推向数据库。这不仅能提供零延迟的极致录入，而且可以将写入次数物理级缩减为 `1 次/Save`，极度安全。

### 6. Ant Design 视觉一致性冲突雷区 (AntD Visual Breakdown) — 📝 P2 级风险
- **风险描述**：像 Handsontable 这样自带完整渲染主题的框架，其自带的输入框样式、下拉选择器完全是传统的 Excel 风格，与我们 ABF Calculator 既有的 Ant Design 6 精美的 glassmorphism 与暗色主题格格不入。
- **防御与规避策略**：采用 Headless 架构的 **TanStack Table**。由于其不带任何样式和内置 DOM 控制，我们能够直接嵌套 AntD 的 `<Select>`、`<InputNumber>` 组件作为 Cell Editor，完美实现与 Results / Dashboard 页面的 100% 视觉对齐。
