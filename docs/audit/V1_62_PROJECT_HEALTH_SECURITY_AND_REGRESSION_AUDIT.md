# v1.62 Project Health, Security & Regression Audit

**Date:** 2026-06-08
**Branch:** `xiaomi/v1-62-project-health-audit`
**Baseline:** v1.62.0

---

## Executive Summary (执行摘要)

| Area (领域) | Verdict (审计结论) | Critical (致命) | High (高危) | Medium (中危) | Low (低危) |
|------|---------|----------|------|--------|-----|
| API Key Security | ✅ PASS | 0 | 0 | 0 | 0 |
| Firestore Rules | ✅ PASS | 0 | 0 | 0 | 0 |
| DeepSeek Proxy | ✅ PASS | 0 | 0 | 0 | 0 |
| BYOK/AI Drawer | ✅ PASS | 0 | 0 | 0 | 0 |
| BP Version History | ✅ PASS (隔离已加固) | 0 | 0 | 0 | 0 |
| Regression Guards | ✅ HARDENED (加固至36项) | 0 | 0 | 0 | 0 |
| i18n Health | ✅ PASS | 0 | 0 | 0 | 0 |
| Debug Code | ✅ PASS | 0 | 0 | 0 | 0 |
| Package Health | ✅ PASS | 0 | 0 | 0 | 0 |

**Total: 0 active findings (36/36 checks passed)**

---

## 1. Security: API Key Exposure (API 密钥泄露审计)

**Verdict: PASS — 源码中完全无敏感信息泄露**

审计过程中全面扫描了所有前端及 Functions 源代码：
- **无 `sk-`** (DeepSeek/OpenAI 密钥前缀)：前端核心逻辑、`BpTargets.tsx`、`aiChatService.ts` 等文件无任何硬编码密钥。
- **云函数 API 密钥安全**：`DEEPSEEK_API_KEY` 变量仅用于 Functions 环境变量与 Firebase Secret Manager (`functions/src/index.ts` 中配置 `secrets: ['DEEPSEEK_API_KEY']`)，杜绝了明文存储和代码仓库泄露。
- **客户端 Firebase Config**：配置完全提取为 `.env` 构建期变量，并在运行时实施了严格的初始化防错断言。

---

## 2. Security: Firestore Rules (Firestore 安全规则审计)

**Verdict: PASS — 规则严密，权限合理收敛**

- 所有的读写逻辑都受到了严格的身份检验（`isSignedIn()`、`isSelf(uid)`），拒绝一切未登录用户的访问。
- 分层权限结构：针对 Workspaces 分设了 `owner`、`editor` 与 `viewer` 角色，没有出现特权提升和逻辑漏洞。
- 快照的不可变性（Snapshots Immutability）：`snapshots` 集合的 `update` 权限被写死为 `allow update: if false;`，完全防止了已生成的计算模型快照被篡改的风险。

---

## 3. Security: DeepSeek Proxy (DeepSeek 安全代理审计)

**Verdict: PASS — 代理隔离度极高**

客户端永远不与 DeepSeek 的 API 端点直接通信，架构流程符合设计标准：
```
Client (前端) → callAiChatProxy() → Cloud Functions (包含 Auth & CORS 白名单校验)
                                            ↓ (从 Secret Manager 挂载密钥)
                                    DeepSeek API
```
- **身份认证**：必须通过有效的 Firebase Auth ID Token。
- **CORS 机制**：限制在特定的 Firebase 域名和本地开发接口。
- **输入过滤**：过滤大小不得超过 50KB 的输入，阻断了非预期的注入和缓冲区溢出攻击。
- **速率限制 (Rate Limiting)**：云函数具备针对用户的限流策略（10 req/min），避免被恶意刷爆额度。

---

## 4. AI Drawer / BYOK (AI 抽屉与 BYOK 消除审计)

**Verdict: PASS — 移除了所有 BYOK 输入框**

- `AiProviderSettingsDrawer` 只支持 `'deepseek-proxy'` 模式，无任何允许输入 API 密钥的 Input 框。
- `AiProviderAdapter` 内置的 Provider 对象均标注 `requiresApiKey: false`。
- `CopilotChat` 没有遗留的密钥获取逻辑，完美杜绝了用户的密钥在前端被窃取的隐患。

---

## 5. BP Version History — Storage Key Security (BP 版本历史用户隔离审计)

**Verdict: PASS — 数据完全隔离**

