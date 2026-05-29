# ABF Capacity Calculator -- Project State Inventory

Date: 2026-05-28
Branch: xiaomi/v1-41-ai-copilot-reliability-marathon
Main Branch Version: v1.39.0
Current Branch Version: v1.45.0
Total Tests: 1398 passing (57 test files), 0 failing
Lint: 0 errors (177 pre-existing warnings)

---

## Inventory Scope

This document inventories all core features from v1.20.0 through v1.45.0, classifying each into one of five categories:

- **Production-Ready**: Feature is merged to `main`, tested, and usable
- **Feature Branch**: Code exists but only on feature branches (not merged to `main`)
- **Docs Only**: Documentation exists but implementation is incomplete
- **Planned but Not Implemented**: Documented in roadmap but no code
- **Implemented but Weakly Verified**: Code exists but tests are thin or missing

---

## 1. Core Planning Foundation (Pre-v1.20, Production-Ready)

These features predate the v1.20 scope window but form the foundation. All are on `main`.

### 1.1 Product/SKU Management

- **Version Introduced**: v1.2.6
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/pages/Products.tsx`
  - `frontend/src/pages/ProductsSpreadsheetLab.tsx`
  - `frontend/src/services/skuService.ts`
  - `frontend/src/core/skuDerived.ts`
- **Test Coverage**: skuDerived.test.ts, readOnlyGuard.test.ts
- **Notes**: Inline edit with expanded form, download/import template, Products Spreadsheet Lab at `/products-sheet-lab`

### 1.2 Monthly Forecasts

- **Version Introduced**: v1.12.1
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/pages/Forecasts.tsx`
  - `frontend/src/pages/ForecastsSpreadsheetLab.tsx`
  - `frontend/src/services/forecastService.ts`
  - `frontend/src/core/forecastGrowth.ts`
- **Test Coverage**: forecastGrowth.test.ts, forecastsLabHelpers.test.ts
- **Notes**: Yearly growth generation, batch generation, Spreadsheet Lab with Excel paste

### 1.3 Capacity Planning

- **Version Introduced**: Initial build
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/pages/CapacityPlan.tsx`
  - `frontend/src/pages/CapacitySpreadsheet.tsx`
  - `frontend/src/services/capacityService.ts`
- **Test Coverage**: calculationEngine.test.ts (31 tests)
- **Notes**: Excel-style grid, factory management, batch operations, Fill Forward, Month/Quarter/Year views

### 1.4 Yield & Panel Parameters

- **Version Introduced**: Initial build
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/core/yieldMatrix.ts`
  - `frontend/src/core/panelLayout.ts`
  - `frontend/src/core/defaults.ts`
  - `frontend/src/pages/Parameters.tsx`
  - `frontend/src/services/parameterService.ts`
- **Test Coverage**: calculationEngine.test.ts covers yield/panel integration
- **Notes**: Configurable yield rate matrix, panel layout, working days

### 1.5 Calculation Engine

- **Version Introduced**: Initial build
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/core/calculationEngine.ts`
  - `frontend/src/core/validation.ts`
- **Test Coverage**: calculationEngine.test.ts (31 tests)
- **Notes**: Deterministic TypeScript calculation of panel demand, utilization, shortages, revenue

### 1.6 Dashboard

- **Version Introduced**: v1.7.0
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/core/analytics.ts`
- **Test Coverage**: Page render tests, analytics integration
- **Notes**: Real-time metrics, trend charts, BP attainment table, demo data loader

### 1.7 Results & Risk Brief

- **Version Introduced**: v1.7.0 / v1.16.1
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/pages/CalculationResults.tsx`
  - `frontend/src/core/riskBrief.ts`
  - `frontend/src/core/analytics.ts`
- **Test Coverage**: riskBrief.test.ts
- **Notes**: SKU-month breakdown, monthly capacity summary, bottleneck identification, Sales/Product Planning/Capacity/Raw tabs

### 1.8 Version History (Capacity Snapshots)

- **Version Introduced**: Initial build
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/services/versionService.ts`
- **Test Coverage**: Service-level tests
- **Notes**: Save, restore, delete named snapshots of capacity plan

### 1.9 Currency Conversion (USD/TWD/CNY)

