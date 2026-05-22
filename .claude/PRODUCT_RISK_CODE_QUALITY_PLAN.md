# Product-Risk Code Quality Plan

**计划版本**: v1.1  
**制定日期**: 2026-05-21  
**基于状态**: v1.14.4  
**最后修订**: 基于真实 repo 状态校正

---

## Executive Summary

当前 ABF 产能计算器正处于功能稳定期，**数据正确性**和**部署稳定性**是最高优先级。原计划过度强调工程整洁，偏离了产品真实风险。

**真实检查结果**:
- `npm run lint`: 156 problems (148 errors, 8 warnings)，`no-explicit-any` 是 error 级别
- Firebase 配置 (`firebase.json`, `.firebaserc`) **确实缺失**
- `frontend/code_trans_keys*.txt` **当前不存在**，但需防止再次出现
- `.claude/` **尚无 tracked files**，可正常通过 `.gitignore` 防护
- 根目录有 `.gitignore`，frontend 目录也有独立的 `.gitignore`

**最应该立即解决的问题（Phase 0 + Phase 1，预计 3-4 小时）**：
1. Git 工作区清理 - 通过 root `.gitignore` 防止工具文件进入产品仓库
2. 版本号一致性检查 - README / package.json 需同步
3. Effect 依赖缺失导致的 stale state 风险（Dashboard / Results / Forecasts 可能显示旧数据）
4. Firebase 部署配置缺失导致的部署失败风险（P0，确实缺失）

**应该推迟的问题**：
1. 大文件机械拆分（不影响用户）
2. 全量 any 类型消除（采用方案 B：先降级为 warn）
3. 覆盖率报告配置（现有 109 个测试已保护核心算法）
4. React Refresh 警告（开发阶段体验问题，不影响生产）

**根本不需要做的问题**：
1. 单文件 300 行硬限制（拆分反而可能引入 regression）
2. dateUtils 提取（三处重复，但是稳定的纯函数）

---

## Current Product Priorities

按用户价值排序的产品稳定点：

| 优先级 | 产品功能 | 用户价值 | 风险影响 |
|--------|---------|---------|---------|
| 🔴 最高 | **Forecasts 输入与年度成长** | 产能预测的基础 | 算错 revenue = 整个系统不可信 |
| 🔴 最高 | **BP target 分析正确性** | 管理层决策依据 | 错读/错换算/错分摊 = 业务决策失误 |
| 🔴 最高 | **Firebase 数据保存与读取** | 所有用户数据的持久化 | 保存失败 = 用户数据丢失 |
| 🔴 最高 | **Firebase 部署能力** | 发布流程 | 无法部署 = 新功能无法上线 |
| 🟡 高 | **Capacity demand / utilization 计算** | 产能瓶颈识别 | 错算 = 产能规划失误 |
| 🟡 高 | **Dashboard / Results 分析可信度** | 日常监控页面 | stale state = 用户不信任数据 |
| 🟡 高 | **Products / Products Sheet 输入效率** | 基础数据录入 | 性能卡顿 = 用户体验差 |
| 🔵 低 | **i18n 多语言完整性** | 国际化体验 | 缺失 key = 显示代码，影响专业感 |

---

## Lint Strategy Recommendation

### 推荐：**方案 B - 产品阶段 lint gate**

**当前状态**: `npm run lint` = 156 problems (148 errors, 8 warnings)，其中 140+ 是 `no-explicit-any`。

**方案 B 具体做法**：
1. 把 `@typescript-eslint/no-explicit-any` 暂时从 `error` 降级为 `warn`
2. P0/P1 只修真正会导致 runtime/data 风险的 any：
   - `catch (e: any)` 中访问 `e.message` 的 NPE 风险
   - 未做类型保护的类型断言访问
3. 后续再逐步清理 pages 层 any

**Tradeoff 分析**：

| 利 | 弊 |
|----|----|
| ✅ 立即消除 140+ 个 lint errors，CI 可以通过 | ❌ any 类型问题可能继续增加 |
| ✅ 聚焦修复真正有风险的 10-15 处 any | ❌ 类型安全严格性暂时降低 |
| ✅ 不阻塞产品快速迭代 | ❌ 需要后续持续投入清理 |
| ✅ 低风险，只需改 eslint 配置 | ❌ 可能产生"破窗效应" |

