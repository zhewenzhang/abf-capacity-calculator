# Product Requirement Compliance Review

**Date**: 2026-05-28
**Start Time**: 15:16:51
**End Time**: 15:20:35
**Duration**: ~4 minutes
**Reviewer**: Agent 2 -- Product Requirement Compliance Agent
**Branch**: xiaomi/v1-41-ai-copilot-reliability-marathon

---

## Review Scope

This review checks six feature families against their stated product requirements from `docs/product/PROJECT_AGENT_CONTEXT_AND_ROADMAP.md` and `docs/product/DEVELOPMENT_PRINCIPLES.md`.

---

## 1. BP Targets -- Independent from Parameters

**Requirement**: BP Target editing must be decoupled from Parameters page. BP target unit fixed as Million TWD. Parameters Save and Restore Defaults must preserve BP targets.

**Status**: COMPLIANT

**Evidence**:

- `BpTargets.tsx` is a fully independent page at `/bp-targets` route with its own data loading, save, discard, and dirty-check logic.
- `Parameters.tsx` (lines 614-631) contains only a redirect card with a navigation button to `/bp-targets`. No BP target editing UI exists on the Parameters page.
- `Parameters.tsx` `handleRestoreDefaults` (line 232) explicitly preserves BP targets: `bpTargets: latestParams.bpTargets`.
- `Parameters.tsx` `handleSave` (line 213) preserves BP targets: `bpTargets: params.bpTargets`.
- BP target unit is displayed as "Million TWD" via `UnitText` in `BpTargets.tsx` (line 357) and quick fix input shows `addonAfter="M TWD"` (line 216).
- `bpTargetsHelpers.ts` enforces START_YEAR/END_YEAR range and `rowsToRecord` handles NaN/empty/zero semantics safely.

**No gaps found.**

---

## 2. Viewer True Read-Only -- Consistency Across ALL Pages

**Requirement**: Viewer cannot edit, paste, or trigger any state change. All editable fields must be `disabled: !writable`. All onChange handlers must have guards. Read-only warning Alert must be shown.

**Status**: PARTIALLY COMPLIANT -- 2 pages have gaps

**Evidence by page**:

| Page | canEdit() | Read-only Alert | onChange Guard | Button Guards | Status |
|------|-----------|-----------------|---------------|---------------|--------|
| Products.tsx | Yes (line 104) | Yes (line 618) | Yes (line 279) | Yes (lines 605-607, 639, 650) | PASS |
| Forecasts.tsx | Yes (line 122) | Yes (line 869) | Yes (line 211) | Yes (lines 925, 932) | PASS |
| CapacityPlan.tsx | Yes (line 92) | Yes (line 701) | No explicit guard | Partial (lines 751-752) | PASS* |
| BpTargets.tsx | Yes (line 41) | Yes (line 337) | Yes (line 325) | Yes (lines 359, 363, 259) | PASS |
| Parameters.tsx | Yes (line 45) | Yes (line 353) | No explicit guard | Yes (lines 359, 362) | PASS* |
| Dashboard.tsx | Yes (line 44) | No | N/A (read-only page) | Yes (line 259) | PASS |
| CalculationResults.tsx | Partial (line 1633) | Yes (change view) | N/A (read-only page) | Yes (lines 1663, 1754, 1760) | PASS |
| ScenarioPlanning.tsx | Yes (line 75) | Yes (line 233) | N/A (stateless inputs) | Yes (lines 269, 297, 319, 347) | PASS |
| **DailyOperationsWorkbench.tsx** | **No** | **No** | **No** | **No viewer guards** | **FAIL** |
| AiCopilot.tsx | N/A | N/A | N/A | Viewer handled in CopilotChat | PASS |

**Gaps Found**:

### P0 -- DailyOperationsWorkbench.tsx has NO viewer guards

`DailyOperationsWorkbench.tsx` receives `scope` as a prop but never calls `canEdit(scope.role)` or checks `scope.role`. This means:

1. **No read-only warning Alert** is shown to viewers.
2. **Scenario v2 buttons** (lines 823-841) are only disabled by `!rawData`, not by viewer role. A viewer can trigger `handleRunScenarioV2` which computes scenarios. While this is read-only (no Firestore writes), it violates the principle that "Viewer cannot trigger any state change."
3. **Management Report buttons** (lines 888-915) are not guarded by viewer role. A viewer can generate and download reports.
4. **Pipeline Readiness stage cards** (lines 494-552) have `navigate()` calls that are not guarded -- but these are navigation-only, which is acceptable.