- **Version Introduced**: v1.8.0 / v1.15.0
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/core/currency.ts`
- **Test Coverage**: currency.test.ts
- **Notes**: USD/TWD/CNY display switching, constant or yearly exchange rate, BP TWD conversion

### 1.10 Bilingual UI (EN / zh-TW)

- **Version Introduced**: v1.8.0
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/i18n/en.ts`
  - `frontend/src/i18n/zhTW.ts`
- **Test Coverage**: i18nKeys.test.ts (parity), i18nOutputs.test.ts
- **Notes**: Strict 1:1 key parity enforcement, mojibake detection, Simplified Chinese rejection

### 1.11 BP Target & Attainment Analysis

- **Version Introduced**: v1.13.0
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/core/bpTargets.ts`
  - `frontend/src/core/bpTargetsHelpers.ts`
- **Test Coverage**: bpTargets.test.ts, bpTargetsHelpers.test.ts
- **Notes**: Yearly/quarterly/monthly BP analysis, TWD conversion, customer/SKU contribution

### 1.12 Shared Workspace Collaboration

- **Version Introduced**: v1.18.0
- **Status**: Production-Ready
- **Key Files**:
  - `frontend/src/context/WorkspaceContext.tsx`
  - `frontend/src/components/workspace/WorkspaceSwitcher.tsx`
  - `frontend/src/services/workspaceService.ts`
  - `firestore.rules`
- **Test Coverage**: firestoreRules.test.ts, readOnlyGuard.test.ts
- **Notes**: Owner/Editor/Viewer roles, UID-based invite, personal + shared data paths

---

## 2. Decision Analysis Depth (v1.20.0)

- **Version Introduced**: v1.20.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/riskBrief.ts` -- Weighted Pressure Index
  - `frontend/src/core/riskAttribution.ts` -- Extended with weighted index
  - `frontend/src/core/bpAttribution.ts` -- BP Gap Attribution
  - `frontend/src/core/impactAnalysis.ts` -- Price Impact + Capacity Improvement Impact
  - `frontend/src/core/keyFindings.ts` -- Deterministic top-5 priority queue
  - `frontend/src/core/dataQuality.ts` -- decisionImpact tag
  - `frontend/src/core/analysisContract.ts` -- v1.1 payload
- **Test Coverage**: Comprehensive
  - riskAttribution.test.ts
  - bpAttribution.test.ts
  - impactAnalysis.test.ts
  - keyFindings.test.ts
  - analysisContract.test.ts
  - analysisCalibration.test.ts
- **i18n**: Complete (EN + zh-TW, ~70 new keys each)
- **Notes**: Weighted Pressure Index (Core x1.3, BU x1.0), proportional (not causal) attribution, read-only price/capacity scenarios, Key Findings priority queue. All analysis strings in EN + zh-TW.

---

## 3. AI Brief Export / Prompt Pack (v1.21.0, hardened v1.21.1)

- **Version Introduced**: v1.21.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/aiBriefExport.ts`
- **Test Coverage**: aiBriefExport.test.ts
- **i18n**: Complete
- **Notes**: Copy AI Brief Pack (Chinese prompt + sanitized JSON), Copy Prompt, Copy JSON, Download JSON with UTF-8 BOM. Guardrails prevent AI from modifying formulas, supplementing data, confusing units, or misinterpreting attribution. F-A-I-R classification.

---

## 4. Forecast Versioning & Change Impact Review (v1.22.0)

- **Version Introduced**: v1.22.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/changeImpact.ts`
  - `frontend/src/core/changeImpactExport.ts`
  - `frontend/src/services/snapshotService.ts`
- **Test Coverage**: changeImpact.test.ts, changeImpactExport.test.ts
- **i18n**: Complete
- **Notes**: Named forecast snapshots, compare any two snapshots for revenue/BP/utilization deltas, top changed customers/SKUs/months, price vs quantity attribution, DeepSeek export pack

---

## 5. Snapshot Change Review UX Polish (v1.23.0)

