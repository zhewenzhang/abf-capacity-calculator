# v1.27.0 UI 一致性只读验收报告

本报告针对 v1.27.0 (包含 commit `f668b48` 及 `edd25bf`) 的前端 UI 视觉与一致性优化进行**独立只读审计与验收**。

---

## 一、 验收结论

### 结论评估：**Conditional Pass（条件性通过）**

> [!NOTE]
> **评估摘要**：
> v1.27.0 在 UI 视觉的一致性、基础组件标准化、国际化完整性以及性能安全性上做出了极佳的质量提升。
> 所有的 433 项前端自动化单元测试均无瑕疵通过，ESLint 及 Vite 打包在生产环境下能实现 100% 无错误编译。
> 评定为 **Conditional Pass** 的唯一原因是在样式包裹结构上存在一处微小的规范遗漏（`CapacitySpreadsheet.tsx` 未被 `.spreadsheet-wrapper` 容器包裹），该遗漏可能导致小屏幕或极端视口下的横向水平滚动条展现不一致，但不影响标准视口渲染。本报告已在下文给出了简明的修复建议。

---

## 二、 8 项关键核对指标审计详情

### 1. v1.27.0 是否只做展示层
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   经深入代码 Diff 验证，本版本所修改的文件完全处于 UI 渲染、页面骨架及样式微调层面。
    *   移除了 `ForecastsSpreadsheetLab.tsx` 中的本地 inline 样式块，并将其解耦、标准化地集成到了全局的 `index.css` 样式表中。
    *   没有引入任何具有副作用的外部计算脚本或改变现有组件 state 的业务处理函数。

### 2. 是否没有修改 services、core formulas、Firestore rules
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   **核心计算公式 (Core Formulas)**：`frontend/src/core/` 目录下的所有核心逻辑文件（如分摊归因、数据校验等）在此次发布中均**未受到任何物理修改**。
    *   **服务层 (Services)**：除 `snapshotService.ts` 进行了纯静态的 `APP_VERSION = 'v1.27.0'` 字符串声明更新外，没有对读写、缓存、数据加工的任何业务方法进行修改。
    *   **数据权限规则 (Firestore rules)**：`firestore.rules` 及其对应的测试在发布中**完全保持原样，未经任何篡改**。
    *   **测试通过度**：本地执行 `npm run test`，所有涉及 core、services 及 firestoreRules 的 25 个测试文件、共 **433 项自动化测试均完美通过**，有力地佐证了底层逻辑的安全无损。

### 3. Spreadsheet grid 样式是否统一
*   **审计结论**：**Conditional Pass（需要轻微的结构对齐）**
*   **事实剖析**：
    *   **样式覆盖 (index.css)**：网格的全局覆盖非常成功，它以非常温和且规范的优先级，将 `react-datasheet-grid` 完美统一至 **Ant Design 视觉规范**：
        *   **Header background**：修改为 `#fafafa !important`，保证视觉上与 AntD 标准 Table 组件无二。
        *   **Active cell box-shadow**：采用标准 AntD primary 蓝 (`#1677ff !important`)，让选中状态具有高饱和度且现代感的呼吸焦态。
        *   **Dirty cell (脏数据单元格)**：改为 `#fffbe6` 暖黄背景及 `#faad14` 警告边框，极其自然地传达出“未保存”的安全警示。
        *   **Disabled (只读单元格)**：重置为 `#fafafa`，前景色转为淡灰，实现了极佳的视觉减负。
    *   **一处结构性不一致 (待优化建议)**：
        *   在 `ForecastsSpreadsheetLab.tsx` 和 `ProductsSpreadsheetLab.tsx` 中，`DataSheetGrid` 组件的外部均增加了 `className="spreadsheet-wrapper"` 的包裹 div，使得多列排版具备了响应式的优雅横向滚动保护能力。
        *   然而在 `CapacitySpreadsheet.tsx` (L274 和 L294) 中，`DataSheetGrid` 却**直接裸露在 AntD Tabs.TabPane 下**，未能应用上 `.spreadsheet-wrapper` 样式。
        *   由于 Capacity 表格也包含 13 列的宽幅数据，该缺憾导致在中窄视口下，三个 Spreadsheet 实验室页面的滚动行为呈现出局部的不一致性，易出现表格右缘布局截断的潜在风险。

