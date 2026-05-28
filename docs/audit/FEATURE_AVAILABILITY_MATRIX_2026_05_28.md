# ABF Capacity Calculator -- Feature Availability Matrix

Date: 2026-05-28
Branch: xiaomi/v1-41-ai-copilot-reliability-marathon
Main Branch Version: v1.39.0

---

## Legend

- **Available in main?**: Is the feature merged to the `main` branch?
- **Core module exists?**: Does the primary TypeScript module file exist?
- **Tests exist?**: Are there dedicated test files for this feature?
- **i18n complete?**: Are all user-facing strings available in both EN and zh-TW?
- **Documentation exists?**: Is there dedicated documentation (beyond README)?
- **Risk level**: Low (stable, tested, no known issues), Medium (some gaps or dependencies), High (blockers, thin coverage, or architectural risk)

---

## Feature Availability Matrix

| # | Feature | Version | Available in main? | Core module exists? | Tests exist? | i18n complete? | Documentation exists? | Risk level |
|---|---------|---------|-------------------|--------------------|--------------|-----------------|-----------------------|-----------|
| 1 | Product/SKU Management | v1.2.6 | Y | Y | Y | Y | Y (user-guide) | Low |
| 2 | Monthly Forecasts | v1.12.1 | Y | Y | Y | Y | Y (user-guide) | Low |
| 3 | Capacity Planning | Initial | Y | Y | Y | Y | Y (user-guide) | Low |
| 4 | Yield & Panel Parameters | Initial | Y | Y | Y | Y | Y (user-guide) | Low |
| 5 | Calculation Engine | Initial | Y | Y | Y | Y | Y (README formulas) | Low |
| 6 | Dashboard | v1.7.0 | Y | Y | Y | Y | Y (user-guide) | Low |
| 7 | Results & Risk Brief | v1.7.0 | Y | Y | Y | Y | Y (user-guide) | Low |
| 8 | Version History (Snapshots) | Initial | Y | Y | Y | Y | Y | Low |
| 9 | Currency Conversion (USD/TWD/CNY) | v1.8.0 | Y | Y | Y | Y | Y | Low |
| 10 | Bilingual UI (EN/zh-TW) | v1.8.0 | Y | Y | Y | Y | Y | Low |
| 11 | BP Target & Attainment | v1.13.0 | Y | Y | Y | Y | Y (user-guide) | Low |
| 12 | Shared Workspace Collaboration | v1.18.0 | Y | Y | Y | Y | Y (WORKSPACE_COLLABORATION.md) | Low |
| 13 | Decision Analysis Depth | v1.20.0 | Y | Y | Y | Y | Y (ANALYSIS_CONTRACT.md) | Low |
| 14 | AI Brief Export / Prompt Pack | v1.21.0 | Y | Y | Y | Y | Y (AI_BRIEF_EXPORT.md) | Low |
| 15 | Forecast Versioning & Change Impact | v1.22.0 | Y | Y | Y | Y | Y | Low |
| 16 | Snapshot Rules Hardening | v1.22.2 | Y | Y (firestore.rules) | Y | N/A | Y (phase6 docs) | Low |
| 17 | Snapshot Change Review UX | v1.23.0 | Y | Y (in CalculationResults) | Y | Y | N | Low |
| 18 | Forecast Version History Workflow | v1.24.0 | Y | Y | Y | Y | N | Low |
| 19 | Forecasts Spreadsheet Lab | v1.26.0 | Y | Y | Y | Y | N | Low |
| 20 | UI Visual Consistency | v1.27.0 | Y | Y (CSS) | N (style-only) | Y | N | Low |
| 21 | Viewer True Read-only | v1.28.0 | Y | Y | Y | Y | N | Low |
| 22 | BP Targets Page | v1.29.0 | Y | Y | Y | Y | Y (user-guide) | Low |
| 23 | UI System Foundation | v1.30.0 | Y | Y (CSS/components) | N (style-only) | Y | Y (UI docs) | Low |
| 24 | Dashboard & Results UI Unification | v1.31.0 | Y | Y (pages) | N (style-only) | Y | N | Low |
| 25 | Core Input Pages UI Standardization | v1.32.0 | Y | Y (pages) | N (style-only) | Y | N | Low |
| 26 | Number Display Standardization | v1.33.0 | Y | Y | Y | Y | N | Low |
| 27 | UI System Phase 1 Closure | v1.34.0 | Y | Y (pages) | N (style-only) | Y | N | Low |
| 28 | Data Quality Visibility | v1.35.0 | Y | Y | Y | Y | Y (data-quality docs) | Low |
| 29 | Data Quality Remediation | v1.36.0 | Y | Y | Y | Y | Y (data-quality docs) | Low |
| 30 | Scenario Planning MVP | v1.37.0 | Y | Y | Y | Y | Y (scenario docs) | Low |
| 31 | AI Data Copilot Deterministic MVP | v1.38.0 | Y | Y | Y | Y | Y (ai-copilot docs) | Low |
| 32 | AI Copilot Evaluation & Hardening | v1.39.0 | Y | Y | Y | Y | Y (ai-eval docs) | Low |
| 33 | AI Provider Adapter + BYOK | v1.40.0 | N | Y | Y | Y | Y (ai-copilot docs) | Medium |
| 34 | Output Validation Wiring Fix | v1.40.1 | N | Y | Y | N/A | N | Medium |
| 35 | AI Copilot Reliability Marathon | v1.41.0 | N | Y | Y | Y | Y (ai-copilot docs) | Medium |
| 36 | Daily Operations Workbench | v1.42.0 | N | Y | Y | Y | Y (workbench docs) | Medium |
| 37 | Abnormality Intelligence Layer | v1.43.0 | N | Y | Y | Y | Y (operations docs) | Medium |
| 38 | Operational What-if Scenario | v1.44.0 | N | Y | Y | Y | Y (operations docs) | Medium |
| 39 | Management Report Pack | v1.45.0 | N | Y | Y | Y | Y (operations docs) | Medium |

