# v1.46 Consolidation Fix Pack 深度只读验收审查报告

**审查日期**：2026-05-28  
**审查人**：AGY (Antigravity AI Coding Assistant)  
**审查分支**：`origin/xiaomi/v1-46-consolidation-fix-pack`  
**基线分支**：`origin/xiaomi/project-integrity-audit-marathon`

---

## 一、最终结论

根据深度静态源码审计、本地测试编译执行以及安全合规扫描，本次验收给出的最终评估结论为：

### **评估状态：Conditional Pass（条件性通过）**

> [!WARNING]
> **是否可进入 Merge Main 前的最终发布检查**：**不可直接合并**。虽然大部分 P1/P2 缺陷得到了实质性修复且编译打包与 Lint 表现优异，但**新暴露了一个关键性的 P1 阻塞缺陷**（P1-3 修复与 UI 硬编码冲突），直接导致核心功能在界面下点击失效并静默失败。开发团队（MiMo/Qwen）必须先对该缺陷进行针对性修复，才能获批进行 `main` 分支的整包合并。
> 
> **是否需要 v1.46.1 Hotfix**：不需要。建议直接在此分支或 PR 中追加一个修复 Commit，无需等到发布后再作为 Hotfix 处理，以保持主干提交记录的纯净度。
> 
> **是否还有 P0 / P1 阻塞**：**存在 1 个严重的 P1 阻塞级缺陷**（详情参见下文 P1-3 章节与重新分类章节）。
> 
> **是否建议继续做真实 Browser QA**：**非常建议**。尤其是在修复了 P1-3 阻塞缺陷后，应在真实浏览器下重点对 DailyOperationsWorkbench 的所有场景（V2 Run）以及 Products 页面的 URL 参数跳入预填进行真机验收。

---

## 二、分支范围检查与防污评估

### 1. 代码差异与行数统计
对比基线分支 `origin/xiaomi/project-integrity-audit-marathon`，本次 Fix Pack 相对基线修改了 **14 个文件**，共引入了 **186 行新增（Additions）** 与 **157 行删除（Deletions）**。
修改范围极其精准，完全被限制在 v1.46 修复相关的核心页面（`CapacityPlan.tsx`、`DailyOperationsWorkbench.tsx`、`Products.tsx`）及 core 工具和护栏逻辑中，无任何无关文件与逻辑的越权修改。

### 2. 工作树防污评估与未提交文件
通过对当前工作树的扫描，发现了以下未提交或未纳入 Git 追踪的本地临时文件（污点文件）：
- `modified:   .claude/settings.json`（被本地修改但未 staged）
- `Untracked:  .claudeteam.md`
- `Untracked:  docs/product/PROJECT_AGENT_CONTEXT_AND_ROADMAP.md`
- `Untracked:  node_modules/`

> [!IMPORTANT]
> **关于 "Phase 0 open" 状态的说明**：
> 报告中显示的 “Phase 0: Status freeze and work tree inventory open” 状态，不仅是任务看板显示问题，**工作树中确实存在未过滤的临时与未提交文件**。这表明 MiMo/Qwen 在 Phase 0 freeze 阶段执行不够彻底。尽管这些本地文件未被误提交至远程仓库，但在最终 Merge 发布前，应当在 `.gitignore` 中进一步补充上述污点文件，并对本地工作区执行彻底的 `git clean -fd` 清洗。

---

## 三、8 个修复项逐项源码深度验收

### 【P1-1】DailyOperationsWorkbench Viewer Guards (只读角色卫护)
* **评级：真修 (真修 / 部分覆盖)**
* **源码证据与分析**：
  - 在 `DailyOperationsWorkbench.tsx` 中，通过 `const writable = canEdit(scope.role);` 正确定义了写入权限控制。
  - 在所有操作 Handler 开头均实现了前置拦截防御：
    - `handleGenerateReport` (第 294 行)：`if (!writable) return;`
    - `handleExportMarkdown` (第 310 行)：`if (!writable) return;`
    - `handleExportJson` (第 317 行)：`if (!writable) return;`
    - `handleRunScenarioV2` (第 325 行)：`if (!writable) return;`
  - 界面 UI 层的对应按钮均完美集成了置灰逻辑：
    - 运行场景 V2 的三个按钮（第 841, 849, 857 行）：`disabled={!rawData || !writable}`
    - 报告生成按钮（第 905, 912 行）：`disabled={... || !writable}`
    - Markdown / JSON 导出按钮（第 921, 928 行）：`disabled={!writable}`
  - 在页面头部第 498-505 行，只读状态下会显式渲染 `Alert` 提示框：
    ```tsx
    {!writable && (
      <Alert type="info" showIcon message={t('common.viewerReadOnly')} style={{ marginBottom: 16 }} />
    )}
    ```
