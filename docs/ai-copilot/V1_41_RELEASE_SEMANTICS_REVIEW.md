# v1.41.0 Release Semantics Review

> **Reviewed by**: Product/Release Agent (Phase 1)
> **Date**: 2026-05-27
> **Verdict**: GO for commit

## 1. Naming Decision

**v1.41.0** (not v1.40.x patch). Rationale:
- v1.40.0 and v1.40.1 are already committed on this branch
- Uncommitted changes are substantial: 10 agent contributions, ~250 lines changed, 6+ new test files
- New features: router v2, "Why this answer?" UX, red team corpus 100, security boundary tests

## 2. Version Consistency

| Source | Value | Status |
|:---|:---|:---|
| `frontend/package.json` | 1.40.0 -> **1.41.0** | Bumped |
| `README.md` | v1.41.0 | Already set |
| `frontend/src/App.tsx` | No version display | N/A |
| `frontend/src/services/snapshotService.ts` | No version reference | N/A |

## 3. PII and Prompt Injection Gaps

**PII detection**: No PII detection rules in `aiCopilotOutputValidation.ts`. Guardrails strip sensitive keys from context input but do not scan output text.

**Prompt injection**: No dedicated prompt injection detector. Domain-specific patterns are caught but generic payloads pass through.

**Verdict**: Neither gap blocks release because:
- External BYOK provider is disabled (returns `confidence: 'blocked'`)
- Mock provider returns hardcoded responses
- Guardrails strip sensitive keys from context
- Red team corpus validates these scenarios explicitly

**Recommendation**: Track as v1.42 follow-up.

## 4. Commit Recommendation

- Single commit (changes form one coherent feature set)
- Version bump required in `package.json`
- No split needed
