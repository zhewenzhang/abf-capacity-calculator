/**
 * AI Copilot Output Validation Layer — v1.40.0
 *
 * Post-generation validation for AI provider output. Runs after the provider
 * returns a response and before it is shown to the user. Detects forbidden
 * claims, write-action hallucinations, currency confusion, causality
 * misattribution, and missing-data guessing.
 *
 * Design principles:
 * - Pure functions, zero side effects, synchronous
 * - Conservative: false positives preferred over false negatives
 * - Each validator returns an array of ValidationIssue so the caller can
 *   aggregate and decide the overall status
 * - "blocked" always wins over "warning" when both are present
 */

// ============================================================
// Types
// ============================================================

export interface OutputValidationResult {
  readonly status: 'pass' | 'warning' | 'blocked';
  readonly issues: ValidationIssue[];
  readonly sanitizedAnswer: string;
  readonly blockedReason?: string;
}

export interface ValidationIssue {
  readonly rule: string;
  readonly severity: 'warning' | 'blocked';
  readonly message: string;
  readonly line?: number;
}

export interface ValidatedOutput {
  readonly original: string;
  readonly validation: OutputValidationResult;
  readonly confidence: 'high' | 'medium' | 'low' | 'blocked';
}

// ============================================================
// 1. FAIR Label Validation
// ============================================================

const FAIR_LABELS = [
  /\bFact\b/i,
  /\bAssumption\b/i,
  /\bInference\b/i,
  /\bRecommendation\b/i,
];

/**
 * Check if text contains F-A-I-R labels (Fact, Assumption, Inference, Recommendation).
 * Warning if no labels found.
 */
export function validateFairLabels(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hasAnyLabel = FAIR_LABELS.some(pattern => pattern.test(text));
  if (!hasAnyLabel) {
    issues.push({
      rule: 'FAIR_LABELS',
      severity: 'warning',
      message:
        'Response does not contain FAIR labels (Fact, Assumption, Inference, Recommendation). Consider labeling the source of each claim.',
    });
  }
  return issues;
}

// ============================================================
// 2. Source Reference Validation
// ============================================================

const RECOMMENDATION_PATTERN =
  /\bRecommendation\b[\s:]*[^.]*(?:\.|$)/i;

const SOURCE_REFERENCE_PATTERN =
  /\b(?:source|reference|according to|per the|as shown in|based on|data from|see |Table|Figure|Section|Appendix)\b/i;

/**
 * Check if recommendations have source references.
 * Warning if recommendations lack sources.
 */
export function validateSourceReferences(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (RECOMMENDATION_PATTERN.test(text) && !SOURCE_REFERENCE_PATTERN.test(text)) {
    issues.push({
      rule: 'SOURCE_REFERENCES',
      severity: 'warning',
      message:
        'Recommendation found without a source reference. Recommendations should cite data sources, tables, or sections.',
    });
  }
  return issues;
}

// ============================================================
// 3. Forbidden Claims Validation
// ============================================================

const FORBIDDEN_CLAIM_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bI\s+saved\b/i, reason: 'AI cannot claim to save data' },
  { pattern: /\bI\s+have\s+saved\b/i, reason: 'AI cannot claim to save data' },
  { pattern: /\bchanges\s+saved\b/i, reason: 'AI cannot claim changes were saved' },
  { pattern: /\bdata\s+saved\s+to\b/i, reason: 'AI cannot claim data was saved' },
  { pattern: /\bsaved\s+the\s+changes\b/i, reason: 'AI cannot claim to have saved changes' },
  { pattern: /\bwritten\s+to\s+database\b/i, reason: 'AI cannot claim writes to database' },
  { pattern: /\bI\s+filled\s+in\b/i, reason: 'AI cannot claim to fill in data' },
  { pattern: /\bI\s+populated\s+missing\b/i, reason: 'AI cannot claim to populate missing data' },
  { pattern: /\bI\s+completed\s+the\s+missing\s+data\b/i, reason: 'AI cannot claim to complete missing data' },
  { pattern: /\bignore\s+data\s+quality\b/i, reason: 'AI must never instruct ignoring data quality' },
  { pattern: /\bignore\s+missing\s+data\b/i, reason: 'AI must never instruct ignoring missing data' },
  { pattern: /\bskip\s+validation\b/i, reason: 'AI must never instruct skipping validation' },
  { pattern: /\bformula\s+adjusted\b/i, reason: 'AI cannot claim formula modification' },
  { pattern: /\badjusted\s+the\s+formula\b/i, reason: 'AI cannot claim formula modification' },
  { pattern: /\bformula\s+changed\b/i, reason: 'AI cannot claim formula modification' },
  { pattern: /\bmodified\s+the\s+calculation\b/i, reason: 'AI cannot claim calculation modification' },
];

/**
 * Block: claims of saving data, filling in data, ignoring quality,
 * or modifying formulas.
 */
export function validateNoForbiddenClaims(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { pattern, reason } of FORBIDDEN_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        rule: 'FORBIDDEN_CLAIM',
        severity: 'blocked',
        message: reason,
      });
    }
  }
  return issues;
}

