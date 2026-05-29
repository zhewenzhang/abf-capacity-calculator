import React, { useState, useEffect } from 'react';
import { Alert, Spin } from 'antd';
import { useI18n } from '../i18n';
import type { ProjectScope } from '../types';
import { PageHeader } from '../components/common';
import { getParameters } from '../services/parameterService';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { buildAnalyticsModel } from '../core/analytics';
import { buildBpAnalysis } from '../core/bpTargets';
import { buildAiCopilotContext, type AiCopilotContext } from '../core/aiCopilotContext';
import CopilotChat from '../components/copilot/CopilotChat';
import { DEFAULT_CURRENCY_SETTINGS } from '../core/currency';

interface AiCopilotPageProps {
  scope: ProjectScope;
}

const AiCopilotPage: React.FC<AiCopilotPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<AiCopilotContext | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [skuData, forecastData, capacityData, paramsData] = await Promise.all([
          getSKUs(scope),
          getForecasts(scope),
          getCapacityPlans(scope),
          getParameters(scope),
        ]);

        if (skuData.length === 0 || forecastData.length === 0) {
          setError(t('results.noSkus'));
          setLoading(false);
          return;
        }

        const model = buildAnalyticsModel(skuData, forecastData, capacityData, paramsData);

        let bpTargets: Record<string, number> = {};
        if (paramsData.bpTargets?.yearlyRevenueTargetsMillionTwd) {
          bpTargets = { ...paramsData.bpTargets.yearlyRevenueTargetsMillionTwd };
        }
        const bpModel = Object.keys(bpTargets).length > 0
          ? buildBpAnalysis(model.skuResults, skuData, model.monthlySummaries, bpTargets, paramsData.currencySettings ? { ...DEFAULT_CURRENCY_SETTINGS, ...paramsData.currencySettings } : DEFAULT_CURRENCY_SETTINGS)
          : null;

        const ctx = buildAiCopilotContext(
          skuData,
          forecastData,
          capacityData,
          paramsData,
          model,
          bpModel,
          scope.role
        );
        setContext(ctx);
      } catch (e: any) {
        setError(e.message || t('results.calcFailed'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [scope]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" tip={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  if (!context) {
    return <Alert message={t('common.noData')} type="info" showIcon />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <PageHeader title={t('copilot.title')} description={t('copilot.desc')} />
      <CopilotChat context={context} />
    </div>
  );
};

export default AiCopilotPage;
