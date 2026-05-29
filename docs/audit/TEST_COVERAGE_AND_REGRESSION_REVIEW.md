# Test Coverage and Regression Review

**Date**: 2026-05-28
**Branch**: `xiaomi/v1-41-ai-copilot-reliability-marathon`
**Start Time**: 2026-05-28 (execution timestamp 1779952653679)
**End Time**: 2026-05-28 (test run completed)
**Duration**: ~2 minutes (348 test suites, 1398 tests)

---

## Summary

| Metric | Value |
|---|---|
| Total Test Suites | 348 |
| Total Tests | 1,398 |
| Passed | 1,398 |
| Failed | 0 |
| Pending | 0 |
| Snapshots | 0 |
| Test Files | 56 |

**Overall Status**: All 1,398 tests pass. Zero failures.

---

## Tests Per Module/Category

### Core Domain Logic (32 files, 729 tests)

| File | Tests | Duration (ms) | Coverage Quality |
|---|---|---|---|
| `aiCopilotRedTeamCorpus100.test.ts` | 100 | 26 | Strong - 100 adversarial corpus entries |
| `aiCopilotOutputValidation.test.ts` | 78 | 29 | Strong - all validator functions covered |
| `aiCopilotRouting.test.ts` | 55 | 17 | Good |
| `workbench.test.ts` | 55 | 77 | Strong - empty, partial, full data, edge cases, determinism |
| `aiBriefExport.test.ts` | 51 | 84 | Good |
| `aiCopilotGuardrails.test.ts` | 50 | 19 | Good |
| `formatters.test.ts` | 50 | 38 | Good - number, currency, percentage formatting |
| `aiCopilotExport.test.ts` | 49 | 72 | Good |
| `bpTargets.test.ts` | 49 | 101 | Good |
| `aiCopilotTools.test.ts` | 46 | 21 | Good |
| `managementReport.test.ts` | 41 | 62 | Strong - daily/weekly reports, exports, sensitivity |
| `aiCopilotSanitize.test.ts` | 39 | 14 | Good |
| `aiProviderSecurityBoundary.test.ts` | 37 | 222 | Strong - security boundary tests |
| `forecastsLabHelpers.test.ts` | 32 | 13 | Good |
| `aiCopilotPrompt.test.ts` | 32 | 37 | Good |
| `snapshotMetadata.test.ts` | 31 | 44 | Good |
| `calculationEngine.test.ts` | 31 | 13 | Good - core calculation tested |
| `aiProviderPromptPack.test.ts` | 24 | 39 | Good |
| `changeImpactExport.test.ts` | 24 | 14 | Good |
| `aiCopilotFixDrafts.test.ts` | 24 | 13 | Good |
| `operationalScenario.test.ts` | 23 | 225 | Strong - capacity delay, forecast adj, order disappearance, clamp bounds, no mutation, determinism |
| `scenarioExport.test.ts` | 22 | 23 | Good |
| `aiProviderAdapter.test.ts` | 21 | 14 | Good |
| `aiCopilotEval.test.ts` | 18 | 17 | Adequate |
| `skuDerived.test.ts` | 18 | 10 | Good |
| `riskAttribution.test.ts` | 17 | 61 | Good |
| `aiCopilotViewer.test.ts` | 16 | 78 | Adequate |
| `dataQualityVisibility.test.ts` | 15 | 10 | Adequate |
| `riskBrief.test.ts` | 14 | 809 | Good - longest duration, likely uses real calculation |
| `abnormalityIntelligence.test.ts` | 13 | 21 | Adequate |
| `aiCopilotContext.test.ts` | 13 | 150 | Adequate |
| `currency.test.ts` | 11 | 33 | Adequate |
| `impactAnalysis.test.ts` | 11 | 221 | Adequate |
| `scenarioEngine.test.ts` | 10 | 28 | Adequate |
| `aiCopilotRedTeam.test.ts` | 10 | 15 | Adequate |
| `aiProviderSecurity.test.ts` | 10 | 77 | Adequate |
| `changeImpact.test.ts` | 10 | 11 | Adequate |
| `analysisCalibration.test.ts` | 8 | 3 | Minimal |
| `keyFindings.test.ts` | 8 | 193 | Adequate |
| `forecastGrowth.test.ts` | 8 | 8 | Adequate |
| `dataQuality.test.ts` | 8 | 10 | Adequate - blocked, high, low, medium confidence paths |
| `bpTargetsHelpers.test.ts` | 7 | 11 | Minimal |
| `bpAttribution.test.ts` | 7 | 230 | Minimal |
| `aiCopilotProviderRedTeam.test.ts` | 5 | 34 | Minimal |
| `readOnlyGuard.test.ts` | 5 | 7 | Minimal |
| `metricDefinitions.test.ts` | 4 | 5 | Minimal |
| `analysisContract.test.ts` | 2 | 159 | Very thin |

### Component Tests (3 files, 80 tests)

