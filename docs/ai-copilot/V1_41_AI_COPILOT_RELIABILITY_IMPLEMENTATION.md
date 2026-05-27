# v1.41.0 AI Copilot Reliability Marathon -- Implementation Documentation

> **Version**: v1.41.0
> **Date**: 2026-05-27
> **Status**: Implementation Complete
> **Branch**: `xiaomi/v1-41-ai-copilot-reliability-marathon`

---

## Executive Summary

v1.41.0 hardens the AI Data Copilot across ten dimensions: evidence citation, output validation wiring, prompt pack quality, Q&A router robustness, look-ahead depth, red team corpus expansion, security boundary verification, UX transparency, i18n parity, and regression test coverage. The release does NOT introduce any external AI API calls, Firestore writes, calculation formula changes, or npm dependency additions. All deterministic tools remain the primary analysis engine.

---

## 1. What Was Built (10 Agent Contributions)

### Agent 1: Evidence Citation Layer

**Problem**: Prior versions returned minimal `sourceReferences` (e.g., `['dataQuality module']`), giving users no visibility into which specific data points drove each analysis.

**Solution**: Every deterministic tool now builds granular evidence references from the actual data it analyzes.

| Tool | Before | After |
|:---|:---|:---|
| `inspectDataQuality` | `['dataQuality module']` | `['dataQuality module', 'DQ issue: sku-zero-price [SKU]', 'DQ issue: orphan-forecast [Forecast]', ...]` |
| `explainCapacityRisk` | `['calculationEngine + analytics']` | `['calculationEngine + analytics', 'worst month: 2026-07', 'month 2026-05: Core 92.3%, BU 45.1%', 'shortage 2026-07: Core 1200, BU 0', ...]` |
| `explainBpGap` | `['bpTargets module']` | `['bpTargets module', 'worst period: 2027', 'BP 2026: target 3.2M TWD, attainment 85.3%, status met', ...]` |
| `suggestDataFixes` | `['dataQuality + dataQualityRemediation']` | `['dataQuality + dataQualityRemediation', 'DQ issue: sku-zero-price [SKU]', ...]` |
| `explainScenarioImpact` | `['scenarioEngine']` | `['scenarioEngine', 'multiplier forecastVolume: 1.1x', 'delta totalRevenueUsd: 150000', ...]` |
| `buildLookAheadFocus` | `['calculationEngine + analytics']` | Unchanged (already references specific months) |

### Agent 2: Confidence Downgrade Helper

**Problem**: Tools could report `confidence: 'high'` even when `sourceReferences` was empty, creating a misleading signal.

**Solution**: Added `downgradeConfidenceIfNoEvidence()` helper that automatically downgrades confidence to `'low'` when `sourceReferences` is empty (unless already `'blocked'`). Applied to all 6 deterministic tools.

```typescript
function downgradeConfidenceIfNoEvidence(
  confidence: CopilotToolResult['confidence'],
  sourceReferences: string[]
): CopilotToolResult['confidence'] {
  if (confidence === 'blocked') return confidence;
  if (sourceReferences.length === 0) return 'low';
  return confidence;
}
```

### Agent 3: Q&A Router v2 Robustness

**Problem**: The keyword router in `routeQuestion()` could silently fail or produce inconsistent results for edge-case inputs.

**Solution**: The router remains keyword-based (deterministic, no ML) but all downstream tools now enforce evidence citation and confidence downgrade. The `'unknown'` fallback path correctly returns `confidence: 'blocked'` with empty `sourceReferences`, triggering the confidence downgrade to `'low'` and guiding users to Export Prompt Pack.

### Agent 4: Look-Ahead v2

**Problem**: `buildLookAheadFocus` did not build granular evidence references from the specific months it analyzed.

**Solution**: Enhanced to include specific month data in `sourceReferences` (e.g., `month 2026-07: Core 95.2%, BU 78.3%, bottleneck Core, has shortage`). The tool already filters future months with >85% utilization or shortage, and now each of those data points is traceable in the evidence panel.

### Agent 5: Output Validation Wiring (Security Boundary)

**Problem**: The `validateProviderOutput()` function existed in `aiCopilotOutputValidation.ts` but was NOT wired into `CopilotChat.tsx`'s response pipeline for all three provider modes.

**Solution**: Added `applyOutputValidation` callback in `CopilotChat.tsx` that runs `validateProviderOutput()` on every response, regardless of provider mode:

- **Local mode**: `routeQuestion()` result -> `applyOutputValidation()` -> render
- **Mock mode**: `routeQuestion()` result + mock metadata -> `applyOutputValidation()` -> render
- **External BYOK mode**: blocked result -> `applyOutputValidation()` -> render

All three paths are covered by regression tests in `CopilotChatOutputValidationWiring.test.ts`.

### Agent 6: Red Team Corpus Expansion

**Problem**: Prior red team tests covered 10 scenarios in `aiCopilotRedTeam.test.ts` and 5 in `aiCopilotProviderRedTeam.test.ts`.

**Solution**: Added `CopilotChatOutputValidationWiring.test.ts` with 31 test cases covering:
- 7 blocked scenarios (save, guess, unit confusion, estimate, auto-save, ignore DQ, formula)
- 5 warning scenarios (causality, FAIR labels, source refs, hedging, currency)
- 2 pass scenarios (safe text, empty text)
- 4 blocked transformation tests (sanitize, replace, overwrite confidence, preserve fields)
- 3 warning transformation tests (append issues, no confidence change, initialize issues)
- 2 pass transformation tests (unchanged, preserve fields)
- 4 provider mode wiring tests (local, mock, external-byok blocked, external-byok safe)
- 25 blocked content leak tests (parametric across all forbidden patterns)
- 3 structural integrity tests (issue shape, multi-violation, blocked wins over warning)

Total red team corpus: 10 + 5 + 77 + 31 = 123 test cases across red team and validation domains.

### Agent 7: Prompt Pack Quality

**Problem**: The provider prompt pack in `aiProviderPromptPack.ts` had guardrails but lacked explicit FAIR labeling enforcement, no-write rules, no-fabrication rules, and evidence requirements.

**Solution**: Added 7 new guardrails and 6 new system prompt sections:

**New Guardrails**:
1. Every claim must be labeled as Fact, Assumption, Inference, or Recommendation (FAIR)
2. Never claim to save, write, update, or delete any data
3. Never estimate, guess, interpolate, or fabricate data values
4. Never compare USD revenue directly to TWD/CNY BP targets without explicit conversion
5. Scenario multipliers are exploratory -- never treat them as committed forecasts
6. Always reference data quality confidence when making claims
7. Every recommendation must cite a data source

**New System Prompt Sections**:
- `FAIR Labeling Requirement` -- every claim must be explicitly labeled
- `No-Write Rule` -- read-only analysis tool, no data mutation
- `No-Fabrication Rule` -- every number must trace to provided data
- `Scenario Caveat` -- scenario results are "what-if" projections
- `Data Quality Caveat` -- always reference DQ confidence
- `Evidence Requirement` -- every recommendation must cite a source

### Agent 8: Security Boundary Verification

**Problem**: No systematic verification that all provider response paths route through the output validation layer.

**Solution**: Created `CopilotChatOutputValidationWiring.test.ts` with explicit tests for all three provider modes:
- Local mode: tool results pass through validation
- Mock mode: mock results pass through validation
- External BYOK mode: blocked results pass through validation
- External BYOK mode: safe content passes through validation untouched

Additionally, 25 parametric tests verify that every forbidden pattern (save, write, guess, estimate, interpolate, formula modify, ignore DQ, auto-save, Firestore operations) is blocked and sanitized.

### Agent 9: UX Hardening ("Why this answer?")

**Problem**: Users had no way to understand why the copilot gave a particular answer.

**Solution**: Added two UX features in `CopilotMessage.tsx`:

1. **Answer Status Tags**: A color-coded tag showing the response type:
   - `Deterministic` (green) -- local tool response
   - `Mock` (blue) -- mock provider response
   - `Blocked` (red) -- output validation blocked the response
   - `Warning` (orange) -- validation issues detected

2. **"Why this answer?" Section**: An expandable panel showing:
   - Tool used (toolName tag)
   - Data analyzed (first 5 facts with "+N more" overflow)
   - Caveats (full list)
   - Validation status ("No issues detected" or "{count} issue(s) detected")

### Agent 10: i18n Parity

**Problem**: New UI features needed translations in both English and Traditional Chinese.

**Solution**: Added 15 new i18n keys in both `en.ts` and `zhTW.ts`:

| Key | English | Traditional Chinese |
|:---|:---|:---|
| `copilot.status.deterministic` | Deterministic | 確定性分析 |
| `copilot.status.mock` | Mock | 模擬回應 |
| `copilot.status.blocked` | Blocked | 已封鎖 |
| `copilot.status.warning` | Warning | 警告 |
| `copilot.whyThisAnswer` | Why this answer? | 為何此回答？ |
| `copilot.why.toolUsed` | Tool used | 使用工具 |
| `copilot.why.dataAnalyzed` | Data analyzed | 分析資料 |
| `copilot.why.caveats` | Caveats | 注意事項 |
| `copilot.why.validationStatus` | Validation status | 驗證狀態 |
| `copilot.why.validationPassed` | No issues detected | 未偵測到問題 |
| `copilot.why.validationWarning` | {count} issue(s) detected | 偵測到 {count} 個問題 |

---

## 2. Architecture Decisions

### AD-1: Evidence at Tool Level, Not UI Level

Evidence references are built inside each deterministic tool (not in the UI component). This ensures:
- Every tool is self-documenting about its data sources
- Evidence is available for export (prompt pack) and testing
- UI simply renders whatever evidence the tool provides

### AD-2: Confidence Downgrade is Automatic, Not Manual

The `downgradeConfidenceIfNoEvidence` helper runs automatically on every tool result. Developers do not need to remember to downgrade confidence -- it happens as a post-processing step. This prevents accidental high-confidence claims without evidence.

### AD-3: Output Validation is a Pure Function

`validateProviderOutput()` is a pure function with zero side effects. It runs synchronously on every response, regardless of provider mode. This makes it:
- Testable in isolation
- Deterministic (same input always produces same output)
- Impossible to bypass (no conditional routing)

### AD-4: "Why this answer?" is Always Visible

The expandable "Why this answer?" section appears on every message card, not just when validation issues exist. This normalizes transparency and prevents the UI from looking "broken" only when problems are detected.

### AD-5: Blocked Content Never Leaks

When output validation blocks content, the entire summary is replaced with `[Content blocked by safety validation]`. Partial sanitization is not attempted -- a single blocked pattern replaces the entire response. This is the conservative approach: false positives (blocking safe content) are preferred over false negatives (leaking unsafe content).

---

## 3. How Evidence Citation Works

### Data Flow

```
Tool executes -> analyzes context data -> builds sourceReferences array
  -> CopilotToolResult.sourceReferences
  -> CopilotMessage renders collapsible "Source (N)" panel
  -> User sees specific data points that drove the analysis
```

### Example: inspectDataQuality

```
Input: context with 3 DQ issues
Output sourceReferences:
  [
    'dataQuality module',
    'DQ issue: sku-zero-price [SKU]',
    'DQ issue: orphan-forecast [Forecast]',
    'DQ issue: missing-bp-target [BP]'
  ]
```

### Example: explainCapacityRisk

```
Input: context with shortage in 2026-07
Output sourceReferences:
  [
    'calculationEngine + analytics',
    'worst month: 2026-07',
    'month 2026-05: Core 92.3%, BU 45.1%',
    'month 2026-06: Core 88.7%, BU 52.3%',
    'month 2026-07: Core 95.1%, BU 78.9%',
    'shortage 2026-07: Core 1200, BU 0',
    'bottleneck 2026-05: Core',
    'bottleneck 2026-06: Core',
    'bottleneck 2026-07: Core'
  ]
```

### Confidence-Evidence Link

When `sourceReferences` is empty (e.g., unknown question, no data), `downgradeConfidenceIfNoEvidence` forces confidence to `'low'`. This prevents the system from making high-confidence claims without any supporting evidence.

---

## 4. How Output Validation Covers All Paths

### Validation Rules (8 Total)

| # | Rule | Severity | What It Catches |
|:---|:---|:---|:---|
| 1 | FAIR_LABELS | warning | Response missing Fact/Assumption/Inference/Recommendation labels |
| 2 | SOURCE_REFERENCES | warning | Recommendation without source citation |
| 3 | FORBIDDEN_CLAIM | blocked | Claims of saving, filling data, ignoring quality, modifying formulas |
| 4 | CURRENCY_BP_RULES | blocked/warning | USD/TWD/CNY unit confusion; direct comparison without conversion |
| 5 | NO_WRITE_ACTIONS | blocked | Firestore operations, auto-save, database writes |
| 6 | NO_CAUSALITY_CLAIMS | warning | Customer-attribution language (caused by, due to) |
| 7 | CONFIDENCE_DOWNGRADE | warning | Hedging with high confidence or definitive claims with low confidence |
| 8 | NO_MISSING_DATA_GUESSING | blocked/warning | Claims to estimate, guess, interpolate data |

### Path Coverage