### P1 -- Parameters.tsx yield matrix and currency inputs lack onChange guards

`Parameters.tsx` has `writable` checks on Save/Restore buttons, but individual input handlers (`handleYieldChange` line 242, `setCurrencySettings` lines 298, 333, 534, 547, 563, 577) do not have `if (!writable) return` guards. The Form-level `disabled` prop is not used either. A viewer could modify local state (though changes would not persist since Save is disabled).

### P1 -- CapacityPlan.tsx Add Factory button lacks viewer guard

`CapacityPlan.tsx` `handleAddFactory` (line 316) and `handleAddMonth` (line 748) buttons are not disabled for viewers. A viewer could add factories/months to local state.

---

## 3. Data Quality Visibility/Remediation -- Loop Closure

**Requirement**: Users can see where the dataset is not trustworthy and move from data quality warning to guided repair workflow. No silent auto-fix. Viewer blocked from remediation.

**Status**: COMPLIANT

**Evidence**:

- **Visibility layer**: `DataQualityBadge.tsx` provides inline cell-level indicators. `DataQualityAlert.tsx` provides page-level alerts. Both are used across Products, Forecasts, CapacityPlan, BpTargets, and Parameters pages.
- **DQ engine**: `dataQuality.ts` produces `DataQualitySummary` with confidence scoring, issue severity, and decision-impact classification.
- **Visibility helpers**: `dataQualityVisibility.ts` provides `filterIssuesByDomain`, `findIssueBySkuId`, `findAllIssuesAffectingSku`, `findIssueByYear` for page-specific filtering.
- **Remediation -- Products**: `DataQualityQuickFixDrawer.tsx` provides inline SKU attribute editing with validation, viewer blocking (line 263-270), and no silent auto-fix.
- **Remediation -- Forecasts**: `DataQualityGuidedFixModal.tsx` provides guided remediation for orphan forecasts with multiple paths (create SKU, edit forecast), viewer blocking (line 146-153).
- **Remediation -- BpTargets**: Inline Popover quick fix for missing BP targets (lines 195-244), guarded by `writable` (line 195).
- **Remediation -- Parameters**: Exchange Rate Quick Fix Popover for TWD/CNY rates (lines 404-485), guarded by `writable` (line 403).
- **Remediation -- Capacity**: Navigation fix via URL parameters (`parseRemediationFocusParams` in CapacityPlan.tsx line 103).
- **No silent auto-fix**: All remediation paths require explicit user confirmation via Save/Confirm buttons.
- **Viewer blocking**: All remediation components check `canEdit(scope.role)` and show read-only warnings.

**No gaps found.**

---

## 4. Scenario -- In-Memory Only, No Firestore Pollution

**Requirement**: Scenario state must be in-memory only. No writes to Firestore. Viewer read-only guard.

**Status**: COMPLIANT

**Evidence**:

- `scenarioEngine.ts` has zero imports from `services/*`, `firebase`, or `firestore`. It imports only from `./calculationEngine`, `./bpTargets`, `./dataQuality`, `./currency` -- all pure computation modules.
- `scenarioExport.ts` explicitly states in its header: "Do NOT import from services/*", "Do NOT add persistence". It produces a JSON export pack with `scenarioNotCommitted: true` and `deterministic: true` flags.
- `ScenarioPlanning.tsx` has zero Firestore/firebase imports. All state is managed via `useState` hooks (`scenarioActive`, `multipliers`, `comparison`). No `save` or `write` calls exist in the file.
- The page loads baseline data from Firestore (read-only) and computes scenarios entirely in memory via `computeScenarioComparison`.
- Viewer guard is present: `writable = canEdit(scope.role)` (line 75), read-only Alert (line 233), Enter Mode button disabled for viewers (line 269), Run Scenario button disabled for viewers (line 347), sliders disabled for viewers (lines 319, 329).
- The scenario v2 (`operationalScenario.ts`) is invoked from DailyOperationsWorkbench but also appears to be computation-only (no service imports observed).

**No gaps found.**

---

## 5. AI Copilot -- Deterministic/Validated/Evidence-Based

**Requirement**: AI output must pass validation. Unsafe claims blocked or downgraded. All recommendations include evidence or marked low confidence. No external AI API calls. No hidden network calls. BYOK session-only. Viewer restrictions.

**Status**: COMPLIANT (with one known caveat about feature branch status)

**Evidence**:

