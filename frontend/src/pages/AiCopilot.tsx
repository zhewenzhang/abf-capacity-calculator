import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Typography, Space, Spin } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import type { ProjectScope } from '../types';
import { getParameters } from '../services/parameterService';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { buildAnalyticsModel } from '../core/analytics';
import { buildBpAnalysis } from '../core/bpTargets';
import { buildAiCopilotContext, type AiCopilotContext } from '../core/aiCopilotContext';
import CopilotChat from '../components/copilot/CopilotChat';
import { DEFAULT_CURRENCY_SETTINGS } from '../core/currency';

const { Title } = Typography;

interface AiCopilotPageProps {
  scope: ProjectScope;
}

const VALID_TOOL_IDS = new Set([
  'dataProblems',
  'capacityRisk',
  'bpGap',
  'suggestFixes',
  'scenarioImpact',
  'lookAhead',
  'workbenchOverview',
  'abnormalityDetail',
  'scenarioV2',
  'reportNarrative',
]);

const AiCopilotPage: React.FC<AiCopilotPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<AiCopilotContext | null>(null);
  // Track the deep-linked tool ID for auto-execution after context loads
  const [pendingToolId, setPendingToolId] = useState<string | null>(null);

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

        // Check for deep-link tool query param
        const toolParam = searchParams.get('tool');
        if (toolParam && VALID_TOOL_IDS.has(toolParam)) {
          setPendingToolId(toolParam);
          // Clear the query param to avoid re-triggering on refresh
          setSearchParams({}, { replace: true });
        }
      } catch (e: any) {
        setError(e.message || t('results.calcFailed'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by CopilotChat after it processes the pending tool
  const handlePendingToolConsumed = useCallback(() => {
    setPendingToolId(null);
  }, []);

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
      <Space style={{ marginBottom: 16 }}>
        <RobotOutlined style={{ fontSize: 24 }} />
        <Title level={4} style={{ margin: 0 }}>{t('copilot.title')}</Title>
      </Space>
      <CopilotChat
        context={context}
        pendingToolId={pendingToolId}
        onPendingToolConsumed={handlePendingToolConsumed}
      />
    </div>
  );
};

export default AiCopilotPage;