**推荐理由**：当前产品仍在快速迭代，140 个 any 大部分是 Ant Design Table render 函数的类型问题，不影响 runtime。强行全量修复会占用大量开发时间，且引入不必要的 regression 风险。

---

## Risk Matrix

### 原计划 11 个 Issue 重新评估

| # | Issue | 原优先级 | 新优先级 | 是否保留 | 是否拆小 | 为什么 | 用户风险 | 开发风险 | 推荐执行时机 |
|---|-------|---------|---------|---------|---------|-------|---------|---------|------------|
| 1 | React Effect 内同步 setState + 依赖缺失 | P0 | **P0** | ✅ 保留 | ✅ 拆小 | CalculationResults 的 currency 同步可能导致页面闪烁或显示旧数据；直接影响 Results 可信度 | 🔴 中高：用户可能看到错误的货币金额 | 🟡 中：修复后需手动验证各页面 | **Phase 1 - 立即** |
| 2 | 测试覆盖率报告工具 | P0 | **P2** | ✅ 保留 | - | 现有 109 个测试已通过，覆盖率报告是改进工具，不影响当前用户 | 🔵 无 | 🟡 低：纯工具配置 | **Phase 4 - 有空再做** |
| 3 | 关键路径 `any` 类型消除 | P1 | **P1** | ✅ 保留 | ✅ 拆小 | 只修 `catch (e: any)` 中 `e.message` 的潜在 NPE（约 15 处）；不修 Table render 中的 any（Ant Design 类型问题，约 130+ 处） | 🟡 中：error.message undefined 会显示 "undefined" 给用户 | 🟢 低：安全的类型收紧 | **Phase 2 - core/service 先修** |
| 4 | Forecasts.tsx 超大组件拆分 (995 行) | P1 | **P2** | ✅ 保留 | ✅ 大幅拆小 | 不追求 300 行目标。只拆分 Excel 导入导出逻辑（最常出 bug 的部分），便于单独测试 | 🟡 中：拆分可能引入 regression | 🔴 高：大文件重构风险高 | **Phase 3 - 先加测试再拆** |
| 5 | CapacityPlan.tsx 超大组件拆分 (957 行) | P1 | **P3** | ⚠️ 延后 | - | 957 行但相对稳定，且有 5 处 catch(e: any)。先不拆，优先修类型问题。**仅修复 lint 问题，不做结构重构** | 🔵 低：当前工作正常 | 🔴 很高：产能计划是核心页面，拆分风险大 | **Phase 3 后期，高风险** |
| 6 | 提取重复的时间工具函数 dateUtils.ts | P1 | **P3** | ❌ 暂不做 | - | 三处重复但是纯函数，测试覆盖充分，提取不会降低业务风险，反而可能引入 regression | 🔵 无 | 🟢 低：无业务收益，纯工程整洁 | **Do Not Do Yet** |
| 7 | 空 catch 块修复 | P1 | **P1** | ✅ 保留 | - | 4 处空 catch 静默吞噬错误，包括 AppPreferences 和 i18n 初始化失败。用户看到无响应但无提示 | 🟡 中：出错时用户无感知，以为卡住 | 🟢 低：只是加日志，不改变业务逻辑 | **Phase 2 - 立即，低风险** |
| 8 | Service 层单元测试 | P2 | **P1** | ✅ 保留 | ✅ 拆小 | Firebase CRUD 是数据正确性的最后一道防线。sku/forecast/parameter 三个核心服务必须先测 | 🟡 中：service 层 bug 会导致数据持久化错误 | 🟡 中：测试会发现 edge case | **Phase 2 - 高价值，Phase 0+1 不做** |
| 9 | 表格性能优化 - useMemo 记忆化 | P2 | **P2** | ✅ 保留 | - | 1000 行数据切换卡顿影响输入效率，但不影响数据正确性 | 🟡 中：用户体验差但数据正确 | 🟢 低：纯性能优化，风险低 | **Phase 4 - 体验优化** |
| 10 | 未使用变量清理 | P3 | **P3** | ✅ 保留 | - | 纯代码整洁，无风险 | 🔵 无 | 🔵 极低 | **Do Later** |
| 11 | React Refresh 警告修复 | P3 | **P3** | ❌ 暂不做 | - | 仅开发阶段体验问题，不影响生产 | 🔵 无 | 🔵 极低 | **Do Not Do Yet** |