| File | Tests | Duration (ms) | Coverage Quality |
|---|---|---|---|
| `CopilotChatOutputValidationWiring.test.ts` | 56 | 29 | Strong - wiring verification |
| `CopilotMessage.ux.test.tsx` | 12 | 1915 | Adequate - UX rendering tests |
| `CopilotChat.validation.test.ts` | 12 | 13 | Adequate |

### Page Tests (1 file, 17 tests)

| File | Tests | Duration (ms) | Coverage Quality |
|---|---|---|---|
| `DailyOperationsWorkbench.test.tsx` | 17 | 2996 | Adequate - integration test, slow |

### Service Tests (4 files, 74 tests)

| File | Tests | Duration (ms) | Coverage Quality |
|---|---|---|---|
| `firestoreRules.test.ts` | 40 | 12 | Strong |
| `firebaseServices.test.ts` | 11 | 58 | Adequate |
| `workspaceService.test.ts` | 11 | 387 | Adequate |
| `projectScope.test.ts` | 12 | 8 | Adequate |

### i18n Tests (2 files, 15 tests)

| File | Tests | Duration (ms) | Coverage Quality |
|---|---|---|---|
| `i18nOutputs.test.ts` | 10 | 185 | Good - output translation coverage |
| `i18nKeys.test.ts` | 5 | 11 | Good - key parity, mojibake, simplified Chinese detection |

---

## Coverage Gaps Identified

### 1. Core Modules Without Dedicated Test Files

The following core modules have NO corresponding test file:

| Module | Risk Level | Notes |
|---|---|---|
| `analytics.ts` | **HIGH** | Contains `buildAnalyticsModel()`, `toQuarter()`, `toYear()` - heavily used by Dashboard. Indirectly tested via `i18nOutputs.test.ts` and management report tests, but no direct unit tests for edge cases (empty data, single month, large datasets). |
| `validation.ts` | **HIGH** | Contains `validateSKU()`, `validateForecast()`, `validateCapacityPlan()` - input validation for all CRUD forms. No direct tests exist. |
| `panelLayout.ts` | **MEDIUM** | Contains `calculatePanelLayout()` - indirectly tested via `calculationEngine.test.ts` but no edge case tests for boundary chip sizes, zero margins, or negative dimensions. |
| `yieldMatrix.ts` | **MEDIUM** | Contains `layerCountToBucket()`, `getYieldRate()` - indirectly tested via calculation engine tests but no boundary tests for layer count transitions (8->10, 14->16, 20->21). |
| `defaults.ts` | **LOW** | Static configuration constants. No logic to test. |
| `dataQualityRemediation.ts` | **MEDIUM** | Contains remediation strategy classification and validation. No dedicated tests. |
| `analysisQaFixtures.ts` | **LOW** | Test fixture helper, not production code. |

### 2. Service Modules Without Test Files

| Module | Risk Level | Notes |
|---|---|---|
| `projectService.ts` | **MEDIUM** | Firestore CRUD for projects. Relies on `firestoreRules.test.ts` indirectly. |
| `skuService.ts` | **MEDIUM** | Firestore CRUD for SKUs with batch operations. |
| `forecastService.ts` | **MEDIUM** | Firestore CRUD for forecasts with batch operations. |
| `capacityService.ts` | **MEDIUM** | Firestore CRUD for capacity plans. |
| `parameterService.ts` | **MEDIUM** | Firestore CRUD for parameters. |
| `versionService.ts` | **MEDIUM** | Version snapshot management. |
| `skuVersionService.ts` | **MEDIUM** | SKU-level version management. |
| `demoDataService.ts` | **LOW** | Demo data seeding, not critical path. |
| `snapshotService.ts` | **MEDIUM** | Snapshot persistence. |

### 3. Page Components Without Test Files

Only 1 of 15 page components has tests:

| Page | Has Tests | Risk |
|---|---|---|
| `DailyOperationsWorkbench.tsx` | Yes | - |
| `Dashboard.tsx` | No | **HIGH** - primary landing page |
| `CalculationResults.tsx` | No | **HIGH** - core output page |
| `ScenarioPlanning.tsx` | No | **MEDIUM** |
| `AiCopilot.tsx` | No | **MEDIUM** |
| `Products.tsx` | No | **MEDIUM** |
| `Forecasts.tsx` | No | **MEDIUM** |
| `CapacityPlan.tsx` | No | **MEDIUM** |
| `BpTargets.tsx` | No | **MEDIUM** |
| `Parameters.tsx` | No | **LOW** |
| `LoginPage.tsx` | No | **LOW** |
| `SetupPage.tsx` | No | **LOW** |
| `CapacitySpreadsheet.tsx` | No | **MEDIUM** |
| `ForecastsSpreadsheetLab.tsx` | No | **MEDIUM** |
| `ProductsSpreadsheetLab.tsx` | No | **MEDIUM** |

### 4. UI Components Without Test Files

Only 3 of 24 component files have tests:

- `CopilotChat.tsx` - tested via validation wiring test
- `CopilotMessage.tsx` - has UX test
- All other 21 components have **zero tests**

### 5. Thin Test Coverage (Happy Path Only)

