import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Spin,
  Alert,
  Tabs,
  Row,
  Col,
  Typography,
  Segmented,
  Card,
  List,
  Collapse,
  Button,
  Space,
  message,
  Modal,
  Select,
  Input,
  Popconfirm,
  Statistic,
  Progress,
} from 'antd';
import {
  WarningOutlined,
  InfoCircleOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DownloadOutlined,
  RobotOutlined,
  SafetyOutlined,
  CameraOutlined,
  DeleteOutlined,
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import { getParameters } from '../services/parameterService';
import { formatCurrency, DEFAULT_CURRENCY_SETTINGS } from '../core/currency';
import type { CurrencySettings } from '../core/currency';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import {
  buildAnalyticsModel,
  buildShortageExposure,
  type AnalyticsModel,
} from '../core/analytics';
import TimeMatrixTable, { type TimeMatrixRow } from '../components/analytics/TimeMatrixTable';
import { YearlyHealthMatrix } from '../components/analytics/YearlyHealthMatrix';
import { MetricCard } from '../components/common';
import { buildBpAnalysis } from '../core/bpTargets';
import BpAnalysisPanel from '../components/analytics/BpAnalysisPanel';
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { buildAnalysisContractPayload } from '../core/analysisContract';
import { buildRiskBrief } from '../core/riskBrief';
import { METRIC_DEFINITIONS } from '../core/metricDefinitions';
import type { ProjectScope } from '../types';
import {
  buildSanitizedAnalysisContract,
  buildChineseAiBriefPrompt,
  buildCombinedAiBriefPack,
  downloadSanitizedContract,
  revokeDownloadUrl,
} from '../core/aiBriefExport';
import {
  listSnapshots,
  createSnapshot,
  deleteSnapshot,
  getSnapshot,
  canDeleteSnapshot,
} from '../services/snapshotService';
import type { SnapshotListItem } from '../types/snapshot';
import {
  computeChangeImpact,
  type ChangeImpactResult,
} from '../core/changeImpact';
import {
  buildCombinedChangeImpactPack,
  downloadChangeImpactPack,
  revokeDownloadUrl as revokeChangeImpactUrl,
  copyToClipboard,
} from '../core/changeImpactExport';

const { Text } = Typography;

interface CalculationResultsPageProps {
  scope: ProjectScope;
}

type ResultsView = 'risk' | 'change' | 'sales' | 'product' | 'capacity' | 'bp' | 'raw';

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [view, setView] = useState<ResultsView>('risk');
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});

  // Phase 6: Snapshot states
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [baseSnapshotId, setBaseSnapshotId] = useState<string | null>(null);
  const [targetSnapshotId, setTargetSnapshotId] = useState<string | null>(null);
  const [changeImpact, setChangeImpact] = useState<ChangeImpactResult | null>(null);
  const [comparing, setComparing] = useState(false);

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
        setSkus(skuData);
        setForecasts(forecastData);
        setCapacityPlans(capacityData);
        setParams(paramsData);

        if (skuData.length === 0) {
          setModel(null);
          setBpTargets({});
          setError(t('results.noSkus'));
          setLoading(false);
          return;
        }
        if (forecastData.length === 0) {
          setModel(null);
          setBpTargets({});
          setError(t('results.noForecasts'));
          setLoading(false);
          return;
        }

        const m = buildAnalyticsModel(skuData, forecastData, capacityData, paramsData);
        setModel(m);

        if (paramsData.currencySettings) {
          const cs = paramsData.currencySettings as CurrencySettings;
          setCurrencySettings({ ...cs, displayCurrency: prefs.displayCurrency });
        }
        if (paramsData.bpTargets?.yearlyRevenueTargetsMillionTwd) {
          setBpTargets({ ...paramsData.bpTargets.yearlyRevenueTargetsMillionTwd });
        } else {
          setBpTargets({});
        }
      } catch (e: any) {
        setError(e.message || t('results.calcFailed'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [scope]);

  // Sync display currency when user preference changes
  useEffect(() => {
    setCurrencySettings(prev => ({ ...prev, displayCurrency: prefs.displayCurrency }));
  }, [prefs.displayCurrency]);

  // --- Shortage exposure ---
  const shortageExposure = useMemo(() => {
    if (!model) return [];
    return buildShortageExposure(model, skus);
  }, [model, skus]);

  // --- Year columns for matrix tables ---
  const yearColumns = useMemo(() => {
    if (!model) return [];
    return model.yearlyHealth.map(y => y.year);
  }, [model]);

  const bpAnalysisModel = useMemo(() => {
    if (!model) return undefined;
    return buildBpAnalysis(model.skuResults, skus, model.monthlySummaries, bpTargets, currencySettings);
  }, [model, skus, bpTargets, currencySettings]);

  const analysisPayload = useMemo(() => {
    if (!model || !params) return null;
    return buildAnalysisContractPayload(
      skus,
      forecasts,
      capacityPlans,
      params,
      model,
      bpAnalysisModel
    );
  }, [skus, forecasts, capacityPlans, params, model, bpAnalysisModel]);

  const riskBrief = useMemo(() => {
    if (!analysisPayload) return null;
    return buildRiskBrief(analysisPayload);
  }, [analysisPayload]);

  // ============================
  // Phase 6: Snapshot handlers
  // ============================

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const list = await listSnapshots(scope);
      setSnapshots(list);
    } catch (e: any) {
      message.error(t('changeReview.snapshotLoadFailed') + ': ' + e.message);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [scope, t]);

  const handleCreateSnapshot = useCallback(async () => {
    if (!newSnapshotName.trim()) {
      message.warning(t('changeReview.snapshotNameRequired'));
      return;
    }
    if (!model || !params) {
      message.warning(t('changeReview.noDataToSnapshot'));
      return;
    }

    setCreating(true);
    try {
      // Build derived highlights
      const derivedHighlights = {
        totalRevenueUsd: model.totalRevenue,
        totalForecastPcs: model.totalForecastPcs,
        maxCoreUtilization: model.maxCoreUtil,
        maxBuUtilization: model.maxBuUtil,
        shortageMonthCount: model.shortageMonthCount,
        worstBottleneckMonth: model.worstMonth,
        bpAttainment: bpAnalysisModel?.yearly[0]?.attainment ?? null,
        bpGapMillionTwd: bpAnalysisModel?.yearly[0]?.gapMillionTwd ?? null,
        keyFindingsCount: 0, // Will be computed when snapshot is loaded
        skuCount: skus.length,
        forecastMonthCount: new Set(forecasts.map(f => f.month)).size,
      };

      await createSnapshot(
        scope,
        scope.userId,
        undefined,
        {
          name: newSnapshotName.trim(),
          description: newSnapshotDesc.trim() || undefined,
          rawInputs: {
            skus,
            forecasts,
            capacityPlans,
            parameters: params,
          },
          derivedHighlights,
        }
      );

      message.success(t('changeReview.snapshotCreated'));
      setCreateModalOpen(false);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
      loadSnapshots();
    } catch (e: any) {
      message.error(t('changeReview.snapshotCreateFailed') + ': ' + e.message);
    } finally {
      setCreating(false);
    }
  }, [scope, newSnapshotName, newSnapshotDesc, model, params, skus, forecasts, capacityPlans, bpAnalysisModel, loadSnapshots, t]);

  const handleDeleteSnapshot = useCallback(async (snapshot: SnapshotListItem) => {
    try {
      await deleteSnapshot(scope, snapshot.id, snapshot.createdBy);
      message.success(t('changeReview.snapshotDeleted'));
      loadSnapshots();
      // Clear selection if deleted snapshot was selected
      if (baseSnapshotId === snapshot.id) setBaseSnapshotId(null);
      if (targetSnapshotId === snapshot.id) setTargetSnapshotId(null);
    } catch (e: any) {
      message.error(t('changeReview.snapshotDeleteFailed') + ': ' + e.message);
    }
  }, [scope, baseSnapshotId, targetSnapshotId, loadSnapshots, t]);

  const handleCompareSnapshots = useCallback(async () => {
    if (!baseSnapshotId || !targetSnapshotId) {
      message.warning(t('changeReview.selectTwoSnapshots'));
      return;
    }
    if (baseSnapshotId === targetSnapshotId) {
      message.warning(t('changeReview.sameSnapshot'));
      return;
    }

    setComparing(true);
    try {
      const [baseSnap, targetSnap] = await Promise.all([
        getSnapshot(scope, baseSnapshotId),
        getSnapshot(scope, targetSnapshotId),
      ]);

      if (!baseSnap || !targetSnap) {
        message.error(t('changeReview.snapshotNotFound'));
        return;
      }

      const result = computeChangeImpact(baseSnap, targetSnap);
      setChangeImpact(result);
    } catch (e: any) {
      message.error(t('changeReview.compareFailed') + ': ' + e.message);
    } finally {
      setComparing(false);
    }
  }, [scope, baseSnapshotId, targetSnapshotId, t]);

  const handleCopyChangeImpactPack = useCallback(async () => {
    if (!changeImpact) return;
    const pack = buildCombinedChangeImpactPack(changeImpact);
    const success = await copyToClipboard(pack);
    if (success) {
      message.success(t('changeReview.packCopied'));
    } else {
      message.error(t('changeReview.packCopyFailed'));
    }
  }, [changeImpact, t]);

  const handleDownloadChangeImpactPack = useCallback(() => {
    if (!changeImpact) return;
    const { dataUrl, filename } = downloadChangeImpactPack(changeImpact);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    revokeChangeImpactUrl(dataUrl);
    message.success(t('changeReview.packDownloaded'));
  }, [changeImpact, t]);

  // Load snapshots when view changes to 'change'
  useEffect(() => {
    if (view === 'change') {
      loadSnapshots();
    }
  }, [view, loadSnapshots]);

  // --- Reusable util cell render ---
  const renderUtil = (val: number | null, demand: number) => {
    if (val === null && demand > 0) return <Tag color="red">Over</Tag>;
    if (val === null) return '-';
    const pct = val * 100;
    return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
  };

  // --- Format helpers ---
  const fmtNum = (v: number) => v > 0 ? v.toLocaleString() : '-';
  const fmtRev = (v: number, year?: string) => {
    if (v <= 0) return '-';
    return formatCurrency(v, currencySettings, year);
  };

  // ============================
  // SALES VIEW TABS
  // ============================
  const salesItems = [
    {
      key: 'rev-by-customer',
      label: t('results.revByCustomer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueByCustomer}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Customer"
        />
      ) : null,
    },
    {
      key: 'fcst-by-customer',
      label: t('results.fcstByCustomer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.forecastByCustomer}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Customer"
        />
      ) : null,
    },
    {
      key: 'rev-by-sku',
      label: t('results.revBySku'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueBySku}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="SKU"
        />
      ) : null,
    },
    {
      key: 'shortage-exposure',
      label: t('results.shortageExposure'),
      children: shortageExposure.length > 0 ? (
        <TimeMatrixTable
          rows={shortageExposure.map(e => ({ label: e.customer, values: e.values }))}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Customer"
        />
      ) : (
        <Text type="secondary">{t('results.noShortage')}</Text>
      ),
    },
  ];

  // ============================
  // PRODUCT PLANNING VIEW TABS
  // ============================
  const productItems = [
    {
      key: 'rev-by-size',
      label: t('results.revBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueBySize}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'core-by-size',
      label: t('results.coreBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandBySize}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'bu-by-size',
      label: t('results.buBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandBySize}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'core-by-app',
      label: t('results.coreByApp'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByApplication}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Application"
        />
      ) : null,
    },
    {
      key: 'bu-by-app',
      label: t('results.buByApp'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandByApplication}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Application"
        />
      ) : null,
    },
    {
      key: 'rev-by-grade',
      label: t('results.revByGrade'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueByProductGrade}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Grade"
        />
      ) : null,
    },
    {
      key: 'core-by-grade',
      label: t('results.coreByGrade'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByProductGrade}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Grade"
        />
      ) : null,
    },
    {
      key: 'core-by-layer',
      label: t('results.coreByLayer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByLayerBucket}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Layer Bucket"
        />
      ) : null,
    },
    {
      key: 'bu-by-layer',
      label: t('results.buByLayer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandByLayerBucket}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Layer Bucket"
        />
      ) : null,
    },
  ];

  // ============================
  // CAPACITY ANALYSIS VIEW
  // ============================
  // Yearly health as horizontal matrix (metrics as rows, years as columns)
  const yearlyHealthRows = useMemo((): TimeMatrixRow[] => {
    if (!model || model.yearlyHealth.length === 0) return [];
    return [
      { label: t('results.revenue'), metricType: 'revenue', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.revenue])) },
      { label: t('results.forecastPcs'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.forecastPcs])) },
      { label: t('results.coreDemand'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreDemand])) },
      { label: t('results.coreCapacity'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreCapacity])) },
      { label: t('results.coreUtil'), metricType: 'utilization', values: Object.fromEntries(model.yearlyHealth.map(y => { const v = y.coreCapacity > 0 ? (y.coreDemand / y.coreCapacity) * 100 : (y.coreDemand > 0 ? 999 : 0); return [y.year, v]; })) },
      { label: t('results.buDemand'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buDemand])) },
      { label: t('results.buCapacity'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buCapacity])) },
      { label: t('results.buUtil'), metricType: 'utilization', values: Object.fromEntries(model.yearlyHealth.map(y => { const v = y.buCapacity > 0 ? (y.buDemand / y.buCapacity) * 100 : (y.buDemand > 0 ? 999 : 0); return [y.year, v]; })) },
      { label: t('results.shortageMonthsLabel'), metricType: 'shortage', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.shortageMonths.length])) },
      { label: t('results.bottleneck'), metricType: 'bottleneck', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.bottleneck === 'None' ? 0 : y.bottleneck === 'Core' ? 1 : 2])) },
    ];
  }, [model, t]);

  const yearlyHealthYears = useMemo(() => {
    if (!model) return [];
    return model.yearlyHealth.map(y => y.year);
  }, [model]);

  // Monthly Core/BU matrix
  const monthlyColumns = (metric: 'core' | 'bu'): ColumnsType<any> => {
    const demandKey = metric === 'core' ? 'totalCorePanelDemand' : 'totalBuPanelDemand';
    const capacityKey = metric === 'core' ? 'coreCapacity' : 'buCapacity';
    const utilKey = metric === 'core' ? 'coreUtilization' : 'buUtilization';
    const shortageKey = metric === 'core' ? 'coreShortage' : 'buShortage';

    return [
      { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
      { title: t('results.demand'), dataIndex: demandKey, key: demandKey, width: 100, render: (v: number) => fmtNum(v) },
      { title: t('results.capacity'), dataIndex: capacityKey, key: capacityKey, width: 100, render: (v: number) => fmtNum(v) },
      {
        title: t('results.utilization'),
        dataIndex: utilKey,
        key: utilKey,
        width: 100,
        render: (v: number | null, r: MonthlyCapacitySummary) => {
          const demand = r[demandKey] as number;
          return renderUtil(v, demand);
        },
      },
      {
        title: t('results.shortage'),
        dataIndex: shortageKey,
        key: shortageKey,
        width: 100,
        render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-',
      },
    ];
  };

  const capacityItems = [
    {
      key: 'yearly-health',
      label: t('results.yearlyHealth'),
      children: model && model.yearlyHealth.length > 0 ? (
        <YearlyHealthMatrix
          rows={yearlyHealthRows}
          years={yearlyHealthYears}
          currencySettings={currencySettings}
        />
      ) : null,
    },
    {
      key: 'monthly-core',
      label: t('results.monthlyCore'),
      children: model ? (
        <Table
          columns={monthlyColumns('core')}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'monthly-bu',
      label: t('results.monthlyBu'),
      children: model ? (
        <Table
          columns={monthlyColumns('bu')}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'bottleneck-calendar',
      label: t('results.bottleneckCalendar'),
      children: model ? (
        <Table
          columns={[
            { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
            { title: t('results.bottleneck'), dataIndex: 'bottleneck', key: 'bottleneck', width: 100, render: (v: string) => v === 'None' ? <Tag color="green">{t('common.none')}</Tag> : v === 'Core' ? <Tag color="orange">{t('common.core')}</Tag> : <Tag color="red">{t('common.bu')}</Tag> },
            { title: t('results.coreShortage'), dataIndex: 'coreShortage', key: 'coreShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
            { title: t('results.buShortage'), dataIndex: 'buShortage', key: 'buShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
          ]}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
  ];

  // ============================
  // RAW DETAIL TAB
  // ============================
  const skuColumns: ColumnsType<SkuCalculationResult> = [
    { title: t('results.sku'), dataIndex: 'skuCode', key: 'skuCode', width: 110, fixed: 'left' as const },
    { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90 },
    { title: t('results.forecastPcs'), dataIndex: 'forecastPcs', key: 'forecastPcs', render: (v: number) => v.toLocaleString() },
    { title: t('results.yield'), dataIndex: 'yieldRate', key: 'yieldRate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: t('results.inputPcs'), dataIndex: 'requiredInputPcs', key: 'requiredInputPcs', render: (v: number) => v.toLocaleString() },
    { title: t('results.pcsPerPanel'), dataIndex: 'pcsPerPanel', key: 'pcsPerPanel' },
    { title: t('results.panels'), dataIndex: 'requiredPanels', key: 'requiredPanels', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreSteps'), dataIndex: 'coreSteps', key: 'coreSteps' },
    { title: t('results.buSteps'), dataIndex: 'buSteps', key: 'buSteps' },
    { title: t('results.coreDemand'), dataIndex: 'corePanelDemand', key: 'corePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.buDemand'), dataIndex: 'buPanelDemand', key: 'buPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.revenue'), dataIndex: 'revenue', key: 'revenue', render: (v: number) => formatCurrency(v, currencySettings) },
  ];

  const summaryColumns: ColumnsType<MonthlyCapacitySummary> = [
    { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
    { title: t('results.coreDemand'), dataIndex: 'totalCorePanelDemand', key: 'totalCorePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreCapacity'), dataIndex: 'coreCapacity', key: 'coreCapacity', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreUtil'), dataIndex: 'coreUtilization', key: 'coreUtilization', render: (v: number | null) => v === null ? <Tag color="red">{t('results.over')}</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: t('results.buDemand'), dataIndex: 'totalBuPanelDemand', key: 'totalBuPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.buCapacity'), dataIndex: 'buCapacity', key: 'buCapacity', render: (v: number) => v.toLocaleString() },
    { title: t('results.buUtil'), dataIndex: 'buUtilization', key: 'buUtilization', render: (v: number | null) => v === null ? <Tag color="red">{t('results.over')}</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: t('results.coreShortage'), dataIndex: 'coreShortage', key: 'coreShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: t('results.buShortage'), dataIndex: 'buShortage', key: 'buShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: t('results.bottleneck'), dataIndex: 'bottleneck', key: 'bottleneck', render: (v: string) => v === 'None' ? <Tag color="green">{t('common.none')}</Tag> : v === 'Core' ? <Tag color="orange">{t('common.core')}</Tag> : <Tag color="red">{t('common.bu')}</Tag> },
  ];

  const rawItems = [
    {
      key: 'sku-detail',
      label: t('results.skuDetail'),
      children: model ? (
        <Table
          columns={skuColumns}
          dataSource={model.skuResults}
          rowKey={(r) => `${r.skuId}-${r.month}`}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'capacity-summary',
      label: t('results.capacitySummary'),
      children: model ? (
        <Table
          columns={summaryColumns}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
          rowClassName={(r) => r.coreShortage > 0 || r.buShortage > 0 ? 'shortage-row' : ''}
        />
      ) : null,
    },
  ];

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon />}
      {!error && model && (
        <>
          {/* Summary KPIs */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <MetricCard
                title={t('results.totalRevenue')}
                value={model.totalRevenue}
                precision={currencySettings.displayCurrency === 'USD' ? 2 : 0}
              />
            </Col>
            <Col span={6}>
              <MetricCard title={t('results.totalForecastPcs')} value={model.totalForecastPcs} precision={0} />
            </Col>
            <Col span={6}>
              <MetricCard title={t('results.calculationRows')} value={model.skuResults.length} />
            </Col>
            <Col span={6}>
              <MetricCard
                title={t('results.shortageMonthCount')}
                value={model.shortageMonthCount}
                valueStyle={{ color: model.shortageMonthCount > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Col>
          </Row>

          {/* View selector */}
          <Segmented
            value={view}
            onChange={(v) => setView(v as ResultsView)}
            options={[
              { label: t('results.riskBrief') || 'Risk Brief', value: 'risk' },
              { label: t('results.salesView'), value: 'sales' },
              { label: t('results.productView'), value: 'product' },
              { label: t('results.capacityView'), value: 'capacity' },
              { label: t('bp.analysis'), value: 'bp' },
              { label: t('results.rawDetail'), value: 'raw' },
            ]}
            style={{ marginBottom: 16 }}
          />

          {/* Risk Brief View */}
          {view === 'risk' && riskBrief && analysisPayload && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Executive Summary */}
              <Card title={t('results.riskBrief.executiveSummaryTitle')} bordered={false} size="small">
                <List
                  dataSource={riskBrief.executiveSummaryMessages}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Text style={{ fontSize: 14 }}>{t(item)}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Phase 5.4 — AI Brief Export */}
              <Card
                title={
                  <Space>
                    <RobotOutlined />
                    <span>{t('aiBriefExport.title')}</span>
                  </Space>
                }
                bordered={false}
                size="small"
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('aiBriefExport.subtitle')}
                  </Text>
                }
              >
                <Alert
                  type="info"
                  showIcon
                  icon={<SafetyOutlined />}
                  message={t('aiBriefExport.notice')}
                  description={t('aiBriefExport.disclaimer')}
                  style={{ marginBottom: 16 }}
                />
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      if (!analysisPayload) return;
                      const pack = buildCombinedAiBriefPack(analysisPayload);
                      const success = await copyToClipboard(pack);
                      if (success) {
                        message.success(t('aiBriefExport.copied'));
                      } else {
                        message.error(t('aiBriefExport.copyFailed'));
                      }
                    }}
                  >
                    {t('aiBriefExport.copyPack')}
                  </Button>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      if (!analysisPayload) return;
                      const sanitized = buildSanitizedAnalysisContract(analysisPayload);
                      const prompt = buildChineseAiBriefPrompt(sanitized);
                      const success = await copyToClipboard(prompt);
                      if (success) {
                        message.success(t('aiBriefExport.copied'));
                      } else {
                        message.error(t('aiBriefExport.copyFailed'));
                      }
                    }}
                  >
                    {t('aiBriefExport.copyPrompt')}
                  </Button>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      if (!analysisPayload) return;
                      const sanitized = buildSanitizedAnalysisContract(analysisPayload);
                      const json = JSON.stringify(sanitized, null, 2);
                      const success = await copyToClipboard(json);
                      if (success) {
                        message.success(t('aiBriefExport.copied'));
                      } else {
                        message.error(t('aiBriefExport.copyFailed'));
                      }
                    }}
                  >
                    {t('aiBriefExport.copyJson')}
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      if (!analysisPayload) return;
                      const { dataUrl, filename } = downloadSanitizedContract(analysisPayload);
                      const link = document.createElement('a');
                      link.href = dataUrl;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      revokeDownloadUrl(dataUrl);
                      message.success(t('aiBriefExport.downloaded'));
                    }}
                  >
                    {t('aiBriefExport.downloadJson')}
                  </Button>
                </Space>
                <Collapse
                  size="small"
                  style={{ marginTop: 16 }}
                  items={[
                    {
                      key: 'security',
                      label: t('aiBriefExport.securityNote'),
                      children: (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {t('aiBriefExport.securityContent')}
                        </Text>
                      ),
                    },
                    {
                      key: 'guardrails',
                      label: t('aiBriefExport.guardrailsTitle'),
                      children: (
                        <div>
                          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                            {t('aiBriefExport.guardrails.note')}
                          </Text>
                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                            <li>{t('aiBriefExport.guardrails.modifyFormulas')}</li>
                            <li>{t('aiBriefExport.guardrails.supplementData')}</li>
                            <li>{t('aiBriefExport.guardrails.currencyMix')}</li>
                            <li>{t('aiBriefExport.guardrails.attribution')}</li>
                          </ul>
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>

              {/* Phase 5.3B — Key Findings */}
              {analysisPayload.keyFindings.length > 0 && (
                <Card title={t('results.keyFindings.title')} bordered={false} size="small"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>{t('results.keyFindings.subtitle')}</Text>}
                >
                  <List
                    dataSource={analysisPayload.keyFindings}
                    renderItem={(f) => (
                      <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
                        <div style={{ width: '100%' }}>
                          <Tag color={
                            f.severity === 'critical' ? 'red' :
                            f.severity === 'warning' ? 'orange' :
                            f.severity === 'positive' ? 'green' : 'blue'
                          } style={{ marginRight: 8 }}>
                            {t(`keyFindings.severity.${f.severity}`)}
                          </Tag>
                          <Tag color="default" style={{ marginRight: 8 }}>{t(`keyFindings.source.${f.source}`)}</Tag>
                          <Text strong>{t(f.titleMessage)}</Text>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>{t(f.detailMessage)}</Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* Phase 5.3B — BP Gap Attribution */}
              {analysisPayload.bpAttribution.topDrivers.length > 0 && (
                <Card title={t('results.bpAttr.title')} bordered={false} size="small"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>{t('results.bpAttr.subtitle')}</Text>}
                >
                  <Table
                    dataSource={analysisPayload.bpAttribution.topDrivers}
                    rowKey={(r) => `${r.dimension}-${r.label}-${r.period}`}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: t('results.bpAttr.period'), dataIndex: 'period', key: 'period', width: 120 },
                      { title: t('results.bpAttr.dimension'), dataIndex: 'dimension', key: 'dimension', width: 130, render: (v: string) => t(`attr.dimension.${v}`) },
                      { title: t('results.bpAttr.driver'), dataIndex: 'label', key: 'label', width: 220 },
                      {
                        title: t('results.bpAttr.shareOfGap'),
                        dataIndex: 'shareOfGap',
                        key: 'shareOfGap',
                        width: 110,
                        align: 'right',
                        render: (v: number) => `${v.toFixed(1)}%`,
                      },
                      {
                        title: t('results.bpAttr.gapContribution'),
                        dataIndex: 'gapContributionMillionTwd',
                        key: 'gapContributionMillionTwd',
                        width: 160,
                        align: 'right',
                        render: (v: number) => `${v.toFixed(1)} M TWD`,
                      },
                      {
                        title: t('results.riskBrief.reason'),
                        dataIndex: 'reasonMessage',
                        key: 'reasonMessage',
                        render: (_v: unknown, record: typeof analysisPayload.bpAttribution.topDrivers[0]) => (
                          <div style={{ whiteSpace: 'normal', fontSize: 13 }}>{t(record.reasonMessage)}</div>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Phase 5.3B — Price Impact */}
              {analysisPayload.priceImpact.scenarios.length > 0 && (
                <Card title={t('results.priceImpact.title')} bordered={false} size="small"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>{t('results.priceImpact.subtitle')}</Text>}
                >
                  <Tabs
                    size="small"
                    items={analysisPayload.priceImpact.scenarios.map((sc) => ({
                      key: sc.scenarioId,
                      label: `${sc.priceDeltaPct > 0 ? '+' : ''}${(sc.priceDeltaPct * 100).toFixed(0)}%`,
                      children: (
                        <Table
                          dataSource={sc.yearly}
                          rowKey="year"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: t('results.priceImpact.year'), dataIndex: 'year', key: 'year', width: 100 },
                            {
                              title: t('results.priceImpact.baseRevenue'),
                              dataIndex: 'baseRevenueMillionTwd',
                              key: 'baseRevenueMillionTwd',
                              width: 150,
                              align: 'right',
                              render: (v: number) => `${v.toFixed(1)} M TWD`,
                            },
                            {
                              title: t('results.priceImpact.scenarioRevenue'),
                              dataIndex: 'scenarioRevenueMillionTwd',
                              key: 'scenarioRevenueMillionTwd',
                              width: 150,
                              align: 'right',
                              render: (v: number) => `${v.toFixed(1)} M TWD`,
                            },
                            {
                              title: t('results.priceImpact.revenueDelta'),
                              dataIndex: 'revenueDeltaMillionTwd',
                              key: 'revenueDeltaMillionTwd',
                              width: 160,
                              align: 'right',
                              render: (v: number) => (
                                <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'} style={{ margin: 0 }}>
                                  {v > 0 ? '+' : ''}{v.toFixed(1)} M TWD
                                </Tag>
                              ),
                            },
                            {
                              title: t('results.priceImpact.baseAttainment'),
                              dataIndex: 'baseBpAttainment',
                              key: 'baseBpAttainment',
                              width: 130,
                              align: 'right',
                              render: (v: number | null) => v === null ? '-' : `${(v * 100).toFixed(1)}%`,
                            },
                            {
                              title: t('results.priceImpact.scenarioAttainment'),
                              dataIndex: 'scenarioBpAttainment',
                              key: 'scenarioBpAttainment',
                              width: 130,
                              align: 'right',
                              render: (v: number | null) => v === null ? '-' : `${(v * 100).toFixed(1)}%`,
                            },
                            {
                              title: t('results.priceImpact.attainmentDelta'),
                              dataIndex: 'bpAttainmentDelta',
                              key: 'bpAttainmentDelta',
                              width: 140,
                              align: 'right',
                              render: (v: number | null) => v === null ? '-' : (
                                <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'} style={{ margin: 0 }}>
                                  {v > 0 ? '+' : ''}{(v * 100).toFixed(1)}pp
                                </Tag>
                              ),
                            },
                          ]}
                        />
                      ),
                    }))}
                  />
                </Card>
              )}

              {/* Phase 5.3B — Capacity Improvement Impact */}
              {analysisPayload.capacityImpact.scenarios.length > 0 && (
                <Card title={t('results.capacityImpact.title')} bordered={false} size="small"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>{t('results.capacityImpact.subtitle')}</Text>}
                >
                  <Table
                    dataSource={analysisPayload.capacityImpact.scenarios}
                    rowKey="scenarioId"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: t('results.capacityImpact.scenario'),
                        dataIndex: 'scenarioId',
                        key: 'scenarioId',
                        width: 220,
                        render: (v: string) => t(`results.capacityImpact.scenarioName.${v}`),
                      },
                      {
                        title: t('results.capacityImpact.shortageBefore'),
                        dataIndex: 'shortageMonthsBefore',
                        key: 'shortageMonthsBefore',
                        width: 140,
                        align: 'right',
                      },
                      {
                        title: t('results.capacityImpact.shortageAfter'),
                        dataIndex: 'shortageMonthsAfter',
                        key: 'shortageMonthsAfter',
                        width: 140,
                        align: 'right',
                        render: (v: number, r: typeof analysisPayload.capacityImpact.scenarios[0]) => (
                          <Tag color={v < r.shortageMonthsBefore ? 'green' : 'default'} style={{ margin: 0 }}>{v}</Tag>
                        ),
                      },
                      {
                        title: t('results.capacityImpact.resolvedCount'),
                        dataIndex: 'resolvedShortageMonths',
                        key: 'resolvedShortageMonths',
                        width: 110,
                        align: 'right',
                        render: (v: string[]) => v.length,
                      },
                      {
                        title: t('results.capacityImpact.maxCoreUtilBefore'),
                        dataIndex: 'maxCoreUtilBefore',
                        key: 'maxCoreUtilBefore',
                        width: 160,
                        align: 'right',
                        render: (v: number | null) => v === null ? t('results.capacityImpact.overflow') : `${(v * 100).toFixed(1)}%`,
                      },
                      {
                        title: t('results.capacityImpact.maxCoreUtilAfter'),
                        dataIndex: 'maxCoreUtilAfter',
                        key: 'maxCoreUtilAfter',
                        width: 160,
                        align: 'right',
                        render: (v: number | null) => v === null ? t('results.capacityImpact.overflow') : `${(v * 100).toFixed(1)}%`,
                      },
                      {
                        title: t('results.capacityImpact.maxBuUtilBefore'),
                        dataIndex: 'maxBuUtilBefore',
                        key: 'maxBuUtilBefore',
                        width: 160,
                        align: 'right',
                        render: (v: number | null) => v === null ? t('results.capacityImpact.overflow') : `${(v * 100).toFixed(1)}%`,
                      },
                      {
                        title: t('results.capacityImpact.maxBuUtilAfter'),
                        dataIndex: 'maxBuUtilAfter',
                        key: 'maxBuUtilAfter',
                        width: 160,
                        align: 'right',
                        render: (v: number | null) => v === null ? t('results.capacityImpact.overflow') : `${(v * 100).toFixed(1)}%`,
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Top Risk Periods */}
              {riskBrief.topRiskPeriods.length > 0 && (
                <Card title={t('results.riskBrief.topRiskPeriodsTitle', { count: riskBrief.topRiskPeriods.length })} bordered={false} size="small">
                  <Table
                    dataSource={riskBrief.topRiskPeriods}
                    rowKey="period"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: t('results.riskBrief.period'),
                        dataIndex: 'period',
                        key: 'period',
                        width: 80,
                        render: (v: string) => <Text strong>{v}</Text>,
                      },
                      {
                        title: t('results.riskBrief.severity'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 90,
                        render: (v: string) => (
                          <Tag color={v === 'red' ? 'red' : v === 'orange' ? 'orange' : 'green'}>
                            {v.toUpperCase()}
                          </Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.bottleneckCol'),
                        dataIndex: 'bottleneck',
                        key: 'bottleneck',
                        width: 90,
                        render: (v: string) => (
                          <Tag color={v === 'Core' ? 'orange' : v === 'BU' ? 'red' : 'default'}>{v}</Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.reason'),
                        dataIndex: 'reasonMessage',
                        key: 'reasonMessage',
                        render: (_v: unknown, record: typeof riskBrief.topRiskPeriods[0]) => t(record.reasonMessage),
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Key Facts */}
              {riskBrief.facts.length > 0 && (
                <Card title={t('results.riskBrief.keyFactsTitle')} bordered={false} size="small">
                  <List
                    dataSource={riskBrief.facts}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '4px 0' }}>
                        <Tag
                          color={
                            item.severity === 'critical' ? 'red' :
                            item.severity === 'warning' ? 'orange' :
                            item.severity === 'positive' ? 'green' : 'blue'
                          }
                          style={{ marginRight: 8 }}
                        >
                          {item.severity.toUpperCase()}
                        </Tag>
                        <Text strong>{t(item.titleMessage)}:</Text>
                        <Text style={{ marginLeft: 4 }}>{t(item.detailMessage)}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* Risk Period Attribution — shortage-month drivers */}
              {riskBrief.attributionDrivers.length > 0 && (
                <Card
                  title={t('results.riskBrief.attributionTitle', { count: riskBrief.shortageMonths.length, plural: riskBrief.shortageMonths.length === 1 ? '' : 's' })}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.attributionSubtitle')}
                    </Text>
                  }
                >
                  <Table
                    dataSource={riskBrief.attributionDrivers}
                    rowKey={(r) => `${r.dimension}-${r.metric}-${r.label}`}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: t('results.riskBrief.dimension'), dataIndex: 'dimension', key: 'dimension', width: 110, render: (v: string) => t(`attr.dimension.${v}`) },
                      { title: t('results.riskBrief.driver'), dataIndex: 'label', key: 'label', width: 180 },
                      { title: t('results.riskBrief.metric'), dataIndex: 'metric', key: 'metric', width: 170, render: (v: string) => t(`attr.metric.${v}`) },
                      {
                        title: t('results.riskBrief.value'),
                        dataIndex: 'value',
                        key: 'value',
                        width: 110,
                        align: 'right',
                        render: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }),
                      },
                      {
                        title: t('results.riskBrief.share'),
                        dataIndex: 'share',
                        key: 'share',
                        width: 80,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.severity'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 90,
                        render: (s: string) => (
                          <Tag color={s === 'critical' ? 'red' : s === 'warning' ? 'orange' : 'blue'}>{s.toUpperCase()}</Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.periods'),
                        dataIndex: 'affectedPeriods',
                        key: 'affectedPeriods',
                        render: (ps: string[]) => (ps.length > 4 ? t('results.riskBrief.morePeriods', { shown: ps.slice(0, 4).join(', '), rest: ps.length - 4 }) : ps.join(', ') || '-'),
                      },
                      { title: t('results.riskBrief.reason'), dataIndex: 'reasonMessage', key: 'reasonMessage', render: (_v: unknown, record: typeof riskBrief.attributionDrivers[0]) => t(record.reasonMessage) },
                    ]}
                  />
                </Card>
              )}

              {/* SKU Health Signals (deterministic MVP) */}
              {riskBrief.skuHealthSignals.length > 0 && (
                <Card
                  title={t('results.riskBrief.healthSignalsTitle', { count: riskBrief.skuHealthSignals.length })}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.healthSignalsSubtitle')}
                    </Text>
                  }
                >
                  <Table
                    dataSource={riskBrief.skuHealthSignals}
                    rowKey="skuId"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: t('results.sku'), dataIndex: 'skuCode', key: 'skuCode', width: 140 },
                      { title: t('attr.dimension.customer'), dataIndex: 'customer', key: 'customer', width: 140 },
                      {
                        title: t('results.riskBrief.classification'),
                        dataIndex: 'classification',
                        key: 'classification',
                        width: 160,
                        render: (c: string) => {
                          const colorMap: Record<string, string> = {
                            strategicGrowth: 'geekblue',
                            cashCow: 'green',
                            capacityDrainer: 'orange',
                            lowValueHighLoad: 'red',
                            watchList: 'default',
                            dataIncomplete: 'volcano',
                          };
                          return <Tag color={colorMap[c] ?? 'default'}>{t(`health.${c}`)}</Tag>;
                        },
                      },
                      {
                        title: t('results.riskBrief.revenueShare'),
                        dataIndex: 'revenueShare',
                        key: 'revenueShare',
                        width: 120,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.pressureShare'),
                        dataIndex: 'capacityPressureShare',
                        key: 'capacityPressureShare',
                        width: 130,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.reason'),
                        dataIndex: 'reasonMessages',
                        key: 'reasonMessages',
                        render: (_v: unknown, record: typeof riskBrief.skuHealthSignals[0]) => record.reasonMessages.map((m) => t(m)).join(' '),
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Overall Contribution Drivers */}
              {riskBrief.drivers.length > 0 && (
                <Card
                  title={t('results.riskBrief.contributionTitle')}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.contributionSubtitle')}
                    </Text>
                  }
                >
                  <Tabs
                    size="small"
                    items={riskBrief.drivers.map((dg) => ({
                      key: dg.metric,
                      label: t(dg.titleMessage),
                      children: (
                        <Table
                          dataSource={dg.items}
                          rowKey="label"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: t('results.riskBrief.driver'), dataIndex: 'label', key: 'label', width: 180 },
                            {
                              title: t('results.riskBrief.value'),
                              dataIndex: 'value',
                              key: 'value',
                              width: 120,
                              align: 'right',
                              render: (v: number) => dg.metric === 'revenue' ? formatCurrency(v, currencySettings) : v.toLocaleString(),
                            },
                            {
                              title: t('results.riskBrief.share'),
                              dataIndex: 'share',
                              key: 'share',
                              width: 80,
                              align: 'right',
                              render: (v: number | undefined) => v !== undefined ? `${v.toFixed(1)}%` : '-',
                            },
                            { title: t('results.riskBrief.reason'), dataIndex: 'reasonMessage', key: 'reasonMessage', render: (_v: unknown, record: typeof dg.items[0]) => t(record.reasonMessage) },
                          ]}
                        />
                      ),
                    }))}
                  />
                </Card>
              )}

              {/* BP Risk */}
              {riskBrief.bpRisk?.statement && (
                <Card title={t('results.riskBrief.bpRiskTitle')} bordered={false} size="small">
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={t(riskBrief.bpRisk.statement.titleMessage)}
                    description={t(riskBrief.bpRisk.statement.detailMessage)}
                  />
                </Card>
              )}

              {/* Data Confidence & Caveats */}
              <Card title={t('results.riskBrief.dataConfidenceTitle')} bordered={false} size="small">
                <div style={{ marginBottom: 12 }}>
                  <Tag
                    color={
                      riskBrief.confidence === 'high' ? 'green' :
                      riskBrief.confidence === 'medium' ? 'orange' :
                      riskBrief.confidence === 'blocked' ? 'default' : 'red'
                    }
                  >
                    {riskBrief.confidence.toUpperCase()}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                    {t(riskBrief.confidenceExplanationMessage)}
                  </Text>
                </div>
                {riskBrief.dataCaveats.total > 0 && (
                  <Collapse
                    size="small"
                    items={[{
                      key: 'caveats',
                      label: t('results.riskBrief.caveatsCollapse', { shown: riskBrief.dataCaveats.top.length, total: riskBrief.dataCaveats.total }),
                      children: (
                        <List
                          size="small"
                          dataSource={riskBrief.dataCaveats.top}
                          renderItem={(issue) => (
                            <List.Item>
                              <Tag
                                color={
                                  issue.severity === 'error' ? 'red' :
                                  issue.severity === 'warning' ? 'orange' : 'blue'
                                }
                                style={{ marginRight: 8 }}
                              >
                                {issue.severity.toUpperCase()}
                              </Tag>
                              <Tag color="default" style={{ marginRight: 8 }}>{issue.domain}</Tag>
                              <Text strong>{t(issue.titleMessage)}</Text>
                              <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>{t(issue.detailMessage)}</Text>
                            </List.Item>
                          )}
                        />
                      ),
                    }]}
                  />
                )}
              </Card>

              {/* Assumptions */}
              <Card title={t('results.riskBrief.assumptionsTitle')} bordered={false} size="small">
                <List
                  dataSource={riskBrief.assumptions}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <InfoCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                      <Text strong>{t(item.titleMessage)}:</Text>
                      <Text type="secondary" style={{ marginLeft: 4 }}>{t(item.detailMessage)}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Role-Based Attention */}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.salesTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.salesMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.productPlanningTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.productPlanningMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.capacityTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.capacityMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.executiveTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.executiveMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Metric Glossaries */}
              <Card title={t('results.riskBrief.metricRegistryTitle')} size="small" bordered={false}>
                <Table
                  dataSource={METRIC_DEFINITIONS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: t('results.riskBrief.metricId'), dataIndex: 'id', key: 'id', width: 140 },
                    { title: t('results.riskBrief.formula'), dataIndex: 'formula', key: 'formula', width: 220, render: (v: string) => <code>{v}</code> },
                    { title: t('results.riskBrief.description'), dataIndex: 'definition', key: 'definition' },
                    { title: t('results.riskBrief.unit'), dataIndex: 'unit', key: 'unit', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                  ]}
                />
              </Card>
            </div>
          )}

          {/* Change Review View (Phase 6.1 Enhanced) */}
          {view === 'change' && (
            <div>
              {/* Snapshot Management Section */}
              <Card
                title={t('changeReview.snapshotsTitle')}
                bordered={false}
                size="small"
                extra={
                  <Button
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                    disabled={scope.role === 'viewer'}
                  >
                    {t('changeReview.createSnapshot')}
                  </Button>
                }
              >
                <Spin spinning={snapshotsLoading}>
                  {snapshots.length === 0 ? (
                    <Alert message={t('changeReview.noSnapshots')} type="info" showIcon />
                  ) : (
                    <Table
                      dataSource={snapshots}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: t('changeReview.snapshotName'),
                          dataIndex: 'name',
                          key: 'name',
                          render: (name: string, record: SnapshotListItem) => (
                            <Space direction="vertical" size={0}>
                              <Text strong>{name}</Text>
                              {record.description && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {record.description}
                                </Text>
                              )}
                            </Space>
                          ),
                        },
                        {
                          title: t('changeReview.snapshotDate'),
                          dataIndex: 'createdAt',
                          key: 'createdAt',
                          width: 140,
                          render: (date: Date) => new Date(date).toLocaleString(),
                        },
                        {
                          title: t('changeReview.snapshotCreatedBy'),
                          key: 'createdBy',
                          width: 100,
                          render: (_: unknown, record: SnapshotListItem) => (
                            <Text type="secondary">
                              {record.createdByName || t('changeReview.snapshotCreatedByUnknown')}
                            </Text>
                          ),
                        },
                        {
                          title: t('changeReview.snapshotVersion'),
                          dataIndex: 'sourceAppVersion',
                          key: 'version',
                          width: 80,
                          render: (v: string) => <Tag color="blue">{v}</Tag>,
                        },
                        {
                          title: t('changeReview.snapshotSummary'),
                          key: 'summary',
                          render: (_: unknown, record: SnapshotListItem) => (
                            <Space size="small" wrap>
                              <Tag>{t('changeReview.snapshotSkuCount')}: {record.derivedHighlights?.skuCount ?? 0}</Tag>
                              <Tag>{t('changeReview.revenue')}: {formatCurrency(record.derivedHighlights?.totalRevenueUsd ?? 0, currencySettings)}</Tag>
                              <Tag color={record.derivedHighlights?.shortageMonthCount ? 'orange' : 'green'}>
                                {t('changeReview.shortageMonths')}: {record.derivedHighlights?.shortageMonthCount ?? 0}
                              </Tag>
                            </Space>
                          ),
                        },
                        {
                          title: t('changeReview.actions'),
                          key: 'actions',
                          width: 60,
                          render: (_: unknown, record: SnapshotListItem) => (
                            <Popconfirm
                              title={t('changeReview.deleteConfirm')}
                              onConfirm={() => handleDeleteSnapshot(record)}
                              disabled={!canDeleteSnapshot(scope.role, record.createdBy, scope.userId)}
                            >
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={!canDeleteSnapshot(scope.role, record.createdBy, scope.userId)}
                              />
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  )}
                </Spin>
              </Card>

              {/* Compare Section */}
              <Card
                title={t('changeReview.compareTitle')}
                bordered={false}
                size="small"
                style={{ marginTop: 16 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {/* Compare Direction Hint */}
                  <Alert
                    message={t('changeReview.compareDirection')}
                    description={t('changeReview.compareDirectionDesc')}
                    type="info"
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                  <Row gutter={16}>
                    <Col span={10}>
                      <Text type="secondary">{t('changeReview.baseIsOld')}</Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder={t('changeReview.selectBaseHint')}
                        value={baseSnapshotId}
                        onChange={setBaseSnapshotId}
                        options={snapshots.map(s => ({ value: s.id, label: s.name }))}
                        allowClear
                      />
                    </Col>
                    <Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
                        <SwapOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Target − Base</Text>
                      </Space>
                    </Col>
                    <Col span={10}>
                      <Text type="secondary">{t('changeReview.targetIsNew')}</Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder={t('changeReview.selectTargetHint')}
                        value={targetSnapshotId}
                        onChange={setTargetSnapshotId}
                        options={snapshots.map(s => ({ value: s.id, label: s.name }))}
                        allowClear
                      />
                    </Col>
                  </Row>
                  {/* Same Snapshot Warning */}
                  {baseSnapshotId && targetSnapshotId && baseSnapshotId === targetSnapshotId && (
                    <Alert message={t('changeReview.sameSnapshotError')} type="error" showIcon />
                  )}
                  {/* Not Enough Snapshots Hint */}
                  {snapshots.length < 2 && (
                    <Alert message={t('changeReview.noSnapshotsToCompare')} type="warning" showIcon />
                  )}
                  <Button
                    type="primary"
                    onClick={handleCompareSnapshots}
                    loading={comparing}
                    disabled={!baseSnapshotId || !targetSnapshotId || baseSnapshotId === targetSnapshotId}
                  >
                    {t('changeReview.compareSnapshots')}
                  </Button>
                </Space>
              </Card>

              {/* Change Impact Results */}
              {changeImpact && (
                <div style={{ marginTop: 16 }}>
                  {/* Export Buttons */}
                  <Card size="small" bordered={false} style={{ marginBottom: 16 }}>
                    <Space>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopyChangeImpactPack}
                      >
                        {t('changeReview.copyPack')}
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadChangeImpactPack}
                      >
                        {t('changeReview.downloadPack')}
                      </Button>
                    </Space>
                  </Card>

                  {/* Attribution Disclaimer */}
                  <Alert
                    message={t('changeReview.attributionDisclaimer')}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  {/* Section 1: Revenue Impact */}
                  <Card
                    title={t('changeReview.revenueImpactTitle')}
                    bordered={false}
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {t('changeReview.revenueImpactDesc')}
                    </Text>
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={t('changeReview.baseValue')}
                          value={changeImpact.summary.revenueDelta.base ?? 0}
                          precision={0}
                          suffix="USD"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={t('changeReview.targetValue')}
                          value={changeImpact.summary.revenueDelta.target ?? 0}
                          precision={0}
                          suffix="USD"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={t('changeReview.deltaValue')}
                          value={changeImpact.summary.revenueDelta.delta ?? 0}
                          precision={0}
                          prefix={
                            (changeImpact.summary.revenueDelta.delta ?? 0) > 0
                              ? <ArrowUpOutlined style={{ color: '#52c41a' }} />
                              : (changeImpact.summary.revenueDelta.delta ?? 0) < 0
                                ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                                : <MinusOutlined />
                          }
                          suffix="USD"
                          valueStyle={{
                            color:
                              (changeImpact.summary.revenueDelta.delta ?? 0) > 0
                                ? '#52c41a'
                                : (changeImpact.summary.revenueDelta.delta ?? 0) < 0
                                  ? '#ff4d4f'
                                  : '#666',
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {(changeImpact.summary.revenueDelta.deltaPercent ?? 0).toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                  </Card>

                  {/* Section 2: BP Impact */}
                  <Card
                    title={t('changeReview.bpImpactTitle')}
                    bordered={false}
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {t('changeReview.bpImpactDesc')}
                    </Text>
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.baseValue')} BP %`}
                          value={(changeImpact.summary.bpAttainmentDelta.base ?? 0) * 100}
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.targetValue')} BP %`}
                          value={(changeImpact.summary.bpAttainmentDelta.target ?? 0) * 100}
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={t('changeReview.deltaValue')}
                          value={(changeImpact.summary.bpAttainmentDelta.delta ?? 0) * 100}
                          precision={1}
                          prefix={
                            (changeImpact.summary.bpAttainmentDelta.delta ?? 0) > 0
                              ? <ArrowUpOutlined style={{ color: '#52c41a' }} />
                              : (changeImpact.summary.bpAttainmentDelta.delta ?? 0) < 0
                                ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                                : <MinusOutlined />
                          }
                          suffix="pp"
                          valueStyle={{
                            color:
                              (changeImpact.summary.bpAttainmentDelta.delta ?? 0) > 0
                                ? '#52c41a'
                                : (changeImpact.summary.bpAttainmentDelta.delta ?? 0) < 0
                                  ? '#ff4d4f'
                                  : '#666',
                          }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 12 }}>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.baseValue')} BP Gap`}
                          value={changeImpact.summary.bpGapDelta.base ?? 0}
                          precision={1}
                          suffix="M TWD"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.targetValue')} BP Gap`}
                          value={changeImpact.summary.bpGapDelta.target ?? 0}
                          precision={1}
                          suffix="M TWD"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title="BP Gap Delta"
                          value={changeImpact.summary.bpGapDelta.delta ?? 0}
                          precision={1}
                          suffix="M TWD"
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* Section 3: Capacity Risk Impact */}
                  <Card
                    title={t('changeReview.capacityRiskImpactTitle')}
                    bordered={false}
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {t('changeReview.capacityRiskImpactDesc')}
                    </Text>
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.baseValue')} Shortage`}
                          value={changeImpact.summary.shortageMonthDelta.base ?? 0}
                          suffix={t('results.months')}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.targetValue')} Shortage`}
                          value={changeImpact.summary.shortageMonthDelta.target ?? 0}
                          suffix={t('results.months')}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={t('changeReview.deltaValue')}
                          value={changeImpact.summary.shortageMonthDelta.delta ?? 0}
                          prefix={
                            (changeImpact.summary.shortageMonthDelta.delta ?? 0) > 0
                              ? <ArrowUpOutlined style={{ color: '#ff4d4f' }} />
                              : (changeImpact.summary.shortageMonthDelta.delta ?? 0) < 0
                                ? <ArrowDownOutlined style={{ color: '#52c41a' }} />
                                : <MinusOutlined />
                          }
                          valueStyle={{
                            color:
                              (changeImpact.summary.shortageMonthDelta.delta ?? 0) > 0
                                ? '#ff4d4f'
                                : (changeImpact.summary.shortageMonthDelta.delta ?? 0) < 0
                                  ? '#52c41a'
                                  : '#666',
                          }}
                        />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 12 }}>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.baseValue')} Max Core Util`}
                          value={(changeImpact.summary.maxCoreUtilizationDelta.base ?? 0) * 100}
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title={`${t('changeReview.targetValue')} Max Core Util`}
                          value={(changeImpact.summary.maxCoreUtilizationDelta.target ?? 0) * 100}
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic
                          title="Max Core Util Delta"
                          value={(changeImpact.summary.maxCoreUtilizationDelta.delta ?? 0) * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{
                            color: Math.abs(changeImpact.summary.maxCoreUtilizationDelta.delta ?? 0) > 0.05 ? '#ff4d4f' : '#666',
                          }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  {/* Section 4: Price vs Quantity Attribution */}
                  <Card
                    size="small"
                    title={t('changeReview.priceQuantityTitle')}
                    bordered={false}
                    style={{ marginBottom: 16 }}
                  >
                    <Alert
                      message={t('changeReview.deepseekWarning.noCausal')}
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                    />
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title={t('changeReview.priceDriven')}
                          value={changeImpact.priceQuantityAttribution.priceDrivenDeltaUsd}
                          precision={0}
                          suffix="USD"
                        />
                        <Progress percent={changeImpact.priceQuantityAttribution.priceDrivenPercent} size="small" />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t('changeReview.quantityDriven')}
                          value={changeImpact.priceQuantityAttribution.quantityDrivenDeltaUsd}
                          precision={0}
                          suffix="USD"
                        />
                        <Progress percent={changeImpact.priceQuantityAttribution.quantityDrivenPercent} size="small" />
                      </Col>
                    </Row>
                  </Card>

                  {/* Section 5: Top Changes */}
                  <Card
                    title={t('changeReview.topChangesTitle')}
                    bordered={false}
                    size="small"
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                      {t('changeReview.topChangesDesc')}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                      {t('changeReview.sortByDeltaDesc')}
                    </Text>
                    <Collapse
                      size="small"
                      items={[
                        {
                          key: 'customers',
                          label: t('changeReview.topChangedCustomers'),
                          children: (
                            <Table
                              dataSource={changeImpact.topChangedCustomers}
                              rowKey="id"
                              pagination={false}
                              size="small"
                              columns={[
                                { title: t('changeReview.customer'), dataIndex: 'label', key: 'label' },
                                {
                                  title: t('changeReview.baseValue'),
                                  dataIndex: 'baseRevenueUsd',
                                  key: 'base',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.targetValue'),
                                  dataIndex: 'targetRevenueUsd',
                                  key: 'target',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.deltaValue'),
                                  dataIndex: 'revenueDeltaUsd',
                                  key: 'delta',
                                  render: (v: number) => (
                                    <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#666' }}>
                                      {v > 0 ? '+' : ''}${(v ?? 0).toLocaleString()}
                                    </Text>
                                  ),
                                },
                                {
                                  title: t('changeReview.deltaPercent'),
                                  dataIndex: 'revenueDeltaPercent',
                                  key: 'percent',
                                  render: (v: number) => (
                                    <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'}>
                                      {v > 0 ? '+' : ''}{(v ?? 0).toFixed(1)}%
                                    </Tag>
                                  ),
                                },
                              ]}
                            />
                          ),
                        },
                        {
                          key: 'skus',
                          label: t('changeReview.topChangedSkus'),
                          children: (
                            <Table
                              dataSource={changeImpact.topChangedSkus}
                              rowKey="id"
                              pagination={false}
                              size="small"
                              columns={[
                                { title: t('changeReview.sku'), dataIndex: 'label', key: 'label' },
                                {
                                  title: t('changeReview.baseValue'),
                                  dataIndex: 'baseRevenueUsd',
                                  key: 'base',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.targetValue'),
                                  dataIndex: 'targetRevenueUsd',
                                  key: 'target',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.deltaValue'),
                                  dataIndex: 'revenueDeltaUsd',
                                  key: 'delta',
                                  render: (v: number) => (
                                    <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#666' }}>
                                      {v > 0 ? '+' : ''}${(v ?? 0).toLocaleString()}
                                    </Text>
                                  ),
                                },
                                {
                                  title: t('changeReview.deltaPercent'),
                                  dataIndex: 'revenueDeltaPercent',
                                  key: 'percent',
                                  render: (v: number) => (
                                    <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'}>
                                      {v > 0 ? '+' : ''}{(v ?? 0).toFixed(1)}%
                                    </Tag>
                                  ),
                                },
                              ]}
                            />
                          ),
                        },
                        {
                          key: 'months',
                          label: t('changeReview.topChangedMonths'),
                          children: (
                            <Table
                              dataSource={changeImpact.topChangedMonths}
                              rowKey="id"
                              pagination={false}
                              size="small"
                              columns={[
                                { title: t('changeReview.month'), dataIndex: 'label', key: 'label' },
                                {
                                  title: t('changeReview.baseValue'),
                                  dataIndex: 'baseRevenueUsd',
                                  key: 'base',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.targetValue'),
                                  dataIndex: 'targetRevenueUsd',
                                  key: 'target',
                                  render: (v: number) => `$${(v ?? 0).toLocaleString()}`,
                                },
                                {
                                  title: t('changeReview.deltaValue'),
                                  dataIndex: 'revenueDeltaUsd',
                                  key: 'delta',
                                  render: (v: number) => (
                                    <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#666' }}>
                                      {v > 0 ? '+' : ''}${(v ?? 0).toLocaleString()}
                                    </Text>
                                  ),
                                },
                                {
                                  title: t('changeReview.deltaPercent'),
                                  dataIndex: 'revenueDeltaPercent',
                                  key: 'percent',
                                  render: (v: number) => (
                                    <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'}>
                                      {v > 0 ? '+' : ''}{(v ?? 0).toFixed(1)}%
                                    </Tag>
                                  ),
                                },
                              ]}
                            />
                          ),
                        },
                      ]}
                    />
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Create Snapshot Modal */}
          <Modal
            title={t('changeReview.createSnapshot')}
            open={createModalOpen}
            onOk={handleCreateSnapshot}
            onCancel={() => setCreateModalOpen(false)}
            confirmLoading={creating}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>{t('changeReview.snapshotNameLabel')}</Text>
              <Input
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder={t('changeReview.snapshotNamePlaceholder')}
              />
              <Text>{t('changeReview.snapshotDescLabel')}</Text>
              <Input.TextArea
                value={newSnapshotDesc}
                onChange={(e) => setNewSnapshotDesc(e.target.value)}
                placeholder={t('changeReview.snapshotDescPlaceholder')}
                rows={3}
              />
            </Space>
          </Modal>

          {/* Sales View */}
          {view === 'sales' && (
            <Tabs items={salesItems} size="small" />
          )}

          {/* Product Planning View */}
          {view === 'product' && (
            <Tabs items={productItems} size="small" />
          )}

          {/* Capacity Analysis View */}
          {view === 'capacity' && (
            <Tabs items={capacityItems} size="small" />
          )}

          {/* BP Analysis View */}
          {view === 'bp' && model && Object.keys(bpTargets).length > 0 && (
            <BpAnalysisPanel
              model={buildBpAnalysis(model.skuResults, skus, model.monthlySummaries, bpTargets, currencySettings)}
            />
          )}

          {view === 'bp' && (!model || Object.keys(bpTargets).length === 0) && (
            <Alert message={model ? t('bp.noTarget') : t('bp.noData')} type="info" showIcon />
          )}

          {/* Raw Detail */}
          {view === 'raw' && (
            <Tabs items={rawItems} size="small" />
          )}
        </>
      )}
    </div>
  );
};

export default CalculationResultsPage;