---

### 新增原计划漏掉的风险项（基于真实检查）

| # | Issue | 新优先级 | 用户风险 | 开发风险 | 推荐执行时机 |
|---|-------|---------|---------|---------|------------|
| 12 | **Git working tree 不干净** | **P0** | 🔵 无，但工具文件进入 repo 会污染发布分支 | 🟡 中：错误提交 debug 文件 | **Phase 0 - 立即** |
| 13 | **.claude/、PROJECT_ARCHIVE.md 等工具文件应 gitignore** | **P0** | 🔵 无 | 🟡 中：repo 中混入大量非产品文件 | **Phase 0 - 立即（尚无 tracked files，可直接添加 gitignore）** |
| 14 | **版本号 README / package.json / App.tsx 不一致** | **P0** | 🟡 中：用户看到的版本号与实际不符，debug 困难 | 🟢 低：纯字符串修改 | **Phase 0 - 立即** |
| 15 | **Firebase deploy 配置缺失** | **P0** | 🔴 高：无法部署 = 用户无法使用新功能 | 🔴 高：部署失败阻塞发布 | **Phase 0 - 立即（确实缺失，需要创建）** |
| 16 | **Bundle size 过大 (4.3MB)** | **P1** | 🟡 中：首屏加载慢 = 用户流失 | 🟡 中：代码分割需要测试路由 | **Phase 4 - 性能优化** |
| 17 | **实验页和正式页混在一起但缺少 i18n key** | **P1** | 🟡 中：实验页显示翻译 key 而非实际文字 | 🟢 低：仅实验页受影响 | **Phase 2 - 低风险** |
| 18 | **Dashboard / Results / Forecasts stale state 风险** | **P0** | 🔴 高：用户基于旧数据做决策 | 🟡 中：需要梳理 state 刷新逻辑 | **Phase 1 - 最高优先级** |
| 19 | **i18n key parity 持续验证** | **P1** | 🟡 中：缺翻译会显示代码字符串，降低产品专业感 | 🟢 低：添加测试即可，不改业务 | **Phase 2 - 添加自动化测试** |
| 20 | **Prevent debug artifacts (code_trans_keys*.txt) from reappearing** | **P1** | 🔵 无，但可能意外提交大文件阻塞 clone | 🔴 高：60MB+ 文件会严重影响 git 性能 | **Phase 0 - 通过 gitignore 防护** |
| 21 | **ESLint no-explicit-any 降级为 warn** | **P0** | 🔵 无，但 148 errors 会阻塞 CI | 🟢 低：只改 eslint 配置 | **Phase 0 - 立即，不修改任何业务代码** |

---

### P0 严格限定清单（共 6 个）

只有以下问题符合 P0 标准：
1. ✅ **Stale state 风险** - 可能导致错误数据展示
2. ✅ **Firebase 配置缺失** - 可能导致部署失败
3. ✅ **版本号不一致** - 可能导致错误版本发布
4. ✅ **Git 工作区不干净** - 可能导致错误 artifact 发布
5. ✅ **工具文件 gitignore 防护** - 防止 .claude/ 等混入 repo
6. ✅ **ESLint any 降级为 warn** - 148 errors 阻塞 CI

**以下不再列为 P0**：
- ❌ 纯工具配置（如 coverage 工具）
- ❌ 纯代码整洁
- ❌ 纯开发体验优化

---

## Revised Execution Phases

---

### Phase 0: Repo hygiene and release consistency
**目标**：确保工作区干净，版本一致，debug/tool artifacts 不污染 repo，CI 可通过。  
**预计工时**：1 小时  
**风险**：极低，纯配置修改

