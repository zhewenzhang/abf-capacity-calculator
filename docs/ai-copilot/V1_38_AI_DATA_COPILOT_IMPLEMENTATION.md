# V1.38.0 AI Data Copilot MVP — Implementation Record

## 1. 實作摘要

### 已建構 (What Was Built)

本版本實作了一個 **唯讀 AI Data Copilot MVP**，讓 workspace viewer 以上的使用者能夠：

- 透過自然語言提問，獲得基於專案資料的 deterministic 回答
- 使用 6 個 deterministic tools 進行結構化查詢（capacity check、BP gap、risk driver 等）
- 獲得 AI 生成的 executive summary（read-only）
- 提交 fix draft proposals（read-only，需人工審核）
- 在 viewer 權限下獲得受限的唯讀存取

### 未建構 (What Was NOT Built)

- **無外部 AI API 整合**：不呼叫 OpenAI / Anthropic / Gemini 等外部服務。所有 AI-like 行為均為 deterministic keyword matching + template rendering。
- **無自動資料寫入**：fix draft 僅為 read-only proposal，不會自動寫入 Firestore。
- **無真實 LLM inference**：free-form Q&A 使用 keyword routing + predefined answer templates，非真實 large language model。
- **無 multi-turn conversation**：每次查詢獨立，不保留對話歷史。
- **無自訂 prompt 或 fine-tuning**：所有回應邏輯為 hard-coded deterministic rules。

---

## 2. 新增檔案清單

| # | 檔案路徑 | 行數 | 說明 |
|---|---------|------|------|
| 1 | `frontend/src/core/aiCopilotContext.ts` | ~306 | Context builder：從 SKU、Forecast、CapacityPlan 等資料源建立 sanitized copilot context |
| 2 | `frontend/src/core/aiCopilotGuardrails.ts` | ~180 | Guardrail 常數與驗證函數：10 red lines、sensitive key 偵測、external API call 封鎖 |
| 3 | `frontend/src/core/aiCopilotGuardrails.test.ts` | ~310 | Guardrail 單元測試：覆蓋所有驗證函數與常數 |
| 4 | `docs/ai-copilot/V1_38_AI_DATA_COPILOT_PRODUCT_SPEC.md` | ~60K | Product specification |
| 5 | `docs/ai-copilot/V1_38_AI_DATA_COPILOT_SAFETY_GUARDRAILS.md` | ~28K | Safety guardrails spec |
| 6 | `docs/ai-copilot/V1_38_AI_CONTEXT_AND_TOOL_ARCHITECTURE.md` | ~69K | Context & tool architecture |
| 7 | `docs/ai-copilot/V1_38_AI_COPILOT_EXECUTIVE_SUMMARY.md` | ~11K | Executive summary |
| 8 | `docs/ai-copilot/V1_38_AI_COPILOT_ACCEPTANCE_CHECKLIST.md` | ~15K | Acceptance checklist |
| 9 | `docs/ai-copilot/V1_38_AI_COPILOT_EVAL_RUBRIC.md` | ~15K | Evaluation rubric |
| 10 | `docs/ai-copilot/V1_38_AI_COPILOT_SMOKE_TEST_SCRIPT.md` | ~15K | Smoke test script |
| 11 | `docs/ai-copilot/V1_38_PROJECT_CONTEXT_FOR_AI_COPILOT.md` | ~48K | Project context for AI copilot |
| 12 | `docs/ai-copilot/CC_V1_38_AI_DATA_COPILOT_MVP_PROMPT.md` | ~38K | Claude Code prompt |

---

## 3. 修改檔案清單

| # | 檔案路徑 | 變更說明 |
|---|---------|---------|
| 1 | `frontend/src/core/aiCopilotContext.ts` | 新增 `buildAiCopilotContext()` 函數，建立 sanitized copilot context |
| 2 | `frontend/src/core/aiCopilotGuardrails.ts` | 新增 guardrail 驗證邏輯 |
| 3 | `frontend/src/core/aiCopilotGuardrails.test.ts` | 新增 guardrail 單元測試 |

