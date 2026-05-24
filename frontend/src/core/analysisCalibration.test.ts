import { describe, it, expect } from 'vitest';
import { ALL_QA_FIXTURES } from './analysisQaFixtures';
import { buildAnalyticsModel } from './analytics';
import { buildBpAnalysis } from './bpTargets';
import { buildAnalysisContractPayload } from './analysisContract';

describe('Decision Analysis QA Fixtures Verification', () => {
  ALL_QA_FIXTURES.forEach((fixture) => {
    describe(`Scenario: ${fixture.name}`, () => {
      const { skus, forecasts, capacityPlans, params } = fixture;
      const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, params);
      const bpAnalysis = buildBpAnalysis(
        analytics.skuResults,
        skus,
        analytics.monthlySummaries,
        params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
        params.currencySettings!
      );
      const payload = buildAnalysisContractPayload(
        skus,
        forecasts,
        capacityPlans,
        params,
        analytics,
        bpAnalysis,
        'v1.20.1-qa'
      );

      it('should produce a valid Analysis Contract payload', () => {
        expect(payload.version).toBe('1.1');
        expect(payload.keyFindings.length).toBeGreaterThanOrEqual(0);
        expect(payload.keyFindings.length).toBeLessThanOrEqual(5);
      });

      if (fixture.name === 'Healthy Case') {
        it('should have high data confidence and no major risks', () => {
          expect(payload.quality.confidenceScore).toBeGreaterThanOrEqual(90);
          expect(payload.summary.shortageMonthCount).toBe(0);
          // Key findings shouldn't scream about shortage or BP miss
          const critical = payload.keyFindings.filter(f => f.severity === 'critical');
          expect(critical.length).toBe(0);
        });
      }

      if (fixture.name === 'Capacity Shortage Case') {
        it('should detect shortage and recommend remedy', () => {
          expect(payload.summary.shortageMonthCount).toBeGreaterThan(0);
          const shortageFinding = payload.keyFindings.find(f => f.id === 'kf-capacity-shortage');
          expect(shortageFinding).toBeDefined();
          expect(shortageFinding?.severity).toBe('critical');

          const remedyFinding = payload.keyFindings.find(f => f.id === 'kf-capacity-remedy');
          expect(remedyFinding).toBeDefined();
          expect(remedyFinding?.severity).toBe('positive');
        });
      }

      if (fixture.name === 'BP Miss Case') {
        it('should detect BP miss and attribute it', () => {
          const missFinding = payload.keyFindings.find(f => f.id === 'kf-bp-miss');
          expect(missFinding).toBeDefined();
          expect(missFinding?.severity).toBe('critical');

          const attributionFinding = payload.keyFindings.find(f => f.id === 'kf-bp-top-driver');
          expect(attributionFinding).toBeDefined();
          expect(payload.bpAttribution.topDrivers.length).toBeGreaterThan(0);
        });
      }

      if (fixture.name === 'Dirty Data Case') {
        it('should flag data quality issues as top priority', () => {
          expect(payload.quality.confidenceScore).toBeLessThan(70);
          const dqFinding = payload.keyFindings.find(f => f.id === 'kf-dq-high');
          expect(dqFinding).toBeDefined();
          expect(dqFinding?.severity).toBe('critical');
          // DQ finding should be the first one due to severity rank
          expect(payload.keyFindings[0].id).toBe('kf-dq-high');
        });
      }
    });
  });
});