- **Version Introduced**: v1.23.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/CalculationResults.tsx` (Compare tab)
- **Test Coverage**: Integrated into page tests
- **i18n**: Complete
- **Notes**: Enhanced snapshot list, clear compare direction, organized impact sections, enhanced top changed tables, improved DeepSeek prompt

---

## 6. Forecast Version History Workflow (v1.24.0)

- **Version Introduced**: v1.24.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/snapshotMetadata.ts`
- **Test Coverage**: snapshotMetadata.test.ts (28 tests)
- **i18n**: Complete
- **Notes**: Optional metadata (kind, periodLabel, reviewStatus, note), Version Type Tags (6 types with color coding), Review Status Tags, filtering, recommended compare pairs, enhanced create modal

---

## 7. Forecasts Spreadsheet Lab (v1.26.0)

- **Version Introduced**: v1.26.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/ForecastsSpreadsheetLab.tsx`
  - `frontend/src/core/forecastsLabHelpers.test.ts`
- **Test Coverage**: forecastsLabHelpers.test.ts
- **i18n**: Complete
- **Notes**: Excel-like horizontal forecast input, year selector, react-datasheet-grid, dirty state tracking, save/discard, viewer read-only. Does NOT replace official Forecasts page.

---

## 8. UI Visual Consistency (v1.27.0)

- **Version Introduced**: v1.27.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/index.css`
  - `frontend/src/components/common/EmptyState.tsx`
- **Test Coverage**: Visual/style-only, no logic tests needed
- **i18n**: Complete
- **Notes**: Spreadsheet grid unification, EmptyState component, PageLoading unification, CSS organization. Style-only release.

---

## 9. Viewer True Read-only (v1.28.0)

- **Version Introduced**: v1.28.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/readOnlyGuard.test.ts`
  - All lab pages
- **Test Coverage**: readOnlyGuard.test.ts
- **i18n**: Complete
- **Notes**: Column disabled for viewers, onChange guard, read-only warning Alert, capacity lab wrapper. UI/interaction-only.

---

## 10. BP Targets Page (v1.29.0)

- **Version Introduced**: v1.29.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/BpTargets.tsx`
  - `frontend/src/core/bpTargetsHelpers.ts`
- **Test Coverage**: bpTargetsHelpers.test.ts
- **i18n**: Complete
- **Notes**: Independent `/bp-targets` page, Excel-like horizontal layout (2026-2040), viewer true read-only, validation rules, empty target safe removal

---

## 11. UI System Foundation (v1.30.0)

- **Version Introduced**: v1.30.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/index.css` (abf-page, abf-section, abf-toolbar, etc.)
  - `frontend/src/components/common/ActionBar.tsx`
  - `frontend/src/components/common/UnitText.tsx`
- **Test Coverage**: Style/component-only
- **i18n**: Complete
- **Notes**: CSS utilities, ActionBar, UnitText, component props passthrough, pilot pages updated

---

## 12. Dashboard & Results UI Unification (v1.31.0)

- **Version Introduced**: v1.31.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/pages/CalculationResults.tsx`
- **Test Coverage**: Presentation-layer only
- **i18n**: Complete
- **Notes**: abf-page container, standardized Alert classes, responsive KPI cards, PageLoading component

---

## 13. Core Input Pages UI Standardization (v1.32.0)

- **Version Introduced**: v1.32.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/Products.tsx`
  - `frontend/src/pages/Forecasts.tsx`
  - `frontend/src/pages/CapacityPlan.tsx`
- **Test Coverage**: Presentation-layer only
- **i18n**: Complete
- **Notes**: abf-page container, PageHeader, ActionBar, abf-section applied to all three core input pages

---

## 14. Number Display Standardization (v1.33.0)

- **Version Introduced**: v1.33.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/formatters.ts`
- **Test Coverage**: formatters.test.ts
- **i18n**: Complete
- **Notes**: formatNumber, formatCurrency, formatPercent utilities. Applied to Dashboard, Results, BP analysis. NaN protection with '-' fallback.

---

## 15. UI System Phase 1 Closure (v1.34.0)

- **Version Introduced**: v1.34.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/Parameters.tsx`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/SetupPage.tsx`
- **Test Coverage**: Presentation-layer only
- **i18n**: Complete
- **Notes**: Final low-risk polish for Parameters, Login, Setup pages. Closure of v1.30-v1.41 UI System Phase 1.

---

## 16. Data Quality Visibility (v1.35.0)

