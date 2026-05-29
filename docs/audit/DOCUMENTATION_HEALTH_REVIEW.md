# Documentation Health Review

**Audit Date**: 2026-05-28
**Current Version**: v1.45.0
**Branch**: `xiaomi/v1-41-ai-copilot-reliability-marathon`
**Auditor**: Agent 10 — Documentation and Knowledge Agent
**Start Time**: 2026-05-28 10:00 UTC+8
**End Time**: 2026-05-28 10:45 UTC+8
**Duration**: ~45 minutes

---

## Executive Summary

The project has strong release-level documentation (specs, acceptance checklists, smoke tests, release reviews) for each version. However, **cross-cutting documentation** — the documents that agents and developers read to understand the project as a whole — is significantly outdated. Five major documents are frozen at v1.29-v1.35 and do not reflect v1.36-v1.45. The user guide covers only pre-v1.36 features. The QA smoke test checklist is pinned at v1.29.0.

**Overall Health**: 6/12 documents are outdated or contain errors. The per-release docs are excellent; the cross-cutting docs need a systematic refresh.

---

## Document-by-Document Assessment

### 1. README.md

**Status**: PARTIALLY OUTDATED (3 issues found)

**What is accurate**:
- Tech stack section is correct (React 19, Ant Design 6, Firebase, Vitest, React Router v7).
- Features list (items 1-34) is comprehensive and covers through v1.45.0.
- Firebase Setup, Local Development, Testing & Build, Deploy sections are correct.
- Core Calculation Formulas section is accurate.
- Firestore Data Model section is accurate.
- Version history entries for v1.37.0 through v1.45.0 are detailed and accurate.

**Issues found**:

1. **Version history gap**: v1.35.0 (Data Quality Visibility) and v1.36.0 (DQ Remediation Entry Points) are described in the Features section (items 31-32) but are **missing from the Version History section**. The history jumps from v1.34.0 directly to v1.37.0. Git confirms both versions exist (commits `3c92354` and `1cd0f37`).

2. **Project Structure section is outdated**: The `frontend/src/` tree listing only shows the original pages and a few core modules. It does not include:
   - `pages/DailyOperationsWorkbench.tsx` (v1.42)
   - `pages/ScenarioPlanning.tsx` (v1.37)
   - `pages/AiCopilot.tsx` (v1.38)
   - `core/workbench.ts`, `core/abnormalityIntelligence.ts`, `core/operationalScenario.ts`, `core/managementReport.ts` (v1.42-v1.45)
   - `core/aiCopilotTools.ts`, `core/aiCopilotContext.ts`, `core/aiProviderAdapter.ts` (v1.38-v1.41)
   - `core/riskAttribution.ts`, `core/bpAttribution.ts`, `core/impactAnalysis.ts`, `core/keyFindings.ts` (v1.17-v1.20)
   - `components/copilot/`, `components/common/` subdirectories
   - `core/calculationEngine.test.ts` is listed as "31 Vitest tests" but the suite has grown significantly.

3. **Project Documentation table is incomplete**: Missing references to:
   - `docs/operations/` (v1.42-v1.45 product plan, architecture, acceptance, smoke test, release review)
   - `docs/workbench/` (v1.42 workbench specs and architecture)
   - `docs/ai-copilot/` directory (22 documents covering v1.38-v1.41)
   - `docs/security/` (Firestore rules test infra, review guide, overlap incident)
   - `docs/audit/` (security and trust boundary review)

**Recommendations**:
- Add v1.35.0 and v1.36.0 entries to Version History.
- Update Project Structure to reflect current file tree or simplify to a high-level overview.
- Add `docs/operations/`, `docs/workbench/`, `docs/ai-copilot/`, and `docs/security/` to the Project Documentation table.

---

### 2. docs/product/PROJECT_AGENT_CONTEXT_AND_ROADMAP.md

**Status**: SEVERELY OUTDATED (6 issues found)