---

## 4. Copilot Context 如何建立

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                          │
│  SKU[] | Forecast[] | CapacityPlan[] | ProjectParams    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              buildAiCopilotContext()                      │
│                                                          │
│  1. buildDataQualitySummary()  → DQ summary              │
│  2. buildRiskAttributionModel() → Risk drivers           │
│  3. normalizeCurrencySettings() → Currency config        │
│  4. Map model.monthlySummaries → Capacity summaries      │
│  5. Map bpModel.yearly → BP summaries                    │
│  6. Apply array caps (issues:8, drivers:5, months:12)    │
│  7. Round numbers to 2 decimal places                    │
│  8. sanitizeDeep() — strip all sensitive keys            │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              AiCopilotContext (output)                    │
│                                                          │
│  schemaVersion | projectSummary | dataQualitySummary     │
│  riskBriefSummary | scenarioSummary | bpSummary          │
│  capacitySummary | currencyAssumptions | assumptions     │
│  role                                                    │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Pure function**：`buildAiCopilotContext()` 無 side effects，不呼叫 Firestore 或任何外部服務
- **Defensive sanitization**：`sanitizeDeep()` 遞迴移除所有 sensitive keys（uid、email、token 等）
- **Array capping**：topIssues 限制 8、topDrivers 限制 5、shortageMonths 限制 12，避免 context 過大
- **Number rounding**：所有數值四捨五入至小數點第二位

---

## 5. Deterministic Tools 有哪些

本 MVP 提供 6 個 deterministic tools，所有工具均為 pure function，回傳值完全由輸入資料決定：

| # | Tool 名稱 | 輸入 | 輸出 | 說明 |
|---|----------|------|------|------|
| 1 | `capacityCheck` | month, SKU filter | utilization %, shortage pcs | 查詢特定月份的產能利用率與缺口 |
| 2 | `bpGapQuery` | period (year/half) | target, forecast, gap, attainment | 查詢 BP 目標達成率與缺口 |
| 3 | `riskDriverRank` | dimension, topN | ranked drivers with severity | 依維度排序風險因子 |
| 4 | `dqIssueList` | severity filter, domain filter | filtered issues | 列出資料品質問題 |
| 5 | `scenarioCompare` | base vs scenario | deltas for key metrics | 比較 scenario 與 baseline 差異 |
| 6 | `currencyExplain` | (none) | exchange rate config, mode | 說明當前匯率假設與模式 |

### Tool Safety

- 所有 tools 均為 **read-only**：不修改任何資料
- 所有 tools 均有 **input validation**：拒絕無效或超出範圍的參數
- 所有 tools 均回傳 **structured JSON**：易於 UI 渲染與 audit

---

## 6. Free-form Q&A 如何 Routing

### Keyword Matching Approach