**允许修改的文件**：
- 根目录 `.gitignore`（项目实际使用的是 root gitignore）
- `README.md`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/eslint.config.js`（降级 any 为 warn）
- `firebase.json`, `.firebaserc`（需要创建）

**不允许修改的文件**：
- 任何业务逻辑代码
- `.claude/` 下的已 tracked 文件（当前无，如需 git rm --cached 需用户确认）

| Task | Action |
|------|--------|
| 0.1 | 在 **root .gitignore** 添加防护规则：`.claude/`、`PROJECT_ARCHIVE.md`、`code_trans_keys*.txt` |
| 0.2 | 检查 README.md / package.json / App.tsx 版本号一致性，统一为 1.14.4 |
| 0.3 | 创建缺失的 Firebase 部署配置：firebase.json、.firebaserc（使用标准 Firebase hosting 配置） |
| 0.4 | 修改 frontend/eslint.config.js，将 `@typescript-eslint/no-explicit-any` 从 error 降级为 warn |
| 0.5 | 验证 `npm run lint` 错误数从 156 → ≤ 16（只剩真正有风险的问题） |
| 0.6 | 验证 `npm run build` 仍然通过 |

---

### Phase 1: Correctness and stale-state fixes
**目标**：先修会导致错误数据显示、旧数据显示、BP/Forecast/Capacity 分析不可信的问题。  
**预计工时**：2-3 小时  
**风险**：中高，需要手动验证

**允许修改的文件**：
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/CalculationResults.tsx`
- `frontend/src/pages/Forecasts.tsx`
- `frontend/src/pages/CapacityPlan.tsx`（仅修复确有用户风险的问题）

**不允许修改的文件**：
- 其他所有页面
- 不做类型修复（留到 Phase 2）
- 不拆组件
- 不加 service tests

| Task | Action |
|------|--------|
| 1.1 | **Dashboard 页面 stale state 修复**：<br>• 如果 SKUs 或 Forecasts 为空，显式清空 `model`、`highlights` 状态<br>• 如果 params 没有 BP targets，显式清空 `bpTargets`<br>• currency preference 改变时，触发金额重新计算，但避免不必要的重复计算 |
| 1.2 | **CalculationResults 页面 stale state 修复**：<br>• 如果重新加载时 forecasts 为空，清空旧 model<br>• 如果 params BP target 为空，清空旧 BP target<br>• currencySettings 与 prefs.displayCurrency 的同步要避免 stale display |
| 1.3 | **Forecasts 页面 stale state 修复**：<br>• 保存 forecast 后必须 reload 或同步本地 forecasts<br>• 年度 growth 生成后必须 reload<br>• 清空 forecast 后不能保留旧 forecastMap 显示 |
| 1.4 | **CapacityPlan lint 风险评估**：<br>• 检查 React lint `set-state-in-effect` 是否真会导致旧数据显示<br>• **如果无法证明有用户可见的 stale state 风险，则不修复**<br>• 不要为了满足 lint 规则大改数据加载逻辑 |
| 1.5 | 手动验证清单：<br>• 修改 BP target → Dashboard Results 更新<br>• 切换货币 → Results 金额正确转换<br>• 修改 Forecast → Results 立即刷新<br>• 清空 Forecast → Results 显示为空（无旧数据残留） |

---

### Phase 2: Lint gate and type safety on core paths
**目标**：修复剩余真正有风险的 lint errors，优先 core/services/components，不要先拆大页面。  
**预计工时**：3-4 小时  
**风险**：低到中

| Task | Action |
|------|--------|
| 2.1 | 修复 core/ 和 services/ 下所有 catch (e: any) → e instanceof Error 保护（约 15 处） |
| 2.2 | 修复 4 处空 catch 块，添加 console.warn 或用户提示 |
| 2.3 | 添加 i18n key parity 单元测试，确保 en.ts 和 zhTW.ts key 数量一致 |
| 2.4 | 修复实验页缺失的 i18n key（capacityLab.experimentTag 等） |
| 2.5 | 验证 `npm run lint` error = 0 |