### Deterministic Tools
- `aiCopilotTools.ts` contains 10 pure diagnostic tools (`inspectDataQuality`, `explainCapacityRisk`, `explainBpGap`, `suggestDataFixes`, `explainScenarioImpact`, `buildLookAheadFocus`, `explainWorkbenchOverview`, `explainAbnormalityDetail`, `explainScenarioV2Impact`, `generateReportNarrative`).
- All tools are pure functions with zero side effects. The module header states: "NO imports from services/**".
- Every tool returns a structured `CopilotToolResult` with `facts`, `assumptions`, `inferences`, `recommendations`, `sourceReferences`, `confidence`, and `caveats`.
- The keyword `routeQuestion` router is deterministic -- it matches keywords to tools without any external calls.

### Output Validation
- `aiCopilotOutputValidation.ts` implements 8 validation rules:
  1. FAIR Label validation (warning if missing)
  2. Source Reference validation (warning if recommendations lack sources)
  3. Forbidden Claims validation (blocked: "I saved", "data saved", "ignore data quality", "formula adjusted")
  4. Currency/BP Rules validation (blocked: "USD revenue equals BP target"; warning: direct USD/TWD/CNY comparison)
  5. Write-Action validation (blocked: "save to database", "update Firestore", "auto-saved")
  6. Causality Claims validation (warning: "caused by customer", "customer drove")
  7. Confidence Downgrade validation (warning: hedging with high confidence, definitive with low confidence)
  8. Missing Data Guessing validation (blocked: "I estimated", "I guessed", "I interpolated")
- `validateProviderOutput` aggregates all rules and returns `pass | warning | blocked` status.

### Validation Wiring (v1.40.1 Fix)
- `CopilotChat.tsx` imports `validateProviderOutput` (line 9) and applies it in `applyOutputValidation` (lines 36-66).
- The validation runs on ALL provider modes: local (line 117), mock (line 112), and external-byok (line 103).
- Blocked content is sanitized to `[Content blocked by safety validation]` (line 44).
- Validation issues are propagated to `CopilotMessage.tsx` which displays them as warnings (lines 191-203).

### Provider Adapter
- `aiProviderAdapter.ts` has zero network imports (no fetch, no axios). Header states: "No fetch() or network API calls", "No localStorage or sessionStorage".
- `ExternalByokPlaceholder` always returns `confidence: 'blocked'` with message "External provider is not enabled in this build".
- `MockProvider` returns deterministic mock text with no external calls.

### Viewer Restrictions
- `suggestDataFixes` blocks viewer role (lines 324-338): returns `confidence: 'blocked'` with "Viewer role cannot view fix recommendations."
- `explainAbnormalityDetail` limits recommendations for viewers (lines 1020-1027): "Contact your workspace editor for actionable fix recommendations."
- `CopilotChat.tsx` checks `isViewer` (line 34) and shows viewer info banner (lines 176-183), hides fixes in messages (line 209), and disables provider settings button (line 155).
- `CopilotMessage.tsx` receives `showFixes` prop (line 44) and hides recommendations when false (line 50), showing a viewer notice instead (lines 138-145).

### Caveat
- The AI Provider Adapter branch status needs verification against `main`. The roadmap doc notes this as a "known blocker" but the v1.40.1 commit message indicates the wiring fix was applied.

**No compliance gaps found. The feature meets all stated safety requirements.**

---

## 6. Operations Workbench -- Daily Workflow Connection

**Requirement**: Create a daily operating workflow that guides users from product setup to forecast, capacity matching, revenue estimate, risk review, and reporting. Step-by-step status cards with progress states (Ready, Warning, Blocked, Needs Review).

**Status**: COMPLIANT (core functionality), PARTIALLY COMPLIANT (viewer guards)

**Evidence**:

### Core Workflow
- `workbench.ts` is a pure function module that builds a `WorkbenchViewModel` from raw data.
- `deriveWorkflowStages` (lines 238-416) produces 7 workflow stages: Products, Forecasts, Capacity, Parameters, BP Targets, Analysis, Scenario.
- Each stage has a derived `WorkflowStageStatus` (`ready | warning | blocked | notStarted`) based on data presence and DQ issues.
- Each stage has a `cta` route linking to the relevant page for investigation/remediation.
- `classifyAbnormalities` (lines 422-559) produces cross-domain abnormality insights sorted by severity.
- `computeLookAheadFocus` (lines 566-592) provides next-6-month capacity risk view.
- `deriveRevenueBpSummary` (lines 598-618) provides revenue vs BP target status.