// ============================================================
// 4. Currency / BP Rules Validation
// ============================================================

const CURRENCY_CONFUSION_BLOCKED: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\bUSD\s+revenue\s+equals?\s+BP\s+target\b/i,
    message: 'Unit confusion: USD revenue cannot directly equal a BP target without conversion.',
  },
];

const CONVERSION_KEYWORDS =
  /\b(?:convert|conversion|exchange|rate|factor|translated|applying\s+(?:the\s+)?exchange)\b/i;

const CURRENCY_CONFUSION_WARNING: ReadonlyArray<{
  test: (text: string) => boolean;
  message: string;
}> = [
  {
    test: (text: string) => {
      const hasUsd = /\bUSD\b/i.test(text);
      const hasTwdCny = /\b(?:TWD|twd|CNY|cny)\b/i.test(text);
      return hasUsd && hasTwdCny && !CONVERSION_KEYWORDS.test(text);
    },
    message:
      'Direct comparison of USD to TWD/CNY without explicit conversion mention. Ensure exchange rate is applied.',
  },
  {
    test: (text: string) => {
      const hasRevenueTwd = /\brevenue\b[^.\n]{0,60}\bMillion\s+TWD\b/i.test(text);
      return hasRevenueTwd && !CONVERSION_KEYWORDS.test(text);
    },
    message:
      'Revenue compared to "Million TWD" BP target without unit conversion. Ensure currency and magnitude are aligned.',
  },
];

/**
 * Warning: direct USD/TWD/CNY comparisons without conversion.
 * Block: "USD revenue equals BP target" (unit confusion).
 */
export function validateCurrencyBpRules(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { pattern, message } of CURRENCY_CONFUSION_BLOCKED) {
    if (pattern.test(text)) {
      issues.push({ rule: 'CURRENCY_BP_RULES', severity: 'blocked', message });
    }
  }

  for (const { test, message } of CURRENCY_CONFUSION_WARNING) {
    if (test(text)) {
      issues.push({ rule: 'CURRENCY_BP_RULES', severity: 'warning', message });
    }
  }

  return issues;
}

// ============================================================
// 5. Write-Action Validation
// ============================================================

const WRITE_ACTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bsav(?:e|ed)\s+to\s+database\b/i, reason: 'AI cannot perform write actions to database' },
  { pattern: /\bupdate\s+Firestore\b/i, reason: 'AI cannot perform Firestore write actions' },
  { pattern: /\bwrite\s+to\s+collection\b/i, reason: 'AI cannot write to Firestore collections' },
  { pattern: /\bsetDoc\b/i, reason: 'AI cannot use Firestore setDoc' },
  { pattern: /\bdeleteDoc\b/i, reason: 'AI cannot use Firestore deleteDoc' },
  { pattern: /\bauto[- ]?saved?\b/i, reason: 'AI cannot trigger auto-save' },
  { pattern: /\bautomatically\s+saved\b/i, reason: 'AI cannot claim automatic saving' },
  { pattern: /\bsaved\s+for\s+you\b/i, reason: 'AI cannot claim saving on behalf of user' },
];

/**
 * Block: Firestore operations, database writes, auto-save claims.
 */
export function validateNoWriteActions(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { pattern, reason } of WRITE_ACTION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        rule: 'NO_WRITE_ACTIONS',
        severity: 'blocked',
        message: reason,
      });
    }
  }
  return issues;
}

// ============================================================
// 6. Causality Claims Validation
// ============================================================

const CAUSALITY_WARNING_PATTERNS: ReadonlyArray<RegExp> = [
  /\bcaused\s+by\s+customer\b/i,
  /\bbecause\s+of\s+customer\b/i,
  /\bdue\s+to\s+customer\s+demand\b/i,
  /\bcustomer\s+caused\b/i,
  /\bthis\s+led\s+to\b/i,
  /\bresulted\s+from\s+customer\b/i,
  /\bcustomer\s+drove\b/i,
];

/**
 * Warning: causality language attributing business outcomes to customers.
 * "caused by" is allowed when referring to data quality issues, not business
 * attribution. This validator flags customer-attribution patterns.
 */
export function validateNoCausalityClaims(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const pattern of CAUSALITY_WARNING_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        rule: 'NO_CAUSALITY_CLAIMS',
        severity: 'warning',
        message:
          'Causality attribution to customer detected. BP Gap Attribution is revenue-share based, not causal. Rephrase as proportional contribution.',
      });
    }
  }
  return issues;
}

// ============================================================
// 7. Confidence Downgrade Validation
// ============================================================

const HEDGING_PATTERNS: ReadonlyArray<RegExp> = [
  /\bmight\b/i,
  /\bpossibly\b/i,
  /\buncertain\b/i,
  /\bmay\b/i,
  /\bcould\s+be\b/i,
  /\bperhaps\b/i,
  /\bit\s+is\s+unclear\b/i,
];

const DEFINITIVE_PATTERNS: ReadonlyArray<RegExp> = [
  /\bwill\s+definitely\b/i,
  /\bcertainly\b/i,
  /\bguaranteed\b/i,
  /\babsolutely\b/i,
  /\bwithout\s+a\s+doubt\b/i,
  /\bis\s+confirmed\b/i,
];