* **测试覆盖情况**：在 `DailyOperationsWorkbench.test.tsx` 新增了 `viewer handler guards` 测试用例，测试了 `canEdit` 对不同 role 的 mock 返回值是否正确。但**测试并未对 React 组件本身在 Viewer 角色下的 DOM 交互（如按钮点击是否触发拦截）做集成断言**，测试覆盖深度属于部分覆盖。

---

### 【P1-2】中文 Output Validation (中文输出安全校验)
* **评级：真修**
* **源码证据与分析**：
  - 在 `aiCopilotOutputValidation.ts` 中，完美补充并覆盖了中文/繁体中文的危险表达模式：
    - **Forbidden Claims**：补充了对“我已经保存”、“已自动保存”、“我帮你写入”、“我已经修改数据库”、“忽略数据质量”、“已调整公式”的正则校验，且均被赋予了 `blocked` 拦截等级与明确的 reason。
    - **Write Action Claims**：补充了对“我帮你写入”与“我已经修改数据库”的拦截正则。
    - **Causality Claims**：补充了对“这是由某客户导致”的需求归因因果警示。
    - **Guessing Claims**：补充了“我猜测”与“我估算缺失数据”的缺失数据猜测拦截。
  - 上述正则的抗绕过性良好，使用直接文本匹配，对中文简繁体的核心词表覆盖度非常完备。
* **测试覆盖情况**：在 `aiCopilotOutputValidation.test.ts` 中，高强度地编写了专门的中文测试用例，完美测试了诸如 `'我已经保存了修改。'`、`'我帮你写入了数据库。'`、`'这是由某客户导致的需求波动。'` 以及 `'我猜测这个数据大概是500。'` 等情况，测试百分之百真实通过。

---

### 【P1-3】capacityShiftTarget 静默失效与新阻塞隐患
* **评级：部分修 (新引入 P1 核心功能阻塞缺陷！)**
* **源码证据与分析**：
  - **算法层修复**：在 `operationalScenario.ts` 的容量平移逻辑中，确实将 `_target` 替换为了 `target`。且增加了对于不支持参数的显式拦截机制（第 326-330 行）：
    ```typescript
    if (target !== 'both') {
      throw new Error(`shiftCapacityPlans: target="${target}" is not supported. Only "both" is currently supported.`);
    }
    ```
  - **严重集成缺陷**：在 `DailyOperationsWorkbench.tsx` 中运行 `capacityDelay` 场景的逻辑第 342 行，**入参 `capacityShiftTarget` 依然被硬编码为了 `'bu'`**：
    ```tsx
    if (scenarioType === 'capacityDelay') {
      result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        ...
        capacityShiftMonths: 3,
        capacityShiftTarget: 'bu', // <--- 此处硬编码为 bu！
      });
    }
    ```
    当用户在工作台界面点击运行 `capacityDelay` 时，底层会因为传入 `'bu'` 而直接抛出类型异常。由于该 Handler 使用了静默 `try-catch` 捕获结构，这会直接导致**运行场景闪退且没有任何结果输出**，核心功能完全失效！
* **测试覆盖情况**：在 `operationalScenario.test.ts` 中，只包含了 `capacityShiftTarget: 'both'` 的正常用例，**完全缺失对于传入 `'bu'` 或 `'core'` 抛出 unsupported 异常的单元测试用例**。

---

