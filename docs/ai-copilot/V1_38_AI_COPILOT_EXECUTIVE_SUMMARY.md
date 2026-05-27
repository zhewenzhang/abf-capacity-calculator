# v1.38 AI Data Copilot Foundation — Executive Summary

> **Orchestrator 整合文件**
> 建立日期：2026-05-27
> 分支：`xiaomi/v1-38-ai-data-copilot-foundation`
> 狀態：Phase A 文件規劃完成，待進入實作

---

## 1. 本輪多 Agent 任務完成內容

本輪使用 Claude Code 多 Agent / sub-agent 協作能力，實際派出 6 個專門 sub-agent 並行執行：

| Agent | 角色 | 任務 | 產出文件 | 行數 |
|-------|------|------|---------|------|
| Agent 1 | Project Context Research | 全面理解專案架構與已完成功能 | V1_38_PROJECT_CONTEXT_FOR_AI_COPILOT.md | 1,072 |
| Agent 2 | Product UX | 設計 AI Copilot 產品體驗 | V1_38_AI_DATA_COPILOT_PRODUCT_SPEC.md | 512 |
| Agent 3 | AI Context & Tool Architecture | 設計 AI 可安全讀取的 context 與工具層 | V1_38_AI_CONTEXT_AND_TOOL_ARCHITECTURE.md | 1,879 |
| Agent 4 | AI Safety / Trust Boundary | 設計 AI 安全邊界與 guardrails | V1_38_AI_COPILOT_SAFETY_GUARDRAILS.md | 582 |
| Agent 5 | QA / Evaluation | 設計驗收、評測與 smoke test | 3 files (checklist + smoke test + rubric) | ~1,200 |
| Agent 6 | Implementation Prompt Integrator | 整合成可直接交給 CC 實作的 MVP Prompt | CC_V1_38_AI_DATA_COPILOT_MVP_PROMPT.md | 946 |

Orchestrator 負責：建立分支、提供專案上下文、派出 agent、等待回收、一致性整合、新增本文件、commit + push。

---

## 2. 新增文件索引

### 本次新增（7 個文件）

| 文件 | 大小 | 用途 |
|------|------|------|
| `V1_38_PROJECT_CONTEXT_FOR_AI_COPILOT.md` | 46.9 KB | 專案架構、資料模型、資料流、安全資料清單 |
| `V1_38_AI_DATA_COPILOT_PRODUCT_SPEC.md` | 59.8 KB | 產品 UX 規格：6 個核心功能、UI 元件、資料流 |
| `V1_38_AI_CONTEXT_AND_TOOL_ARCHITECTURE.md` | 67.6 KB | Context builder、6 個 tool 定義、draft 模式、API key 規劃 |
| `V1_38_AI_COPILOT_SAFETY_GUARDRAILS.md` | 27.2 KB | 12 條安全 guardrail、violation 處理流程 |
| `V1_38_AI_COPILOT_ACCEPTANCE_CHECKLIST.md` | 14.5 KB | 10 項驗收清單、blocking 條件 |
| `V1_38_AI_COPILOT_SMOKE_TEST_SCRIPT.md` | 14.2 KB | 9 個測試階段、安全紅隊測試、邊界案例 |
| `V1_38_AI_COPILOT_EVAL_RUBRIC.md` | 14.3 KB | 8 維度 100 分評分標準、10 個 veto 條件 |
| `CC_V1_38_AI_DATA_COPILOT_MVP_PROMPT.md` | 36.9 KB | 完整實作 prompt：8 個任務、rollback plan |
| `V1_38_AI_COPILOT_EXECUTIVE_SUMMARY.md` | 本文件 | Orchestrator 整合摘要 |

### 已存在（4 個文件，本次未修改）

| 文件 | 用途 |
|------|------|
| `V1_38_AI_COPILOT_MVP_SCOPE_REVIEW.md` | MVP 範圍審查 |
| `V1_38_AI_COPILOT_RED_TEAM_TESTS.md` | 紅隊測試案例 |
| `V1_38_AI_COPILOT_RELEASE_REVIEW_TEMPLATE.md` | 發佈審查模板 |
| `V1_38_AI_COPILOT_SAFETY_ACCEPTANCE_GATE.md` | 11 項安全驗收閘道 |

---

## 3. v1.38 MVP 一句話定義

**v1.38 AI Data Copilot Foundation**：在產品內嵌入一個確定性 AI Copilot 面板，使用現有計算引擎的輸出作為 context，透過 6 個本地 tool 為使用者提供資料問題診斷、產能風險解析、BP 差距解釋、情境影響分析、資料修復建議，所有建議以 draft 形式呈現並需人工確認後方可儲存。**第一版不接真 AI API，所有回應為確定性 / 本地 tool 輸出。**