This is the onboarding document for project management agents. It is dated 2026-05-27 and reflects the state **before** v1.42-v1.45 were released.

**Issues found**:

1. **Section 3.2 — AI Copilot is listed as "feature branch, verify merge status"**: The AI Copilot (v1.38.0) has been merged to main and is production-ready. This section incorrectly implies it may not be merged.

2. **Section 3.2 — AI Provider Adapter has a known blocker**: The document states `validateProviderOutput(text)` was "not fully wired" and "must be fixed before merge." This was fixed in v1.41.0 (commit `4f28ca6`). The blocker is resolved.

3. **Section 3.2 — AI Copilot Evaluation and UX Hardening listed as "feature branch"**: v1.39.0 has been merged to main.

4. **Section 4 (Planned Features)**: All five planned features have been partially or fully implemented:
   - 4.1 AI Abnormality Analysis -> shipped as v1.43.0 Abnormality Intelligence Layer
   - 4.2 Daily Workflow Layer -> shipped as v1.42.0 Daily Operations Workbench
   - 4.3 Analysis, Reporting, and Process Handling -> shipped as v1.45.0 Management Report Pack
   - 4.4 Simulation and Hypothesis Planning -> shipped as v1.44.0 Operational What-if Scenario
   - 4.5 AI as Capacity Readiness Assistant -> partially shipped (10 deterministic tools across v1.38-v1.45)

5. **Section 6 (Key Files Index)**: Missing many new files:
   - `pages/DailyOperationsWorkbench.tsx`
   - `core/workbench.ts`, `core/abnormalityIntelligence.ts`, `core/operationalScenario.ts`, `core/managementReport.ts`
   - No `docs/operations/` or `docs/workbench/` in the documentation index.

6. **Section 8 (Suggested Next Roadmap)**: The "Immediate Gate" (fix AI Provider output validation wiring) is resolved. The roadmap items 1-5 have all been shipped. The entire section needs rewriting.

**Recommendations**:
- Move all v1.38-v1.41 items from Section 3.2 to Section 3.1 (Production-Ready).
- Remove the resolved blocker note for AI Provider Adapter.
- Update Section 4 to mark shipped features as complete and define next-phase goals.
- Update Section 6 with current file index.
- Rewrite Section 8 with post-v1.45 roadmap.

---

### 3. docs/product/PRODUCT_STATE_REVIEW_AFTER_V1_35.md

**Status**: OUTDATED (historical reference only)

Written as of v1.35.0. The "Core Gaps" section identifies five gaps, of which three have been addressed:

| Gap Identified | Status as of v1.45.0 |
|---|---|
| Scenario Planning (described as "fatal gap") | SHIPPED: v1.37.0 MVP + v1.44.0 Operational What-if |
| DQ Remediation (described as "medium gap") | SHIPPED: v1.36.0 |
| Version Workflow 2.0 (described as "light gap") | PARTIALLY SHIPPED: v1.24.0 metadata + kind/status tags; locking not yet implemented |
| Firebase Emulator Tests (described as "tech debt") | PARTIALLY SHIPPED: v1.22.2 overlap fix + TypeScript rule simulation; full emulator infra not yet set up |
| AI Brief v2 Local LLM (described as "bubble") | SUPERSEDED: v1.38-v1.45 took a deterministic tools approach instead of WebLLM |

**Recommendations**:
- Add a header note: "This document is a historical snapshot as of v1.35.0. For current state, see PROJECT_AGENT_CONTEXT_AND_ROADMAP.md."
- Do not delete — it has value as a product positioning analysis.

---

### 4. docs/product/NEXT_ROADMAP_AFTER_V1_35.md

**Status**: OUTDATED (historical reference only)

The Phase 8 roadmap (v1.36-v1.40) has been fully delivered, though in a different order and with different scope than planned:

| Planned Version | Planned Feature | Actual Delivery |
|---|---|---|
| v1.36.0 | Sandbox Scenario Planning | v1.36.0 was DQ Remediation; Scenario was v1.37.0 |
| v1.37.0 | DQ Remediation Workflow | DQ Remediation was v1.36.0; v1.37.0 was Scenario Planning MVP |
| v1.38.0 | Forecast Version Workflow 2.0 | Forecast Version Workflow was v1.24.0; v1.38.0 was AI Copilot MVP |
| v1.39.0 | Firebase Emulator Security Tests | v1.39.0 was AI Copilot Eval & Hardening |
| v1.40.0 | AI Brief v2 Local LLM Pilot | v1.40.0 was AI Provider Adapter + BYOK |

**Recommendations**:
- Add a header note: "This document is a historical snapshot. The planned Phase 8 roadmap was delivered across v1.36-v1.45 with revised scope and ordering."
- Do not delete — it has value as a planning artifact.

---

### 5. docs/product/DEVELOPMENT_PRINCIPLES.md

**Status**: OUTDATED (3 issues found)

The document states it applies to v1.29.0. Several principles need updating.

**Issues found**:

1. **Section "不早接 AI API" (Principle 9)**: States "不在產品內整合 AI" (do not integrate AI in the product). This is no longer accurate — the AI Data Copilot (v1.38+) is integrated in-product with deterministic tools. The principle should be updated to: "Product core logic does not depend on external AI API calls. In-product AI uses deterministic local tools only."

2. **Applicable version**: States "適用版本：v1.29.0" — should be updated to v1.45.0 or changed to "current version."

3. **Missing principles**: No principles cover:
   - Operations workbench architecture (derived status, no new schema)
   - Management report determinism requirements
   - Operational scenario in-memory safety

**Recommendations**:
- Update the applicable version.
- Revise Principle 9 to reflect the deterministic AI Copilot approach.
- Add principles for operations workbench and management report patterns.

---

### 6. docs/design-system/

**Status**: MOSTLY OUTDATED

Contains 24 files covering v1.27-v1.34 UI standardization work. All planned items in `UI_CONSISTENCY_ROADMAP.md` are marked "預計" (planned) for v1.31 and v1.32, but both versions have been shipped.

**Issues found**:
- `UI_CONSISTENCY_ROADMAP.md`: v1.31 and v1.32 are marked as "預計" (planned) but both have been completed (commits exist for v1.31.0 and v1.32.0). v1.33 and v1.34 are not listed.
- No docs for post-v1.34 UI patterns used in v1.37-v1.45 pages (ScenarioPlanning, AiCopilot, DailyOperationsWorkbench).

**Recommendations**:
- Update `UI_CONSISTENCY_ROADMAP.md` to mark all items as complete through v1.34.
- These docs are largely historical at this point. Consider archiving the v1.27-v1.34 spec/checklist files.

---

### 7. docs/data-quality/

**Status**: PARTIALLY OUTDATED

Contains 10 files covering v1.35 (DQ Visibility) and v1.36 (DQ Remediation). These are accurate for their scope.

**Issues found**:
- No documentation for v1.43 Abnormality Intelligence Layer, which significantly extends DQ diagnostics with business-aware severity scoring, taxonomy mapping, and evidence citations. This work is documented in `docs/operations/` instead.
- The directory name suggests it covers all data quality work, but v1.43+ DQ work lives in `docs/operations/`.

**Recommendations**:
- Add a README.md to `docs/data-quality/` that references `docs/operations/V1_42_TO_V1_45_PRODUCT_PLAN.md` for the v1.43 Abnormality Intelligence Layer.

---

### 8. docs/scenario/

**Status**: MISSING

The `docs/scenario/` directory does not exist, despite scenario planning being a shipped feature across two versions:
- v1.37.0: Scenario Planning MVP (global multipliers)
- v1.44.0: Operational What-if Scenario (capacity shift, forecast adjustment, order disappearance)

Scenario documentation is scattered across:
- `docs/workbench/V1_43_SCENARIO_PRESET_SIMULATION_SPEC.md`
- `docs/operations/V1_42_TO_V1_45_PRODUCT_PLAN.md` (Section 2.4)
- README.md feature descriptions