### 【P1-4】CapacityPlan Viewer Guards (容量计划只读角色防区)
* **评级：真修**
* **源码证据与分析**：
  - 在 `CapacityPlan.tsx` 中，对 `handleAddFactory`（第 314 行）与 `handleAddMonth`（第 451 行）的首行均追加了 `if (!writable) return;` 安全拦截。
  - 在界面层对 `Add Factory` 按钮和 `Add Month` 按钮完美集成了权限禁用拦截：
    ```tsx
    <Button icon={<PlusOutlined />} onClick={handleAddFactory} disabled={!writable}>
    <Button icon={<PlusOutlined />} onClick={handleAddMonth} disabled={viewMode !== 'month' || !writable}>
    ```
  - 保存按钮与气泡确认框也增加了 `Popconfirm disabled={!writable}` 和 `Button disabled={!writable}`。页面第 703 行引入了 Viewer Alert Warning，实现了从 Handler、UI 置灰到顶部 Alert 的三级立体防护。

---

### 【P2-5】Shared Sanitize Utility (通用脱敏共享工具)
* **评级：真修**
* **源码证据与分析**：
  - 成功新增了共享脱敏工具文件 `sensitiveDataUtils.ts`。
  - 在其中统一维护了 `SENSITIVE_KEYS` 只读敏感字段词表，包含 `'uid', 'email', 'token', 'auth', 'apiKey', 'api_key', 'secret', 'password', 'workspaceId', 'userId', 'ownerUid', 'member', 'credential'`。
  - 实现了深拷贝递归脱敏函数 `sanitizeDeep`，并使用大小写无关的 substring 模糊匹配判断 `isSensitiveKey`，能拦截如 `userEmail` 等字段变体，极其稳固。
  - 成功移除了原本重复冗余在 `aiBriefExport.ts`、`aiCopilotContext.ts`、`aiCopilotGuardrails.ts`、`managementReport.ts`、`scenarioExport.ts` 中的脱敏和词表实现，转而统一从 `sensitiveDataUtils.ts` 中引入，整体架构重构一致性非常高，没有任何敏感数据外泄。

---

### 【P2-6】Quick Fix Drawer Field Highlighting (字段高亮提示)
* **评级：真修**
* **源码证据与分析**：
  - 在 `dataQuality.ts` 中，数据质量模块对 SKU 属性缺失的 `evidence` 进行了扩展，新增了 `missingAttrs` 属性：`evidence: { ..., missingAttrs: missingAttrs.join(',') }`。该设计完美兼容老版的数据质量数据结构。
  - 在 `DataQualityQuickFixDrawer.tsx` 中，成功通过 `getFieldsWithIssues` 提取 `issue.evidence?.missingAttrs` 并缓存为 `fieldsWithIssues` 集合。
  - 随后在 Form Item 标签定义中，通过以下逻辑高亮并展示警报图标：
    ```tsx
    label={
      <Space>
        {t('products.unitPrice')}
        {fieldsWithIssues.has('unitPrice') && (
          <WarningOutlined style={{ color: '#ff4d4f' }} />
        )}
      </Space>
    }
    ```
    该实现轻量、美观，且在修改数据修复后实时响应，属于非常高水准的前端交互修复。

---

### 【P2-7】Guided Fix Create SKU Navigation (参数导航自动填充)
* **评级：真修**
* **源码证据与分析**：
  - 导航生成逻辑中，如果检测到孤儿 SKU，会自动生成包含 `?createSku=...` 的 URL。
  - 在 `Products.tsx` 中（第 118-129 行），使用 React Router `useSearchParams` 在 `useEffect` 挂载时读取 `createSku`：
    ```tsx
    useEffect(() => {
      const createSku = searchParams.get('createSku');
      if (createSku && writable) {
        setAddMode(true);
        addForm.setFieldsValue({ skuCode: createSku });
        searchParams.delete('createSku');
        setSearchParams(searchParams, { replace: true });
      }
    }, []);
    ```
  - 解析逻辑设计极为合理：自动拉起新建 SKU 表单、预填 SKU Code 字段、在读取后**立即从 URL 中擦除参数**防止页面刷新时二次触发；同时整个流程绝对不会自动在后台触发保存，确保了数据的写入安全。

---

