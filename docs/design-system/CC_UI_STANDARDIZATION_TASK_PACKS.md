# CC UI 标准化开发任务包 (CC UI Standardization Task Packs)

为了帮助开发团队 (CC) 能够以最快速度、最低风险、高内聚的形式落实 UI 规范，特将全系统 UI 标准化拆解为以下 **4 个可独立交付的任务开发包**。

---

## 📦 Pack 1：Low-risk Visual Consistency (低风险视觉一致性)

### A. 任务详情表
- **目标**：实现全系统表格样式的视觉 Parity 统一，补齐全局空状态（Empty）与间距（Spacing）变量，不改变任何数据流。
- **Scope (范围)**：
  - 重写 `react-datasheet-grid` 的原生表头、聚焦边框、Hover行 CSS 样式。
  - 将所有 Ant Design Table 和网格表头的视觉表现与 AntD 样式 100% 对齐。
  - 导入原子级 `EmptyState` 组件，替换 Products 及 Forecasts 页面中的秃头空列表。
- **禁止事项**：
  - 严禁修改任何 `.test.ts` 中的数据层断言，严禁修改 Firestore 存取逻辑。
- **涉及页面**：Products Spreadsheet Lab、Capacity Lab、Forecasts (空状态)、Products 主页。
- **测试建议**：
  - 在大屏幕及中等屏幕视口下检查 Grid 与 AntD Table 表头字号、底色是否完美一致。
  - 清空个人空间产品，检查 `EmptyState` 跳转引导按钮是否正常亮起。
- **完成报告格式**：
  - 1. 修改的 CSS 文件及重写类。
  - 2. 新增的 Empty 引导功能及截图。

### B. 💾 可直接复制派发给 CC 的 Prompt：
```text
请执行 Pack 1：低风险视觉一致性重构。

【硬性约束】：不修改任何数据流，不修改 test.ts，不升版，不部署。

【开发任务】：
1. 在全局 css 文件中重写 `react-datasheet-grid` 样式类，使其表头底色采用 AntD Table 的浅灰色（#fafafa），悬浮行 Hover 背景采用 #fafafa，选中聚焦边框采用 AntD 主蓝色（#1677ff）。
2. 在 `frontend/src/components` 下开发 `EmptyState.tsx` 统一空状态引导组件，当 Products 主表或 Forecasts 表格为空时，渲染该 Empty 引导卡，并提供跳转到对应添加页的 action 按钮。
3. 检查 Dashboard 指标卡片的 box-shadow 与 Settings 配置卡片的 padding 间距，统一归一化为 CSS 变量。
```

---

## 📦 Pack 2：Save/Discard and Dirty State Consistency (录入状态大统一)

### A. 任务详情表
- **目标**：将项目中所有具录入功能的 Lab 页面，其顶层保存、丢弃以及“未保存修改”提示条进行底层状态机与 UI 动作条大合并。
- **Scope (范围)**：
  - 开发公共分子级组件 `DirtyStateBar.tsx`。
  - 为 Products Spreadsheet Lab、Capacity Lab、BP Targets 统一装备该公共脏状态条。
  - 实现路由拦截组件（Router Guard），当用户处于脏状态尝试切换左侧菜单时，强行弹出精美自定义 Modal 拦截。
- **禁止事项**：
  - 严禁擅自缩短 Discard 回滚的重置逻辑，防止出现缓存不清理。
- **涉及页面**：Products Spreadsheet Lab、Capacity Lab、BP Targets 独立页、Forecasts Lab。
- **测试建议**：
  - 故意修改某个格子，检查 DirtyStateBar 是否瞬间灵敏浮现。
  - 不保存，尝试点击左侧 Dashboard 菜单，确认是否成功弹出路由拦截对话框，点击“确定离开”后是否丢弃修改，点击“取消”是否留在本页。
- **完成报告格式**：
  - 1. 公共 Dirty 组件 Props 及 Router Guard 注册代码片段。
  - 2. 脏状态路由强退拦截测试通过截图。

### B. 💾 可直接复制派发给 CC 的 Prompt：
```text
请执行 Pack 2：Save/Discard 与 Dirty 状态统一重构。

【硬性约束】：只重构 UI 动作条与路由拦截逻辑，不改动后端 API 物理服务层。

【开发任务】：
1. 封装通用 `DirtyStateBar.tsx` 和 Hook `useDirtyState`，使所有 Lab 输入表格的数据修改后，均调用该 Hook 统一控制 Dirty 提示条的浮现、[Save] 按钮的 Validation 亮起、及 [Discard] 的物理回滚。
2. 封装 `RouterGuard.tsx`，监听 React Router 导航切换。若当前工作空间表单 `isDirty === true`，强行拦截跳转并弹出 AntD 风格的二次确认 Modal：“您有未保存的产能/销售设定，确定要丢弃并离开吗？”。
3. 将此公共交互无缝应用于 Products Spreadsheet Lab 和 BP Targets。
```