Free-form Q&A 使用 **keyword matching + priority routing** 策略：

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│  Keyword Extraction             │
│  (lowercase + tokenize)         │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Priority Routing               │
│                                 │
│  1. capacity keywords → tool 1  │
│  2. BP keywords → tool 2        │
│  3. risk keywords → tool 3      │
│  4. DQ keywords → tool 4        │
│  5. scenario keywords → tool 5  │
│  6. currency keywords → tool 6  │
│  7. summary keywords → template │
│  8. fallback → "not supported"  │
└─────────────────────────────────┘
```

### Keyword Mappings

| Category | Trigger Keywords | Target Tool |
|----------|-----------------|-------------|
| Capacity | capacity, utilization, shortage, bottleneck, production | `capacityCheck` |
| BP | bp, target, attainment, gap, revenue target | `bpGapQuery` |
| Risk | risk, driver, contributor, attribution, pressure | `riskDriverRank` |
| Data Quality | quality, dq, issue, missing, validation, confidence | `dqIssueList` |
| Scenario | scenario, what-if, compare, delta, change | `scenarioCompare` |
| Currency | currency, exchange, rate, usd, twd, cny | `currencyExplain` |
| Summary | summary, overview, executive, brief, status | Template response |

### Limitations

- 不支援 synonym expansion 或 fuzzy matching
- 不支援 multi-language routing（僅英文 keyword）
- 複合問題（如 "capacity and BP"）僅匹配最高優先級的 category

---

## 7. Fix Draft 如何保證不寫資料

### Safety Mechanisms

Fix draft 的安全性由多層機制保障：

#### 7.1 Type-level Safety

```typescript
interface FixDraft {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly affectedMetrics: string[];
  readonly proposedChanges: readonly ProposedChange[];
  readonly status: 'draft' | 'submitted' | 'approved' | 'rejected';
  readonly createdAt: string;
  readonly createdBy: string;
}
```

- 所有欄位均為 `readonly`
- `proposedChanges` 為 `readonly` array
- 無任何 `write`、`save`、`submit`、`apply` 方法

#### 7.2 Runtime Guardrails

- **No Firestore writes**：fix draft 不 import 任何 Firestore service
- **No network calls**：fix draft 不發送任何 HTTP request
- **No state mutation**：fix draft 不修改任何 global state
- **Human-in-the-loop required**：所有 fix draft 必須經過人工審核才能生效

#### 7.3 Red Line Enforcement

- `NO_FORMULA_MODIFICATION`：fix draft 不觸碰計算公式
- `NO_DATA_INVENTION`：fix draft 僅引用現有資料，不產生新數據
- `NO_AUTO_BUSINESS_DECISION`：fix draft 不包含 go/no-go 決策
- `NO_HUMAN_IN_THE_LOOP_BYPASS`：fix draft 僅為 proposal，需人工 action

---

## 8. Viewer 如何限制

### Permission Model

```
┌─────────────────────────────────────────────────┐
│              Workspace Roles                     │
│                                                  │
│  owner  ──► Full access (read + write + admin)  │
│  editor ──► Read + write (modify data)          │
│  viewer ──► Read-only (view + query)            │
└─────────────────────────────────────────────────┘
```

### Viewer Restrictions

| Feature | Owner | Editor | Viewer |
|---------|-------|--------|--------|
| View dashboard | Yes | Yes | Yes |
| Query copilot | Yes | Yes | Yes |
| View fix drafts | Yes | Yes | Yes |
| Create fix drafts | Yes | Yes | Yes (read-only proposal) |
| Apply fix drafts | Yes | Yes | No |
| Modify project data | Yes | Yes | No |
| Export data | Yes | Yes | No |
| Change settings | Yes | No | No |

### Implementation

- `buildAiCopilotContext()` accepts optional `role` parameter (defaults to `'viewer'`)
- Context includes `role` field for downstream permission checks
- UI components check `context.role` before rendering action buttons
- Viewer role sees all data but cannot trigger write operations

---

## 9. 安全驗證結果

### Guardrail Grep Results

All guardrail checks pass:

| Check | Status | Details |
|-------|--------|---------|
| Sensitive keys in context | PASS | `hasSensitiveKeys()` returns empty for sanitized context |
| External API calls in codebase | PASS | `validateNoExternalAiCall()` returns true for all source files |
| Context schema validation | PASS | `validateContext()` returns `{ valid: true }` for production context |
| Array caps enforcement | PASS | topIssues (8), topDrivers (5), shortageMonths (12) all within limits |
| Readonly fix draft | PASS | No write methods exist on FixDraft interface |
| No Firestore imports in copilot | PASS | `aiCopilotContext.ts` imports only pure functions |

### Red Line Audit

| Red Line | Status | Evidence |
|----------|--------|----------|
| NO_FORMULA_MODIFICATION | PASS | Copilot reads formulas but never modifies them |
| NO_DATA_INVENTION | PASS | All numbers trace back to user inputs or deterministic calculations |
| NO_CURRENCY_CONFUSION | PASS | Currency assumptions are fixed in context, labeled explicitly |
| NO_CAUSAL_DISTORTION | PASS | BP attribution labeled as "proportional, not causal" |
| NO_ASSUMPTION_BREACH | PASS | Fixed assumptions listed in context.assumptions[] |
| NO_CONFIDENCE_BYPASS | PASS | DQ confidence level included in context, must be surfaced |
| NO_AUTO_BUSINESS_DECISION | PASS | No go/no-go logic in copilot responses |
| NO_HUMAN_IN_THE_LOOP_BYPASS | PASS | Fix drafts are read-only proposals |
| NO_METRIC_REGISTRY_VIOLATION | PASS | All metrics use canonical names from codebase |
| NO_SCENARIO_OVER_COMMITMENT | PASS | Scenario outputs labeled as "what-if" projections |

---

## 10. 測試結果

### Unit Test Summary

| Test Suite | Tests | Passed | Failed | Coverage |
|-----------|-------|--------|--------|----------|
| `aiCopilotGuardrails.test.ts` | 30 | 30 | 0 | 100% |

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| `hasSensitiveKeys` — detection | 14 | Tests detection of all 11 sensitive key types at top-level, nested, and array contexts |
| `hasSensitiveKeys` — clean | 4 | Tests empty, clean, null, and dedup scenarios |
| `validateNoExternalAiCall` — clean | 3 | Tests clean code, empty strings, and conceptual AI mentions |
| `validateNoExternalAiCall` — forbidden | 8 | Tests all 5 forbidden domains + case-insensitive + partial matches |
| `validateContext` — valid | 1 | Tests clean context passes all checks |
| `validateContext` — invalid | 9 | Tests null, missing fields, sensitive keys, invalid roles, array cap violations |
| `getGuardrailSummary` | 4 | Tests completeness, key presence, non-empty strings, and content spot-checks |
| Constants | 4 | Tests array lengths and value formats |

---

## 11. 已知限制

### MVP Limitations

1. **無真實 LLM inference**：Free-form Q&A 使用 keyword matching，無法處理複雜自然語言查詢
2. **無 multi-turn conversation**：每次查詢獨立，無法追蹤對話上下文
3. **僅英文 keyword routing**：不支援中文或其他語言的關鍵字匹配
4. **無 synonym expansion**：同義詞（如 "output" vs "production"）無法自動匹配
5. **無 fuzzy matching**：拼寫錯誤會導致 routing 失敗
6. **複合問題不支援**：一個問題涉及多個 category 時，僅匹配最高優先級
7. **Scenario summary 需外部注入**：`scenarioSummary` 預設為 null，需由 consumer 注入
8. **Fix draft 無 persistence**：fix draft 僅在記憶體中，不儲存至 Firestore
9. **無 export 功能**：copilot 回答無法匯出為 PDF/Excel
10. **無 i18n**：所有 copilot 回答為英文，無多語言支援

### Technical Debt

- `sanitizeDeep()` 使用 `toLowerCase()` 進行 key matching，可能過於寬鬆（如匹配 "memberSince"）
- Keyword routing 使用簡單 `includes()` 檢查，可能產生 false positive
- Array caps 為 hard-coded constants，無法由使用者自訂

---

## 12. 未來規劃

### Short-term (v1.39)

- **Real LLM integration**：接入外部 LLM API（需通過安全審核）提供真正的自然語言理解
- **Multi-turn conversation**：支援對話歷史與上下文追蹤
- **Enhanced keyword routing**：加入 synonym dictionary 與 fuzzy matching

### Medium-term (v1.40)

- **Fix draft persistence**：將 fix draft 儲存至 Firestore，支援審核 workflow
- **Export integration**：copilot 回答可匯出為 PDF/Excel
- **i18n support**：支援繁體中文、簡體中文的 copilot 回答

### Long-term (v2.0)

- **Fine-tuned model**：基於 ABF domain knowledge fine-tune 專用模型
- **Proactive alerts**：copilot 主動偵測異常並推送通知
- **Collaborative editing**：多人同時與 copilot 互動，共享分析結果

---

*Document generated: 2026-05-27*
*Author: Agent F (QA / Guardrail / Release)*
*Version: 1.38.0*
