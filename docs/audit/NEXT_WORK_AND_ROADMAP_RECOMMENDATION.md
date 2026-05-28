# ABF Capacity Calculator -- Roadmap and Next Work Recommendation

**Date**: 2026-05-28
**Current Version**: v1.45.0 (feature branch: `xiaomi/v1-41-ai-copilot-reliability-marathon`)
**Main Branch Version**: v1.39.0 (last merge: `e9b4b11`)
**Agent**: Agent 12 -- Roadmap and Next Work Agent

---

## 1. Executive Summary

ABF Capacity Calculator has evolved from a capacity calculator into a **collaborative decision analysis and production management tool**. The project is healthy, with 1249 passing tests, zero lint errors, and successful production builds. The current feature branch contains 6 versions of work (v1.40 through v1.45) that have not yet been merged to main.

### Project Health Scorecard

| Dimension | Status | Notes |
|-----------|--------|-------|
| Test Coverage | Strong | 1249 tests across 52 files, 100% pass rate |
| Build Health | Clean | tsc + vite build succeeds, no regressions |
| Lint | Clean | Zero errors, zero warnings |
| Security Posture | Strong | Write-service isolation enforced, BYOK session-only, no external AI calls |
| Architecture | Good | Clean layered AI copilot architecture, minor tech debt (4x duplicated sanitize logic) |
| UI Consistency | Improving | UI System Phase 1 complete, remaining backlog tracked |
| Unmerged Work | Large | 6 versions (v1.40-v1.45) on feature branch, need merge to main |

---

## 2. P0 -- Must Fix Now (Blocking Issues)

### 2.1 Merge v1.40-v1.45 to Main

**Issue**: Six versions of completed work (v1.40 AI Provider Adapter, v1.41 Reliability Marathon, v1.42 Daily Operations Workbench, v1.43-v1.45 Operations AI Marathon) remain on the feature branch. This creates risk of divergence and prevents the team from benefiting from completed features.

**Action**: Merge `xiaomi/v1-41-ai-copilot-reliability-marathon` into `main` after cleanup.

**Pre-merge cleanup**:
1. Run `vitest -u` to update 2 obsolete snapshots in `aiProviderPromptPack.test.ts.snap`
2. Sync version numbers: `package.json`, `App.tsx`, `snapshotService.ts` should all read `1.45.0`
3. Delete orphan snapshot file: `frontend/src/core/__snapshots__/aiProviderPromptPack.test.ts.snap`

### 2.2 Version Number Inconsistency

**Issue**: `package.json` shows `1.45.0` but the README and release docs reference various versions. All version identifiers must be synchronized before merge.

**Files to update**:
- `frontend/package.json` -- confirm `1.45.0`
- `frontend/src/App.tsx` -- confirm `APP_VERSION`
- `frontend/src/services/snapshotService.ts` -- confirm version constant

---

## 3. P1 -- Fix in Next Version (Important Gaps)

### 3.1 Duplicated Sensitive Key Lists and Sanitize Logic

**Issue**: The architecture review identified 4+ copies of the same 11-item sensitive key list and 4 nearly identical recursive sanitize functions across:
- `aiCopilotContext.ts`
- `aiCopilotExport.ts`
- `aiCopilotGuardrails.ts`
- `aiBriefExport.ts`
- `scenarioExport.ts`

**Action**: Extract a single shared `SENSITIVE_KEYS` constant and a shared `removeSensitiveData()` utility into `frontend/src/core/sensitiveDataUtils.ts`.

**Effort**: Small (1-2 hours)
**Risk**: Low -- pure refactor, no behavior change

### 3.2 Safety Logic in UI Layer

**Issue**: `CopilotChat.tsx` contains validation-to-result merging logic (blocked/warning/pass branching) that should live in core. Lines 36-66 (`applyOutputValidation`) and lines 95-101 (BYOK blocked result construction) should be extracted to a core utility.

**Action**: Create `frontend/src/core/aiCopilotResultBuilder.ts` with `applyValidationToResult()` function.

**Effort**: Small
**Risk**: Low

### 3.3 Chinese-Language Output Validation Gap

**Issue**: Output validation patterns are English-only. Since the system is bilingual (EN/zh-TW) and prompt packs contain Chinese guardrails, Chinese-language forbidden claims (e.g., data save claims in Chinese) are not detected.

