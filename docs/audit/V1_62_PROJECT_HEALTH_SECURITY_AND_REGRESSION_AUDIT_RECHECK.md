# v1.62 Project Health, Security & Regression Audit — Recheck Report
# v1.62 项目健康、安全与回退风险审计复验报告

**Date:** 2026-06-08
**Rechecker:** Antigravity (AI Auditor)
**Branch:** `agy/v1-62-project-health-security-audit-recheck`
**Verdict:** ⚠️ **CONDITIONAL PASS** (有条件的通过)

---

## 1. Executive Summary (评估摘要)

对 CC 上一轮完成的 `v1.62` 审计报告进行独立只读复验，评估结论如下：

*   **P0 (致命缺陷)**: 0
*   **P1 (高危/Guard漏洞)**: 2 (回退防护脚本 verify-release-baseline.cjs 对部分历史回退场景覆盖不全)
*   **P2 (中低危/体验优化)**: 1 (BP 版本历史使用 LocalStorage + userId 的协作局限性)
*   **CC 审计质量评价**: **高度认可，但不够严密**。CC 准确完成了安全漏洞的封堵与 userId 隔离，并将基线防护脚本切实扩充到了 36 项，但在对“非典型回退项”的 guard 覆盖率上存在一定的盲区，存在被绕过的可能。
*   **是否可以进入下一阶段开发**: **可以**。在补充相关 regression guard 后可直接推进。

---

## 2. verify-release-baseline.cjs 项数与覆盖率核验

