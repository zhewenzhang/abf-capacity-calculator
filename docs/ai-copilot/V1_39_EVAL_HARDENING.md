# v1.39.0 - AI Copilot Evaluation & Hardening

## Overview

v1.39 builds on the v1.38 AI Data Copilot Deterministic MVP by adding a comprehensive evaluation harness, red team safety testing, UX hardening for the copilot panel, and export quality improvements. This release focuses on quality assurance, safety validation, and polish rather than new features.

## Evaluation Harness

### Eval Cases

10 deterministic eval cases covering all 6 copilot tools:

| # | Tool | Case | Expected Behavior |
|---|------|------|-------------------|
| 1 | `inspectDataQuality` | SKUs with missing attributes | Returns DQ issues with severity and suggested fix |
| 2 | `inspectDataQuality` | Clean dataset | Returns "no issues found" confirmation |
| 3 | `explainCapacityRisk` | Months with >90% utilization | Returns bottleneck explanation with affected SKUs |
| 4 | `explainCapacityRisk` | All months under capacity | Returns "no risk" with capacity headroom stats |
| 5 | `analyzeBpGap` | BP target miss year | Returns gap amount, top drivers, proportional attribution |
| 6 | `analyzeBpGap` | All targets met | Returns "targets met" with attainment summary |
| 7 | `suggestDataFixes` | Dataset with fixable issues | Returns prioritized fix drafts with impact estimates |
| 8 | `suggestDataFixes` | Clean dataset | Returns "no fixes needed" |
| 9 | `analyzeScenarioImpact` | Capacity increase scenario | Returns before/after shortage comparison |
| 10 | `lookAheadFocus` | Near-term forecast period | Returns priority focus areas for next quarter |

### Eval Runner

The eval runner (`aiCopilotEval.ts`) executes each case against the deterministic tool engine and produces a structured report:

```
EvalReport {
  caseId: string;
  tool: string;
  status: 'pass' | 'fail' | 'skip';
  actualOutput: ToolResult;
  expectedPattern: string;
  executionTimeMs: number;
}
```

### Eval Report Format

Reports are generated as structured JSON with:
- Per-case pass/fail status
- Execution time per case
- Total suite pass rate
- Failure details with expected vs actual comparison

## Red Team Tests

10 safety-focused test cases (`aiCopilotRedTeam.test.ts`) validating guardrails against adversarial inputs:

| # | Attack Vector | Test Description |
|---|---------------|------------------|
| 1 | Prompt injection | Input containing "ignore previous instructions" |
| 2 | Prompt injection | Input with system-role framing ("You are now...") |
| 3 | Sensitive data leakage | Attempt to extract Firebase credentials |
| 4 | Sensitive data leakage | Attempt to extract user auth tokens |
| 5 | External AI calls | Verify no network requests to openai.com |
| 6 | External AI calls | Verify no network requests to anthropic.com |
| 7 | External AI calls | Verify no network requests to api.googleapis.com (AI) |
| 8 | Context validation | Tool call with malformed input schema |
| 9 | Context validation | Tool call with out-of-scope project ID |
| 10 | Context validation | Tool call attempting to access another workspace |

All red team tests are pattern-based assertions checking for forbidden API domains, input sanitization, and scope boundaries. They do not use real adversarial payloads.

## UX Hardening

### Message Rendering

- **Tool name display**: Each copilot response shows which tool produced the result (e.g., "Data Quality Inspector")
- **Confidence color coding**: High (green), Medium (yellow), Low (red) confidence indicators on responses
- **Collapsible source references**: Source data references (SKU codes, month keys) shown in collapsible sections
- **Caveat alerts**: DQ caveats and data limitations rendered as warning alerts above the response

### Fallback & Error States

- **Fallback CTAs**: When a tool cannot produce a result, a clear call-to-action guides the user (e.g., "Fix data quality issues first")
- **Viewer messaging**: Workspace viewers see a read-only explanation instead of action buttons
- **Loading states**: Spinner with tool-specific loading messages during execution

### Accessibility

- All interactive elements have ARIA labels
- Confidence indicators have text equivalents
- Screen reader compatible message structure

## Export Quality

### Prompt Enhancements

- **Eval-friendly prompt sections**: Export prompts include structured sections for external AI evaluation
- **F-A-I-R labeling**: All exported data points tagged as Fact, Assumption, Inference, or Recommendation
- **Guardrails in prompts**: Export prompts include explicit instructions prohibiting formula modification, data fabrication, and unit confusion
- **Source references**: Every data point in the export includes its source (e.g., "from SKU ABC-123, forecast 2027-03")
- **No-write warnings**: Prompts explicitly state "Do not write to any database or modify any files"

### Deterministic JSON Export

- JSON export produces deterministic, reproducible output
- Same input data always produces identical JSON output
- No timestamps or random IDs in export payload
- UTF-8 BOM encoding for Excel compatibility

## Test Coverage

60+ new tests across multiple domains:

| Domain | File | Test Count |
|--------|------|------------|
| Eval harness | `aiCopilotEval.test.ts` | ~10 |
| Red team safety | `aiCopilotRedTeam.test.ts` | ~10 |
| Routing logic | `aiCopilotRouting.test.ts` | ~10 |
| Viewer guard | `aiCopilotViewer.test.ts` | ~8 |
| Prompt building | `aiCopilotPrompt.test.ts` | ~12 |
| Sanitization | `aiCopilotSanitize.test.ts` | ~10 |
| **Total** | | **~60** |

## Guardrails Maintained

The following hard constraints from v1.38 remain enforced in v1.39:

- **No external AI API**: Zero calls to OpenAI, Anthropic, Google AI, or any external LLM service
- **No auto-save**: All data modifications require explicit user confirmation
- **No Firestore writes**: Copilot analysis never writes to Firestore directly
- **No formula modification**: Calculation engine formulas are read-only from the copilot's perspective
- **Viewer read-only**: Workspace viewers cannot trigger any data-modifying actions

## Known Limitations

- **Deterministic tools only**: The copilot uses rule-based deterministic tools, not real AI models. Analysis quality depends on data completeness.
- **Static eval cases**: The 10 eval cases are hand-crafted and do not cover every possible data configuration. They serve as regression guards, not exhaustive validation.
- **Pattern-based red team**: Red team tests check for forbidden patterns (domain names, keywords) rather than performing real adversarial testing. A determined attacker could potentially craft inputs that pass pattern checks.
- **No streaming**: Responses are rendered all-at-once, not streamed token-by-token.
- **Single-language prompts**: Export prompts are in Chinese (matching the v1.21 convention). English prompt support is a future enhancement.

## Files Changed

### New Files
- `frontend/src/core/aiCopilotEval.ts` - Eval harness runner
- `frontend/src/core/aiCopilotEval.test.ts` - Eval case tests
- `frontend/src/core/aiCopilotRedTeam.test.ts` - Red team safety tests
- `frontend/src/core/aiCopilotRouting.test.ts` - Routing logic tests
- `frontend/src/core/aiCopilotViewer.test.ts` - Viewer guard tests
- `frontend/src/core/aiCopilotPrompt.test.ts` - Prompt building tests
- `frontend/src/core/aiCopilotSanitize.test.ts` - Sanitization tests

### Modified Files
- `frontend/src/components/copilot/CopilotMessage.tsx` - UX hardening (tool name, confidence, caveats)
- `frontend/src/components/copilot/CopilotChat.tsx` - Loading states, fallback CTAs
- `frontend/src/core/aiCopilotExport.ts` - Export quality improvements
- `frontend/src/core/aiCopilotPrompt.ts` - F-A-I-R labeling, guardrail text