- 历史缓存键在 `BpTargets.tsx` 中已经更新为：`bp-versions-${scope.userId}-${scope.projectId || ''}`。
- 本次审计中确认了前端的所有加载与存储操作（`localStorage.getItem` 和 `localStorage.setItem`）全部对准了这一隔离键，避免了同一台公共工作站上，不同登录用户因为 `projectId` 为空或同名而发生缓存交叉污染的风险。

---

## 6. Regression Guards (回归防护加固审计)

**Verdict: PASS — verify:release-baseline 加固至 36 项**

为了保证未来在进行其他开发或分支合并时，这些安全特性和新版 UI 布局不会退化（Regression），本次审计将校验防护脚本进行了大幅加固：
1. **添加对前端 `services/aiChatService.ts` 的密钥扫描**（防止开发中意外将 Key 写入请求代理层）。
2. **添加对云函数 Secret 绑定配置的自动化扫描**（确保 `index.ts` 必定声明绑定 Secret `DEEPSEEK_API_KEY`）。
3. **添加对云函数 `aiChat.ts` 的 API Key 获取位置扫描**（强制从 `process.env.DEEPSEEK_API_KEY` 取值）。
4. **添加对 `BpTargets.tsx` 中 `scope.userId` 缓存键隔离的静态语法提取校验**。

**当前 verify:release-baseline 检测清单 (36 项)：**
- [x] 核心版本校验（Version ≥ v1.60.x）
- [x] Copilot 全局 Drawer 挂载验证（4项）
- [x] Risk Brief (风险简报) 数据项检测（3项）
- [x] Workbench 年度运营指标变量检测（2项）
- [x] BP 模拟运行状态与版本历史保存验证（2项）
- [x] PageShell 宽版布局样式及各个页面的 variant 挂载情况（7项）
- [x] 菜单导航中不可出现 copilot 菜单项（1项）
- [x] 防止旧中文文案退化（问题摘要、今日行動建議）（2项）
- [x] 静态密钥审计（防止 BpTargets/aiChatService 硬编码 sk- 与 DEEPSEEK_API_KEY）（4项）
- [x] AI 抽屉及 BYOK 输入彻底剔除校验（2项）
- [x] 禁用生产环境 console.log（1项）
- [x] 废弃的旧 `TwkPage` 逻辑清除校验（1项）
- [x] Firestore rules 开放规则安全检测（2项）
- [x] BP 版本历史 Storage Key 用户隔离格式检测（1项）
- [x] 云函数 Secret Manager 声明及配置检测（3项）
- [x] 国际化 zhTW/en 的翻译键一致性警告提示（1项）

---

## 7. i18n Health (国际化翻译健康审计)

**Verdict: PASS**

- `zhTW.ts` 和 `en.ts` 的 Key 解析对等。
- 自动化测试 `i18nKeys.test.ts` 实时把关，预防乱码（mojibake）以及繁简混杂的情况。

---

## 8. Debug Code (调试及冗余代码审计)

**Verdict: PASS**

- 所有生产级 `.ts` / `.tsx` 文件不存在残留的 `console.log()` 或 `debugger`。
- 不存在残留的临时开发接口。

---

## 9. Package Health (依赖包版本审计)

**Verdict: PASS — 均为安全、较新的依赖版本**

| Package | Version | Status |
|---------|---------|--------|
| React | ^19.2.6 | 最新 React 19 稳定版 |
| Ant Design | ^6.4.3 | 最新稳定版 |
| Firebase | ^12.13.0 | 最新 v12.x 稳定版 |
| TypeScript | ~6.0.2 | 启用最新 TS 版本编译 |
| Vitest | ^4.1.6 | 单元测试框架 |

---

## Actions Taken (已采取的加固行动)

1. **加固校验脚本**：重构了 `scripts/verify-release-baseline.cjs`，从 23 个静态检测项提升到 36 个检测项，覆盖了前端和后端的关键安全卡口与隔离格式。
2. **运行全套测试**：执行了 ESLint 语法检查（`npm run lint -- --quiet`）、前端编译（`npm run build`）、1546 个单元测试用例（`npm test -- --run`）以及加固后的基线检测（`npm run verify:release-baseline`），各项检测全部在绿灯状态下通过。
3. **输出本审计报告**：生成并封存本审计报告，作为本次发布 and 继续开发前的安全健康基准。

---

## Recommendations (后续改进建议)

1. **持续监控 rate limit 云函数**：目前的内存 rateLimit 基于实例内存桶。若云函数冷启动频率极高或业务量剧增，建议迁移到 Redis 或 Firestore 存储令牌桶。
2. **保持 merge 基线校验策略**：团队所有合并前的主线 PR 必须强制执行 `npm run verify:release-baseline` 卡口。