### DailyOperationsWorkbench.tsx UI
- Pipeline Readiness stepper with clickable stage cards (Section 1).
- Abnormality Summary grouped by domain (Section 2).
- Abnormality Intelligence Panel with severity scoring and "Must Act Today" items (Section 2B).
- Look-Ahead Focus table (Section 3).
- Revenue/BP Summary metrics (Section 4).
- Scenario v1 presets and v2 one-click scenarios (Sections 5, 5B).
- Management Report generation and export (Section 5C).
- Copilot Quick Actions linking to AI Copilot page (Section 6).

### Gap: Viewer Guards (same as Finding #2)
- The DailyOperationsWorkbench page does not implement viewer guards. This is the same P0 gap identified in the Viewer True Read-Only section.

### Gap: No new Firestore schema
- The workbench uses only derived data from existing modules. No new Firestore collections or schema fields were added. This complies with the "Avoid new Firestore schema in MVP" requirement.

---

## Summary of Gaps

### P0 -- Must Fix Before Merge

| # | Gap | Feature | File | Description |
|---|-----|---------|------|-------------|
| 1 | DailyOperationsWorkbench has NO viewer guards | Viewer / Workbench | `DailyOperationsWorkbench.tsx` | Page never calls `canEdit()`, shows no read-only Alert, and does not guard interactive buttons (scenario v2, report generation) by viewer role. Violates "Viewer is true read-only" principle. |

### P1 -- Should Fix Soon

| # | Gap | Feature | File | Description |
|---|-----|---------|------|-------------|
| 2 | Parameters yield/currency inputs lack onChange guards | Viewer | `Parameters.tsx` | Individual `onChange` handlers for yield matrix and currency settings do not check `writable`. Local state can be modified by viewer (though not persisted). |
| 3 | CapacityPlan Add Factory/Month buttons lack viewer guard | Viewer | `CapacityPlan.tsx` | `handleAddFactory` and `handleAddMonth` buttons are not disabled for viewers. |
| 4 | DailyOperationsWorkbench missing workbench-specific stage for Report | Workbench | `workbench.ts` | The workbench has 7 stages but no explicit "Report" stage. The management report section exists in the UI but is not represented as a workflow stage with derived status. This is a minor completeness gap. |

### P2 -- Nice to Have

| # | Gap | Feature | File | Description |
|---|-----|---------|------|-------------|
| 5 | Copilot router keyword overlap | AI Copilot | `aiCopilotTools.ts` | The keyword router uses broad matches (e.g., "data" matches data quality, "fix" matches suggest fixes). Ambiguous queries may route to unexpected tools. Consider adding disambiguation logic. |
| 6 | Scenario v2 presets are hardcoded | Workbench / Scenario | `workbench.ts` | `SCENARIO_PRESETS` are constant. Users cannot customize presets. Low priority for MVP. |
| 7 | Parameters page viewer: form inputs not wrapped in `disabled` | Viewer | `Parameters.tsx` | The yield matrix `Table` and panel params `Form` are not wrapped in a top-level `disabled={!writable}` prop. Individual `InputNumber` components accept input from viewers. |

---

## Priority Recommendations

1. **Immediate (P0)**: Add viewer guards to `DailyOperationsWorkbench.tsx`:
   - Import `canEdit` from `projectScope`.
   - Add `const writable = canEdit(scope.role)`.
   - Show read-only Alert when `!writable`.
   - Disable scenario v2 buttons and report generation buttons when `!writable`.

2. **Next Sprint (P1)**: Add onChange guards to `Parameters.tsx` yield matrix and currency inputs:
   - Wrap yield matrix `Table` render functions with `if (!writable) return value` guard.
   - Add `disabled={writable === false}` to currency Radio.Group and InputNumber components.

3. **Next Sprint (P1)**: Add viewer guards to `CapacityPlan.tsx` Add Factory/Month buttons:
   - Add `disabled={!writable}` to Add Factory and Add Month buttons.

---

## Compliance Matrix

| Feature | Requirement Met | Gaps | Priority |
|---------|----------------|------|----------|
| BP Targets Independence | Yes | None | -- |
| Viewer True Read-Only | Partial | DailyOperationsWorkbench, Parameters, CapacityPlan | P0/P1 |
| Data Quality Visibility/Remediation | Yes | None | -- |
| Scenario In-Memory Only | Yes | None | -- |
| AI Copilot Deterministic/Validated | Yes | None | -- |
| Operations Workbench | Yes (core) | Viewer guards on workbench page | P0 |
