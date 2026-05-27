/**
 * Abnormality Intelligence Layer (v1.43)
 *
 * Enriches DQ issues with business intelligence:
 * - Taxonomy classification
 * - Composite severity scoring
 * - Evidence citations
 * - "Why it matters today" narrative
 *
 * Constraints:
 * - Pure function, zero side effects
 * - No imports from services/**
 * - Reuses DataQualityIssue from dataQuality.ts -- does NOT duplicate rules
 * - Deterministic: same input = same output
 * - Array cap: max 20 ranked abnormalities
 */

import type { DataQualitySummary } from './dataQuality';
import type {
  AbnormalityInsight,
  AbnormalityDomain,
} from './workbench';

// ============================================================
// Taxonomy Types
// ============================================================

export type AbnormalityCategory =
  | 'data-integrity'
  | 'capacity-constraint'
  | 'revenue-risk'
  | 'operational-readiness'
  | 'forecast-gap'
  | 'currency-mismatch';

export interface AbnormalityType {
  /** Stable identifier matching DataQualityIssue.id patterns or derived signals. */
  id: string;
  /** Taxonomy category. */
  category: AbnormalityCategory;
  /** Source domain. */
  domain: AbnormalityDomain;
  /** Human-readable label. */
  label: string;
  /** Business impact description. */
  impactDescription: string;
  /** Typical root causes. */
  typicalCauses: string[];
  /** Recommended investigation route. */
  investigationRoute: string;
}

export interface AbnormalityTaxonomy {
  /** All registered abnormality types. */
  types: AbnormalityType[];
  /** Lookup by issue id pattern. */
  lookup(issueId: string): AbnormalityType | undefined;
}

// ============================================================
// Evidence Citation
// ============================================================

export interface EvidenceCitation {
  /** What data point this citation references. */
  metric: string;
  /** The actual value observed. */
  value: number | string;
  /** The expected or threshold value (null if not applicable). */
  threshold: number | string | null;
  /** Unit of measurement (e.g., 'panels', '%', 'M TWD'). */
  unit: string;
  /** Source module that produced this data point. */
  source: 'dataQuality' | 'analytics' | 'bpTargets' | 'scenarioEngine' | 'riskAttribution';
  /** Time period this evidence relates to (YYYY-MM or YYYY). */
  period?: string;
  /** Affected SKU codes (if applicable). */
  affectedSkuCodes?: string[];
}

// ============================================================
// Ranked Abnormality
// ============================================================

export interface RankedAbnormality {
  /** The enriched abnormality insight. */
  insight: AbnormalityInsight;
  /** Taxonomy type (if matched). */
  taxonomyType: AbnormalityType | null;
  /** Composite severity score (0-100, higher = more urgent). */
  severityScore: number;
  /** Business impact category. */
  impactCategory: 'blocking' | 'distorting' | 'degrading' | 'informational';
  /** Evidence citations attached to this insight. */
  citations: EvidenceCitation[];
  /** "Why it matters today" narrative. */
  whyItMatters: string;
}

// ============================================================
// Entry Point Types
// ============================================================

export interface AbnormalityIntelligenceInput {
  /** Workbench abnormalities (from buildWorkbenchViewModel). */
  abnormalities: AbnormalityInsight[];
  /** Data quality summary (for enrichment). */
  dqSummary: DataQualitySummary;
  /** Current date for "today" context. */
  currentDate?: Date;
}

export interface AbnormalityIntelligenceOutput {
  /** Ranked abnormalities with full intelligence. */
  ranked: RankedAbnormality[];
  /** Summary statistics. */
  summary: {
    total: number;
    blocking: number;
    distorting: number;
    degrading: number;
    informational: number;
    topCategory: AbnormalityCategory | null;
  };
  /** Top 3 "must act today" items. */
  mustActToday: RankedAbnormality[];
}

// ============================================================
// Static Taxonomy Registry
// ============================================================