**Recommendations**:
- Create `docs/scenario/` with a README.md that consolidates scenario planning documentation and links to the relevant specs.

---

### 9. docs/ai-copilot/

**Status**: CURRENT (for v1.38-v1.41 scope)

Contains 22 files covering the AI Copilot from v1.38 (MVP) through v1.41 (Reliability Marathon). Documentation quality is high — includes product specs, architecture, acceptance checklists, smoke tests, eval rubrics, safety guardrails, red team results, security models, and release reviews.

**Issues found**:
- AI Copilot Tools 7-10 (added in v1.42-v1.45) are documented in `docs/operations/` rather than here. This is a minor organizational inconsistency.
- No README.md index file for the directory.

**Recommendations**:
- Add a README.md index to `docs/ai-copilot/` listing all documents with brief descriptions.
- Add cross-reference to `docs/operations/` for Tools 7-10.

---

### 10. docs/operations/

**Status**: CURRENT

Contains 6 files covering v1.42-v1.45 (Operations AI Marathon):
- Product plan, architecture, implementation report, acceptance checklist, smoke test, release review.

Documentation quality is high and consistent with the project's per-release documentation standards.

**No issues found.**

---

### 11. docs/user-guide/

**Status**: SEVERELY OUTDATED (6 missing features)

The user guide covers 6 pages: Products, Forecasts, Capacity, BP Targets, Results & Risk Brief, Workspace Collaboration. All were written for pre-v1.36 features.

**Missing user guide pages for shipped features**:

| Shipped Feature | Version | User Guide Page |
|---|---|---|
| Scenario Planning | v1.37.0 | MISSING |
| AI Data Copilot | v1.38.0-v1.41.0 | MISSING |
| Data Quality Remediation | v1.36.0 | MISSING |
| Daily Operations Workbench | v1.42.0 | MISSING |
| Abnormality Diagnostics | v1.43.0 | MISSING |
| Operational What-if Scenario | v1.44.0 | MISSING |
| Management Report Pack | v1.45.0 | MISSING |
| Snapshot Version History | v1.24.0 | MISSING |
| Forecasts Spreadsheet Lab | v1.26.0 | MISSING |

**Existing pages may need updates**:
- `RESULTS_AND_RISK_BRIEF.md`: Does not mention Key Findings, BP Gap Attribution, Price Impact, or Capacity Improvement Impact (added in v1.20.0).
- `FORECASTS.md`: Does not mention the yearly growth generation feature (v1.12.1) or the Spreadsheet Lab.
- `CAPACITY.md`: States "支援 2026 年 1 月至 2030 年 12 月" but the system supports 2026-2040.

**Recommendations**:
- Create user guide pages for: Scenario Planning, AI Copilot, Daily Operations Workbench, Management Reports.
- Update `RESULTS_AND_RISK_BRIEF.md` with v1.20.0 analysis depth features.
- Update `CAPACITY.md` year range to 2026-2040.
- Update `FORECASTS.md` with yearly growth generation and Spreadsheet Lab.
- Update `docs/user-guide/README.md` table of contents.

---

### 12. docs/qa/SMOKE_TEST_MASTER_CHECKLIST.md

**Status**: SEVERELY OUTDATED

The header states "v1.29.0" and the checklist covers only features through v1.29.

**Missing smoke test sections for**:
- Data Quality Visibility badges (v1.35.0)
- Data Quality Remediation drawers/popovers (v1.36.0)
- Scenario Planning page (v1.37.0)
- AI Copilot page (v1.38.0-v1.41.0)
- Daily Operations Workbench (v1.42.0)
- Abnormality Intelligence (v1.43.0)
- Operational What-if Scenario (v1.44.0)
- Management Report Pack (v1.45.0)
- Snapshot Version History workflow (v1.24.0)

Note: Per-release smoke tests exist in their respective docs directories (e.g., `docs/operations/V1_42_TO_V1_45_SMOKE_TEST.md`). The master checklist should reference or incorporate these.