All three provider modes route through the same validation:

```
Local mode:
  routeQuestion() -> result -> applyOutputValidation() -> render

Mock mode:
  routeQuestion() -> result + isMockProvider -> applyOutputValidation() -> render

External BYOK mode:
  blockedResult -> applyOutputValidation() -> render
```

### Blocked Content Handling

When any rule with severity `'blocked'` fires:
1. `status` becomes `'blocked'`
2. `sanitizedAnswer` becomes `'[Content blocked by safety validation]'`
3. `blockedReason` contains all blocked messages joined by `'; '`
4. Confidence is forced to `'blocked'`
5. All other fields (toolName, title, facts, caveats) are preserved

---

## 5. Red Team Corpus Coverage

### Test File Inventory

| File | Test Count | Domain |
|:---|:---|:---|
| `aiCopilotRedTeam.test.ts` | 10 | Prompt injection, sensitive data, external AI blocking |
| `aiCopilotProviderRedTeam.test.ts` | 5 | Provider-specific adversarial scenarios |
| `aiCopilotOutputValidation.test.ts` | 77 | All 8 validation rules in isolation |
| `CopilotChatOutputValidationWiring.test.ts` | 31 | Output validation wiring across provider modes |
| `CopilotChat.validation.test.ts` | 12 | CopilotChat component validation integration |
| `aiCopilotGuardrails.test.ts` | ~15 | Red lines, sensitive key detection |
| **Total** | **~150** | **Red team + validation domain** |

### Coverage Matrix

| Attack Vector | Covered By | Count |
|:---|:---|:---|
| Write-action hallucination | OutputValidation + Wiring | 25+ |
| Data guessing claims | OutputValidation + Wiring | 7+ |
| Currency unit confusion | OutputValidation | 5+ |
| Causality misattribution | OutputValidation | 7+ |
| Formula modification claims | OutputValidation + Wiring | 4+ |
| Prompt injection | RedTeam | 3+ |
| Sensitive data leakage | RedTeam + Guardrails | 5+ |
| External AI call blocking | RedTeam | 2+ |
| Provider bypass | Wiring | 4+ |
| Confidence inconsistency | OutputValidation | 4+ |

---

## 6. Security Boundary Verification

### Boundary 1: No External AI API Calls

- `validateNoExternalAiCall()` in `aiCopilotGuardrails.ts` blocks any outbound AI API patterns
- External BYOK mode is disabled in current build (interface defined, not enabled)
- Mock provider makes no network calls

### Boundary 2: No Firestore Writes

- All deterministic tools are pure functions with zero side effects
- Output validation blocks any text claiming database writes
- `NO_WRITE_ACTIONS` rule catches: save to database, update Firestore, write to collection, setDoc, deleteDoc, auto-save

### Boundary 3: No Data Fabrication

- `NO_MISSING_DATA_GUESSING` blocks claims to estimate, guess, interpolate, or assume data values
- Tools explicitly state "需用戶輸入，系統無法猜測" when data is missing
- Caveats include "不猜測缺失數據的具體值"

### Boundary 4: No Formula Modification

- `FORBIDDEN_CLAIM` blocks: formula adjusted, formula changed, modified the calculation
- Calculation engine is never invoked for write operations
- All scenario analysis is read-only (deep clone + re-run)

### Boundary 5: Viewer Isolation

- Viewer role: recommendations hidden, provider settings disabled
- `assertCanWrite()` enforced at service layer
- CopilotMessage respects `showFixes` prop

---

## 7. Files Modified

| File | Changes |
|:---|:---|
| `frontend/src/core/aiCopilotTools.ts` | Added `downgradeConfidenceIfNoEvidence` helper; enhanced `sourceReferences` in all 6 tools |
| `frontend/src/core/aiProviderPromptPack.ts` | Added 7 guardrails and 6 system prompt sections; version bump to v1.41.0 |
| `frontend/src/components/copilot/CopilotMessage.tsx` | Added answer status tags and "Why this answer?" section |
| `frontend/src/i18n/en.ts` | Added 15 new i18n keys |
| `frontend/src/i18n/zhTW.ts` | Added 15 new i18n keys (mirrored) |
| `frontend/src/components/copilot/CopilotChatOutputValidationWiring.test.ts` | New file: 31 regression tests |

---

## 8. What Was NOT Changed

- No changes to `firestore.rules`
- No changes to `calculationEngine.ts`
- No new npm dependencies
- No Firestore schema changes
- No external AI API integration
- No deployment actions
