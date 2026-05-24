/**
 * Key Findings extractor (Phase 5.3B, v1.20.0)
 *
 * Distills the top 3-5 decision-level findings from the existing deterministic
 * analyses (Risk Attribution, BP Analysis, BP Attribution, Price Impact, Capacity
 * Impact, Data Quality). This is NOT an AI summary — it is a deterministic
 * priority queue: severity (critical > warning > info > positive) first, then
 * source-specific evidence magnitude.
 *
 * Hard cap: MAX_FINDINGS items. Stable sort.
 */

import type { BpAnalysisModel } from './bpTargets';
import type { BpAttributionModel } from './bpAttribution';
import type { PriceImpactModel, CapacityImpactModel } from './impactAnalysis';
import type { DataQualitySummary } from './dataQuality';
import type { RiskAttributionModel } from './riskAttribution';
import type { LocalizedMessage } from '../i18n';

export type KeyFindingSeverity = 'critical' | 'warning' | 'info' | 'positive';
export type KeyFindingSource = 'capacity' | 'bp' | 'price' | 'dataQuality' | 'skuHealth';

export interface KeyFinding {
  id: string;
  severity: KeyFindingSeverity;
  source: KeyFindingSource;
  /** Legacy English title; UI should prefer titleMessage. */
  title: string;
  titleMessage: LocalizedMessage;
  /** Legacy English detail; UI should prefer detailMessage. */
  detail: string;
  detailMessage: LocalizedMessage;
  evidence?: Record<string, string | number | null>;
}

export const MAX_FINDINGS = 5;

function msg(key: string, params?: Record<string, string | number>): LocalizedMessage {
  return params ? { key, params } : { key };
}

const SEVERITY_RANK: Record<KeyFindingSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

export interface KeyFindingsInput {
  risk?: RiskAttributionModel;
  bp?: BpAnalysisModel;
  bpAttribution?: BpAttributionModel;
  priceImpact?: PriceImpactModel;
  capacityImpact?: CapacityImpactModel;
  dataQuality?: DataQualitySummary;
}