- **Version Introduced**: v1.35.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/dataQuality.ts`
  - `frontend/src/core/dataQualityVisibility.ts`
  - `frontend/src/components/common/DataQualityBadge.tsx`
  - `frontend/src/components/common/DataQualityAlert.tsx`
- **Test Coverage**: dataQuality.test.ts, dataQualityVisibility.test.ts
- **i18n**: Complete
- **Notes**: Inline cell-level indicators, page-level warning banners on Products, Forecasts, Capacity, BP Targets, Parameters. Viewer can see but not edit.

---

## 17. Data Quality Remediation Entry Points (v1.36.0)

- **Version Introduced**: v1.36.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/dataQualityRemediation.ts`
  - `frontend/src/components/common/DataQualityQuickFixDrawer.tsx`
  - `frontend/src/components/common/DataQualityGuidedFixModal.tsx`
- **Test Coverage**: Integration with data quality tests
- **i18n**: Complete
- **Notes**: Products Quick Fix Drawer, BP Targets Inline Popover, Parameters Exchange Rate Popover, Forecasts Guided Fix Modal, Capacity Navigation Fix. Viewer gate enforced. No silent auto-fix.

---

## 18. Scenario Planning MVP (v1.37.0)

- **Version Introduced**: v1.37.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/ScenarioPlanning.tsx`
  - `frontend/src/core/scenarioEngine.ts`
  - `frontend/src/core/scenarioExport.ts`
- **Test Coverage**: scenarioEngine.test.ts, scenarioExport.test.ts
- **i18n**: Complete
- **Notes**: Single in-memory scenario, four global multipliers (forecast volume, unit price, Core capacity, BU capacity), baseline vs scenario comparison, DQ caveat banner, viewer read-only guard, sanitized JSON export

---

## 19. AI Data Copilot Deterministic MVP (v1.38.0)

- **Version Introduced**: v1.38.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/pages/AiCopilot.tsx`
  - `frontend/src/core/aiCopilotContext.ts`
  - `frontend/src/core/aiCopilotTools.ts`
  - `frontend/src/core/aiCopilotPrompt.ts`
  - `frontend/src/core/aiCopilotExport.ts`
  - `frontend/src/core/aiCopilotFixDrafts.ts`
  - `frontend/src/core/aiCopilotGuardrails.ts`
  - `frontend/src/components/copilot/CopilotChat.tsx`
  - `frontend/src/components/copilot/CopilotMessage.tsx`
  - `frontend/src/components/copilot/CopilotQuickButtons.tsx`
- **Test Coverage**: aiCopilotContext.test.ts, aiCopilotTools.test.ts, aiCopilotPrompt.test.ts, aiCopilotExport.test.ts, aiCopilotFixDrafts.test.ts, aiCopilotGuardrails.test.ts, aiCopilotViewer.test.ts, aiCopilotSanitize.test.ts, aiCopilotRouting.test.ts
- **i18n**: Complete
- **Notes**: 6 deterministic diagnostic tools, quick question buttons, free-form keyword routing, F-A-I-R tagged responses, source references, confidence/caveat display, fix draft model, viewer read-only guard. No external AI API.

---

## 20. AI Copilot Evaluation & Hardening (v1.39.0)

- **Version Introduced**: v1.39.0
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `frontend/src/core/aiCopilotEval.ts`
  - `frontend/src/core/aiCopilotRedTeam.test.ts`
- **Test Coverage**: aiCopilotEval.test.ts, aiCopilotRedTeam.test.ts (10 safety tests)
- **i18n**: Complete
- **Notes**: Eval harness with 10 cases, red team suite (prompt injection, data leakage, external AI blocking), UX hardening (tool name display, confidence color coding, collapsible references, caveat alerts, fallback CTAs), F-A-I-R labeling, 60+ new tests

---

## 21. AI Provider Adapter + BYOK Safe Pilot (v1.40.0)