| Test File | Issue |
|---|---|
| `analysisContract.test.ts` | Only 2 tests - needs edge cases for empty model, malformed input |
| `metricDefinitions.test.ts` | Only 4 tests - needs coverage for all metric types |
| `bpAttribution.test.ts` | Only 7 tests with 230ms duration - complex logic, needs more edge cases |
| `readOnlyGuard.test.ts` | Only 5 tests - needs coverage for all mutation paths |
| `aiCopilotProviderRedTeam.test.ts` | Only 5 tests - thin for a security-critical module |
| `analysisCalibration.test.ts` | Only 8 tests - calibration logic needs boundary testing |

### 6. Missing Edge Case Categories

Across the test suite, the following edge case categories are underrepresented:

- **Concurrency/race conditions**: No tests for concurrent Firestore writes
- **Large dataset performance**: No tests for 100+ SKUs or 60+ month forecasts
- **Network failure simulation**: Service tests mock Firestore but don't simulate timeouts/offline
- **Browser compatibility**: No tests for different date parsing behaviors
- **Unicode/i18n in data fields**: Customer names with CJK characters, special chars in SKU codes
- **Negative/zero values**: Some tests exist but coverage is inconsistent across modules
- **Date boundary conditions**: Year-end rollover, leap year months, timezone edge cases

---

## Test Distribution by Category

| Category | Files | Tests | % of Total |
|---|---|---|---|
| AI Copilot (tools, validation, security, red team) | 18 | 653 | 46.7% |
| Core Business Logic (calculation, DQ, workbench, scenarios) | 14 | 340 | 24.3% |
| Components & Pages | 4 | 97 | 6.9% |
| Services (Firestore, workspace) | 4 | 74 | 5.3% |
| Export & Formatting | 6 | 188 | 13.4% |
| i18n | 2 | 15 | 1.1% |
| Other (snapshots, guards, metadata) | 8 | 131 | 9.4% |

Note: Some files are counted in multiple categories. AI Copilot tests dominate the suite at ~47% of all tests.

---

## Recommendations

### Priority 1 (High Risk - Add Tests)

1. **`validation.ts`** - Add unit tests for `validateSKU()`, `validateForecast()`, `validateCapacityPlan()`. These are the first line of defense for data integrity. Test: empty fields, boundary values, invalid types, negative numbers.

2. **`analytics.ts`** - Add unit tests for `buildAnalyticsModel()` with edge cases: empty input, single SKU, multi-year data, months with zero capacity. Currently only indirectly tested.

3. **Dashboard page** - Add integration test for the primary landing page component.

### Priority 2 (Medium Risk - Improve Coverage)

4. **`dataQualityRemediation.ts`** - Add tests for remediation strategy classification and input validation.

5. **Service modules** (`skuService.ts`, `forecastService.ts`, `capacityService.ts`) - Add Firestore CRUD tests with mocked database. Focus on batch operations and error handling.

6. **`panelLayout.ts`** - Add boundary tests: zero-size chips, chips larger than panel, negative margins.

7. **`yieldMatrix.ts`** - Add boundary tests for layer count bucket transitions.

8. **`analysisContract.test.ts`** - Expand from 2 tests to at least 10. Cover empty model, malformed timestamps, missing required fields.

### Priority 3 (Low Risk - Defensive)

9. **Thin test files** (`metricDefinitions`, `bpAttribution`, `readOnlyGuard`, `analysisCalibration`) - Expand to cover all exported functions and edge cases.

10. **Page component smoke tests** - Add basic render tests for critical pages (`CalculationResults`, `ScenarioPlanning`) to catch import/render regressions.

11. **Unicode edge cases** - Add tests with CJK characters in customer names, special characters in SKU codes.

---

## Test Quality Assessment

### Strengths

- **AI Copilot coverage is excellent**: 653 tests covering validation, security boundaries, red team corpus (100 adversarial cases), guardrails, sanitization, and provider adapter safety.
- **Core business logic has good depth**: `workbench.test.ts` (55 tests), `managementReport.test.ts` (41 tests), and `operationalScenario.test.ts` (23 tests) all include empty data, partial data, full data, edge cases, and determinism checks.
- **Determinism is tested**: Multiple modules verify that identical input produces identical output.
- **No mutation tests**: `operationalScenario.test.ts` explicitly verifies that original data arrays are not mutated.
- **Sensitive data stripping**: Management report tests verify that API keys and tokens are stripped from exports.
- **i18n integrity**: Tests detect mojibake, replacement characters, and Simplified Chinese leakage in Traditional Chinese dictionary.

### Weaknesses

- **Service layer is under-tested**: 9 service modules, only 4 have tests. Firestore CRUD operations are mostly untested.
- **Page components are almost untested**: 14 of 15 pages have zero test coverage.
- **UI components are under-tested**: 21 of 24 components have zero tests.
- **No performance/load tests**: No tests for large datasets (100+ SKUs, 60+ months).
- **No error boundary tests**: No tests for React error boundary behavior.
- **Test file imbalance**: AI Copilot tests are 47% of all tests, while the service layer (critical for data persistence) is only 5%.