export function buildKeyFindings(input: KeyFindingsInput): KeyFinding[] {
  const out: KeyFinding[] = [];

  // 1) Data Quality — high decisionImpact issues block trust. Surface the worst one.
  if (input.dataQuality) {
    const highImpact = input.dataQuality.issues.filter((i) => i.decisionImpact === 'high');
    if (highImpact.length > 0) {
      const first = highImpact[0];
      const count = highImpact.length;
      out.push({
        id: 'kf-dq-high',
        severity: 'critical',
        source: 'dataQuality',
        title: 'Data quality blocks confident decisions',
        titleMessage: msg('keyFindings.dq.high.title'),
        detail: `${count} high-impact data issue(s) detected. First: "${first.title}".`,
        detailMessage: msg('keyFindings.dq.high.detail', { count, first: first.title }),
        evidence: { count, firstId: first.id },
      });
    }
  }

  // 2) Capacity — shortage months in baseline risk model.
  if (input.risk && input.risk.shortageMonths.length > 0) {
    const months = input.risk.shortageMonths.length;
    const firstMonth = input.risk.shortageMonths[0];
    const lastMonth = input.risk.shortageMonths[input.risk.shortageMonths.length - 1];
    out.push({
      id: 'kf-capacity-shortage',
      severity: months >= 3 ? 'critical' : 'warning',
      source: 'capacity',
      title: `${months} month(s) under capacity shortage`,
      titleMessage: msg('keyFindings.capacity.shortage.title', { months }),
      detail: `Shortage spans ${firstMonth} → ${lastMonth}. See Capacity Improvement Impact for remediation.`,
      detailMessage: msg('keyFindings.capacity.shortage.detail', { first: firstMonth, last: lastMonth }),
      evidence: { months, firstMonth, lastMonth },
    });
  }

  // 3) Capacity Improvement Impact — best scenario that resolves the most months.
  if (input.capacityImpact && input.capacityImpact.bestScenarioId) {
    const best = input.capacityImpact.scenarios.find((s) => s.scenarioId === input.capacityImpact!.bestScenarioId);
    if (best) {
      const resolvedCount = best.resolvedShortageMonths.length;
      const beforeU = best.maxCoreUtilBefore ?? 1;
      const afterU = best.maxCoreUtilAfter ?? 1;
      const utilImproved = afterU < beforeU;
      
      if (resolvedCount > 0 || utilImproved) {
        out.push({
          id: 'kf-capacity-remedy',
          severity: 'positive',
          source: 'capacity',
          title: resolvedCount > 0 
            ? `Scenario ${best.scenarioId} resolves ${resolvedCount} shortage month(s)`
            : `Scenario ${best.scenarioId} reduces peak utilization`,
          titleMessage: msg('keyFindings.capacity.remedy.title', {
            scenario: best.scenarioId,
            resolved: resolvedCount,
          }),
          detail: resolvedCount > 0
            ? `Adding capacity per "${best.scenarioId}" removes ${resolvedCount} of ${best.shortageMonthsBefore} shortage months.`
            : `Adding capacity per "${best.scenarioId}" reduces peak utilization from ${(beforeU * 100).toFixed(0)}% to ${(afterU * 100).toFixed(0)}%.`,
          detailMessage: msg('keyFindings.capacity.remedy.detail', {
            scenario: best.scenarioId,
            resolved: resolvedCount,
            before: best.shortageMonthsBefore,
          }),
          evidence: {
            scenarioId: best.scenarioId,
            resolved: resolvedCount,
            before: best.shortageMonthsBefore,
          },
        });
      }
    }
  }

  // 4) BP miss — worst yearly miss period.
  if (input.bp) {
    let worst: { period: string; gap: number; attainment: number | null; status: 'miss' | 'watch' } | null = null;
    for (const r of input.bp.yearly) {
      if ((r.status === 'miss' || r.status === 'watch') && r.gapMillionTwd !== null) {
        const gap = Math.abs(r.gapMillionTwd);
        if (!worst || gap > worst.gap) {
          worst = { period: r.period, gap, attainment: r.attainment, status: r.status };
        }
      }
    }
    if (worst) {
      const attVal = worst.attainment ?? 0;
      const attainmentStr = worst.attainment !== null ? (worst.attainment * 100).toFixed(1) : '—';
      const gapStr = worst.gap.toFixed(1);
      const statusLabel = worst.status === 'miss' ? 'miss' : 'watch';
      const severity: 'critical' | 'warning' = worst.status === 'miss' ? 'critical' : 'warning';
      out.push({
        id: 'kf-bp-miss',
        severity,
        source: 'bp',
        title: `BP ${statusLabel} in ${worst.period}: ${attainmentStr}% attainment, gap ${gapStr}M TWD`,
        titleMessage: msg('keyFindings.bp.miss.title', {
          period: worst.period,
          attainment: attainmentStr + '%',
          gap: gapStr,
        }),
        detail: `BP target missed in ${worst.period}. See BP Gap Attribution for the customers and SKUs that carry the biggest share of the gap.`,
        detailMessage: msg('keyFindings.bp.miss.detail', { period: worst.period }),
        evidence: { period: worst.period, attainment: attVal, gapMillionTwd: worst.gap },
      });
    }
  }

  // 5) BP attribution top driver — name the single biggest contributor.
  if (input.bpAttribution && input.bpAttribution.topDrivers.length > 0) {
    const top = input.bpAttribution.topDrivers[0];
    const shareStr = top.shareOfGap.toFixed(1);
    const gapStr = Math.abs(top.gapContributionMillionTwd).toFixed(1);
    out.push({
      id: 'kf-bp-top-driver',
      severity: 'warning',
      source: 'bp',
      title: `Top BP gap driver: ${top.dimension} ${top.label}`,
      titleMessage: msg('keyFindings.bp.topDriver.title', {
        dimension: top.dimension,
        label: top.label,
      }),
      detail: `Carries ${shareStr}% of the ${top.period} gap (≈${gapStr}M TWD, proportional attribution).`,
      detailMessage: msg('keyFindings.bp.topDriver.detail', {
        share: shareStr,
        period: top.period,
        gap: gapStr,
      }),
      evidence: {
        dimension: top.dimension,
        label: top.label,
        period: top.period,
        share: top.shareOfGap,
        gapContribution: top.gapContributionMillionTwd,
      },
    });
  }

  // 6) Price Impact — sensitivity highlight.
  if (input.priceImpact && input.priceImpact.mostSensitiveYear && input.priceImpact.maxAttainmentDeltaPp !== null) {
    const pp = input.priceImpact.maxAttainmentDeltaPp;
    out.push({
      id: 'kf-price-sensitivity',
      severity: pp >= 10 ? 'warning' : 'info',
      source: 'price',
      title: `Price sensitivity: up to ±${pp.toFixed(1)}pp attainment swing in ${input.priceImpact.mostSensitiveYear}`,
      titleMessage: msg('keyFindings.price.sensitivity.title', {
        pp: pp.toFixed(1),
        year: input.priceImpact.mostSensitiveYear,
      }),
      detail: `±10% price change moves ${input.priceImpact.mostSensitiveYear} BP attainment by up to ${pp.toFixed(1)}pp. Pricing leverage is material.`,
      detailMessage: msg('keyFindings.price.sensitivity.detail', {
        year: input.priceImpact.mostSensitiveYear,
        pp: pp.toFixed(1),
      }),
      evidence: { year: input.priceImpact.mostSensitiveYear, deltaPp: pp },
    });
  }

  // 7) SKU health — call out any lowValueHighLoad or capacityDrainer SKU.
  if (input.risk) {
    const drains = input.risk.skuHealthSignals.filter(
      (s) => s.classification === 'lowValueHighLoad' || s.classification === 'capacityDrainer'
    );
    if (drains.length > 0) {
      const first = drains[0];
      out.push({
        id: 'kf-sku-drainer',
        severity: 'warning',
        source: 'skuHealth',
        title: `${drains.length} SKU(s) consume capacity without matching revenue`,
        titleMessage: msg('keyFindings.skuHealth.drainer.title', { count: drains.length }),
        detail: `Example: ${first.skuCode} (${first.classification}). Re-price or de-prioritize.`,
        detailMessage: msg('keyFindings.skuHealth.drainer.detail', {
          skuCode: first.skuCode,
          classification: first.classification,
        }),
        evidence: { count: drains.length, firstSku: first.skuCode, firstClass: first.classification },
      });
    }
  }

  // Stable sort by severity rank then by id (id encodes our preferred order).
  out.sort((a, b) => {
    const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (r !== 0) return r;
    return a.id.localeCompare(b.id);
  });

  return out.slice(0, MAX_FINDINGS);
}