---

### Phase 3: Focused refactor of high-change pages
**目标**：只拆 Forecasts/CapacityPlan 中最常改、最容易出错的部分，不追求机械的 300 行标准。  
**预计工时**：4-6 小时  
**风险**：高，必须先加测试

| Task | Action |
|------|--------|
| 3.1 | 为 Forecasts.tsx 的 Excel 导入导出逻辑添加集成测试（**先测后拆**） |
| 3.2 | 提取 Forecasts.tsx 中的 ExcelImport / ExcelExport 为独立组件 |
| 3.3 | 验证拆分后导入导出功能完全一致 |
| 3.4 | **CapacityPlan.tsx 拆分暂不做**，除非出现实际的可维护性问题 |

---

### Phase 4: Tests, coverage, and performance
**目标**：再补 coverage、service tests、bundle split、large table performance。  
**预计工时**：5+ 小时（按需）  
**风险**：低

| Task | Action |
|------|--------|
| 4.1 | 配置 @vitest/coverage-v8，设置 core 层最低 90% 阈值 |
| 4.2 | 补充 skuService / forecastService / parameterService 核心测试（Happy path + Error path） |
| 4.3 | 表格 useMemo 性能优化 |
| 4.4 | 路由级代码分割，减小主 bundle 体积 |
| 4.5 | 大文件按需加载（xlsx, chart 库） |

---

## Do Now / Do Later / Do Not Do Yet

### ✅ Do Now (Phase 0 + Phase 1)
1. Root .gitignore 更新（添加 .claude/、PROJECT_ARCHIVE.md、code_trans_keys*.txt）
2. 版本号一致性检查
3. Firebase 部署配置创建
4. ESLint no-explicit-any 降级为 warn
5. Dashboard/Results/Forecasts stale state 修复 + 验证
6. 空 catch 块修复

### ⏳ Do Later (Phase 2 + Phase 3)
1. core/service 层有风险的 any 类型安全修复
2. i18n parity 测试
3. Forecasts Excel 导入导出拆分（先测后拆）

### ❌ Do Not Do Yet
1. **CapacityPlan.tsx 全面拆分**（风险太高，收益不明显）
2. dateUtils 提取（纯函数重复无业务风险）
3. 全量 any 类型消除（130+ 处 Ant Design Table 类型问题无法避免）
4. React Refresh 警告修复
5. 单文件 300 行硬限制执行
6. Service 层全量测试

---

## Acceptance Criteria

### 产品指标（最重要）
- ✅ Dashboard / Results / BP Analysis 数据显示正确
- ✅ 修改 Parameters 后所有页面立即刷新，无 stale state
- ✅ Forecast yearly growth 不覆盖已有数据
- ✅ Products Sheet Excel 导入导出仍可用
- ✅ 货币切换后所有金额正确转换
- ✅ Firebase deploy 配置存在且可部署

### 工程指标（次要）
- ✅ `npm run test` 全部通过（≥ 109 个）
- ✅ `npm run build` 无 TypeScript 错误
- ✅ `npm run lint` error ≤ 16（any 降级后），Phase 2 后 error = 0
- ✅ Git 工作区干净，无工具文件混入提交

### 手动 QA CheckList
1. 登录 → Dashboard 加载正确
2. 进入 Parameters → 修改 BP target → 保存
3. 返回 Dashboard → BP 数值更新（无旧数据残留）
4. 进入 Forecasts → 修改某月预测 → 保存
5. 返回 Results → 计算结果正确更新
6. 切换货币（TWD ↔ USD）→ 所有页面金额正确转换
7. Products → Excel 导入 10 行 → 保存成功

---

## Proposed First Implementation Prompt

**下一步最小执行范围（只做 Phase 0 + Phase 1，约 3-4 小时）**：

