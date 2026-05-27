# v1.43 - v1.45 Acceptance Checklist

**Date**: 2026-05-28
**Branch**: `xiaomi/v1-42-to-v1-45-operations-ai-marathon`
**QA Agent**: Combined QA/Security/Test Agent

---

## Automated Verification Summary

| Check | Result |
|-------|--------|
| Test suite (vitest) | 57 files, 1398 tests, ALL PASSED (14.36s) |
| Module tests (3 new modules) | 77 tests, ALL PASSED |
| ESLint (--quiet) | 11 errors (unused vars + whitespace), 0 warnings |
| TypeScript build (tsc -b) | FAILED -- 9 unused variable errors |
| Guardrail grep (AI providers) | CLEAN -- no openai/anthropic/gemini/deepseek references |
| Guardrail grep (API keys) | CLEAN -- `api_key` found only in SENSITIVE_KEYS blocklist (security-positive) |
| Guardrail grep (network) | CLEAN -- no fetch/XMLHttpRequest/axios |
| Guardrail grep (storage) | CLEAN -- no localStorage/sessionStorage/indexedDB/cookie |
| Guardrail grep (write ops) | CLEAN -- no saveSku/saveForecast/saveCapacity/saveParameters/saveBpTarget |
| Guardrail grep (services import) | CLEAN -- no imports from ../services |
| calculationEngine.ts diff vs main | EMPTY (no formula changes) |
| firestore.rules diff vs main | EMPTY (no changes) |

### Lint/Build Issues (must fix before merge)

1. `abnormalityIntelligence.ts:435` -- `dqIssue` assigned but never used
2. `abnormalityIntelligence.ts:620` -- `_currentDate` defined but never used
3. `abnormalityIntelligence.test.ts:22` -- `AbnormalityIntelligenceOutput` imported but never used
4. `abnormalityIntelligence.test.ts:45` -- `makeInsight` defined but never used
5. `operationalScenario.ts:28` -- `CalculationResult` imported but never used
6. `operationalScenario.ts:323` -- `target` assigned but never used
7. `operationalScenario.test.ts:114` -- `scenarioCap` assigned but never used
8. `managementReport.ts:456` -- `buildKpiGridSection` defined but never used
9. `managementReport.ts:786` -- `warningCount` assigned but never used
10. `managementReport.test.ts:26` -- `ManagementReport` imported but never used
11. `managementReport.test.ts:547,560` -- irregular whitespace characters

---

## v1.43 -- Abnormality Intelligence Layer

**Module**: `frontend/src/core/abnormalityIntelligence.ts` (783 lines)
**Test**: `frontend/src/core/abnormalityIntelligence.test.ts` (548 lines)

### Architecture