---

## Risk Assessment Notes

### Low Risk (Features 1-32)

All features on `main` through v1.39.0 have:
- Comprehensive test coverage (core logic tests + integration)
- Complete i18n in EN and zh-TW
- Clean lint (0 errors)
- No known blockers

### Medium Risk (Features 33-39, v1.40-v1.45)

Features on the feature branch carry medium risk because:
- They have not been merged to `main` and have not gone through production deployment
- They represent 9 commits and +21,360 lines of new code
- Integration testing between these features (e.g., v1.43 abnormality scoring feeding v1.45 reports) is only covered by unit tests, not end-to-end tests
- The v1.40 BYOK provider adapter introduces a new architectural pattern (pluggable providers) that needs production validation
- However: all 1398 tests pass, 0 lint errors, clean build, and all guardrails verified

### No High Risk Features

No features currently carry high risk. The v1.40 output validation wiring blocker identified in PROJECT_AGENT_CONTEXT_AND_ROADMAP.md has been resolved in v1.40.1.

---

## Coverage Gaps

### Style-Only Releases (No Dedicated Tests)

The following features are presentation-layer-only and intentionally have no dedicated logic tests:
- v1.27.0 UI Visual Consistency
- v1.30.0 UI System Foundation
- v1.31.0 Dashboard & Results UI Unification
- v1.32.0 Core Input Pages UI Standardization
- v1.34.0 UI System Phase 1 Closure

These are low risk because they contain no business logic changes.

### Thin Page-Level Integration Tests

The implementation report notes that "page-level integration tests are limited to smoke tests." Core modules have comprehensive unit tests, but end-to-end user flows (e.g., creating a SKU, entering forecasts, running analysis, generating report) are not covered by automated tests. The smoke test checklists in `docs/qa/` serve as the manual verification path.

### Experimental Pages Not in Main Sidebar

Two "Lab" pages exist but are marked experimental:
- `/products-sheet-lab` (Products Spreadsheet Lab) -- on `main`
- `/forecasts-lab` (Forecasts Spreadsheet Lab) -- on `main`

These are accessible by direct URL but are labeled with experiment tags. They do not replace the official Products and Forecasts pages.

---

## Module Dependency Map (Core)

