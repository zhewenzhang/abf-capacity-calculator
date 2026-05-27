import { describe, it, expect } from 'vitest';

/**
 * AI Copilot Output Validation Layer Tests — v1.40.0
 *
 * Covers:
 * - Valid answer passes all checks
 * - Causality claim triggers warning
 * - Missing data guessing is blocked
 * - Write action is blocked
 * - No source reference on recommendation triggers warning
 * - Currency confusion is blocked
 * - Forbidden claims ("I filled in", "formula adjusted", "ignore data quality") are blocked
 * - Hedging language with high confidence triggers warning
 * - Clean answer with FAIR labels passes
 * - Multiple issues in one text are all caught
 * - sanitizeBlockedContent replaces blocked sections
 * - Empty text passes
 * - Text with only safe content passes
 */

import {
  validateFairLabels,
  validateSourceReferences,
  validateNoForbiddenClaims,
  validateCurrencyBpRules,
  validateNoWriteActions,
  validateNoCausalityClaims,
  validateConfidenceDowngrade,
  validateNoMissingDataGuessing,
  validateProviderOutput,
  sanitizeBlockedContent,
} from './aiCopilotOutputValidation';

// ============================================================
// validateFairLabels
// ============================================================

describe('validateFairLabels', () => {
  it('passes when text contains all FAIR labels', () => {
    const text =
      'Fact: revenue is $5M. Assumption: exchange rate is fixed. Inference: growth is 10%. Recommendation: increase capacity.';
    const issues = validateFairLabels(text);
    expect(issues).toHaveLength(0);
  });

  it('passes when text contains at least one FAIR label', () => {
    const text = 'Fact: the data shows revenue is $5M.';
    const issues = validateFairLabels(text);
    expect(issues).toHaveLength(0);
  });

  it('warns when no FAIR labels are present', () => {
    const text = 'Revenue is $5M and growth is 10%.';
    const issues = validateFairLabels(text);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rule).toBe('FAIR_LABELS');
  });

  it('warns on empty text', () => {
    const issues = validateFairLabels('');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });
});

// ============================================================
// validateSourceReferences
// ============================================================

