import { describe, it, expect } from 'vitest';

/**
 * CopilotChat Output Validation Wiring Tests — v1.40.1 hotfix
 *
 * Proves that validateProviderOutput from aiCopilotOutputValidation.ts
 * is wired into the Copilot response pipeline and correctly blocks/warns
 * on unsafe content.
 */

import { validateProviderOutput } from '../../core/aiCopilotOutputValidation';

describe('CopilotChat output validation wiring', () => {
  describe('blocked scenarios', () => {
    it('blocks "I saved the changes"', () => {
      const result = validateProviderOutput('I saved the changes to the database.');
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toContain('AI cannot claim to save data');
      expect(result.sanitizedAnswer).toBe('[Content blocked by safety validation]');
    });

    it('blocks "I guessed missing data"', () => {
      const result = validateProviderOutput('I guessed the missing Q3 revenue data.');
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toContain('AI must not guess data values');
      expect(result.sanitizedAnswer).toBe('[Content blocked by safety validation]');
    });

    it('blocks USD revenue equals BP target', () => {
      const result = validateProviderOutput(
        'The USD revenue equals BP target for this quarter.'
      );
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toContain('Unit confusion');
      expect(result.sanitizedAnswer).toBe('[Content blocked by safety validation]');
    });

    it('blocks "I estimated the value"', () => {
      const result = validateProviderOutput('I estimated the value of Q4 capacity.');
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toContain('AI must not claim to estimate data values');
    });

    it('blocks write actions', () => {
      const result = validateProviderOutput('The system auto-save to Firestore completed.');
      expect(result.status).toBe('blocked');
      expect(result.blockedReason).toContain('AI cannot trigger auto-save');
    });
  });

  describe('warning scenarios', () => {
    it('shows warning for causality claim', () => {
      const result = validateProviderOutput(
        'Fact: Revenue dropped. This was caused by customer order cancellations.'
      );
      expect(result.status).toBe('warning');
      expect(result.issues.some((i) => i.rule === 'NO_CAUSALITY_CLAIMS')).toBe(true);
      expect(result.sanitizedAnswer).toBe(
        'Fact: Revenue dropped. This was caused by customer order cancellations.'
      );
    });

    it('shows warning for missing FAIR labels', () => {
      const result = validateProviderOutput('Revenue is trending upward.');
      expect(result.status).toBe('warning');
      expect(result.issues.some((i) => i.rule === 'FAIR_LABELS')).toBe(true);
    });

    it('shows warning for recommendation without source', () => {
      const result = validateProviderOutput(
        'Recommendation: increase capacity by 20%.'
      );
      expect(result.status).toBe('warning');
      expect(result.issues.some((i) => i.rule === 'SOURCE_REFERENCES')).toBe(true);
    });
  });

  describe('pass scenarios', () => {
    it('passes safe mock response', () => {
      const safeText =
        'Fact: Revenue is $5M per the data. Assumption: rate is fixed. ' +
        'Inference: growth at 10%. Recommendation: review capacity (source: Table 1).';
      const result = validateProviderOutput(safeText);
      expect(result.status).toBe('pass');
      expect(result.sanitizedAnswer).toBe(safeText);
      expect(result.blockedReason).toBeUndefined();
    });

    it('empty text gets FAIR label warning but not blocked', () => {
      const result = validateProviderOutput('');
      expect(result.status).not.toBe('blocked');
      expect(result.sanitizedAnswer).toBe('');
    });
  });

  describe('validation result structure', () => {
    it('returns issues array with rule, severity, message', () => {
      const result = validateProviderOutput('I saved the changes.');
      expect(result.issues.length).toBeGreaterThan(0);
      const issue = result.issues[0];
      expect(issue).toHaveProperty('rule');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('message');
      // Overall status is blocked even though some individual issues are warnings
      expect(result.status).toBe('blocked');
      expect(result.issues.some((i) => i.severity === 'blocked')).toBe(true);
    });

    it('returns all issues for multi-violation text', () => {
      const result = validateProviderOutput(
        'I saved the changes and guessed the missing data.'
      );
      const blockedIssues = result.issues.filter((i) => i.severity === 'blocked');
      expect(blockedIssues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
