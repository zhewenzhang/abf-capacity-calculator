# v1.41.0 Security Gate Review

> **Reviewed by**: Security Agent (Phase 2)
> **Date**: 2026-05-27
> **Verdict**: P0=None, P1x2 (non-blocking), P2x2

## 1. Output Validation Full-Chain Check

**PASS.** `validateProviderOutput()` wired via `applyOutputValidation()` in `CopilotChat.tsx`:
- Local deterministic mode (line 116)
- Mock provider mode (line 112)
- External BYOK placeholder mode (line 103)
- Quick-select buttons (line 79)

## 2. PII Detection Gap — P1

No PII detector in `aiCopilotOutputValidation.ts` or `aiCopilotGuardrails.ts`. Red team corpus documents 10 PII-leak test cases that pass through unblocked.

**Mitigation**: External BYOK provider is disabled. Not a release blocker.

## 3. Prompt Injection Detection Gap — P1

No dedicated prompt injection detector. Generic payloads like "ignore previous instructions" pass with only FAIR_LABELS warning.

**Mitigation**: External BYOK provider is disabled. Domain-specific patterns are caught.

## 4. BYOK Key Session-Only Verification

**PASS.** Key held only in React `useState`. Zero localStorage/sessionStorage/indexedDB/cookie usage in non-test source.

## 5. Guardrail Grep Results

| Pattern | Non-test matches | Verdict |
|:---|:---|:---|
| openai/anthropic/gemini/deepseek | Forbidden pattern list (defensive) | OK |
| api_key/apiKey | Sensitive-key strip lists | OK |
| fetch/XMLHttpRequest/axios | Comments only | OK |
| localStorage/sessionStorage/indexedDB/cookie | Comments only | OK |
| saveSku/saveForecast/saveCapacity/saveParameters/saveBpTarget | None | OK |
| from '../services' | None | OK |

## 6. Severity List

**P0**: None

**P1**:
1. PII output detection missing (external BYOK only, currently disabled)
2. Prompt injection detection missing (external BYOK only, currently disabled)

**P2**:
1. BYOK runtime network-call auditing needed when external provider is enabled
2. Red team test expectations should be updated from `not.toBe('blocked')` to `toBe('blocked')` once detectors are added