- **Version Introduced**: v1.40.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/core/aiProviderAdapter.ts`
  - `frontend/src/core/aiCopilotOutputValidation.ts`
  - `frontend/src/core/aiProviderPromptPack.ts`
  - `frontend/src/components/copilot/AiProviderSettingsDrawer.tsx`
  - `frontend/src/components/copilot/AiProviderStatusTag.tsx`
- **Test Coverage**: aiProviderAdapter.test.ts, aiCopilotOutputValidation.test.ts, aiProviderPromptPack.test.ts, aiProviderSecurity.test.ts, aiCopilotProviderRedTeam.test.ts
- **i18n**: Complete (EN + zh-TW)
- **Notes**: Pluggable `AiProvider` interface, mock provider, external BYOK placeholder, output validation layer (blocked patterns: save/write, data guessing, causality claims, currency confusion, formula modification), session-only BYOK keys (no persistence), viewer restrictions on provider config

---

## 22. AI Provider Output Validation Wiring Fix (v1.40.1)

- **Version Introduced**: v1.40.1
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/components/copilot/CopilotChat.tsx`
- **Test Coverage**: Regression tests preventing future disconnection
- **i18n**: N/A (no new strings)
- **Notes**: Fix wiring `validateProviderOutput` into all provider response paths. Was a blocker identified in PROJECT_AGENT_CONTEXT_AND_ROADMAP.md.

---

## 23. AI Copilot Reliability Marathon (v1.41.0)

- **Version Introduced**: v1.41.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/core/aiCopilotOutputValidation.ts`
  - `frontend/src/core/aiCopilotTools.ts`
  - `frontend/src/core/aiCopilotRedTeamCorpus100.test.ts`
  - `frontend/src/core/aiProviderSecurityBoundary.test.ts`
  - `frontend/src/components/copilot/CopilotMessage.tsx`
- **Test Coverage**: aiCopilotRedTeamCorpus100.test.ts (100 eval cases), aiProviderSecurityBoundary.test.ts, aiCopilotOutputValidation.test.ts, CopilotMessage.ux.test.tsx, CopilotChatOutputValidationWiring.test.ts
- **i18n**: Complete (12 new copilot keys in EN + zh-TW)
- **Notes**: Output validation wiring confirmed, UX transparency (answer status tags, "Why this answer?" section), Q&A Router v2 with Traditional Chinese support, Red Team Corpus 100 (8 categories), security boundary tests, auto-save regex fix

---

## 24. Daily Operations Workbench (v1.42.0)

- **Version Introduced**: v1.42.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/pages/DailyOperationsWorkbench.tsx` (1017 lines)
  - `frontend/src/core/workbench.ts` (703 lines)
  - `frontend/src/pages/DailyOperationsWorkbench.test.tsx` (379 lines)
  - `frontend/src/core/workbench.test.ts` (800 lines)
- **Test Coverage**: 55 core unit tests + 18 page render tests
- **i18n**: Complete (80+ new keys in EN + zh-TW)
- **Notes**: `/operations` route, 7-stage workflow pipeline stepper, abnormality summary by domain, look-ahead focus (next 6 months), revenue/BP summary, 5 scenario presets, AI Copilot Tool 7 (`explainWorkbenchOverview`). Pure function, zero side effects.

---

## 25. Abnormality Intelligence Layer (v1.43.0)

- **Version Introduced**: v1.43.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/core/abnormalityIntelligence.ts` (780 lines)
  - `frontend/src/core/abnormalityIntelligence.test.ts` (550 lines)
- **Test Coverage**: 13 core unit tests
- **i18n**: Complete (EN + zh-TW)
- **Notes**: ABNORMALITY_TAXONOMY with 20 DQ issue patterns across 6 business categories, composite severity scoring with domain weights, evidence citations (EvidenceCitation[]), "Why it matters today" narrative template, AI Copilot Tool 8 (`explainAbnormalityDetail`). Pure function, zero side effects.

---

## 26. Operational What-if Scenario (v1.44.0)

- **Version Introduced**: v1.44.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/core/operationalScenario.ts` (450-798 lines)
  - `frontend/src/core/operationalScenario.test.ts` (400 lines)
- **Test Coverage**: 23 core unit tests
- **i18n**: Complete (EN + zh-TW)
- **Notes**: CapacityShiftScenario (shift months by N, clamp [-12,+12]), ForecastAdjustmentScenario (percentage with customer/SKU/month filters), OrderDisappearanceScenario (remove matching forecasts), CustomerSkuImpact (per-customer/SKU revenue deltas, top 20 SKUs). Transforms raw data before calling scenarioEngine.ts. AI Copilot Tool 9 (`explainScenarioV2Impact`). Pure function, zero side effects.

---