```
calculationEngine.ts
  +-- yieldMatrix.ts
  +-- panelLayout.ts
  +-- defaults.ts
  +-- validation.ts

analytics.ts
  +-- calculationEngine.ts (output)

bpTargets.ts / bpTargetsHelpers.ts

dataQuality.ts
  +-- calculationEngine.ts (output)

dataQualityVisibility.ts
  +-- dataQuality.ts

dataQualityRemediation.ts
  +-- dataQuality.ts

scenarioEngine.ts
  +-- calculationEngine.ts (re-run)

scenarioExport.ts
  +-- scenarioEngine.ts

changeImpact.ts / changeImpactExport.ts
  +-- calculationEngine.ts

riskBrief.ts / riskAttribution.ts / bpAttribution.ts
  +-- calculationEngine.ts (output)
  +-- bpTargets.ts

impactAnalysis.ts
  +-- calculationEngine.ts (re-run)

keyFindings.ts
  +-- dataQuality.ts
  +-- riskAttribution.ts
  +-- bpAttribution.ts

analysisContract.ts
  +-- riskBrief.ts
  +-- bpAttribution.ts
  +-- impactAnalysis.ts
  +-- keyFindings.ts

aiBriefExport.ts
  +-- analysisContract.ts

aiCopilotTools.ts
  +-- dataQuality.ts
  +-- scenarioEngine.ts
  +-- bpTargets.ts
  +-- riskBrief.ts
  +-- aiCopilotContext.ts

snapshotMetadata.ts (standalone)

formatters.ts (standalone)

currency.ts (standalone)

--- Feature Branch (v1.42-v1.45) ---

workbench.ts
  +-- dataQuality.ts
  +-- calculationEngine.ts
  +-- bpTargets.ts
  +-- aiCopilotTools.ts

abnormalityIntelligence.ts
  +-- dataQuality.ts

operationalScenario.ts
  +-- scenarioEngine.ts
  +-- calculationEngine.ts

managementReport.ts
  +-- workbench.ts
  +-- abnormalityIntelligence.ts
  +-- operationalScenario.ts (optional)
  +-- scenarioEngine.ts (optional)
```

---

## AI Copilot Tools Inventory

| Tool # | Name | Version | On main? | Keywords (EN) | Keywords (zh-TW) |
|--------|------|---------|----------|---------------|-------------------|
| 1 | inspectDataQuality | v1.38 | Y | data quality, DQ | 資料品質 |
| 2 | explainCapacityRisk | v1.38 | Y | capacity, bottleneck | 產能, 瓶頸 |
| 3 | explainBpGap | v1.38 | Y | BP, target, gap | 差距, 達成 |
| 4 | suggestDataFixes | v1.38 | Y | fix, repair, data | 修復 |
| 5 | explainScenarioImpact | v1.38 | Y | scenario, what-if | 情境 |
| 6 | buildLookAheadFocus | v1.38 | Y | look-ahead, future | 前瞻, 未來 |
| 7 | explainWorkbenchOverview | v1.42 | N | workbench, overview, operations | 工作台, 總覽 |
| 8 | explainAbnormalityDetail | v1.43 | N | abnormality, issue, problem | 異常 |
| 9 | explainScenarioV2Impact | v1.44 | N | scenario v2, what-if, operational | 營運情境 |
| 10 | generateReportNarrative | v1.45 | N | report, daily, weekly | 管理報告 |

---

## Pages Inventory

| Page | Route | Version | On main? | Lazy loaded? |
|------|-------|---------|----------|-------------|
| Dashboard | /dashboard | v1.7.0 | Y | Y |
| Products | /products | v1.2.6 | Y | Y |
| Products Spreadsheet Lab | /products-sheet-lab | v1.12.0 | Y | Y |
| Forecasts | /forecasts | v1.12.1 | Y | Y |
| Forecasts Spreadsheet Lab | /forecasts-lab | v1.26.0 | Y | Y |
| Capacity Plan | /capacity | Initial | Y | Y |
| Capacity Spreadsheet | /capacity-lab | Initial | Y | Y |
| Parameters | /parameters | Initial | Y | Y |
| BP Targets | /bp-targets | v1.29.0 | Y | Y |
| Calculation Results | /results | v1.7.0 | Y | Y |
| Scenario Planning | /scenario | v1.37.0 | Y | Y |
| AI Copilot | /copilot | v1.38.0 | Y | Y |
| Daily Operations Workbench | /operations | v1.42.0 | N | Y |
| Login | /login | Initial | Y | N |
| Setup | /setup | Initial | Y | N |