const TAXONOMY_REGISTRY: AbnormalityType[] = [
  // --- data-integrity ---
  {
    id: 'sku-missing-attr',
    category: 'data-integrity',
    domain: 'data',
    label: 'Missing SKU Production Attributes',
    impactDescription: 'Missing SKU attributes block accurate capacity and revenue calculations.',
    typicalCauses: ['Incomplete product master data', 'Import errors', 'New SKU not fully configured'],
    investigationRoute: '/products',
  },
  {
    id: 'sku-zero-price',
    category: 'data-integrity',
    domain: 'data',
    label: 'Zero Unit Price',
    impactDescription: 'Zero price SKUs distort revenue forecasts and BP attainment.',
    typicalCauses: ['Pricing not entered', 'Free sample SKUs', 'Data migration error'],
    investigationRoute: '/products',
  },
  {
    id: 'forecast-orphan',
    category: 'data-integrity',
    domain: 'data',
    label: 'Orphan Forecast (Missing SKU)',
    impactDescription: 'Orphan forecasts reference non-existent SKUs, inflating demand signals.',
    typicalCauses: ['SKU deleted after forecast created', 'Import mismatch', 'Data sync error'],
    investigationRoute: '/forecasts',
  },
  {
    id: 'forecast-zero-price',
    category: 'data-integrity',
    domain: 'data',
    label: 'Forecast with Zero Price',
    impactDescription: 'Zero-price forecasts produce zero revenue, masking true demand value.',
    typicalCauses: ['Price override not set', 'Inherited zero from SKU'],
    investigationRoute: '/forecasts',
  },

  // --- capacity-constraint ---
  {
    id: 'forecast-missing-capacity',
    category: 'capacity-constraint',
    domain: 'capacity',
    label: 'Missing Capacity for Forecast Period',
    impactDescription: 'Forecasts without matching capacity config cannot determine supply sufficiency.',
    typicalCauses: ['New forecast period not yet configured', 'Capacity planning lag', 'Factory onboarding delay'],
    investigationRoute: '/capacity',
  },
  {
    id: 'bu-demand-zero-capacity',
    category: 'capacity-constraint',
    domain: 'capacity',
    label: 'BU Demand with Zero BU Capacity',
    impactDescription: 'Build-up demand exists but no BU capacity is configured, causing unfulfillable orders.',
    typicalCauses: ['BU line not yet set up', 'Capacity config error', 'Factory BU line down'],
    investigationRoute: '/capacity',
  },
  {
    id: 'capacity-without-forecast',
    category: 'capacity-constraint',
    domain: 'capacity',
    label: 'Capacity Without Demand',
    impactDescription: 'Idle capacity in these months suggests either demand drop or forecasting gap.',
    typicalCauses: ['Forecast not yet entered', 'Demand shifted', 'Seasonal gap'],
    investigationRoute: '/capacity',
  },
  {
    id: 'capacity-shortage',
    category: 'capacity-constraint',
    domain: 'capacity',
    label: 'Capacity Shortage Detected',
    impactDescription: 'Demand exceeds available capacity, risking unfulfilled orders and revenue loss.',
    typicalCauses: ['Demand surge', 'Capacity reduction', 'New customer orders'],
    investigationRoute: '/capacity',
  },
  {
    id: 'high-utilization',
    category: 'capacity-constraint',
    domain: 'capacity',
    label: 'High Capacity Utilization',
    impactDescription: 'Utilization near or above 100% leaves no buffer for demand variability.',
    typicalCauses: ['Tight capacity planning', 'Demand growth', 'No safety margin'],
    investigationRoute: '/capacity',
  },

  // --- revenue-risk ---
  {
    id: 'bp-miss',
    category: 'revenue-risk',
    domain: 'bp',
    label: 'BP Target Missed',
    impactDescription: 'Forecast revenue falls short of BP target, signaling potential business plan shortfall.',
    typicalCauses: ['Demand shortfall', 'Price erosion', 'Customer loss', 'Delayed ramp-up'],
    investigationRoute: '/bp-targets',
  },
  {
    id: 'bp-watch',
    category: 'revenue-risk',
    domain: 'bp',
    label: 'BP Target At Risk',
    impactDescription: 'BP attainment is below threshold, requiring attention to avoid miss.',
    typicalCauses: ['Demand softening', 'Competitive pressure', 'Forecast revision needed'],
    investigationRoute: '/bp-targets',
  },
  {
    id: 'revenue-trend-down',
    category: 'revenue-risk',
    domain: 'sales',
    label: 'Revenue Trend Declining',
    impactDescription: 'Declining revenue trend may signal structural demand issues.',
    typicalCauses: ['Customer churn', 'Product lifecycle decline', 'Market shift'],
    investigationRoute: '/dashboard',
  },

  // --- operational-readiness ---
  {
    id: 'missing-exchange-rate',
    category: 'operational-readiness',
    domain: 'data',
    label: 'Missing Exchange Rate',
    impactDescription: 'Missing exchange rates block accurate multi-currency revenue conversion.',
    typicalCauses: ['Exchange rate not configured', 'New currency added', 'Rate update pending'],
    investigationRoute: '/parameters',
  },
  {
    id: 'missing-bp-target',
    category: 'operational-readiness',
    domain: 'bp',
    label: 'Missing BP Target',
    impactDescription: 'No BP target configured for forecast year, preventing attainment tracking.',
    typicalCauses: ['BP planning not completed for this year', 'New fiscal year setup'],
    investigationRoute: '/bp-targets',
  },
  {
    id: 'bp-target-zero-forecast',
    category: 'operational-readiness',
    domain: 'bp',
    label: 'BP Target Without Forecast',
    impactDescription: 'BP target exists but no forecast demand to support attainment.',
    typicalCauses: ['Forecast not yet entered', 'Demand planning lag'],
    investigationRoute: '/bp-targets',
  },

  // --- forecast-gap ---
  {
    id: 'forecast-partial-year',
    category: 'forecast-gap',
    domain: 'data',
    label: 'Partial Year Forecast',
    impactDescription: 'Partial year forecast may understate annual demand and distort capacity planning.',
    typicalCauses: ['Forecast not fully entered', 'Short planning horizon', 'New product ramp'],
    investigationRoute: '/forecasts',
  },

  // --- currency-mismatch ---
  {
    id: 'sku-unsupported-currency',
    category: 'currency-mismatch',
    domain: 'data',
    label: 'Unsupported Currency',
    impactDescription: 'Unsupported currency cannot be converted, blocking revenue aggregation.',
    typicalCauses: ['New market currency not added to supported list', 'Data entry error'],
    investigationRoute: '/products',
  },

  // --- customer-concentration ---
  {
    id: 'customer-concentration',
    category: 'revenue-risk',
    domain: 'sales',
    label: 'Customer Concentration Risk',
    impactDescription: 'High customer concentration increases revenue vulnerability to single-customer events.',
    typicalCauses: ['Single large customer', 'Market concentration'],
    investigationRoute: '/dashboard',
  },

  // --- no-data ---
  {
    id: 'no-data-blocked',
    category: 'data-integrity',
    domain: 'data',
    label: 'No Data Loaded',
    impactDescription: 'No SKUs or forecasts loaded; all analytics are blocked.',
    typicalCauses: ['Initial setup', 'Data import pending'],
    investigationRoute: '/products',
  },

  // --- informational ---
  {
    id: 'bp-target-evenly-allocated',
    category: 'operational-readiness',
    domain: 'bp',
    label: 'BP Allocation Method',
    impactDescription: 'BP targets are evenly allocated to quarters and months for analysis.',
    typicalCauses: ['System design note'],
    investigationRoute: '/bp-targets',
  },
  {
    id: 'fixed-working-days',
    category: 'operational-readiness',
    domain: 'data',
    label: 'Fixed Working Days',
    impactDescription: 'Working days are fixed across all monthly summaries.',
    typicalCauses: ['Configuration note'],
    investigationRoute: '/parameters',
  },
];