describe('validateSourceReferences', () => {
  it('passes when recommendation has source reference', () => {
    const text =
      'Recommendation: increase capacity. Source: Table 3 shows utilization at 85%.';
    const issues = validateSourceReferences(text);
    expect(issues).toHaveLength(0);
  });

  it('warns when recommendation lacks source reference', () => {
    const text = 'Recommendation: increase capacity by 20%.';
    const issues = validateSourceReferences(text);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rule).toBe('SOURCE_REFERENCES');
  });

  it('passes when no recommendation is present', () => {
    const text = 'Revenue is $5M based on user input.';
    const issues = validateSourceReferences(text);
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateNoForbiddenClaims
// ============================================================

describe('validateNoForbiddenClaims', () => {
  it('blocks "I saved"', () => {
    const issues = validateNoForbiddenClaims('I saved the changes to the file.');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('blocked');
  });

  it('blocks "changes saved"', () => {
    const issues = validateNoForbiddenClaims('All changes saved successfully.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "data saved to"', () => {
    const issues = validateNoForbiddenClaims('Data saved to the database.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "written to database"', () => {
    const issues = validateNoForbiddenClaims('Records written to database.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "I filled in"', () => {
    const issues = validateNoForbiddenClaims('I filled in the missing values.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "I populated missing"', () => {
    const issues = validateNoForbiddenClaims('I populated missing data fields.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "I completed the missing data"', () => {
    const issues = validateNoForbiddenClaims(
      'I completed the missing data for Q3.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "ignore data quality"', () => {
    const issues = validateNoForbiddenClaims(
      'You can ignore data quality issues for now.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "ignore missing data"', () => {
    const issues = validateNoForbiddenClaims('Ignore missing data and proceed.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "skip validation"', () => {
    const issues = validateNoForbiddenClaims(
      'Skip validation and save directly.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "formula adjusted"', () => {
    const issues = validateNoForbiddenClaims(
      'The formula adjusted to account for growth.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "formula changed"', () => {
    const issues = validateNoForbiddenClaims(
      'The formula changed to include a new factor.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "modified the calculation"', () => {
    const issues = validateNoForbiddenClaims(
      'I modified the calculation to improve accuracy.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('passes for clean text with no forbidden claims', () => {
    const issues = validateNoForbiddenClaims(
      'Revenue is $5M. The data shows growth of 10%.'
    );
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateCurrencyBpRules
// ============================================================

describe('validateCurrencyBpRules', () => {
  it('blocks "USD revenue equals BP target"', () => {
    const issues = validateCurrencyBpRules(
      'USD revenue equals BP target for the quarter.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
    expect(issues[0].rule).toBe('CURRENCY_BP_RULES');
  });

  it('warns about direct USD to TWD comparison without conversion', () => {
    const issues = validateCurrencyBpRules(
      'The USD revenue is $5M while the TWD target is 160M.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('passes when USD to TWD comparison includes conversion mention between them', () => {
    const issues = validateCurrencyBpRules(
      'The USD revenue, after applying the exchange rate conversion, matches the TWD target.'
    );
    // The regex checks for conversion keywords between USD and TWD
    const currencyWarnings = issues.filter(i => i.rule === 'CURRENCY_BP_RULES');
    expect(currencyWarnings).toHaveLength(0);
  });

  it('passes for clean text with no currency issues', () => {
    const issues = validateCurrencyBpRules(
      'Revenue is tracking well against the forecast.'
    );
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateNoWriteActions
// ============================================================

describe('validateNoWriteActions', () => {
  it('blocks "save to database"', () => {
    const issues = validateNoWriteActions('Ready to save to database.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
    expect(issues[0].rule).toBe('NO_WRITE_ACTIONS');
  });

  it('blocks "update Firestore"', () => {
    const issues = validateNoWriteActions('Will update Firestore with the changes.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "write to collection"', () => {
    const issues = validateNoWriteActions('Need to write to collection.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "setDoc"', () => {
    const issues = validateNoWriteActions('Using setDoc to store data.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "deleteDoc"', () => {
    const issues = validateNoWriteActions('Using deleteDoc to remove old records.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "auto-save"', () => {
    const issues = validateNoWriteActions('The auto-save feature is enabled.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "auto-saved"', () => {
    const issues = validateNoWriteActions('The data is auto-saved to the cloud.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "automatically saved"', () => {
    const issues = validateNoWriteActions('Your changes have been automatically saved.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "saved for you"', () => {
    const issues = validateNoWriteActions('I have saved for you.');
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('passes for clean text', () => {
    const issues = validateNoWriteActions(
      'The analysis shows capacity is sufficient.'
    );
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateNoCausalityClaims
// ============================================================

describe('validateNoCausalityClaims', () => {
  it('warns about "caused by customer"', () => {
    const issues = validateNoCausalityClaims(
      'The gap was caused by customer demand spikes.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
    expect(issues[0].rule).toBe('NO_CAUSALITY_CLAIMS');
  });

  it('warns about "because of customer"', () => {
    const issues = validateNoCausalityClaims(
      'This happened because of customer orders.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "due to customer demand"', () => {
    const issues = validateNoCausalityClaims(
      'Shortage due to customer demand in Q3.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "customer caused"', () => {
    const issues = validateNoCausalityClaims(
      'Customer caused the supply imbalance.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "this led to"', () => {
    const issues = validateNoCausalityClaims(
      'This led to a shortage in the supply chain.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "resulted from customer"', () => {
    const issues = validateNoCausalityClaims(
      'The issue resulted from customer forecast changes.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "customer drove"', () => {
    const issues = validateNoCausalityClaims(
      'Customer drove the increase in demand.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('passes when "caused by" refers to data quality, not customer', () => {
    const issues = validateNoCausalityClaims(
      'The data quality issue was caused by missing input fields.'
    );
    expect(issues).toHaveLength(0);
  });

  it('passes for clean text with no causality claims', () => {
    const issues = validateNoCausalityClaims(
      'Customer A accounts for 30% of revenue share.'
    );
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateConfidenceDowngrade
// ============================================================

describe('validateConfidenceDowngrade', () => {
  it('warns when hedging language is used with high confidence', () => {
    const text = 'The revenue might increase next quarter, possibly by 10%.';
    const issues = validateConfidenceDowngrade(text, 'high');
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
    expect(issues[0].rule).toBe('CONFIDENCE_DOWNGRADE');
  });

  it('warns when definitive language is used with low confidence', () => {
    const text = 'Revenue will definitely reach $10M next year.';
    const issues = validateConfidenceDowngrade(text, 'low');
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
    expect(issues[0].rule).toBe('CONFIDENCE_DOWNGRADE');
  });

  it('passes when hedging language is used with low confidence', () => {
    const text = 'Revenue might increase, but this is uncertain.';
    const issues = validateConfidenceDowngrade(text, 'low');
    expect(issues).toHaveLength(0);
  });

  it('passes when definitive language is used with high confidence', () => {
    const text = 'Revenue is confirmed at $5M based on the data.';
    const issues = validateConfidenceDowngrade(text, 'high');
    expect(issues).toHaveLength(0);
  });

  it('passes when no confidence context is provided', () => {
    // When called without context, this validator is skipped in validateProviderOutput
    const text = 'Revenue might increase.';
    const issues = validateConfidenceDowngrade(text, 'medium');
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateNoMissingDataGuessing
// ============================================================

describe('validateNoMissingDataGuessing', () => {
  it('blocks "I estimated the value"', () => {
    const issues = validateNoMissingDataGuessing(
      'I estimated the value based on trends.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
    expect(issues[0].rule).toBe('NO_MISSING_DATA_GUESSING');
  });

  it('blocks "I assumed the value"', () => {
    const issues = validateNoMissingDataGuessing(
      'I assumed the value is 100 units.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "I guessed"', () => {
    const issues = validateNoMissingDataGuessing(
      'I guessed the missing figure.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "I interpolated"', () => {
    const issues = validateNoMissingDataGuessing(
      'I interpolated between the data points.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "estimated value of"', () => {
    const issues = validateNoMissingDataGuessing(
      'The estimated value of the metric is 50.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "assumed value is"', () => {
    const issues = validateNoMissingDataGuessing(
      'The assumed value is 200 for the missing month.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('blocks "projected value"', () => {
    const issues = validateNoMissingDataGuessing(
      'The projected value shows growth of 5%.'
    );
    expect(issues.some(i => i.severity === 'blocked')).toBe(true);
  });

  it('warns about "approximately" without data source', () => {
    const issues = validateNoMissingDataGuessing(
      'Revenue is approximately $5M.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('warns about "roughly" without data source', () => {
    const issues = validateNoMissingDataGuessing(
      'The growth is roughly 10%.'
    );
    expect(issues.some(i => i.severity === 'warning')).toBe(true);
  });

  it('passes when "approximately" includes data source', () => {
    const issues = validateNoMissingDataGuessing(
      'Revenue is approximately $5M, based on the Q3 report.'
    );
    const guessingIssues = issues.filter(i => i.rule === 'NO_MISSING_DATA_GUESSING');
    expect(guessingIssues).toHaveLength(0);
  });

  it('passes for clean text with no guessing', () => {
    const issues = validateNoMissingDataGuessing(
      'Revenue is $5M as shown in the data.'
    );
    expect(issues).toHaveLength(0);
  });
});

// ============================================================
// validateProviderOutput (main function)
// ============================================================

describe('validateProviderOutput', () => {
  it('returns pass status for a clean answer with FAIR labels', () => {
    const text =
      'Fact: revenue is $5M. Assumption: rate is fixed. Recommendation: increase capacity. Source: Table 3.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('pass');
    expect(result.issues).toHaveLength(0);
    expect(result.sanitizedAnswer).toBe(text);
    expect(result.blockedReason).toBeUndefined();
  });

  it('returns pass status for empty text', () => {
    const result = validateProviderOutput('');
    // Empty text gets a FAIR labels warning but no blocks
    expect(result.status).toBe('warning');
    expect(result.sanitizedAnswer).toBe('');
  });

  it('returns warning status for missing FAIR labels', () => {
    const text = 'Revenue is $5M and growth is 10%.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('warning');
    expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    expect(result.sanitizedAnswer).toBe(text);
  });

  it('returns blocked status and sanitized answer for write actions', () => {
    const text = 'Data has been saved to database for you.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.severity === 'blocked')).toBe(true);
    expect(result.sanitizedAnswer).toBe(
      '[Content blocked by safety validation]'
    );
    expect(result.blockedReason).toBeDefined();
  });

  it('returns blocked for "I filled in missing data"', () => {
    const text = 'I filled in missing data for Q3 revenue.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
    expect(result.blockedReason).toContain('fill in');
  });

  it('returns blocked for "formula adjusted"', () => {
    const text = 'The formula adjusted to account for new inputs.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
  });

  it('returns blocked for "ignore data quality"', () => {
    const text = 'You can ignore data quality warnings for this analysis.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
  });

  it('returns blocked for "USD revenue equals BP target"', () => {
    const text = 'USD revenue equals BP target for the quarter.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
  });

  it('returns blocked for missing data guessing', () => {
    const text = 'I estimated the value of the missing field.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
    expect(result.blockedReason).toBeDefined();
  });

  it('returns warning for causality claim', () => {
    const text =
      'Fact: revenue is $5M. Recommendation: capacity increase. Source: Table 1. The gap was caused by customer demand.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('warning');
    expect(result.issues.some(i => i.rule === 'NO_CAUSALITY_CLAIMS')).toBe(true);
  });

  it('returns warning for hedging language with high confidence', () => {
    const text =
      'Fact: revenue is $5M. Recommendation: monitor closely. Source: data. Revenue might increase.';
    const result = validateProviderOutput(text, { confidence: 'high' });
    expect(result.status).toBe('warning');
    expect(
      result.issues.some(
        i =>
          i.rule === 'CONFIDENCE_DOWNGRADE' && i.severity === 'warning'
      )
    ).toBe(true);
  });

  it('catches multiple issues in one text', () => {
    const text =
      'I saved the changes. I estimated the value. The gap was caused by customer demand. Ignore data quality.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('blocked');
    const rules = result.issues.map(i => i.rule);
    // Should have at least: FORBIDDEN_CLAIM (saved), NO_MISSING_DATA_GUESSING (estimated),
    // NO_CAUSALITY_CLAIMS (caused by customer), FORBIDDEN_CLAIM (ignore data quality)
    expect(rules).toContain('FORBIDDEN_CLAIM');
    expect(rules).toContain('NO_MISSING_DATA_GUESSING');
    expect(rules).toContain('NO_CAUSALITY_CLAIMS');
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });

  it('returns pass for text with only safe content and FAIR labels', () => {
    const text =
      'Fact: total revenue is $5.2M. Assumption: exchange rate at 32.0 TWD/USD. Inference: Q3 utilization hits 85%. Recommendation: expand BU capacity. Source: capacity plan Table 2.';
    const result = validateProviderOutput(text);
    expect(result.status).toBe('pass');
    expect(result.issues).toHaveLength(0);
    expect(result.sanitizedAnswer).toBe(text);
  });
});

// ============================================================
// sanitizeBlockedContent
// ============================================================

describe('sanitizeBlockedContent', () => {
  it('replaces text with placeholder when blocked content is detected', () => {
    const text = 'I saved the data to the database.';
    const result = sanitizeBlockedContent(text);
    expect(result).toBe('[Content blocked by safety validation]');
  });

  it('returns original text when no blocked content is detected', () => {
    const text =
      'Fact: revenue is $5M. Recommendation: increase capacity. Source: Table 1.';
    const result = sanitizeBlockedContent(text);
    expect(result).toBe(text);
  });

  it('returns placeholder for text with write actions', () => {
    const text = 'Data saved to database.';
    const result = sanitizeBlockedContent(text);
    expect(result).toBe('[Content blocked by safety validation]');
  });

  it('returns original text for empty string', () => {
    const result = sanitizeBlockedContent('');
    // Empty string has no blocked content, just a warning
    expect(result).toBe('');
  });

  it('returns original text for clean text with warnings only', () => {
    const text = 'The gap was caused by customer demand.';
    const result = sanitizeBlockedContent(text);
    // Causality is a warning, not blocked
    expect(result).toBe(text);
  });
});