---

## 4. v1.38 明確不做什麼

| # | 不做 | 原因 |
|---|------|------|
| 1 | 不接真 AI / LLM API | 避免 API key 安全風險，先驗證 UX 與 tool 架構 |
| 2 | 不改計算公式 | 計算引擎為 frozen core |
| 3 | 不新增 Firestore schema | 無新集合、新欄位 |
| 4 | 不新增 Cloud Functions / backend | 純前端 feature |
| 5 | 不自動儲存任何資料 | 所有修復為 draft，需人工確認 |
| 6 | 不推測 missing data | AI 不猜測，只標記 |
| 7 | 不允許 Viewer 寫入 | Viewer 只能問問題，不能看到修復 UI |
| 8 | 不新增 npm dependency | 使用現有 Ant Design + React |
| 9 | 不修改 firestore.rules | 權限模型不變 |
| 10 | 不做多輪記憶 / 對話歷史 | MVP 為單輪問答 |

---

## 5. 最大產品風險

**風險：使用者誤以為 AI 回應是「權威建議」而盲目採納。**

- 即使是確定性 tool 輸出，包裝成「AI Copilot」後使用者可能降低判斷力
- F-A-I-R 標示（Fact / Assumption / Inference / Recommendation）可能被忽略
- 修復建議即使標示為 draft，使用者可能不經審核就確認

**緩解措施**：
- 所有回應必須標示 confidence level 與 F-A-I-R 分類
- 確認對話框預設焦點在「取消」而非「確認」
- Viewer 完全看不到修復 UI
- Low confidence 時降級語氣，blocked 時拒絕回答

---

## 6. 最大技術風險

**風險：Context builder 與 tool 層的維護成本。**

- Context 必須從 6+ 個現有模組組裝，任一模組 API 變動都會影響 copilot
- 6 個 tool 各有不同 input/output schema，需要嚴格的 TypeScript 類型守衛
- 確定性回應的「AI 感」可能不足，使用者體驗可能低於預期

**緩解措施**：
- Context builder 只讀取現有模組輸出，不修改模組
- Tool 層使用 adapter pattern，隔離上游變動
- 透過 i18n 和 F-A-I-R 標示提升回應品質
- Feature flag（`COPILOT_ENABLED`）可隨時關閉

---

## 7. AI 安全紅線摘要

### 10 條 Veto-Class Red Lines（繼承自 AI_SAFETY_GUARDRAILS.md）

| # | 紅線 | Copilot 實作對應 |
|---|------|-----------------|
| 1 | 禁止改公式 | G1: tool 不可修改任何計算參數 |
| 2 | 禁止猜 missing data | G2: 缺失資料只標記，不推測 |
| 3 | 禁止混 USD/TWD/CNY | G3: 所有數值必須標示幣別 |
| 4 | 禁止 proportional → causal | G4: 使用「貢獻」而非「導致」 |
| 5 | 禁止違反假設 | G7: F-A-I-R 標示所有結論 |
| 6 | 禁止繞過 confidence | G9: 依 confidence 降級語氣 |
| 7 | 禁止自動商業決策 | G5: 所有修復為 draft |
| 8 | 禁止繞過 human-in-the-loop | G5: 確認對話框，預設取消 |
| 9 | 禁止 metric registry 違規 | G10: weightedPressureIndex ≠ 物理需求 |
| 10 | 禁止情境過度承諾 | G10: 情境分析必須標示假設 |

### 12 條 Implementation Guardrails（Agent 4 產出）

G1-G12 覆蓋：公式不可變、不猜測、貨幣隔離、不偽因果、不自動儲存、Viewer 守門、F-A-I-R 分類、來源引用、語氣降級、輸出驗證、prompt injection 防禦、export 隱私。

---

## 8. 是否建議進入實作

**建議：是，但附帶條件。**

### 建議進入實作的理由：
1. 安全框架完整：10 條 red lines + 12 條 guardrails + 11 項 acceptance gates
2. 架構設計可行：Context builder + 6 個 deterministic tools，不需外部 API
3. 風險可控：Feature flag 可隨時關閉，不影響現有功能
4. 現有基礎扎實：analysisContract、aiBriefExport、dataQuality 已提供豐富的可複用模組

### 進入實作前必須確認的條件：
1. 產品負責人確認 UX 規格（Agent 2 產出）
2. 安全團隊確認 guardrails（Agent 4 產出）
3. QA 團隊確認驗收標準（Agent 5 產出）
4. 技術負責人確認架構設計（Agent 3 產出）