// ============================================================
// Taxonomy Lookup
// ============================================================

function matchTaxonomyType(issueId: string): AbnormalityType | undefined {
  // Exact match first
  const exact = TAXONOMY_REGISTRY.find(t => t.id === issueId);
  if (exact) return exact;

  // Pattern-based matching (prefix matching for dynamic IDs)
  if (issueId.startsWith('sku-missing-attr-')) return TAXONOMY_REGISTRY.find(t => t.id === 'sku-missing-attr');
  if (issueId.startsWith('sku-zero-price-')) return TAXONOMY_REGISTRY.find(t => t.id === 'sku-zero-price');
  if (issueId.startsWith('forecast-orphan-sku-')) return TAXONOMY_REGISTRY.find(t => t.id === 'forecast-orphan');
  if (issueId.startsWith('forecast-zero-price-')) return TAXONOMY_REGISTRY.find(t => t.id === 'forecast-zero-price');
  if (issueId.startsWith('forecast-partial-year-')) return TAXONOMY_REGISTRY.find(t => t.id === 'forecast-partial-year');
  if (issueId.startsWith('sku-unsupported-currency-')) return TAXONOMY_REGISTRY.find(t => t.id === 'sku-unsupported-currency');
  if (issueId.startsWith('forecast-missing-bp-target-')) return TAXONOMY_REGISTRY.find(t => t.id === 'missing-bp-target');
  if (issueId.startsWith('bp-target-zero-forecast-')) return TAXONOMY_REGISTRY.find(t => t.id === 'bp-target-zero-forecast');
  if (issueId.startsWith('missing-constant-twd-rate') || issueId.startsWith('missing-yearly-twd-rate') ||
      issueId.startsWith('missing-constant-cny-rate') || issueId.startsWith('missing-yearly-cny-rate')) {
    return TAXONOMY_REGISTRY.find(t => t.id === 'missing-exchange-rate');
  }

  // AbnormalityInsight-derived patterns
  if (issueId === 'bp-miss' || issueId.startsWith('bp-miss-')) return TAXONOMY_REGISTRY.find(t => t.id === 'bp-miss');
  if (issueId === 'bp-watch' || issueId.startsWith('bp-watch-')) return TAXONOMY_REGISTRY.find(t => t.id === 'bp-watch');
  if (issueId === 'capacity-shortage' || issueId.startsWith('capacity-shortage-')) return TAXONOMY_REGISTRY.find(t => t.id === 'capacity-shortage');
  if (issueId === 'high-utilization' || issueId.startsWith('high-utilization-')) return TAXONOMY_REGISTRY.find(t => t.id === 'high-utilization');
  if (issueId === 'revenue-trend-down') return TAXONOMY_REGISTRY.find(t => t.id === 'revenue-trend-down');
  if (issueId === 'customer-concentration') return TAXONOMY_REGISTRY.find(t => t.id === 'customer-concentration');

  return undefined;
}