---

## Test File Inventory

| Test File | Tests | Version | On main? |
|-----------|-------|---------|----------|
| calculationEngine.test.ts | 31 | Initial | Y |
| bpTargets.test.ts | 14+ | v1.13.0 | Y |
| bpTargetsHelpers.test.ts | -- | v1.29.0 | Y |
| forecastGrowth.test.ts | -- | v1.12.1 | Y |
| currency.test.ts | -- | v1.8.0 | Y |
| riskBrief.test.ts | -- | v1.16.1 | Y |
| riskAttribution.test.ts | -- | v1.17.0 | Y |
| bpAttribution.test.ts | -- | v1.20.0 | Y |
| impactAnalysis.test.ts | -- | v1.20.0 | Y |
| keyFindings.test.ts | -- | v1.20.0 | Y |
| analysisContract.test.ts | -- | v1.20.0 | Y |
| analysisCalibration.test.ts | -- | v1.20.0 | Y |
| dataQuality.test.ts | -- | v1.35.0 | Y |
| dataQualityVisibility.test.ts | -- | v1.35.0 | Y |
| changeImpact.test.ts | -- | v1.22.0 | Y |
| changeImpactExport.test.ts | -- | v1.22.0 | Y |
| snapshotMetadata.test.ts | 28 | v1.24.0 | Y |
| aiBriefExport.test.ts | -- | v1.21.0 | Y |
| scenarioEngine.test.ts | -- | v1.37.0 | Y |
| scenarioExport.test.ts | -- | v1.37.0 | Y |
| aiCopilotContext.test.ts | -- | v1.38.0 | Y |
| aiCopilotTools.test.ts | -- | v1.38.0 | Y |
| aiCopilotPrompt.test.ts | -- | v1.38.0 | Y |
| aiCopilotExport.test.ts | -- | v1.38.0 | Y |
| aiCopilotFixDrafts.test.ts | -- | v1.38.0 | Y |
| aiCopilotGuardrails.test.ts | -- | v1.38.0 | Y |
| aiCopilotViewer.test.ts | -- | v1.38.0 | Y |
| aiCopilotSanitize.test.ts | -- | v1.38.0 | Y |
| aiCopilotRouting.test.ts | -- | v1.38.0 | Y |
| aiCopilotEval.test.ts | -- | v1.39.0 | Y |
| aiCopilotRedTeam.test.ts | 10 | v1.39.0 | Y |
| i18nKeys.test.ts | -- | v1.19.0 | Y |
| i18nOutputs.test.ts | -- | v1.19.0 | Y |
| metricDefinitions.test.ts | -- | v1.16.0 | Y |
| formatters.test.ts | -- | v1.33.0 | Y |
| readOnlyGuard.test.ts | -- | v1.28.0 | Y |
| forecastsLabHelpers.test.ts | -- | v1.26.0 | Y |
| skuDerived.test.ts | -- | v1.12.0 | Y |
| firestoreRules.test.ts | 7+ | v1.18.0 | Y |
| aiProviderAdapter.test.ts | -- | v1.40.0 | N |
| aiCopilotOutputValidation.test.ts | -- | v1.40.0 | N |
| aiProviderPromptPack.test.ts | -- | v1.40.0 | N |
| aiProviderSecurity.test.ts | -- | v1.40.0 | N |
| aiCopilotProviderRedTeam.test.ts | -- | v1.40.0 | N |
| aiCopilotRedTeamCorpus100.test.ts | 100 | v1.41.0 | N |
| aiProviderSecurityBoundary.test.ts | -- | v1.41.0 | N |
| CopilotMessage.ux.test.tsx | -- | v1.41.0 | N |
| CopilotChatOutputValidationWiring.test.ts | -- | v1.41.0 | N |
| workbench.test.ts | 55 | v1.42.0 | N |
| DailyOperationsWorkbench.test.tsx | 18 | v1.42.0 | N |
| abnormalityIntelligence.test.ts | 13 | v1.43.0 | N |
| operationalScenario.test.ts | 23 | v1.44.0 | N |
| managementReport.test.ts | 41 | v1.45.0 | N |

**Total**: 57 test files, 1398 tests passing

---

*Generated: 2026-05-28*
*Agent: Project State Inventory Agent*