经过逐行分析 [`verify-release-baseline.cjs`](file:///D:/abf-capacity-calculator/scripts/verify-release-baseline.cjs) 脚本逻辑，**实际确实包含 36 项独立的校验点**。

### 2.1 36项 Guard 规则明细清单

1.  **项目版本限制** (1项): 强制版本号 $\ge$ v1.60.x。
2.  **全局 AI 抽屉挂载** (4项): App.tsx 中的 Provider/Button/Drawer 组件以及 context 的引入。
3.  **Risk Brief 数据键校验** (3项): 计算结果页中 `executiveConclusion`、`findings` 和 `planStatus` 的解析。
4.  **年度营运指标变量** (2项): Workbench 页面中 `metricsYear` 和 `annualRevenue` 的声明与渲染。
5.  **BP 模拟保存** (2项): 模拟激活参数 `simActive` 以及保存版本函数 `handleSaveVersion` 的存在性。
6.  **PageShell 宽版自适应布局** (7项): 布局组件存在性、CSS 类配置以及 5 个主要功能页面的 variant variant 绑定。
7.  **导航菜单清理** (1项): 主导航中严格禁止存在 `key: 'copilot'` (AI 助手不放入主导航入口)。
8.  **反向旧文案回退** (2项): 拒绝繁体版「問題摘要」和「今日行動建議」回滚。
9.  **敏感密钥静态审计** (4项): 前端 `BpTargets.tsx` 和 `aiChatService.ts` 不允许存在明文 `sk-` 与 `DEEPSEEK_API_KEY`。
10. **AI Drawer BYOK 剔除** (2项): `CopilotChat.tsx` 中屏蔽 apiKey，`AiProviderSettingsDrawer.tsx` 中屏蔽 BYOK 配置。
11. **生产环境调试清理** (1项): 拒绝 `BpTargets.tsx` 中残留 `console.log`。
12. **LocalStorage 缓存用户隔离** (1项): 检查 BpTargets.tsx 内拼接缓存键是否包含 `scope.userId`。
13. **Functions 云函数配置审计** (3项): `index.ts` 绑定 `DEEPSEEK_API_KEY` Secret，`aiChat.ts` 从环境变量取值，`deepseekClient.ts` 无硬编码 key。
14. **旧死代码清理** (1项): 检查 `components/ui/index.ts` 中废弃组件 `TwkPage` 的残留。
15. **Firestore 规则开放性** (2项): 拒绝 `allow read, write: if true` 或 `if request.auth == null` 的规则。
16. **i18n 翻译一致性** (1项): 中英翻译 key 数量差值控制在 50 个以内。

---

### 2.2 回退风险防御覆盖评估 (漏网与漏洞分析)

对用户提出的 10 项特定回退风险进行覆盖性逐项评估，发现了 **2 处 Regression Guard 漏洞 (P1)**：

| 序号 | 预期回退风险场景 | 36项 Guard 覆盖逻辑 | 评估 verdict | 漏洞/风险说明 |
|---|---|---|---|---|
| 1 | v1.58.0 版本回退 | `pkg.version >= v1.60.x` | ✅ 覆盖 | 直接拦截阻止降级。 |
| 2 | ABF CSS 品牌消失 | `tweakcnTheme.css` 含 `abf-page-shell--wide` | ✅ 覆盖 | 核心样式丢失时会报错。 |
| 3 | 宽版 PageShell 宽度回退 | 各主要页面 `PageShell variant` 强匹配 | ✅ 覆盖 | 误改为旧版布局或缺省配置将被直接拦截。 |
| 4 | 顶部全局 AI Drawer 消失 | App.tsx 中组件拼写静态存在性 | ✅ 覆盖 | 误删或误重写直接导致报错。 |
| 5 | 主导航独立 AI 入口恢复 | App.tsx 强制不包含 `key: 'copilot'` | ✅ 覆盖 | 杜绝 AI 助手回退到主导航。 |
| 6 | Operations 年度营运指标消失 | Workbench 中 `metricsYear`/`annualRevenue` 存在性 | ✅ 覆盖 | 精确检测指标变量是否存在。 |
| 7 | Pipeline Readiness 恢复「情境检视就绪」 | **无** | ❌ **漏网 (P1)** | 静态校验脚本中**没有任何规则**扫描或禁止“情境检视就绪”文案回退回归。 |
| 8 | Results 风险简报恢复旧版 | CalculationResults 页三大渲染键检测 | ✅ 覆盖 | 新版特有数据模型缺失会报错。 |
| 9 | BP 模拟/版本历史/回滚消失 | `simActive` 与 `handleSaveVersion` 检测 | ✅ 覆盖 | 模拟层被剥离时检测直接中断。 |
| 10 | 金额单位回退为旧格式 | **无** | ❌ **漏网 (P1)** | 静态校验脚本中**没有任何规则**对金额单位退化（如 "M TWD", "M CNY" 等）做反向阻断。 |

#### ⚠️ P1 级别回归漏洞修复建议：
为了彻底闭环这两处漏网之鱼，应在 `verify-release-baseline.cjs` 中加入对应的反向匹配规则（Invert Check），例如：
*   增加对 `DailyOperationsWorkbench.tsx` 中不含有繁简版「情境检视就绪」文案的校验。
*   增加对 `i18n` 翻译文件（`zhTW.ts` / `en.ts`）中不含有旧版短格式单位（如 `'M TWD'`, `'M CNY'` 等）的校验。

---

## 3. DeepSeek Key 与 Secret 独立泄露审计

**结论: PASS — 无任何密钥泄露**

*   **前端代码库扫描**：通过全局 `grep_search`，前端 `src/` 下除了测试文件（`*.test.ts`/`*.test.tsx`）中使用 Mock 字符串（如 `'sk-123'`、`'sk-secret-leak-test-key-12345'`）对脱敏器进行边界红队测试外，没有任何生产 `.ts`、`.tsx` 和 `.html` 文件中存在硬编码 `sk-` 的明文密钥。
*   **后端 Secret 安全映射**：云函数主入口通过 `secrets: ['DEEPSEEK_API_KEY']` 从 Google Cloud Secret Manager 获取，后端逻辑 `aiChat.ts` 统一从 `process.env.DEEPSEEK_API_KEY` 寻址，属于 Firebase v2 HTTPS 云函数的最佳安全实践。

---

## 4. BP Version History 隔离机制安全性与局限性评估 (P2)

**结论: PASS (本级隔离有效，但存在跨设备协作局限)**

*   **LocalStorage + scope.userId 机制**：
    *   **优点**：解决了单机/公用设备上多账户登录时的本地缓存碰撞越权显示风险。
    *   **协作权限风险 (P2)**：由于 LocalStorage 纯属客户端浏览器缓存，**完全不支持跨设备同步**。用户在设备 A 上做出的 BP 模拟历史在设备 B 上不可见。若用户手动清理浏览器缓存、Cookie，或使用无痕模式，模拟版本将永久丢失。
    *   **安全性风险**：LocalStorage 中的草稿是明文存储的，无法防范设备端 XSS 攻击的提取。
    *   **建议**：在当前“临时草稿 simulation 阶段”，由于不更改核心产品数据，使用 LocalStorage 隔离属于一种高性价比折中方案；但若业务升级到“团队协同编辑模拟版本”，必须迁移到 Firestore `workspaces/{wid}/projects/{projectId}/simulations` 云端集合。

---

## 5. 编译与单元测试复查运行日志

在 `agy/v1-62-project-health-security-audit-recheck` 分支上重新进行了全套测试和编译，均顺利通过：

1.  **Frontend Lint** (`npm run lint -- --quiet`): **PASS** 无警告与错误。
2.  **Frontend Build** (`npm run build`): **PASS** 编译构建成功。
3.  **Frontend Tests** (`npm test -- --run`): **PASS** 64个测试文件，1546 个用例全部通过。
4.  **Frontend Baseline Verify** (`npm run verify:release-baseline`): **PASS** 基线卡口扫描全部通过。
5.  **Functions Build** (`npm run build`在functions目录): **PASS** 编译成功（tsc 零报错）。