// Build taxonomy object with lookup
export const ABNORMALITY_TAXONOMY: AbnormalityTaxonomy = {
  types: TAXONOMY_REGISTRY,
  lookup: (issueId: string) => matchTaxonomyType(issueId),
};

// ============================================================
// Severity Scoring
// ============================================================

const BASE_SCORES: Record<string, number> = {
  critical: 80,
  warning: 50,
  info: 20,
};

const IMPACT_BONUS: Record<string, number> = {
  high: 20,
  medium: 10,
  low: 0,
};

const DOMAIN_WEIGHTS: Record<AbnormalityDomain, number> = {
  data: 1.2,
  capacity: 1.1,
  bp: 1.0,
  sales: 0.9,
  scenario: 0.8,
};

function computeSeverityScore(insight: AbnormalityInsight): number {
  const baseScore = BASE_SCORES[insight.severity] ?? 20;
  const impactBonus = IMPACT_BONUS[insight.evidence['decisionImpact'] as string] ?? 0;
  const domainWeight = DOMAIN_WEIGHTS[insight.domain] ?? 1.0;
  // Round to avoid floating point artifacts (e.g., 50 * 1.1 = 55.00000000000001)
  return Math.min(100, Math.round((baseScore + impactBonus) * domainWeight * 10) / 10);
}