/**
 * Warning if text contains hedging language but confidence is declared as 'high'.
 * Warning if text makes definitive claims but confidence is declared as 'low'.
 */
export function validateConfidenceDowngrade(
  text: string,
  declaredConfidence: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lower = declaredConfidence.toLowerCase();

  if (lower === 'high') {
    const hasHedging = HEDGING_PATTERNS.some(p => p.test(text));
    if (hasHedging) {
      issues.push({
        rule: 'CONFIDENCE_DOWNGRADE',
        severity: 'warning',
        message:
          'Response uses hedging language (might, possibly, uncertain) but confidence is declared as "high". Consider downgrading confidence.',
      });
    }
  }

  if (lower === 'low') {
    const hasDefinitive = DEFINITIVE_PATTERNS.some(p => p.test(text));
    if (hasDefinitive) {
      issues.push({
        rule: 'CONFIDENCE_DOWNGRADE',
        severity: 'warning',
        message:
          'Response uses definitive language (definitely, guaranteed, confirmed) but confidence is declared as "low". This is inconsistent.',
      });
    }
  }

  return issues;
}

// ============================================================
// 8. Missing Data Guessing Validation
// ============================================================

const GUESSING_BLOCKED_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bI\s+estimated\b/i, reason: 'AI must not claim to estimate data values' },
  { pattern: /\bI\s+assumed\s+the\s+value\b/i, reason: 'AI must not claim to assume data values' },
  { pattern: /\bI\s+guessed\b/i, reason: 'AI must not guess data values' },
  { pattern: /\bI\s+interpolated\b/i, reason: 'AI must not interpolate data values' },
  { pattern: /\bestimated\s+value\s+of\b/i, reason: 'AI must not present estimated values as data' },
  { pattern: /\bassumed\s+value\s+is\b/i, reason: 'AI must not present assumed values as data' },
  { pattern: /\bprojected\s+value\b/i, reason: 'AI must not present projected values as data' },
];

const GUESSING_WARNING_PATTERNS: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    pattern:
      /\b(?:approximately|roughly)\b(?![^.\n]{0,60}\b(?:source|reference|data\s+from|according\s+to|per\s+the|based\s+on)\b)/i,
    message:
      'Approximate language used without citing a data source. Approximations should be traceable.',
  },
];

/**
 * Block: claiming to estimate, assume, guess, or interpolate data.
 * Warning: using approximate language without a data source.
 */
export function validateNoMissingDataGuessing(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { pattern, reason } of GUESSING_BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        rule: 'NO_MISSING_DATA_GUESSING',
        severity: 'blocked',
        message: reason,
      });
    }
  }

  for (const { pattern, message } of GUESSING_WARNING_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        rule: 'NO_MISSING_DATA_GUESSING',
        severity: 'warning',
        message,
      });
    }
  }

  return issues;
}

// ============================================================
// Sanitize Blocked Content
// ============================================================

const BLOCKED_PLACEHOLDER = '[Content blocked by safety validation]';

/**
 * Replace blocked sections of the text with a placeholder.
 * Currently replaces the entire text when any blocked issue is found.
 * Returns the original text if no blocked issues exist.
 */
export function sanitizeBlockedContent(text: string): string {
  const allIssues = collectAllIssues(text);
  const hasBlocked = allIssues.some(i => i.severity === 'blocked');
  if (hasBlocked) {
    return BLOCKED_PLACEHOLDER;
  }
  return text;
}

// ============================================================
// Main Validation Entry Point
// ============================================================

function collectAllIssues(text: string): ValidationIssue[] {
  return [
    ...validateFairLabels(text),
    ...validateSourceReferences(text),
    ...validateNoForbiddenClaims(text),
    ...validateCurrencyBpRules(text),
    ...validateNoWriteActions(text),
    ...validateNoCausalityClaims(text),
    ...validateNoMissingDataGuessing(text),
  ];
}

/**
 * Run all output validators against the provider's response text.
 * Returns an OutputValidationResult with overall status, all issues,
 * and a sanitized answer.
 *
 * @param text  - The raw output string from the AI provider.
 * @param context - Optional context with the declared confidence level.
 */
export function validateProviderOutput(
  text: string,
  context?: { confidence?: string }
): OutputValidationResult {
  const issues: ValidationIssue[] = [
    ...collectAllIssues(text),
    ...(context?.confidence
      ? validateConfidenceDowngrade(text, context.confidence)
      : []),
  ];

  const hasBlocked = issues.some(i => i.severity === 'blocked');
  const hasWarning = issues.some(i => i.severity === 'warning');

  const status: 'pass' | 'warning' | 'blocked' = hasBlocked
    ? 'blocked'
    : hasWarning
      ? 'warning'
      : 'pass';

  const blockedReason = hasBlocked
    ? issues
        .filter(i => i.severity === 'blocked')
        .map(i => i.message)
        .join('; ')
    : undefined;

  const sanitizedAnswer = hasBlocked ? BLOCKED_PLACEHOLDER : text;

  return {
    status,
    issues,
    sanitizedAnswer,
    blockedReason,
  };
}
