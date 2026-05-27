# V1.41 Architecture Review: AI Copilot

## Architecture Layers

The copilot system forms a clear layered architecture:

1. **Context** (`aiCopilotContext.ts`) -- builds sanitized `AiCopilotContext` from domain data
2. **Guardrails** (`aiCopilotGuardrails.ts`) -- 10 red-line vetoes, sensitive key detection, external AI call blocking
3. **Tools** (`aiCopilotTools.ts`) -- 6 deterministic diagnostic tools + keyword router
4. **Validation** (`aiCopilotOutputValidation.ts`) -- 8 post-generation validators
5. **Provider Adapter** (`aiProviderAdapter.ts`) -- pluggable interface with mock and BYOK-placeholder
6. **Provider Prompt Pack** (`aiProviderPromptPack.ts`) -- builds prompts with guardrails embedded
7. **Export** (`aiCopilotExport.ts`) -- sanitized JSON/clipboard export
8. **Fix Drafts** (`aiCopilotFixDrafts.ts`) -- read-only fix suggestions from DQ issues
9. **UI** (`CopilotChat.tsx`, `CopilotMessage.tsx`) -- rendering, input, validation wiring

## Write-Service Isolation: PASS

Zero imports from `services/` in any `frontend/src/core/ai*` file. All core AI modules are pure/read-only.

## Issues Found

### HIGH: Duplicated Sensitive Key Lists (4+ copies)

The same 11-item sensitive key list is defined independently in:
- `aiCopilotContext.ts` (line 33)
- `aiCopilotExport.ts` (line 29)
- `aiCopilotGuardrails.ts` (line 38)
- `aiBriefExport.ts` (line 109)
- `scenarioExport.ts` (line 63, with subtle exact-match vs substring-match inconsistency)

A single shared constant should be extracted.

### HIGH: Duplicated Sanitize/Remove Recursive Logic (4 copies)

Four nearly identical recursive object-sanitization functions exist across the same files. Should be a single shared utility.

### MEDIUM: Safety Logic in UI Layer

`CopilotChat.tsx` lines 95-101 manually construct blocked results for BYOK-not-enabled. Lines 36-66 (`applyOutputValidation`) contain validation-to-result merging logic (blocked/warning/pass branching). The actual validation delegates to core, but the result-merging lives in UI. Should be a core utility like `applyValidationToResult()`.

### LOW: `sourceReferences` is `string[]` with opaque values

All tools emit source references as opaque strings. A structured `Evidence` model would enable linking to specific data sections. Deferrable until external provider needs structured citations.

### LOW: `CopilotToolResult` is a wide flat interface

12 fields including optional provider metadata (`validationIssues`, `isMockProvider`, `blockedReason`) bolted on in v1.40. An `AnswerEnvelope` wrapper would better separate concerns. Deferrable.

## Summary

Architecture is well-layered with clean separation. Write-service isolation is properly enforced. Main tech debt is the 4-way duplication of sensitive-key lists and sanitize logic. Safety wiring in CopilotChat is a minor concern but functional.