function deriveImpactCategory(score: number, severity: string): RankedAbnormality['impactCategory'] {
  if (severity === 'critical' && score >= 80) return 'blocking';
  if (severity === 'critical' || score >= 60) return 'distorting';
  if (severity === 'warning' || score >= 40) return 'degrading';
  return 'informational';
}

// ============================================================
// Evidence Citation Builder
// ============================================================

function buildCitations(
  insight: AbnormalityInsight,
  taxonomyType: AbnormalityType | null,
): EvidenceCitation[] {
  const citations: EvidenceCitation[] = [];
  const evidence = insight.evidence;

  // Source attribution based on domain
  const source: EvidenceCitation['source'] =
    insight.domain === 'bp' ? 'bpTargets' :
    insight.domain === 'capacity' ? 'analytics' :
    insight.domain === 'sales' ? 'analytics' :
    'dataQuality';

  // Build citation from evidence record
  if (evidence['month']) {
    citations.push({
      metric: 'Affected Month',
      value: String(evidence['month']),
      threshold: null,
      unit: 'month',
      source,
      period: String(evidence['month']),
    });
  }

  if (evidence['period']) {
    citations.push({
      metric: 'Affected Period',
      value: String(evidence['period']),
      threshold: null,
      unit: 'period',
      source,
      period: String(evidence['period']),
    });
  }

  if (evidence['coreShortage'] !== undefined && evidence['coreShortage'] !== null) {
    citations.push({
      metric: 'Core Shortage',
      value: Number(evidence['coreShortage']),
      threshold: 0,
      unit: 'panels',
      source: 'analytics',
      period: evidence['month'] ? String(evidence['month']) : undefined,
    });
  }

  if (evidence['buShortage'] !== undefined && evidence['buShortage'] !== null) {
    citations.push({
      metric: 'BU Shortage',
      value: Number(evidence['buShortage']),
      threshold: 0,
      unit: 'panels',
      source: 'analytics',
      period: evidence['month'] ? String(evidence['month']) : undefined,
    });
  }

  if (evidence['coreUtilization'] !== undefined && evidence['coreUtilization'] !== null) {
    citations.push({
      metric: 'Core Utilization',
      value: `${(Number(evidence['coreUtilization']) * 100).toFixed(1)}%`,
      threshold: '100%',
      unit: '%',
      source: 'analytics',
      period: evidence['month'] ? String(evidence['month']) : undefined,
    });
  }

  if (evidence['buUtilization'] !== undefined && evidence['buUtilization'] !== null) {
    citations.push({
      metric: 'BU Utilization',
      value: `${(Number(evidence['buUtilization']) * 100).toFixed(1)}%`,
      threshold: '100%',
      unit: '%',
      source: 'analytics',
      period: evidence['month'] ? String(evidence['month']) : undefined,
    });
  }

  if (evidence['target'] !== undefined && evidence['target'] !== null) {
    citations.push({
      metric: 'BP Target',
      value: `${Number(evidence['target']).toFixed(1)} M TWD`,
      threshold: null,
      unit: 'M TWD',
      source: 'bpTargets',
      period: evidence['period'] ? String(evidence['period']) : undefined,
    });
  }

  if (evidence['forecast'] !== undefined && evidence['forecast'] !== null) {
    citations.push({
      metric: 'Forecast Revenue',
      value: `${Number(evidence['forecast']).toFixed(1)} M TWD`,
      threshold: null,
      unit: 'M TWD',
      source: 'bpTargets',
      period: evidence['period'] ? String(evidence['period']) : undefined,
    });
  }

  if (evidence['gap'] !== undefined && evidence['gap'] !== null) {
    citations.push({
      metric: 'Revenue Gap',
      value: `${Number(evidence['gap']).toFixed(1)} M TWD`,
      threshold: 0,
      unit: 'M TWD',
      source: 'bpTargets',
      period: evidence['period'] ? String(evidence['period']) : undefined,
    });
  }

  if (evidence['attainment'] !== undefined && evidence['attainment'] !== null) {
    citations.push({
      metric: 'BP Attainment',
      value: `${(Number(evidence['attainment']) * 100).toFixed(1)}%`,
      threshold: '100%',
      unit: '%',
      source: 'bpTargets',
      period: evidence['period'] ? String(evidence['period']) : undefined,
    });
  }

  if (evidence['bottleneck']) {
    citations.push({
      metric: 'Bottleneck Process',
      value: String(evidence['bottleneck']),
      threshold: null,
      unit: 'process',
      source: 'analytics',
      period: evidence['month'] ? String(evidence['month']) : undefined,
    });
  }

  if (evidence['skuCode']) {
    citations.push({
      metric: 'Affected SKU',
      value: String(evidence['skuCode']),
      threshold: null,
      unit: 'SKU',
      source: 'dataQuality',
      affectedSkuCodes: [String(evidence['skuCode'])],
    });
  }

  if (evidence['missingCount'] !== undefined && evidence['missingCount'] !== null) {
    citations.push({
      metric: 'Missing Attributes',
      value: Number(evidence['missingCount']),
      threshold: 0,
      unit: 'attributes',
      source: 'dataQuality',
      affectedSkuCodes: evidence['skuCode'] ? [String(evidence['skuCode'])] : undefined,
    });
  }

  if (evidence['count'] !== undefined && evidence['count'] !== null) {
    citations.push({
      metric: 'Affected Months',
      value: Number(evidence['count']),
      threshold: null,
      unit: 'months',
      source,
    });
  }

  // If no citations were built, create a generic one from taxonomy
  if (citations.length === 0 && taxonomyType) {
    citations.push({
      metric: taxonomyType.label,
      value: insight.severity,
      threshold: null,
      unit: 'status',
      source,
    });
  }

  return citations;
}