### 【P2-8】CapacityPlan Remediation Scroll / Highlight (月份平滑定位与高亮)
* **评级：真修**
* **源码证据与分析**：
  - 在 `CapacityPlan.tsx` 的表格列头和单元格上渲染了对应的 `data-month={month}` 与 `data-month-cell={month}` 属性。
  - 在 `CapacityPlan.tsx` 挂载后的 `useEffect` 中（第 213-240 行），当检测到 URL 传入 `focusMonth` 参数后，使用 `document.querySelector` 找到对应的 DOM 节点并调用 `applyRemediationHighlight`：
    ```typescript
    const columnHeader = document.querySelector(`[data-month="${focusParams.focusMonth}"]`);
    if (columnHeader) { applyRemediationHighlight(columnHeader as HTMLElement); }
    ```
  - 在 `dataQualityRemediation.ts` 中实现 `applyRemediationHighlight`（第 401-413 行）：
    ```typescript
    export function applyRemediationHighlight(element: HTMLElement): () => void {
      element.classList.add(REMEDIATION_HIGHLIGHT_CLASS);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ...
    }
    ```
  - 整个执行逻辑使用了优雅的平滑滚动定位（`scrollIntoView`）和 3 秒定时闪烁高亮 Class，**绝对没有滥用 `window.location.reload()`**，极大地提升了用户使用 Guided Fix 数据质量修复时的幸福感。

---

## 四、自动化编译与测试核验结果

我们进入 `/frontend` 路径下执行了完整的构建流校验：

| 校验步骤 | 执行命令 | 校验结果 | 详细记录 |
| :--- | :--- | :--- | :--- |
| **单元测试** | `npm run test` | **FAIL** (1 Failed / 1409 Passed) | 共运行 57 个测试文件，有 1 个测试用例发生 5000ms 超时失败，导致无法做到 100% Pass。 |
| **代码检查** | `npm run lint -- --quiet` | **PASS** (0 Error & 0 Warning) | ESLint 表现异常优秀，没有任何警告或格式问题。 |
| **生产构建** | `npm run build` | **PASS** (编译顺利通过) | `tsc -b && vite build` 成功完成，仅出现了自带的 `antd-vendor` / `charts-vendor` 大于 500kB 的正常分包警告，无任何 Chunk Stale 警告。 |

> [!CAUTION]
> **失败测试用例**：
> `src/pages/DailyOperationsWorkbench.test.tsx > DailyOperationsWorkbench -- Render Tests > basic rendering > renders without crashing when services return empty data`
> **失败原因**：`Error: Test timed out in 5000ms.`  
> 该超时缺陷可能是由于宿主机测试环境资源占用引发，也可能是组件在空数据挂载时内部触发了深层异步非受控循环。开发团队需要针对此测试用例做进一步健壮性优化。

---

## 五、安全与合规扫描 (Guardrail Grep) 报告

为了彻底清查敏感凭证泄露以及非法越权引入，我们在 `frontend/src/` 下利用 GCF / Ripgrep 深入扫描了 21 项特定敏感内容：

1. **AI 服务黑名单拦截 (`openai`, `anthropic`, `gemini`, `deepseek`)**：
   - 扫描发现以上服务字段仅在 `aiCopilotGuardrails.ts` 的外部 API 拦截规则、DeepSeek 导出 Prompt 的构建（`changeImpactExport.ts`）以及相应的安全性单元测试中出现。
   - **结论**：合规。无任何真实的线上越权外部 AI 服务请求。
2. **敏感秘钥字段检测 (`api_key`, `apiKey`)**：
   - 仅作为 `sensitiveDataUtils.ts` 通用脱敏字典中的匹配键、 setup 页面说明以及安全性单元测试的 mock 数据结构中出现。
   - **结论**：合规。项目中绝对没有泄露任何真实的 Google Cloud / Firebase / OpenAI API 凭证。
3. **底层网络与存储调用 (`fetch(`, `XMLHttpRequest`, `axios`)**：
   - `axios` 命中 0 次；`fetch` 和 `XMLHttpRequest` 仅在 AI 边界安全单元测试中作为拦截防御测试断言被检测。
   - **结论**：合规。在核心 Copilot 工具及业务引擎中，绝无本地越权调用网络 API 的情况。
