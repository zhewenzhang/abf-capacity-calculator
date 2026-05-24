# CC 开发任务包 Pack 1 极客 Prompt (Direct Copiable Prompt)

本文件是将 **Pack 1：Low-risk visual consistency (低风险视觉一致性)** 整理而成的、可直接复制派发给协同开发团队 (CC) 或其 AI 前端助手运行的高标准开发指令。

---

## 📋 可直接复制的 Prompt 文本 (Direct Copiable Prompt)

```text
你现在是一名资深的前端开发工程师，正在参与 ABF 产能计算器项目的 v1.26.0 前端重构。

【本任务核心】：Pack 1 - 全站低风险视觉一致性 (Visual Parity 规范化)

【硬性红线与工作边界】：
1. ❌ 绝对禁止修改、污染任何核心计算公式 calculationEngine.ts 及下游 Results 运算逻辑。
2. ❌ 绝对禁止修改、触碰 firestore.rules 安全规则，严禁更改 Firestore API 数据存取与服务层逻辑。
3. ❌ 绝对禁止升级任何 package 依赖版本或进行物理 Hosting 部署，保持 package.json 零改动。
4. 📁 本任务纯属【前端 UI 展现层与全局样式重置】，严防任何数据流或自动化测试用例的破坏。

【详细开发任务】：

任务 1：重写 react-datasheet-grid 样式，实现与 Ant Design Table 视觉一致
- 在项目全局 CSS 样式表（如 index.css 或新建公共网格覆盖文件）中，使用 CSS Class 重置 react-datasheet-grid 的原生样式，确保：
  - 表头（Header）的背景色统一修改为 Ant Design Table 的浅灰色：`#fafafa`。
  - 表头文字：字体大小 `14px`，加粗，文字颜色统一使用 `rgba(0, 0, 0, 0.88)`。
  - 悬浮行（Hover Row）背景色：增加微小渐变，统一使用淡雅的灰色 `#fafafa` 或 HSL 精调淡灰。
  - 单元格聚焦/选中（Focus / Selection Border）：彻底剔除原生的粗黑色聚焦框，聚焦边框物理修改为 Ant Design 主蓝色 `#1677ff`，且线宽与 AntD 样式一致。
  - 只读状态硬隔离：为 react-datasheet-grid columns 声明中引入的 textColumn、floatColumn、intColumn 增加 `disabled: !writable` 判断，且在 `DataSheetGrid` 顶层绑定 `lockRows={!writable}` 属性（writable 通过 `canEdit(scope.role)` 判断传入），彻底死锁只读用户的本地编辑光标与粘贴机制。

任务 2：封装并导入通用 EmptyState 组件，替换光秃空列表
- 在 `frontend/src/components` 下新建通用原子组件 `EmptyState.tsx`。
- 该组件需采用 Ant Design `Empty` 为内核，Props 接口定义如下：
  ```typescript
  interface EmptyStateProps {
    description: string;      // t() 翻译文案，用于指示当前为空的具体业务背景
    actionText?: string;     // 一键跳转/引导添加按钮的翻译文本
    onAction?: () => void;   // 按钮点击回调函数（如跳转到产品录入页）
  }
  ```
- 视觉规范：支持优雅的渐入微动画，按钮采用 AntD 默认的 Primary 风格。
- 应用场景：当 Forecasts 年份数据为空、或 Products 列表为空时，强制剔除原本秃头裸露的空表格，优雅换装渲染此 `EmptyState` 引导卡。

任务 3：全局卡片（Card）内边距与阴影归一化
- 盘点 `Parameters.tsx`、`CalculationResults.tsx` 及 `Dashboard.tsx` 页面中的卡片（Card）外框，将其投影统一替换为轻量级、高级感投影变量：
  `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);`
- 统一卡片的 `padding` 变量，普通卡片设为 `24px`，小卡片或统计卡片设为 `16px`。
- 【排版红线】：全局检索并强行剔除任何“在 Card 内部嵌套子 Card”的割裂排版。

【防退回静态校验规程】：
1. 运行 `git status` 确保没有任何 dataService 或是 test.ts 被修改。
2. 运行 `npm run lint` 验证无代码规范和类型报错。
3. 运行 `npm run test` 确保 401 项 Vitest 测试全绿通过，0 单元测试回归破损。
```