### 4. EmptyState 是否合理
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   引入了全新的展示组件 `EmptyState.tsx`。
    *   底层完全基于 Ant Design 的 `Empty` 机制构建，拥有优雅的 `Typography.Title` (level 5) 和 `Typography.Paragraph` (secondary)，不仅在组件库内部是 100% 原生的，而且比之前的原始粗糙的 `Alert` 提示框更有设计美感、排版留白也更合理（高度符合 `empty-state-container` 统一提供的 `48px 24px` 的 padding 约束）。
    *   同时，该组件还支持传递 action 交互按钮（`actionLabel`、`onAction`），为未来直接跳转“添加数据”等高价值的用户行为预留了良好的扩展插槽。

### 5. PageLoading 是否一致
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   废除了以前杂乱无章的 inline `<div style={{ textAlign: 'center' }}>Loading...</div>` 或 `Spin` 布局。
    *   统一封装并全局应用了具备 ARIA 无障碍辅助特征的 `<PageLoading />` 容器组件 (`role="status"`, `aria-live="polite"`)，内置 Flex 居中、`minHeight: 320` 的布局，在各大模块的异步加载呈现上表现出完美、宁静、高度一致的视觉过度体验。

### 6. 是否存在 i18n 或 hardcoded copy 问题
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   在 `CapacitySpreadsheet.tsx` 和 `ForecastsSpreadsheetLab.tsx` 引用 `EmptyState` 时，其所需的 `title` 和 `description` 属性全部由 i18n 系统所翻译的 `t(...)` 安全传入，不包含任何英文/中文字符的硬编码克隆。
    *   更值得称赞的是，通过引入统一的 `PageLoading`，成功将之前在 `ProductsSpreadsheetLab.tsx` 中直接硬编码的非国际化文字 `"Loading..."` **彻底清除**，有效地改善了项目的 Repo Hygiene。

### 7. 是否有 CSS class collision 或 react-datasheet-grid upgrade 风险
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   **CSS Class Collision**：所有对 Grid 样式的修改完全限定在 `.dsg-` 前缀名之下（如 `.dsg-container`，`.dsg-cell` 等），这是 `react-datasheet-grid` 第三方类库专有的命名空间。因此它被牢牢地限制在了 grid 表格树内，绝对不会对系统外普通的卡片、标准表格造成任何副作用或全局样式冲突。
    *   **Upgrade 风险**：`frontend/package.json` 中的 `"react-datasheet-grid"` 依然保持在原来的 `"^4.11.6"` 版本。这意味着本次升级仅采用了外置 CSS 覆盖覆盖层，而不是物理升级核心 node 包，从而完美避开了库大版本升级破坏核心功能的极高风险，该处理体现出极其稳健的防御性研发理念。

### 8. package-lock version 是否已同步（CC 同步性）
*   **审计结论**：**Pass**
*   **事实剖析**：
    *   在本次拉取 origin/main 后审计发现，`edd25bf` commit 中已特别针对 package-lock 进行了升级，同步将 `"version"` 由 `"1.24.1"` 同步修订为 `"1.27.0"`，使其与 `package.json` 的标记**达成了 100% 物理同步**。
    *   该指标验收通过，不包含任何 P1 等级的仓库同步隐患。

---

## 三、 对未来版本的技术优化建议 (Technical Debt & Alignment Suggestions)

为了实现完美的 UI 一致性与极致的工程质量，我们强烈建议在下一个小版本（如 v1.27.1 或 v1.28.0）中，对以下 Conditional Pass 遗留项进行一句话修复：

### 1. CapacitySpreadsheet 表格包装对齐
在 [CapacitySpreadsheet.tsx](file:///D:/abf-capacity-calculator/frontend/src/pages/CapacitySpreadsheet.tsx) 文件的 Tab 渲染处，建议使用 `.spreadsheet-wrapper` 对两处 `DataSheetGrid` 进行包裹，代码改造示例如下：

```diff
       children: (
+        <div className="spreadsheet-wrapper">
           <DataSheetGrid<CapacitySheetRow>
             value={coreRows}
             onChange={handleCoreRowsChange}
             columns={columns}
             rowHeight={36}
             height={gridHeight}
             lockRows={true}
             cellClassName={buildCellClassName('core')}
           />
+        </div>
       ),
```

该微调可保证在低分辨率的笔记本屏幕或外接窄视窗中，拥有跟 Predictions 与 Sku 实验室完全统一的水平滚动机制。