4. **浏览器数据持久化 (`localStorage`, `sessionStorage`, `indexedDB`, `cookie`)**：
   - `indexedDB` 命中 0 次；`cookie` 与 `sessionStorage` 仅在测试中涉及；`localStorage` 仅在非敏感业务组件中合法保存用户偏好设置（如 `AppPreferencesContext` 存储本地偏好货币、`WorkspaceContext` 保存活跃 Scope 历史记录、`i18n` 存储当前语言）。
   - **结论**：合规。核心敏感模块完全与存储层物理隔离。
5. **特定保存动作 (`saveSku`, `saveForecast`, `saveCapacity`, `saveParameters`, `saveBpTarget`)**：
   - 上述方法仅在合法的 UI 偏好及 remediation 数据库写入服务中被按需引入。
   - **结论**：合规。
6. **分层架构规范校验 (`from '../services'`)**：
   - 对 `frontend/src/core/` 目录下的所有 `ai*.ts`、`operationalScenario*.ts`、`managementReport*.ts` 进行了深层越权扫描。
   - **结论**：**完美！未检测到任何服务层引入**。Core 逻辑层的架构纯净度极高，边界隔离完美。

---

## 六、P0 / P1 / P2 缺陷重新分类与留存

### **【P0 阻塞缺陷】（当前共 0 项）**
* 目前无 P0 级系统崩溃或安全规则越权漏洞。

### **【P1 阻塞缺陷】（当前共 1 项）**
* **P1-SCENARIO-01: UI 场景运行硬编码 bu 参数与底层 unsupported 拦截冲突**
  - **严重程度**：P1 (阻塞 merge main)
  - **表现**：工作台 `capacityDelay` 按钮调用硬编码传入 `'bu'`，导致 `shiftCapacityPlans` 抛出错误而静默失败，界面毫无反应。
  - **修复时机**：必须在 merge main 之前进行修复。

### **【P2 非阻塞缺陷】（当前共 4 项）**
* **P2-TEST-01: DailyOperationsWorkbench test 存在空数据渲染 5000ms 超时**
  - **建议**：建议微调测试环境 testTimeout，或排查 workbench 空数据时的挂载渲染依赖深度。
* **P2-TEST-02: operationalScenario.test 缺失拋错断言**
  - **建议**：补充对 `shiftCapacityPlans` 传入 `'bu'` 或 `'core'` 抛出 unsupported Error 的单元测试用例。
* **P2-TEST-03: DailyOperationsWorkbench Viewer Guard 集成测试覆盖不足**
  - **建议**：可后续在 UI Phase 2 补充 RTL 级按钮只读事件触发与 DOM 元素置灰断言。
* **P2-DIRTY-04: 本地工作区存在污点临时文件**
  - **建议**：在合并前进一步整理 `.gitignore`，并执行 `git clean -fd` 恢复干净工作树。

---

## 七、给开发团队（MiMo/Qwen）的修复与优化建议

1. **解决 P1-SCENARIO-01 缺陷（优先级：最高）**：
   请立即修改 [DailyOperationsWorkbench.tsx](file:///D:/abf-capacity-calculator/frontend/src/pages/DailyOperationsWorkbench.tsx#L342) 第 342 行的入参：
   ```diff
   - capacityShiftTarget: 'bu',
   + capacityShiftTarget: 'both',
   ```
   由于当前底层仅支持平移 `both`，该修复可瞬间消除 UI 端的运行抛错，让容量延期场景分析功能恢复可用。
2. **补全测试用例**：
   在 `operationalScenario.test.ts` 中追加针对 `shiftCapacityPlans` 不支持参数的断言：
   ```typescript
   expect(() => shiftCapacityPlans(..., 'bu', ...)).toThrowError(/not supported/);
   ```
3. **增加 Vitest 单测超时容错**：
   针对 Workbench 测试超时问题，在 `DailyOperationsWorkbench.test.tsx` 挂载测试中可传入特定超时参数，或在全局 `vitest.config` 适当调高运行超时阀值。
4. **清理工作树**：
   在合并主线前，运行 `git restore` 与 `git clean -fd` 确保本地工作区处于 100% 洁净状态。