**Action**: Add Chinese regex patterns to `aiCopilotOutputValidation.ts` for key forbidden claim categories:
- Save/write claims
- Data fabrication claims
- Formula modification claims

**Effort**: Medium
**Risk**: Low

### 3.4 Build Chunk Size Warning

**Issue**: Vite build produces chunks exceeding 500kB. This is a pre-existing issue but should be tracked.

**Action**: Implement code splitting for AI copilot modules and scenario engine via dynamic imports.

**Effort**: Medium
**Risk**: Low

### 3.5 UI Inconsistency Backlog (Remaining Items)

The UI inconsistency audit from 2026-05-25 identified 30 issues. Many were addressed in v1.30-v1.34, but the following remain:

| Priority | Issue | Description |
|----------|-------|-------------|
| P2 | Hard-coded colors | `#cf1322`, `#3f8600`, `#52c41a` should use `theme.useToken()` |
| P2 | View mode controls | Different pages use Button, Radio, Segmented for view switching |
| P2 | EmptyState adoption | Most pages still use custom empty states instead of `EmptyState` component |
| P2 | PageHeader adoption | 0% adoption of `PageHeader` component across pages |
| P2 | Currency display | Inconsistent prefix/suffix positioning of USD/TWD/CNY |
| P2 | DateTime formatting | No shared `formatDateTime` utility |
| P3 | Card bordered/sizing | Inconsistent `bordered` and `size` props across pages |
| P3 | PageSize inconsistency | 10, 12, 20 used randomly across tables |

---

## 4. P2 -- Backlog (Nice-to-Haves)

### 4.1 Firebase Emulator Security Test Infrastructure

**Status**: Test plan documented in `docs/security/FIRESTORE_RULES_TEST_PLAN.md`, but no automated tests implemented.

**Action**: Set up `@firebase/rules-unit-testing` with the 40+ test cases defined in the test plan.

**Effort**: Large (3-5 days)
**Risk**: Medium -- requires Firebase emulator configuration

### 4.2 Version Lock / Freeze Mechanism

**Status**: Planned in Phase 8 backlog but not implemented.

**Action**: Add `lockedBy` and `lockedAt` fields to snapshot metadata. Prevent deletion/restore of locked snapshots.

**Effort**: Medium
**Risk**: Low

### 4.3 Scenario Planning v2 (Structured Simulations)

**Status**: Current scenario engine uses 4 global multipliers. Planned expansion includes:
- Capacity ramp delay/pull-forward by N months
- Forecast increase/decrease by percentage
- Order disappearance simulation
- Customer/SKU-level scenario targeting

**Effort**: Large
**Risk**: Medium

### 4.4 `sourceReferences` Structured Model

**Status**: Currently opaque `string[]`. A structured `Evidence` model would enable linking to specific data sections.

**Action**: Define `interface Evidence { source: string; field: string; value: unknown; }` and update tool outputs.

**Effort**: Small
**Risk**: Low

### 4.5 `CopilotToolResult` Interface Refactor

**Status**: 12-field flat interface with bolt-on provider metadata. An `AnswerEnvelope` wrapper would better separate concerns.

**Effort**: Medium
**Risk**: Low

### 4.6 Prompt Injection Detection Enhancement

**Status**: Current system is physically immune (no external LLM calls in local mode), but regex-based detection has known gaps (e.g., `PI-01` in red team corpus).

**Action**: Add semantic-level detection patterns when external BYOK provider is enabled.

**Effort**: Medium
**Risk**: Low

---

## 5. UI Improvement Roadmap

### Phase 1: Quick Wins (v1.46)
- Extract shared color tokens via `theme.useToken()`
- Standardize view mode controls to `<Segmented>`
- Adopt `EmptyState` component on all empty-data pages
- Add shared `formatDateTime` and `formatCurrency` utilities

### Phase 2: Layout Standardization (v1.47)
- Adopt `PageHeader` on all pages
- Standardize Card `bordered`/`size` props
- Fix responsive breakpoints on Results KPI cards
- Unify `pageSize` conventions

### Phase 3: Form Consistency (v1.48)
- Unify Products add/edit form layout
- Standardize inline vs vertical form usage
- Fix DataSheetGrid wrapper and border-radius alignment

### Phase 4: Mobile/Narrow Polish (v1.49+)
- Responsive table handling
- Touch-friendly controls for tablets
- Narrow viewport testing

---