---

## 9. v1.38 實作前必須確認的 10 條紅線

| # | 索引 | 紅線 | 驗證方式 |
|---|------|------|---------|
| R1 | G1 | 不可修改計算引擎任何檔案 | `git grep` 無 modification to core/* |
| R2 | G2 | 不可推測或填補缺失資料 | Tool output 無 invented values |
| R3 | G3 | 不可混合幣別做算術 | 每個數值標示幣別 |
| R4 | G4 | 不可將 proportional attribution 說成因果 | 用語檢查：「貢獻」非「導致」 |
| R5 | G5 | 不可自動儲存任何資料 | 無 auto-save pattern，確認對話框預設取消 |
| R6 | G6 | Viewer 不可看到修復 UI | `canEdit(role)` guard 在所有 fix 元件 |
| R7 | G7 | 所有結論必須標示 F-A-I-R | Response 模板強制分類 |
| R8 | G8 | 所有建議必須引用 source | 每個回應包含來源模組名稱 |
| R9 | G9 | Low/blocked confidence 必須降級語氣 | Tone downgrade 邏輯存在 |
| R10 | G10 | 不可新增 Firestore schema / Cloud Functions | `git diff` 無 firestore.rules / functions/ |

---

## 10. 各 Sub-Agent 產出摘要

### Agent 1 — Project Context Research
- 產出：V1_38_PROJECT_CONTEXT_FOR_AI_COPILOT.md（1,072 行）
- 內容：10 個章節涵蓋產品能力、資料模型、資料流、DQ 系統、export 管線、snapshot 機制、角色權限、安全/禁止資料清單
- 亮點：完整列出 30+ 核心源碼檔案路徑和 10 個相關文檔引用

### Agent 2 — Product UX
- 產出：V1_38_AI_DATA_COPILOT_PRODUCT_SPEC.md（512 行）
- 內容：5 級 answer 分類框架、6 個核心功能規格、UI 元件設計、context builder 規格、prompt 模板、資料流架構
- 亮點：Copilot Drawer wireframe、Quick Question Buttons（6 個預設問題）、Human Confirmation Modal（預設焦點取消）

### Agent 3 — AI Context & Tool Architecture
- 產出：V1_38_AI_CONTEXT_AND_TOOL_ARCHITECTURE.md（1,879 行）
- 內容：AiCopilotContext schema（9 個 section）、sanitizeDeep() 雙 pass 流程、6 個 tool 完整定義、CopilotDraft 模式、API key 規劃
- 亮點：每個 tool 有 input/output interface + implementation notes + safety constraints，draft lifecycle 圖

### Agent 4 — AI Safety / Trust Boundary
- 產出：V1_38_AI_COPILOT_SAFETY_GUARDRAILS.md（582 行）
- 內容：12 條 guardrail（G1-G12），每條含溯源、規範聲明、禁止行為表、正確行為、標準回應模板
- 亮點：3 個跨 guardrail 協同攻擊場景、violation 處理流程圖

### Agent 5 — QA / Evaluation
- 產出：3 個文件（43 KB）
  - Acceptance Checklist：10 項驗收，4 項 blocking 條件
  - Smoke Test Script：9 個測試階段 + 安全紅隊測試 + 邊界案例
  - Eval Rubric：8 維度 100 分 + 10 個 veto 條件
- 亮點：具體測試數據場景（如「Core utilization 128% in Jun-Sep」）、scorecard 模板

### Agent 6 — Implementation Prompt Integrator
- 產出：CC_V1_38_AI_DATA_COPILOT_MVP_PROMPT.md（946 行）
- 內容：8 個實作任務（A-H）、允許/禁止修改檔案清單、測試要求、release checklist、rollback plan、完成報告格式
- 亮點：完整 Copilot Chat wireframe、keyword matching rules、feature flag 設計、未來 API 接入規劃

---

## 附錄：文件間一致性檢查

| 檢查項 | 結果 |
|--------|------|
| 10 條 red lines 在所有文件中一致引用 | Pass |
| 6 個 tool 名稱在 Agent 3 / Agent 6 中一致 | Pass |
| SENSITIVE_KEYS 清單在所有文件中一致 | Pass |
| F-A-I-R 分類在所有文件中一致 | Pass |
| Viewer 角色限制在所有文件中一致 | Pass |
| Currency handling 規則在所有文件中一致 | Pass |
| Confidence 降級規則在所有文件中一致 | Pass |
| 不接真 AI API 在所有文件中一致聲明 | Pass |
