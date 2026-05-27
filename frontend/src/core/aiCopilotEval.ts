/**
 * AI Copilot Evaluation Harness (v1.39.0)
 *
 * Deterministic evaluation of the copilot keyword router and tool dispatch.
 * Each eval case verifies that a natural-language question routes to the
 * expected tool with the expected confidence level.
 *
 * Key constraints:
 * - Pure functions, zero side effects (no Firestore, no services, no network)
 * - Relies only on routeQuestion from aiCopilotTools
 */

import { routeQuestion } from './aiCopilotTools';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Interfaces
// ============================================================

export interface EvalCase {
  readonly id: string;
  readonly name: string;
  readonly question: string;
  readonly expectedTool: string;
  readonly expectedConfidence: 'high' | 'medium' | 'low';
  readonly description: string;
}

export interface EvalResult {
  readonly caseId: string;
  readonly passed: boolean;
  readonly actualTool: string;
  readonly actualConfidence: string;
  readonly durationMs: number;
  readonly error?: string;
}

export interface EvalReport {
  readonly totalCases: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: EvalResult[];
  readonly generatedAt: string;
}

// ============================================================
// Evaluation Cases (10 total, covering all 6 tools)
// ============================================================

const EVAL_CASES: readonly EvalCase[] = [
  {
    id: 'eval-001',
    name: 'Data quality overview',
    question: 'What data quality issues exist?',
    expectedTool: 'inspectDataQuality',
    expectedConfidence: 'high',
    description: 'Natural data quality question should route to inspectDataQuality',
  },
  {
    id: 'eval-002',
    name: 'Capacity shortage diagnosis',
    question: 'Why is there a capacity shortage?',
    expectedTool: 'explainCapacityRisk',
    expectedConfidence: 'high',
    description: 'Capacity shortage question should route to explainCapacityRisk',
  },
  {
    id: 'eval-003',
    name: 'BP gap analysis',
    question: "What's the BP gap this quarter?",
    expectedTool: 'explainBpGap',
    expectedConfidence: 'high',
    description: 'BP gap question should route to explainBpGap',
  },
  {
    id: 'eval-004',
    name: 'Fix forecast errors',
    question: 'How do I fix the forecast errors?',
    expectedTool: 'suggestDataFixes',
    expectedConfidence: 'high',
    description: 'Fix keyword without earlier-group keywords should route to suggestDataFixes',
  },
  {
    id: 'eval-005',
    name: 'Scenario what-if',
    question: 'What if I increase demand by 20%?',
    expectedTool: 'explainScenarioImpact',
    expectedConfidence: 'medium',
    description: 'What-if scenario question should route to explainScenarioImpact (medium when no active scenario)',
  },
  {
    id: 'eval-006',
    name: 'Look-ahead focus',
    question: 'What should I focus on next month?',
    expectedTool: 'buildLookAheadFocus',
    expectedConfidence: 'high',
    description: 'Focus/next-month question should route to buildLookAheadFocus',
  },
  {
    id: 'eval-007',
    name: 'Data problems shorthand',
    question: 'Show me data problems',
    expectedTool: 'inspectDataQuality',
    expectedConfidence: 'high',
    description: 'Data + problems keywords should route to inspectDataQuality',
  },
  {
    id: 'eval-008',
    name: 'Utilization bottlenecks',
    question: 'Explain utilization bottlenecks',
    expectedTool: 'explainCapacityRisk',
    expectedConfidence: 'high',
    description: 'Utilization + bottleneck keywords should route to explainCapacityRisk',
  },
  {
    id: 'eval-009',
    name: 'Fix broken records',
    question: 'Fix the broken records',
    expectedTool: 'suggestDataFixes',
    expectedConfidence: 'high',
    description: 'Fix keyword without earlier-group keywords should route to suggestDataFixes',
  },
  {
    id: 'eval-010',
    name: 'Scenario impact direct',
    question: "What's the scenario impact?",
    expectedTool: 'explainScenarioImpact',
    expectedConfidence: 'medium',
    description: 'Scenario keyword should route to explainScenarioImpact (medium when no active scenario)',
  },
];

// ============================================================
// Public API
// ============================================================

/**
 * Return a defensive copy of all evaluation cases.
 */
export function getEvalCases(): EvalCase[] {
  return EVAL_CASES.map(ec => ({ ...ec }));
}

/**
 * Run a single evaluation case against the given copilot context.
 * Measures routing accuracy (tool name) and confidence alignment.
 */
export function runEvalCase(evalCase: EvalCase, context: AiCopilotContext): EvalResult {
  const startTime = performance.now();
  try {
    const result = routeQuestion(evalCase.question, context);
    const endTime = performance.now();
    const toolMatch = result.toolName === evalCase.expectedTool;
    const confidenceMatch = result.confidence === evalCase.expectedConfidence;
    return {
      caseId: evalCase.id,
      passed: toolMatch && confidenceMatch,
      actualTool: result.toolName,
      actualConfidence: result.confidence,
      durationMs: Math.round((endTime - startTime) * 100) / 100,
    };
  } catch (error: unknown) {
    const endTime = performance.now();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      caseId: evalCase.id,
      passed: false,
      actualTool: 'error',
      actualConfidence: 'blocked',
      durationMs: Math.round((endTime - startTime) * 100) / 100,
      error: errorMessage,
    };
  }
}

/**
 * Run all evaluation cases and produce a summary report.
 */
export function runAllEvalCases(context: AiCopilotContext): EvalReport {
  const cases = getEvalCases();
  const results = cases.map(evalCase => runEvalCase(evalCase, context));
  const passed = results.filter(r => r.passed).length;
  return {
    totalCases: results.length,
    passed,
    failed: results.length - passed,
    results,
    generatedAt: new Date().toISOString(),
  };
}