## 27. Management Report Pack (v1.45.0)

- **Version Introduced**: v1.45.0
- **Status**: Feature Branch (NOT on `main`)
- **Key Files**:
  - `frontend/src/core/managementReport.ts` (900 lines)
  - `frontend/src/core/managementReport.test.ts` (700 lines)
- **Test Coverage**: 41 core unit tests
- **i18n**: Complete (EN + zh-TW)
- **Notes**: Daily reports (9 sections), weekly reports (14 sections), export to Markdown and JSON with UTF-8 BOM, sanitizeObject() strips sensitive keys, AI Copilot Tool 10 (`generateReportNarrative`). Pure function, zero side effects, fixed precision (toFixed(1)), stable sort.

---

## 28. Snapshot Rules Hardening (v1.22.2)

- **Version Introduced**: v1.22.2
- **Status**: Production-Ready (on `main`)
- **Key Files**:
  - `firestore.rules`
  - `docs/phase6/FIRESTORE_SNAPSHOT_RULES_HARDENING.md`
- **Test Coverage**: firestoreRules.test.ts (7+ snapshot permission tests)
- **i18n**: N/A
- **Notes**: Fixed wildcard `{document=**}` overlap with snapshot-specific rules. Snapshots isolated from general write whitelist. Immutable property and createdBy isolation enforced in production.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Production-Ready (on `main`) | 21 features |
| Feature Branch (NOT on `main`) | 7 features (v1.40-v1.45) |
| Docs Only | 0 |
| Planned but Not Implemented | 0 |
| Implemented but Weakly Verified | 0 |

### Version-to-Status Map

| Version | Feature | Status |
|---------|---------|--------|
| v1.20.0 | Decision Analysis Depth | Production-Ready |
| v1.21.0 | AI Brief Export / Prompt Pack | Production-Ready |
| v1.22.0 | Forecast Versioning & Change Impact | Production-Ready |
| v1.22.2 | Snapshot Rules Hardening | Production-Ready |
| v1.23.0 | Snapshot Change Review UX Polish | Production-Ready |
| v1.24.0 | Forecast Version History Workflow | Production-Ready |
| v1.26.0 | Forecasts Spreadsheet Lab | Production-Ready |
| v1.27.0 | UI Visual Consistency | Production-Ready |
| v1.28.0 | Viewer True Read-only | Production-Ready |
| v1.29.0 | BP Targets Page | Production-Ready |
| v1.30.0 | UI System Foundation | Production-Ready |
| v1.31.0 | Dashboard & Results UI Unification | Production-Ready |
| v1.32.0 | Core Input Pages UI Standardization | Production-Ready |
| v1.33.0 | Number Display Standardization | Production-Ready |
| v1.34.0 | UI System Phase 1 Closure | Production-Ready |
| v1.35.0 | Data Quality Visibility | Production-Ready |
| v1.36.0 | Data Quality Remediation Entry Points | Production-Ready |
| v1.37.0 | Scenario Planning MVP | Production-Ready |
| v1.38.0 | AI Data Copilot Deterministic MVP | Production-Ready |
| v1.39.0 | AI Copilot Evaluation & Hardening | Production-Ready |
| v1.40.0 | AI Provider Adapter + BYOK | Feature Branch |
| v1.40.1 | Output Validation Wiring Fix | Feature Branch |
| v1.41.0 | AI Copilot Reliability Marathon | Feature Branch |
| v1.42.0 | Daily Operations Workbench | Feature Branch |
| v1.43.0 | Abnormality Intelligence Layer | Feature Branch |
| v1.44.0 | Operational What-if Scenario | Feature Branch |
| v1.45.0 | Management Report Pack | Feature Branch |

### Test Coverage Summary

| Metric | Value |
|--------|-------|
| Total test files | 57 |
| Total tests passing | 1398 |
| Tests failing | 0 |
| Lint errors | 0 |
| Lint warnings | 177 (pre-existing) |

### Branch Divergence

- **main**: v1.39.0 (commit `e9b4b11`)
- **Current branch**: v1.45.0 (commit `47e3eca`)
- **Commits ahead of main**: 9 commits
- **Files changed**: 61 files, +21,360 lines, -30 lines

---

*Generated: 2026-05-28*
*Agent: Project State Inventory Agent*