**Recommendations**:
- Update the header version to v1.45.0.
- Add sections for all features shipped since v1.29.0, or add a "See also" reference table pointing to per-release smoke test documents.

---

## Additional Findings

### DEVELOPMENT.md

**Status**: CONTAINS ERRORS

1. **Ant Design version mismatch**: States "Ant Design 5" but `frontend/package.json` shows `"antd": "^6.4.3"`. This is a factual error.
2. **Unit price input claim**: States "Unit price input is always USD. Currency conversion is display-layer only." This was true before v1.15.0 but is now incorrect — multi-currency input (USD/TWD/CNY) was added in v1.15.0. The calculation engine normalizes to USD internally, but input is not restricted to USD.
3. **Data flow diagram**: Does not include the v1.38+ AI Copilot path or the v1.42+ workbench/reporting path.

**Recommendations**:
- Fix Ant Design version to 6.
- Update unit price description to reflect multi-currency input.
- Extend data flow diagram with AI Copilot and operations paths.

### docs/security/

**Status**: CURRENT

Contains 5 files covering Firestore rules test infrastructure, change checklists, review guides, and the overlap incident. Quality is adequate.

**No issues found.**

### docs/workbench/

**Status**: CURRENT

Contains 6 files covering v1.42 Daily Operations Workbench and v1.43 scenario preset simulation spec. Quality is adequate.

**No issues found.**

---

## Summary Table

| Document | Status | Severity | Priority |
|---|---|---|---|
| README.md | 3 issues (version gap, structure, doc table) | Medium | High |
| PROJECT_AGENT_CONTEXT_AND_ROADMAP.md | 6 issues (severely outdated) | High | Critical |
| PRODUCT_STATE_REVIEW_AFTER_V1_35.md | Outdated (historical) | Low | Low |
| NEXT_ROADMAP_AFTER_V1_35.md | Outdated (historical) | Low | Low |
| DEVELOPMENT_PRINCIPLES.md | 3 issues (AI principle, version, gaps) | Medium | Medium |
| docs/design-system/UI_CONSISTENCY_ROADMAP.md | Outdated planned items | Low | Low |
| docs/data-quality/ | Missing v1.43 cross-reference | Low | Low |
| docs/scenario/ | Missing directory entirely | Medium | Medium |
| docs/ai-copilot/ | Current (minor org issue) | None | Low |
| docs/operations/ | Current | None | None |
| docs/user-guide/ | 6+ missing feature pages | High | High |
| docs/qa/SMOKE_TEST_MASTER_CHECKLIST.md | Pinned at v1.29.0 | High | High |
| DEVELOPMENT.md | 2 factual errors | Medium | Medium |

---

## Top 5 Update Recommendations (Priority Order)

1. **Update PROJECT_AGENT_CONTEXT_AND_ROADMAP.md**: This is the agent onboarding document. It contains resolved blockers, unshipped planned features that are actually shipped, and an outdated roadmap. Any agent reading this will have a wrong understanding of the project state. **Critical priority.**

2. **Update docs/user-guide/**: The user guide has no coverage for 7 major features shipped between v1.36 and v1.45. Users cannot find documentation for Scenario Planning, AI Copilot, Operations Workbench, or Management Reports. **High priority.**

3. **Update docs/qa/SMOKE_TEST_MASTER_CHECKLIST.md**: The master smoke test is frozen at v1.29.0. QA agents cannot use it to verify v1.36-v1.45 features. Per-release smoke tests exist but are not cross-referenced. **High priority.**

4. **Fix README.md version history gap and Project Structure**: The missing v1.35.0/v1.36.0 entries create a hole in the release narrative. The outdated Project Structure misleads developers about the codebase layout. **High priority.**

5. **Fix DEVELOPMENT.md factual errors**: Ant Design 5 vs 6 and single-currency vs multi-currency claims are factually wrong and could mislead new developers. **Medium priority.**
