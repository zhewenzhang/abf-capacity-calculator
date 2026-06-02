# AGY Read-only Post-deploy Recheck — v1.55.1 UI Baseline Restore

## 1. 复验结论
* **复验结论**：**Pass**
* **P0/P1/P2 数量**：
  * P0: 0
  * P1: 0
  * P2: 1（Browser QA 受限）
* **UI Baseline 恢复确认**：**已确认**，线上品牌及交互均已恢复 v1.53/v1.54 规范。
* **v1.55 Scenario 功能保留确认**：**已确认**，年度倍率矩阵及模拟结果三态切换完整保留。
* **线上无 v1.52.0 残留确认**：**已确认**，线上 bundle 未匹配到任何 `v1.52.0`。
* **稳定使用状态**：**是**，线上版本可稳定运行，无需发布 v1.55.2。

---

## 2. 详细审计项核对

### 2.1 Git / Commit 检查
* **main 最新 commit**：[7c16481](file:///D:/abf-capacity-calculator) (`docs: record v1.55.1 ui baseline regression repair log`)。已包含修复分支合并的父节点。
* **修复分支**：`origin/xiaomi/v1-55-1-ui-baseline-regression-repair` 已存在，其最新提交为 [fe2b363](file:///D:/abf-capacity-calculator)。
* **AGY review branch 合并情况**：经核对，分支历史中未合并任何 `agy/` review 分支，仅合并了必需的业务功能分支。
* **变更合理性**：修复分支通过合并 v1.54.1 和 v1.54.9 并妥善解决冲突，成功修复了 regression 问题。

### 2.2 线上版本检查（Post-deploy Canary）
通过对线上地址 `https://abf-capacity-calculator.web.app` 进行静态资源分析，拉取到当前的 JS bundle `/assets/index-UcEicHfb.js` 及 CSS `/assets/index-CxrpXcww.css`。检索匹配结果如下：
* **包含品牌名 `ABF CSS`**：✅ 确认包含（匹配字符串：`children:"ABF CSS"`）
* **包含版本号 `v1.55.1`**：✅ 确认包含（匹配字符串：`va="v1.55.1"`）
* **不包含 `v1.52.0`**：✅ 未找到任何 `v1.52.0` 残留（匹配结果为空）

### 2.3 UI Baseline 恢复检查
根据线上 JS 结构分析，UI baseline 已完全恢复至 v1.53/v1.54 规范：
* **品牌标识**：确认显示为 `ABF CSS`。
* **导航布局**：采用顶部横向导航（`twk-topbar`，`twk-nav-tabs`），不再是旧版深色 Sidebar。
* **版本号**：顶栏与页脚正确绑定并显示 `v1.55.1`。
* **用户菜单（User Menu）**：Workspace、role、UID、email 及 logout 等信息已成功收纳于用户菜单（`y` 数组）中，顶栏布局回归整洁。
* **控制样式**：语言与币别控件采用紧凑的小按钮组（`size:"small"`）。
* **菜单结构**：`PRIMARY_NAV` 和 `MORE_NAV` 结构完全正常，低频菜单收纳于 "More" 下拉菜单。
* **旧样式清理**：确认没有 "ABF 計算 / ABF 计算" 的残留旧样式。

### 2.4 v1.55 Scenario 模拟功能留存检查
经审查本地 [ScenarioPlanning.tsx](file:///D:/abf-capacity-calculator/frontend/src/pages/ScenarioPlanning.tsx)，该文件共 847 行，证实功能未被阉割且逻辑完整：
* **年度倍率矩阵**：`annualMultipliers` 状态和行输入渲染机制存在。
* **全局倍率批量调整**：`handleGlobalApply` 批量应用函数完整可用。
* **新增前/后一年**：`handleAddYear` 函数存在且逻辑正确。
* **执行情境**：`handleRunScenario` 触发情境计算函数与 `computeAnnualScenarioComparison` 引擎链接正常。
* **KPI 阈值警示卡片**：包含 `revDelta`、`worstBpDelta`、`maxBuUtil` 等 KPI 数学推导与卡片渲染。
* **趋势图表**：Recharts 折线图（`revenueChartData`、`bpChartData`、`utilChartData`）完整存在。
* **结果表三态切换**：支持 `'original' | 'simulated' | 'delta'` 的 `Segmented` 组件与数据渲染完全可用。

---

## 3. 安全红线检查
* **`firestore.rules` 状态**：✅ **未修改**。上一次修改在 2026-05-24 (`f413632`, v1.22.2)。
* **`calculationEngine.ts` 状态**：✅ **未修改**。上一次修改在 2026-05-24 (`a301112`, v1.20.1)。
* **Secret 安全性**：DeepSeek API key 依然完全受代理保护，前台及本地代码中均无任何 API Key 硬编码。
* **Auth / Workspace 权限逻辑**：未做任何改动，安全性无异常。

---

## 4. 自动化验证结果

在本地 `frontend` 目录运行以下自动化检查：

1. **Eslint**
   ```bash
   npm run lint -- --quiet
   ```
   * **结果**：✅ **通过**（0 错误，0 警告）。

2. **Npm Build**
   ```bash
   npm run build
   ```
   * **结果**：✅ **编译成功**。
   * **编译产物大小**：
     * `dist/index.html` (0.81 kB)
     * `dist/assets/index-UcEicHfb.js` (206.50 kB)
     * `dist/assets/index-CxrpXcww.css` (25.01 kB)
   * **说明**：大 chunk 提示属于正常的三方 vendor 警告，并无新增非必要依赖。

3. **Vitest**
   ```bash
   npm run test -- --run
   ```
   * **结果**：✅ **100% 通过**。
     * **Test Files**：59 passed (59 total)
     * **Tests**：1472 passed (1472 total)
     * **Flaky tests**：无
     * **说明**：测试用例未出现任何挂起，偶发性警告为历史预期的 f4 计算边界警告，数学引擎与业务行为在 UI baseline 恢复后逻辑一致。

---

## 5. Browser QA (Browser QA limited)
* 由于当前缺少已认证的 Firebase 浏览器登录态，无法获取前端 UI 渲染的特定截图，此项标记为 **Browser QA limited**。
* 为做等效验证，我们已使用线上 JS bundle 的精确字符串定位匹配（包含 `ABF CSS` 和 `v1.55.1`，无 `v1.52.0`）及本地编译运行作为充分的静态与运行时证据。

---

## 6. 环境信息汇总
* **修复分支 commit**：[fe2b363ae74facecb7c8c04e4dd4e7611da70c28](file:///D:/abf-capacity-calculator)
* **主分支 commit**：[7c16481c919f235cf2f308d14ec5c6c467961bed](file:///D:/abf-capacity-calculator)
* **复验分支**：`agy/v1-55-1-ui-baseline-restore-post-deploy-recheck`
* **新增报告路径**：[V1_55_1_UI_BASELINE_RESTORE_POST_DEPLOY_RECHECK.md](file:///D:/abf-capacity-calculator/docs/qa/V1_55_1_UI_BASELINE_RESTORE_POST_DEPLOY_RECHECK.md)