// ============================================================
// "Why It Matters" Narrative
// ============================================================

function generateNarrative(
  ranked: RankedAbnormality,
): string {
  const severityLabel =
    ranked.insight.severity === 'critical' ? 'critical' :
    ranked.insight.severity === 'warning' ? 'warning' : 'informational';

  const domainLabel = ranked.insight.domain;
  const metric = ranked.insight.title;

  // Build evidence summary from top citation
  let evidenceSummary = '';
  if (ranked.citations.length > 0) {
    const top = ranked.citations[0];
    evidenceSummary = `${top.metric}: ${top.value}`;
    if (top.threshold !== null) {
      evidenceSummary += ` (threshold: ${top.threshold})`;
    }
  }

  // Consequence based on impact category
  let consequence = '';
  switch (ranked.impactCategory) {
    case 'blocking':
      consequence = 'analysis results will be unreliable and action should be taken immediately';
      break;
    case 'distorting':
      consequence = 'key metrics may be inaccurate, affecting business decisions';
      break;
    case 'degrading':
      consequence = 'data quality is reduced and should be reviewed when possible';
      break;
    case 'informational':
      consequence = 'no immediate action required but awareness is recommended';
      break;
  }

  const parts: string[] = [];
  parts.push(`This ${severityLabel} issue in ${domainLabel} affects: ${metric}.`);
  if (evidenceSummary) {
    parts.push(`Evidence: ${evidenceSummary}.`);
  }
  parts.push(`If not resolved, ${consequence}.`);

  return parts.join(' ');
}