- [x] Pure function, zero side effects
- [x] No imports from services/**
- [x] Reuses DataQualityIssue from dataQuality.ts (no duplication)
- [x] Deterministic: same input = same output
- [x] Array cap: max 20 ranked abnormalities

### Taxonomy Classification

- [ ] 20 abnormality subtypes across 5 domains are correctly classified
- [ ] Data domain (6 subtypes): missing-sku-attributes, unsupported-currency, zero-unit-price, missing-exchange-rate, orphan-forecast, partial-year-forecast
- [ ] Capacity domain (5 subtypes): missing-months, zero-capacity-with-demand, high-utilization, shortage, bottleneck-concentration
- [ ] Sales domain (4 subtypes): forecast-volume-spike, forecast-volume-drop, customer-concentration, revenue-trend-declining
- [ ] BP domain (3 subtypes): target-missed, target-at-risk, missing-target-with-forecast
- [ ] Scenario domain (2 subtypes): sensitivity-high, shortage-amplification

### Severity Scoring

- [ ] Composite score uses 3 factors: Decision Impact (40%), Urgency (35%), Breadth (25%)
- [ ] Score range is 0-100
- [ ] Ranking is stable (deterministic ordering for equal scores)

### Evidence and Narrative

- [ ] Each insight includes evidence citations (data references)
- [ ] Each insight includes "Why it matters today" narrative
- [ ] Narrative is deterministic (no AI generation)
- [ ] Investigation route is provided for each abnormality

### Edge Cases

- [ ] Empty data quality summary produces empty insights
- [ ] All normal data (no DQ issues) produces empty insights
- [ ] Max cap of 20 is enforced even with 50+ raw issues

---

## v1.44 -- Operational What-if Scenario v2

**Module**: `frontend/src/core/operationalScenario.ts` (799 lines)
**Test**: `frontend/src/core/operationalScenario.test.ts` (574 lines)

### Architecture

- [x] Pure function, zero side effects
- [x] No imports from services/**
- [x] Does NOT modify scenarioEngine.ts (extends via composition)
- [x] Deterministic: same input = same output
- [x] Deep clones inputs before transformation (no mutation)

### Scenario Types

- [ ] CapacityShiftScenario (delay): shifts capacity months forward, drops out-of-range entries
- [ ] CapacityShiftScenario (pull-forward): shifts capacity months backward
- [ ] ForecastAdjustmentScenario (increase): increases forecastPcs by percentage
- [ ] ForecastAdjustmentScenario (decrease): decreases forecastPcs by percentage
- [ ] OrderDisappearanceScenario: removes forecasts matching customer filter

### Input Validation and Clamping

- [ ] Capacity shift clamped to [-12, +12] months
- [ ] Forecast adjustment clamped to [-50%, +100%]
- [ ] Invalid inputs produce meaningful error messages

### Impact Analysis

- [ ] Per-customer delta computation is correct
- [ ] Per-SKU delta computation is correct
- [ ] Results sorted by absolute delta descending
- [ ] ScenarioComparison structure includes baseline, scenario, deltas

### Caveats and Disclaimers

- [ ] All results include "what-if projection" caveat
- [ ] Caveat text is deterministic (not AI-generated)
- [ ] Empty input scenarios still produce valid results with caveat

### No-Mutation Guarantee

- [ ] Original SKU array is unchanged after scenario run
- [ ] Original Forecast array is unchanged after scenario run
- [ ] Original CapacityPlan array is unchanged after scenario run

---

## v1.45 -- Management Report Pack

**Module**: `frontend/src/core/managementReport.ts` (1158 lines)
**Test**: `frontend/src/core/managementReport.test.ts` (811 lines)

### Architecture

- [x] Pure function, zero side effects
- [x] No imports from services/**
- [x] Deterministic: same input = same output
- [x] No BYOK key leakage (SENSITIVE_KEYS blocklist active)
- [x] No causality claims
- [x] Fixed precision: toFixed(1) for numbers
- [x] Stable sort ordering

### Report Types

- [ ] Daily report generates correctly
- [ ] Weekly report generates correctly
- [ ] Report includes all section types: risk-list, fix-list, scenario-comparison, narrative, kpi-grid

### Executive Summary

- [ ] Contains data confidence level (high/medium/low/blocked)
- [ ] Contains critical issue count
- [ ] Contains top recommendation
- [ ] Handles zero critical abnormalities gracefully

### Risk List

- [ ] Contains top risks derived from abnormalities
- [ ] Risks sorted by severity (critical first)
- [ ] Capped at 5 risks maximum
- [ ] Includes risk count metadata

### Fix List

- [ ] Contains high-impact DQ issues only
- [ ] Excludes low and medium impact issues
- [ ] Returns empty list when no high-impact issues exist

### Narrative Draft

- [ ] Includes source references
- [ ] Includes caveats about deterministic generation
- [ ] Includes key takeaways
- [ ] Includes open questions for missing BP model
- [ ] References top risks in narrative paragraphs

### Export Formats

- [ ] Markdown export contains section headers
- [ ] Markdown export contains risk table
- [ ] Markdown export includes scenario section when scenario provided
- [ ] JSON export produces valid JSON (after stripping BOM)
- [ ] JSON export starts with UTF-8 BOM for Excel compatibility
- [ ] JSON export has sorted keys

### Security

- [ ] apiKey stripped from all section data
- [ ] Sensitive keys stripped from markdown export
- [ ] SENSITIVE_KEYS blocklist covers: api_key, apikey, token, secret, password, credential, bearer, authorization, auth, key

### Determinism

- [ ] Same input produces identical output (object deep-equal)
- [ ] Same input produces identical JSON (byte-equal)
- [ ] Same input produces identical markdown (byte-equal)

### Edge Cases

- [ ] Empty input returns valid report with blocked confidence
- [ ] Empty input produces risk section with empty risks
- [ ] Empty input produces valid markdown

---

## Cross-Cutting Concerns

### Internationalization (i18n)

- [x] New i18n keys added to `en.ts` for workbench, provider settings, copilot status
- [x] New i18n keys added to `zhTW.ts` for traditional Chinese
- [ ] All new UI strings use i18n function (no hardcoded English in components)
- [ ] Missing i18n keys fall back gracefully (no raw key display)

### Responsive Design

- [ ] Workbench page renders correctly at 1280px+ (desktop)
- [ ] Workbench page renders correctly at 768px-1279px (tablet)
- [ ] Workbench page renders correctly at <768px (mobile)
- [ ] Tables are horizontally scrollable on small screens

### Viewer Role

- [ ] Viewer role can view all reports and insights
- [ ] Viewer role cannot modify scenarios
- [ ] Viewer role cannot trigger save operations
- [ ] Viewer role sees read-only indicators

### Security Boundaries

- [x] No AI provider SDK imports in core modules
- [x] No API keys in core module source code
- [x] No network calls from core modules (pure computation)
- [x] No browser storage access from core modules
- [x] No direct Firestore write operations from core modules
- [x] No service layer imports from core modules
- [x] calculationEngine.ts unchanged (formula integrity preserved)
- [x] firestore.rules unchanged (security rules preserved)
- [ ] Sensitive key stripping tested for all export paths

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | Automated Agent | 2026-05-28 | BLOCKED (lint/build errors) |
| Security | Automated Agent | 2026-05-28 | PASS (all guardrails clean) |
| Product | | | |
| Engineering | | | |