---

## 📦 Pack 3：Unit/Currency/Field Naming Cleanup (命名与单位清洗)

### A. 任务详情表
- **目标**：彻底清洗全系统表格表头中的硬编码中英文，统一表格数值靠右对齐、NaN 捕获、以及 Million TWD 等核心财务物理单位标示。
- **Scope (范围)**：
  - 将 Results 及 Dashboard 所有表头的中文/英文拉取到 `en.ts` / `zhTW.ts` 中。
  - 全局审查表格渲染，凡是 TWD 的地方均在表头显式括号注明 `(百萬新台幣)` 或 `(Million TWD)`。
  - 统一全产品表格数值列 **靠右对齐 (tabular-nums)**，文本列靠左对齐。
  - 全局捕获计算引擎空值，将 `null` 渲染为 `—`。
- **禁止事项**：
  - 严禁修改 calculationEngine.ts 计算公式算式，只更改 UI 表头及格式化。
- **涉及页面**：Results (Capacity Results / Revenue Results)、Dashboard、BP Targets。
- **测试建议**：
  - 切换中英文，扫描全表看是否有英文硬编码残留。
  - 故意不填某年份 BP 目标，检查 Results 表格相应单元格是否优雅呈现 `—`，是否有 NaN 溢出。
- **完成报告格式**：
  - 1. en.ts/zhTW.ts 新增翻译键列表。
  - 2. 靠右等宽对齐 CSS 配置。

### B. 💾 可直接复制派发给 CC 的 Prompt：
```text
请执行 Pack 3：命名与单位全局清洗。

【硬性约束】：严禁修改底层 Calculation 核心计算公式算式，只允许对 UI 展示层进行 i18n 规范化及对齐调整。

【开发任务】：
1. 将 Results 所有子页面的 AntD Table 列配置（columns）中的 title 属性全部换装为 `t('changeReview.columns.*')`。
2. 在所有涉及汇率折算与 BP 目标的表格表头中，统一通过 i18n 显式追加 `(百萬新台幣)` 或 `(Million TWD)` 物理单位标示。
3. 全局统一表格格式：文字一律 text-align: left；数值一律 text-align: right，并绑定 font-variant-numeric: tabular-nums 等宽字体。
4. 在表格渲染函数中增加守卫：若数据为 null，统一渲染为 `—` (灰色短横线)；防范 NaN 泄漏。
```

---

## 📦 Pack 4：Analysis Trust Presentation (分析可信度与 caveats 提示)

### A. 任务详情表
- **目标**：规范全产品 AI 导出与差异分析中的数据置信度标识与免责声明，消除数学比例归因混淆。
- **Scope (范围)**：
  - 开发公共 `DataCaveatAlert.tsx` 提示组件。
  - 在 Results 页头常设置信度明示条（“本分析基于 deterministic 逻辑，非 AI 幻觉，100% 数据可追踪”）。
  - 在 AI Brief Export 头部及导出文本中强制渲染免责声明水印。
  - 审查并治理翻译包文案，将“因……导致”换装为中性的“占比贡献度”。
- **禁止事项**：
  - 严禁删除任何有益的差异高亮算法。
- **涉及页面**：Results 页面顶部、AI Brief Export 区域、Snapshot Change Review 头部。
- **测试建议**：
  - 点击 AI Brief Export，检查导出的文本首尾是否被强行加入了置信度警告水印。
  - 检查 Results 页头是否优雅露出了确定性计算声明。
- **完成报告格式**：
  - 1. DataCaveatAlert 实现截图。
  - 2. 导出报告中水印文案展示。

### B. 💾 可直接复制派发给 CC 的 Prompt：
```text
请执行 Pack 4：分析可信度与数据 caveat 提示框标准化。

【硬性约束】：确保高管用户对数据确定性有绝对知情权，不侵入核心高亮算法。

【开发任务】：
1. 封装公共提示组件 `DataCaveatAlert.tsx`。当 `type === 'deterministic'` 时，渲染精致的蓝色卡片：“本分析基于 deterministic 确定性运筹，非 AI 幻觉生成，数据真实可追踪”；应用于 Results 所有分析表上方。
2. 当 `type === 'ai-generative'` 时，渲染橙色警告框，说明 AI 归因结论不作为直接投资建议。
3. 在 AI Brief Export 的生成 Prompt 模板中，在首尾强行嵌入地道繁体中文免责警告水印，防止高管用户盲信决策自动化。
4. 全面审查 zhTW.ts / en.ts 的分析翻译字典，将强因果词汇“因……导致”重构为客观的数学“缺口分攤占比”或“貢獻度”。
```