// ============================================================
// Tie-breaking comparator
// ============================================================

function compareRanked(a: RankedAbnormality, b: RankedAbnormality): number {
  // Primary: score descending
  if (a.severityScore !== b.severityScore) {
    return b.severityScore - a.severityScore;
  }
  // Secondary: critical before warning before info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sevDiff = (severityOrder[a.insight.severity] ?? 2) - (severityOrder[b.insight.severity] ?? 2);
  if (sevDiff !== 0) return sevDiff;
  // Tertiary: data domain first
  const domainOrder = { data: 0, capacity: 1, bp: 2, sales: 3, scenario: 4 };
  return (domainOrder[a.insight.domain] ?? 5) - (domainOrder[b.insight.domain] ?? 5);
}

// ============================================================
// Derive insightId for taxonomy lookup
// ============================================================

function deriveInsightId(insight: AbnormalityInsight): string {
  // Try to extract from evidence first
  const issueId = insight.evidence['issueId'];
  if (issueId && typeof issueId === 'string') return issueId;

  // Derive from domain + title patterns
  if (insight.domain === 'capacity' && insight.title.includes('shortage')) return 'capacity-shortage';
  if (insight.domain === 'capacity' && insight.title.includes('Over-capacity')) return 'high-utilization';
  if (insight.domain === 'bp' && insight.title.includes('missed')) return 'bp-miss';
  if (insight.domain === 'bp' && insight.title.includes('at risk')) return 'bp-watch';
  if (insight.domain === 'sales' && insight.title.includes('trend')) return 'revenue-trend-down';
  if (insight.domain === 'sales' && insight.title.includes('Top customer')) return 'customer-concentration';

  return '';
}

// ============================================================
// Main Entry Point
// ============================================================

const MAX_RANKED = 20;

export function buildAbnormalityIntelligence(
  input: AbnormalityIntelligenceInput,
): AbnormalityIntelligenceOutput {
  const { abnormalities } = input;

  // Early return for empty input
  if (abnormalities.length === 0) {
    return {
      ranked: [],
      summary: {
        total: 0,
        blocking: 0,
        distorting: 0,
        degrading: 0,
        informational: 0,
        topCategory: null,
      },
      mustActToday: [],
    };
  }

  // Step 1: Enrich each abnormality with taxonomy, score, evidence, narrative
  const ranked: RankedAbnormality[] = abnormalities.map(insight => {
    const insightId = deriveInsightId(insight);
    const taxonomyType = matchTaxonomyType(insightId) ?? null;
    const severityScore = computeSeverityScore(insight);
    const impactCategory = deriveImpactCategory(severityScore, insight.severity);
    const citations = buildCitations(insight, taxonomyType);

    // Build a temporary ranked object for narrative generation
    const tempRanked: RankedAbnormality = {
      insight,
      taxonomyType,
      severityScore,
      impactCategory,
      citations,
      whyItMatters: '', // filled below
    };
    const whyItMatters = generateNarrative(tempRanked);

    return {
      ...tempRanked,
      whyItMatters,
    };
  });

  // Step 2: Sort by composite score (highest first)
  ranked.sort(compareRanked);

  // Step 3: Cap at MAX_RANKED
  const capped = ranked.slice(0, MAX_RANKED);

  // Step 4: Compute summary statistics
  const summary = {
    total: capped.length,
    blocking: capped.filter(r => r.impactCategory === 'blocking').length,
    distorting: capped.filter(r => r.impactCategory === 'distorting').length,
    degrading: capped.filter(r => r.impactCategory === 'degrading').length,
    informational: capped.filter(r => r.impactCategory === 'informational').length,
    topCategory: capped.length > 0 && capped[0].taxonomyType
      ? capped[0].taxonomyType.category
      : null,
  };

  // Step 5: Top 3 "must act today"
  const mustActToday = capped.slice(0, 3);

  return {
    ranked: capped,
    summary,
    mustActToday,
  };
}