```
请执行 ABF 产能计算器 Phase 0 + Phase 1 修复：

## Phase 0: Repo Hygiene (1h)

### 允许修改的文件：
- 根目录 .gitignore
- README.md
- frontend/package.json
- frontend/src/App.tsx
- frontend/eslint.config.js
- firebase.json
- .firebaserc

### 禁止修改的文件：
- 所有业务逻辑代码
- 不做类型修复
- 不拆组件
- 不加测试

### Phase 0 具体任务：
1. 更新 **root .gitignore**（不是 frontend/.gitignore），添加：
   - .claude/
   - PROJECT_ARCHIVE.md
   - code_trans_keys*.txt

2. 检查 README.md / frontend/package.json / App.tsx 版本号，统一为 1.14.4

3. 创建 Firebase 部署配置文件（firebase.json + .firebaserc），使用标准 Firebase hosting 配置指向 frontend/dist

4. 修改 frontend/eslint.config.js，将 `@typescript-eslint/no-explicit-any` 从 error 降级为 warn

5. 运行 `npm run lint` 并确认错误数从 156 大幅下降

6. 运行 `npm run build` 验证构建正常

## Phase 1: Correctness and Stale State (2-3h)

### 允许修改的页面文件：
- frontend/src/pages/Dashboard.tsx
- frontend/src/pages/CalculationResults.tsx
- frontend/src/pages/Forecasts.tsx
- frontend/src/pages/CapacityPlan.tsx（仅在确有用户风险时修改）

### Phase 1 具体任务：

1. **Dashboard stale state 修复**：
   - 如果 SKUs 加载为空，显式清空 model、highlights
   - 如果 params 没有 BP targets，显式清空 bpTargets 状态
   - currency preference 改变时，确保显示金额刷新，但避免重复计算

2. **CalculationResults stale state 修复**：
   - 如果重新加载时 forecasts 为空，清空旧 model
   - 如果 params BP target 为空，清空旧 BP target
   - currencySettings 与 prefs.displayCurrency 同步要避免 stale display

3. **Forecasts stale state 修复**：
   - 保存 forecast 后必须 reload 或同步本地 forecasts
   - 年度 growth 生成后必须 reload
   - 清空 forecast 后不能保留旧 forecastMap 显示

4. **CapacityPlan 风险评估**：
   - 检查 React lint set-state-in-effect 警告
   - **如果无法证明会导致用户可见的旧数据显示，则不修复**
   - 不要为了满足 lint 大改加载逻辑

5. **验证**：每步修改后运行 `npm run test` 和 `npm run build`

## Important Hard Constraints:
✅ 允许修改：gitignore、README、package.json、App.tsx、eslint 配置、firebase 配置、4 个页面的 state 逻辑
❌ 不允许：类型修复、组件拆分、service tests 开发
❌ 不部署，除非用户明确要求
⚠️ 如果要修改 ESLint policy（降级 any 为 warn），请单独列出来并等待确认
```

---

## Plan Accuracy Notes

本次修订纠正的错误假设：

| 检查项 | 原假设 | 真实状态 | 纠正措施 |
|--------|--------|---------|---------|
| **Firebase 配置** | 假设缺失 | ✅ **确实缺失** | 保留 P0，需要创建 firebase.json 和 .firebaserc |
| **code_trans_keys*.txt** | 假设当前存在 60MB 文件 | ❌ **当前不存在** | 从"立即删除"改为"通过 .gitignore 防止再次出现"，优先级降为 P1 |
| **.claude/ tracked files** | 含糊处理 | ✅ **尚无 tracked files** | 可以直接添加到 root .gitignore，无需 git rm --cached |
| **lint error 数量** | 未检查 | ✅ **156 problems (148 errors, 8 warnings)** | 140+ 是 no-explicit-any，推荐方案 B 降级为 warn |
| **.gitignore 位置** | 假设使用 frontend/.gitignore | ✅ **root + frontend 都有** | 统一使用 root .gitignore 作为主配置 |
| **Phase 0 修改范围矛盾** | 写"不要修改任何其他文件"但要改 4+ 个文件 | ✅ **明确列出允许修改的白名单** | 消除矛盾，明确 Phase 0 只改配置文件，不动业务代码 |

---

**计划修订完成** - v1.1 基于真实 repo 状态校正，消除了所有不准确的假设。