## 6. Feature Development Roadmap

### Near-Term (v1.46-v1.48)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Shared sanitize refactor | P1 | Small | Deduplicate 4x sensitive key lists and sanitize functions |
| Chinese output validation | P1 | Medium | Add zh-TW forbidden claim patterns |
| Code splitting | P1 | Medium | Reduce bundle size below 500kB per chunk |
| Scenario v2 engine | P2 | Large | Structured simulation operations |

### Mid-Term (v1.49-v1.52)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Firebase emulator tests | P2 | Large | Automated security rules regression |
| Version lock/freeze | P2 | Medium | Snapshot immutability for baselines |
| Daily workflow wizard | P2 | Large | Step-by-step guided planning flow |
| Management report v2 | P2 | Medium | One-click daily planning report export |

### Long-Term (v1.53+)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| External data import | P3 | Large | CSV/Excel upload for forecasts and capacity |
| API integration | P3 | Large | ERP/CRM data source connectors |
| Multi-scenario persistence | P3 | Large | Save, share, compare scenarios |
| WebLLM local AI | P4 | Very Large | Browser-based AI summary (high risk) |

---

## 7. Business Validation Roadmap

### Adoption Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users | 5+ planners | Firebase Analytics |
| Scenario runs per week | 10+ | Event tracking on scenario page |
| DQ fix rate | 80% of warnings resolved | Compare warnings created vs fixed |
| AI Copilot usage | 5+ sessions/day | Event tracking on copilot page |
| Export usage | 3+ reports/week | Event tracking on export buttons |

### User Testing Priorities

1. **Scenario Planning usability test**: Can planners run a what-if analysis in under 2 minutes?
2. **DQ Remediation flow test**: Can users fix a data quality issue without leaving the page?
3. **AI Copilot trust test**: Do users trust the AI explanations? Do they follow the fix suggestions?
4. **Daily Operations Workbench test**: Does the workbench reduce time-to-insight?

### Enterprise Readiness Checklist

- [ ] Firebase emulator security tests automated
- [ ] Version lock mechanism for BP baselines
- [ ] Audit log for snapshot operations
- [ ] Chinese-language output validation
- [ ] Bundle size under 500kB per chunk
- [ ] Mobile/tablet responsive polish
- [ ] Export format supports Excel (not just JSON/Markdown)

---

## 8. Recommended Next 3 Releases

### v1.46.0: Merge and Cleanup
- Merge v1.40-v1.45 to main
- Version number synchronization
- Snapshot cleanup
- Shared sanitize refactor
- Chinese output validation patterns

### v1.47.0: UI Consistency Phase 2
- PageHeader adoption
- Color token standardization
- EmptyState adoption
- View mode control standardization
- Shared format utilities

### v1.48.0: Scenario Planning v2
- Structured simulation operations
- Capacity ramp delay/pull-forward
- Forecast percentage adjustments
- Order disappearance simulation
- Scenario comparison improvements

---

## 9. Technical Debt Inventory

| Item | Severity | Location | Impact |
|------|----------|----------|--------|
| 4x duplicated sanitize logic | Medium | `aiCop*.ts`, `*Export.ts` | Maintenance burden, inconsistency risk |
| Safety logic in UI layer | Low | `CopilotChat.tsx` | Separation of concerns violation |
| Hard-coded colors | Low | `CalculationResults.tsx`, `CapacityPlan.tsx` | Theme inconsistency |
| No Firebase emulator tests | Medium | `firestore.rules` | Security regression risk |
| 500kB+ build chunks | Low | Vite build output | Load time impact |
| Stale snapshot file | Low | `__snapshots__/aiProviderPromptPack.test.ts.snap` | Build warning noise |

---

## 10. Risk Assessment

### High Risk
- **Branch divergence**: 6 versions unmerged to main. The longer this persists, the harder the merge becomes.
- **No automated Firestore rules testing**: Security rules are complex and manually verified only.

### Medium Risk
- **Output validation language gap**: Chinese-language forbidden claims bypass detection.
- **Bundle size growth**: AI copilot and scenario modules are large and not code-split.

### Low Risk
- **UI inconsistency**: Cosmetic issues that don't affect functionality.
- **Tech debt accumulation**: Duplicated code is manageable but should be addressed soon.

---

**Document Version**: 1.0
**Generated**: 2026-05-28
**Next Review**: After v1.46 merge to main
