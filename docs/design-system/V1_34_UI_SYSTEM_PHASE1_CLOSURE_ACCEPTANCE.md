# v1.34.0 UI System Phase 1 Closure (Parameters / Login / Setup) 只读验收清单

本文件为 `v1.34.0` 版本的只读验收清单，用于在 CC 完成参数设定页 (Parameters)、登录页 (LoginPage)、初始化配置页 (SetupPage) 样式标准化以及 README 版本日志补齐后，进行严格的旁路只读验收。

## 一、 验收判定标准与红线保护 (Gatekeeper Rules)

在进行任何详细验收前，必须首先校验以下只读边界与安全性红线。若有任何违反，判定为 **Fail** 且必须打回重做：

- [ ] **红线 1：未修改核心计算与业务逻辑**
  - `frontend/src/core/calculationEngine.ts` 及其产出、公式逻辑 100% 原始，无任何修改。
- [ ] **红线 2：未修改服务层与数据流逻辑**
  - `frontend/src/services/parameterService.ts`、`forecastService.ts` 等服务层逻辑 100% 原始。
  - 参数加载 (`getParameters`) 与保存 (`saveParameters`) 的底层逻辑、Firestore 交互格式不被修改。
- [ ] **红线 3：未修改安全规则与后端配置**
  - `firestore.rules` 绝对未被修改。
- [ ] **红线 4：还原预设值 (Restore Defaults) 业务安全保障**
  - 校验 `Parameters.tsx` 中 `handleRestoreDefaults` 函数，确保在重置良率、基板参数为系统默认值时，**绝对不能清空或覆盖营业目标 (bpTargets)**。必须完整读取原参数的 `bpTargets` 并在 defaults payload 中原样写回。
- [ ] **红线 5：LoginPage 登录与 Firebase Auth 流程隔离**
  - LoginPage 的 UI 包装不会影响 `signInWithGoogle` 的底层调用、异步状态及异常捕获逻辑。
- [ ] **红线 6：SetupPage 初始化说明文档内容完整性**
  - SetupPage 仅做 UI 美化，所有的初始化步骤 (Step 1 - Step 6) 文字说明与 `.env` 环境变量模板绝对未被缩减或遗漏。

---

## 二、 页面 UI 标准化验收细节

### 1. Parameters.tsx (参数设定页)
- [ ] **容器与页头规范**：
  - 根容器是否已包裹为 `<div className="abf-page">`。
  - 顶部是否导入并应用了统一的 `<PageHeader>`，包含正确的面包屑、标题及副标题。
- [ ] **ActionBar 整合**：
  - 顶部的“保存参数”及“还原预设值”按钮组，是否已完美重构并集成到统一的 `<ActionBar>`（或 PageHeader actions）中。
  - 还原预设值的按钮是否保留 `<Popconfirm>` 确认弹窗，文案与逻辑无退化。
  - 只读模式 (`!writable`) 下，ActionBar 中的操作按钮应被正确 `disabled`。
- [ ] **卡片与布局结构**：
  - 良率矩阵、基板设计参数、币别与汇率设定、营业目标跳转卡片是否统一使用 `<Card className="abf-card">` 或 `<SectionCard>`。
  - 模块间距是否符合系统级 CSS 规范 (24px)。
- [ ] **良率矩阵与汇率 Table 样式**：
  - 良率矩阵 Table 是否使用系统级 Table 规范，移除 ad-hoc 边框硬编码。
  - 常数汇率/年度汇率 Table 中的 `<InputNumber>` 组件样式是否对齐，未发生超出卡片边缘的溢出 (Overflow) 现象。
- [ ] **营业目标跳转卡片 (BP Targets Redirect Card)**：
  - 样式是否套用 dashed border (1px dashed #d9d9d9) 且内边距与其余卡片保持一致，引导按钮功能正常。

### 2. LoginPage.tsx (登录页)
- [ ] **UI 视觉跃升**：
  - 移除硬编码的 `#f0f2f5` 背景色，改用设计系统全局背景色变量。
  - 卡片使用精美微阴影，文字排版使用设计系统 Typography。
- [ ] **Google 登录按钮**：
  - 登录按钮样式精美，包含 Google Icon，加载状态 (`loading`) 动画与置灰状态工作正常。
- [ ] **错误提示**：
  - 登录失败时的 `<Alert>` 错误信息框布局美观，未破坏卡片高度与整体居中结构。

### 3. SetupPage.tsx (初始化配置页)
- [ ] **响应式居中布局**：
  - 页面结构采用最大宽度 (`maxWidth: 800`) 和居中排版，移除临时 margin 硬编码。
- [ ] **代码高亮块 (Env Pre template)**：
  - 环境变量展示框 (pre) 使用设计系统的中性灰底色及圆角规范，支持横向滚动，防止长行破坏布局。
- [ ] **状态图标**：
  - 顶部的 Result 状态警告图标 `<WarningOutlined />` 渲染尺寸与颜色规范。

---

## 三、 版本同步与文档闭环

- [ ] **package.json 版本号**：
  - `frontend/package.json` 中的 version 字段已递增为 `"1.34.0"`。
- [ ] **package-lock.json 完美同步**：
  - 在修改版本号后，CC 必须在 `frontend/` 目录下执行 `npm install`（或 equivalent）以确保 `package-lock.json` 中所有的版本标头完美对齐为 `"1.34.0"`，无 package-lock 滞后现象。
- [ ] **Snapshot APP_VERSION 同步**：
  - `frontend/src/services/snapshotService.ts` 中的 `APP_VERSION` 变量已同步修改为 `'v1.34.0'`。
- [ ] **README.md 发布日志完整性**：
  - 彻底终结 README 文档滞后债务。README.md 的 Release History 必须完整补齐以下三个版本的变更说明与发布日期：
    - `v1.32.0 (Products / Forecasts / Capacity UI Standardization)`
    - `v1.33.0 (Data Trust / NaN / Empty / Unit Display Standardization)`
    - `v1.34.0 (UI System Phase 1 Closure - Parameters / Login / Setup)`

---

## 四、 自动化保障与构建校验

在完成 UI 代码走查后，必须在终端执行以下三条指令，确保代码的绝对健壮：

1. **单元测试校验**：
   - 执行 `npm run test`
   - 要求：445+ 个单元测试 100% Passed，不能引入任何由 UI 重构或版本更新导致的回归错误。
2. **代码风格检查**：
   - 执行 `npm run lint -- --quiet`
   - 要求：**Zero ESLint Warnings**，不能有任何未使用的 import、硬编码未用变量等。
3. **生产环境打包**：
   - 执行 `npm run build`
   - 要求：编译打包顺利完成，无任何 TypeScript 类型编译报错。
