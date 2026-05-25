# v1.35.0 Data Quality Visibility — 只读发布验收报告 (Release Review)

## 一、 发布审查结论

- **发布验收判定**：**Conditional Pass (有条件通过)** ⚠️
- **依赖锁档同步状态**：**未同步 (滞后)** ❌
  - `package.json` 升版为了 `"1.35.0"`。
  - 但 `package-lock.json` **未同步**，依然滞后在 `"1.34.0"`，CC 忘记在本地执行 `npm install` 以同步锁档。
- **README 版本日志状态**：**未更新** ❌
  - `README.md` 漏掉了本轮 `v1.35.0 (Data Quality Visibility)` 的 Release notes。
- **是否需要 v1.35.1 Hotfix**：**否**。但必须在合入 main 之前通过一个同步 commit 修复 package-lock 与 README 债务。
- **是否存在 P0/P1 问题**：**0 个**。
- **是否可 merge main**：**否 (No)**。必须先在 AGY 分支由 CC 补充提交锁档同步和 README 变更，然后才能合入 main。
- **是否需要 deploy**：**否**。在只读阶段无需进行任何托管部署。

---

## 二、 核心安全红线与隔离校验 (红线隔离)

经对比 521106f 提交，本版本完美守住了核心安全红线，数据隔离层表现极佳：

- [x] **红线 1：零持久化污染 (Zero DB Write)**
  - 数据质量警示纯粹通过 `<DataQualityBadge>` 和 `<DataQualityAlert>` 在前端 DOM 级做局部渲染与 Tooltip 悬浮展现。
  - **绝对没有**将任何 DQ 诊断出的错误状态写回可编辑的 state，也**绝对没有**通过服务层持久化到 Firestore 数据库。
- [x] **红线 2：未重写或复制诊断逻辑**
  - 五大页面全部统一引入并调用 `core/dataQuality.ts` 共享诊断引擎，且新增了 `dataQualityVisibility.ts` 纯 helper 函数，专门用来在内存中过滤 Domain issues，代码复用极其优雅。
- [x] **红线 3：Viewer 角色 true read-only 隔离**
  - 当使用 Viewer 只读角色访问系统时，所有的红色 Error 图标、黄色 Warning 图标、Alert 警示横幅与 Tooltip **完美 100% 展示**，且所有的单元格输入框与保存/重置按钮依然**严格保持 disabled 置灰**，只看不能改，符合高安全等级设计。

---

## 三、 性能与渲染防线校验 (性能红线)

- [x] **防线 1：避免在 Cell Render 中高频计算 DQ (性能完美)**
  - 在 `Products.tsx` 与 `Forecasts.tsx` 中，CC 极其优秀地利用了 `useMemo` 缓存机制，在页面加载时一次性计算出全量数据质量汇总 `dqSummary`，并利用 useMemo 在 O(N) 复杂度下建立了 `skuDqIssuesMap` 映射。
  - 在 Table column cell render 时，直接通过 `skuDqIssuesMap.get(record.id)` 进行 O(1) 级的哈希检索，**完美避开了在单元格渲染循环中高频重复跑全表 `buildDataQualitySummary`** 的超级性能陷阱，交互响应极其敏捷。

---

## 四、 页面级 DQ Visibility 警示覆盖性审查

五大输入页面前移 Visibility 的覆盖度 100% 达标：

1. **Products.tsx**：
   - 生产属性缺失的 SKU 首列成功渲染红色 `<ExclamationCircleOutlined />` 并通过 Tooltip 详细显示缺失属性；
   - 零价格 SKU 和不支持的币别在价格单项上成功渲染黄色 Warning。
2. **Forecasts.tsx**：
   - 孤儿预测 SKU 行首高亮警告，Tooltip 提示缺失关联；零价格预测单元格完美高亮并提示；顶部成功展现 `DataQualityAlert` 面板过滤展示 `'forecast'` 域的问题。
3. **CapacityPlan.tsx**：
   - 存在预测需求月份而系统缺失产能配置时，页面顶部 ActionBar 下方成功展现红色 Alert 警示栏，清晰罗列缺失产能配置的月份（如：2026-06）。
4. **BpTargets.tsx**：
   - 跨表脱节年份（有目标无预测，或有预测无目标）时，对应年份表头旁边成功展示了黄色警告图标 `<WarningOutlined />` 并通过 `<Tooltip>` 显示具体分析细节。
5. **Parameters.tsx**：
   - 缺失 constant/yearly 汇率配置时，在“币别与汇率设定”Card 标题旁高亮红色 Exclamation 图标，并在 Card 内部直接渲染 error 级的 Alert，效果卓越。

---

## 五、 i18n 多语言规格校验

- [x] 新增的警示警报多语言配置 `dq.currencyRateMissing.title` 和 `dq.currencyRateMissing.tooltip` 已经在 `en.ts` 和 `zhTW.ts` 中**完美对齐**。
- [x] 表格、Tooltip 与 Alert 统一调用 `t(...)` 函数，无任何硬编码的中文/英文，翻译表达流利、专业。

---

## 六、 自动化验证结果

- **单元测试 (`npm run test`)**：**Pass (通过)** ✅
  - 全量 510/510 Passed。包含了 CC 新增的专用于测试 Visibility Helper 逻辑的 `dataQualityVisibility.test.ts` (15 个用例)，覆盖非常充沛。
- **风格检查 (`npm run lint -- --quiet`)**：**Pass (通过)** ✅
  - ESLint **Zero warnings**，无任何拼写、未使用 import 或规范降级。
- **生产环境打包 (`npm run build`)**：**Pass (通过)** ✅
  - Vite 编译和打包快速通过 (built in 1.44s)，无任何打包及 TS 类型编译报错。

---

## 七、 详细问题记录与反馈

### P0 (阻断级/崩溃) 问题：
- *无*

### P1 (体验严重受损/性能) 问题：
- *无*

### P2 (版本与依赖锁不一致) 问题：
1. **package-lock.json 滞后** ❌：`package.json` 中的 version 为 `"1.35.0"`，但 `package-lock.json` 未执行同步更新，依然为 `"1.34.0"`。
2. **README 日志滞后** ❌：`README.md` 的 Release history 未更新本轮 `v1.35.0` 的发布日志。

*整改建议*：CC 必须在 `agy/ui-system-visual-qa` 分支上，在本地的 `frontend/` 目录下执行 `npm install` 以自动同步 package-lock，并在 `README.md` 中补齐 v1.35.0 的 Release Notes 提交 push 后，本轮验收方可正式升级为 **Pass** 并批准 merge main。
