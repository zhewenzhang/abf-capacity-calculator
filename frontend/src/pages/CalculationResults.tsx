import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Drawer,
} from 'antd';
import {
  WarningOutlined,
  CopyOutlined,
  DownloadOutlined,
  RobotOutlined,
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
import { PageLoading } from '../components/common';
import { buildBpAnalysis } from '../core/bpTargets';
import BpAnalysisPanel from '../components/analytics/BpAnalysisPanel';
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { buildAnalysisContractPayload } from '../core/analysisContract';
import { buildRiskBrief } from '../core/riskBrief';
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
import type { SnapshotListItem, SnapshotKind, SnapshotReviewStatus } from '../types/snapshot';
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
import {
  getKindColor,
  getReviewStatusColor,
  filterSnapshotsByKind,
  getRecommendedComparePair,
  getEffectiveKind,
  getEffectiveReviewStatus,
  getPeriodLabel,
  SNAPSHOT_FILTER_OPTIONS,
} from '../core/snapshotMetadata';
import { buildAiCopilotContext } from '../core/aiCopilotContext';
import CopilotChat from '../components/copilot/CopilotChat';

const { Text } = Typography;

interface CalculationResultsPageProps {
  scope: ProjectScope;
}

type ResultsView = 'risk' | 'change' | 'sales' | 'product' | 'capacity' | 'bp' | 'raw';

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
  const navigate = useNavigate();
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

  // Phase 6.2: Filter and metadata states
  const [snapshotFilter, setSnapshotFilter] = useState<SnapshotKind | 'all'>('all');
  const [newSnapshotKind, setNewSnapshotKind] = useState<SnapshotKind | undefined>(undefined);
  const [newSnapshotPeriodLabel, setNewSnapshotPeriodLabel] = useState('');
  const [newSnapshotReviewStatus, setNewSnapshotReviewStatus] = useState<SnapshotReviewStatus | undefined>(undefined);
  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [copilotDrawerOpen, setCopilotDrawerOpen] = useState(false);

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
  // v1.59.0: Risk Brief Executive Summary — computed data
  // ============================

  const planStatus = useMemo<{ status: 'executable' | 'atRisk' | 'blocked'; labelKey: string; color: string }>(() => {
    if (!model) {
      return { status: 'blocked', labelKey: 'results.riskBrief.planStatus.blocked', color: 'red' };
    }
    const maxUtil = Math.max(model.maxCoreUtil ?? 0, model.maxBuUtil ?? 0);
    const shortageCount = model.shortageMonthCount ?? 0;
    if (maxUtil >= 1.2 || shortageCount >= 6) {
      return { status: 'blocked', labelKey: 'results.riskBrief.planStatus.blocked', color: 'red' };
    }
    let lowestBpAttainment = 1;
    if (bpAnalysisModel) {
      for (const yr of bpAnalysisModel.yearly) {
        if (yr.attainment !== null && yr.attainment < lowestBpAttainment) {
          lowestBpAttainment = yr.attainment;
        }
      }
    }
    const confidence = riskBrief?.confidence ?? 'low';
    if (maxUtil >= 0.9 || lowestBpAttainment < 0.9 || confidence !== 'high') {
      return { status: 'atRisk', labelKey: 'results.riskBrief.planStatus.atRisk', color: 'orange' };
    }
    return { status: 'executable', labelKey: 'results.riskBrief.planStatus.executable', color: 'green' };
  }, [model, bpAnalysisModel, riskBrief]);

  const decisionKpis = useMemo(() => {
    const maxCoreUtil = model?.maxCoreUtil ?? 0;
    const maxBuUtil = model?.maxBuUtil ?? 0;
    const maxUtilPct = Math.max(maxCoreUtil, maxBuUtil) * 100;
    const isBuHigher = maxBuUtil > maxCoreUtil;
    const shortageCount = model?.shortageMonthCount ?? 0;
    const shortageMonths = riskBrief?.shortageMonths ?? [];
    const shortageRange = shortageMonths.length >= 2
      ? `${shortageMonths[0]} → ${shortageMonths[shortageMonths.length - 1]}`
      : shortageMonths.length === 1 ? shortageMonths[0] : '';
    let lowestAttainment: number | null = null;
    let lowestYear = '';
    if (bpAnalysisModel) {
      for (const yr of bpAnalysisModel.yearly) {
        if (yr.attainment !== null && (lowestAttainment === null || yr.attainment < lowestAttainment)) {
          lowestAttainment = yr.attainment;
          lowestYear = yr.period;
        }
      }
    }
    return {
      maxBottleneckPct: maxUtilPct,
      maxBottleneckLabel: isBuHigher ? 'BU' : 'Core',
      maxBottleneckPeriod: model?.worstMonth ?? '',
      shortageMonths: shortageCount,
      shortageRange,
      lowestBpAttainment: lowestAttainment,
      lowestBpYear: lowestYear,
    };
  }, [model, riskBrief, bpAnalysisModel]);

  const findings = useMemo(() => {
    const items: Array<{
      severity: 'critical' | 'warning' | 'info';
      domain: string;
      title: string;
      detail: string;
      actions: Array<{ label: string; onClick: () => void }>;
    }> = [];
    if (riskBrief && riskBrief.topRiskPeriods.length > 0) {
      const w = riskBrief.topRiskPeriods[0];
      items.push({
        severity: w.severity === 'red' ? 'critical' : w.severity === 'orange' ? 'warning' : 'info',
        domain: t('results.riskBrief.domain.capacity'),
        title: `${w.period} ${w.bottleneck} ${t('results.riskBrief.domain.capacity')}`,
        detail: t(w.reasonMessage),
        actions: [
          { label: t('results.riskBrief.action.viewCapacity'), onClick: () => setView('capacity') },
          { label: t('results.riskBrief.action.runScenario'), onClick: () => navigate('/scenario') },
        ],
      });
    }
    if (riskBrief?.bpRisk?.statement) {
      const gapStr = riskBrief.bpRisk.gapMillionTwd !== null ? `${riskBrief.bpRisk.gapMillionTwd.toFixed(1)} M NTD` : '';
      items.push({
        severity: 'critical',
        domain: t('results.riskBrief.domain.bp'),
        title: t(riskBrief.bpRisk.statement.titleMessage),
        detail: gapStr,
        actions: [
          { label: t('results.riskBrief.action.viewBp'), onClick: () => setView('bp') },
        ],
      });
    }
    if (riskBrief && riskBrief.dataCaveats.total > 0) {
      items.push({
        severity: 'warning',
        domain: t('results.riskBrief.domain.data'),
        title: `${riskBrief.dataCaveats.total} ${t('results.riskBrief.dataConfidence')}`,
        detail: riskBrief.dataCaveats.top[0] ? t(riskBrief.dataCaveats.top[0].titleMessage) : '',
        actions: [],
      });
    }
    if (riskBrief && riskBrief.skuHealthSignals.length > 0) {
      items.push({
        severity: 'info',
        domain: t('results.riskBrief.domain.product'),
        title: riskBrief.skuHealthSignals[0].skuCode,
        detail: riskBrief.skuHealthSignals[0].reasonMessages.map(m => t(m)).join(' '),
        actions: [],
      });
    }
    if (analysisPayload && analysisPayload.keyFindings.length > 0) {
      for (const kf of analysisPayload.keyFindings.slice(0, 2)) {
        if (items.length >= 5) break;
        items.push({
          severity: kf.severity === 'critical' ? 'critical' : kf.severity === 'warning' ? 'warning' : 'info',
          domain: t(`keyFindings.source.${kf.source}`),
          title: t(kf.titleMessage),
          detail: t(kf.detailMessage),
          actions: [],
        });
      }
    }
    return items.slice(0, 5);
  }, [riskBrief, analysisPayload, t, setView, navigate]);

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

      // Build optional metadata (Phase 6.2)
      const metadata = {
        kind: newSnapshotKind,
        periodLabel: newSnapshotPeriodLabel.trim() || undefined,
        reviewStatus: newSnapshotReviewStatus,
        note: newSnapshotNote.trim() || undefined,
      };
      // Only include metadata if at least one field is set
      const hasMetadata = metadata.kind || metadata.periodLabel || metadata.reviewStatus || metadata.note;

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
          metadata: hasMetadata ? metadata : undefined,
        }
      );

      message.success(t('changeReview.snapshotCreated'));
      setCreateModalOpen(false);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
      // Reset metadata fields
      setNewSnapshotKind(undefined);
      setNewSnapshotPeriodLabel('');
      setNewSnapshotReviewStatus(undefined);
      setNewSnapshotNote('');
      loadSnapshots();
    } catch (e: any) {
      message.error(t('changeReview.snapshotCreateFailed') + ': ' + e.message);
    } finally {
      setCreating(false);
    }
  }, [scope, newSnapshotName, newSnapshotDesc, newSnapshotKind, newSnapshotPeriodLabel, newSnapshotReviewStatus, newSnapshotNote, model, params, skus, forecasts, capacityPlans, bpAnalysisModel, loadSnapshots, t]);

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

  // Phase 6.2: Filtered snapshots
  const filteredSnapshots = useMemo(() => {
    return filterSnapshotsByKind(snapshots, snapshotFilter);
  }, [snapshots, snapshotFilter]);

  // AI Copilot context
  const copilotContext = useMemo(() => {
    if (!model || !params) return null;
    return buildAiCopilotContext(skus, forecasts, capacityPlans, params, model, bpAnalysisModel, scope.role);
  }, [model, params, skus, forecasts, capacityPlans, bpAnalysisModel, scope.role]);

  // Phase 6.2: Recommended compare pair
  const recommendedPair = useMemo(() => {
    return getRecommendedComparePair(snapshots);
  }, [snapshots]);

  // Apply recommended pair handler
  const handleApplyRecommended = useCallback(() => {
    if (recommendedPair.baseId && recommendedPair.targetId) {
      setBaseSnapshotId(recommendedPair.baseId);
      setTargetSnapshotId(recommendedPair.targetId);
    }
  }, [recommendedPair]);

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
    return <PageLoading />;
  }

  return (
    <div className="twk-page">
      {/* Page Header — Designbyte */}
      <div className="twk-page-header">
        <h2 className="twk-page-title">{t('results.title')}</h2>
        <p className="twk-page-subtitle">{t('results.description')}</p>
      </div>

      {error && (
        <div className="twk-alert twk-alert--error" style={{ marginBottom: 16 }}>
          <WarningOutlined />
          <span>{error}</span>
        </div>
      )}
      {!error && model && (
        <>
          {/* Summary KPIs — Designbyte KPI Cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <div className="twk-kpi">
                <div className="twk-kpi-label">{t('results.totalRevenue')}</div>
                <div className="twk-kpi-value">
                  {model.totalRevenue?.toFixed(currencySettings.displayCurrency === 'USD' ? 2 : 0) ?? '-'}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="twk-kpi">
                <div className="twk-kpi-label">{t('results.totalForecastPcs')}</div>
                <div className="twk-kpi-value">{model.totalForecastPcs?.toLocaleString() ?? '-'}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="twk-kpi">
                <div className="twk-kpi-label">{t('results.calculationRows')}</div>
                <div className="twk-kpi-value">{model.skuResults.length}</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="twk-kpi">
                <div className="twk-kpi-label">{t('results.shortageMonthCount')}</div>
                <div className="twk-kpi-value" style={{ color: model.shortageMonthCount > 0 ? 'var(--twk-error)' : 'var(--twk-success)' }}>
                  {model.shortageMonthCount}
                </div>
              </div>
            </Col>
          </Row>

          {/* View selector + AI Copilot button — Designbyte Toolbar */}
          <div className="twk-toolbar" style={{ marginBottom: 16 }}>
            <div className="twk-toolbar-group">
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
              />
            </div>
            <div className="twk-toolbar-group">
              {copilotContext && (
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => setCopilotDrawerOpen(true)}
                >
                  {t('copilot.title')}
                </Button>
              )}
            </div>
          </div>

          {/* AI Copilot Drawer */}
          <Drawer
            title={
              <Space>
                <RobotOutlined />
                <span>{t('copilot.title')}</span>
              </Space>
            }
            open={copilotDrawerOpen}
            onClose={() => setCopilotDrawerOpen(false)}
            width={480}
            destroyOnClose
          >
            {copilotContext && <CopilotChat context={copilotContext} />}
          </Drawer>

          {/* Risk Brief View — v1.59.0 Executive Summary Redesign */}
          {view === 'risk' && riskBrief && analysisPayload && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* ================================================================
                  1. Executive Conclusion Card
                  ================================================================ */}
              <div className="twk-card" style={{ borderLeft: "4px solid " + (planStatus.color === 'red' ? '#dc2626' : planStatus.color === 'orange' ? '#f59e0b' : '#15803d') }}>
                <div className="twk-card-header">
                  <Space>
                    <span className="twk-card-title">{t('results.riskBrief.executiveConclusion')}</span>
                    <Tag color={planStatus.color} style={{ fontSize: 12, padding: '2px 10px' }}>
                      {t(planStatus.labelKey)}
                    </Tag>
                  </Space>
                </div>
                <div className="twk-card-body">
                  <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {(() => {
                      const parts = [];
                      const maxUtil = Math.max(model?.maxCoreUtil ?? 0, model?.maxBuUtil ?? 0) * 100;
                      if (maxUtil >= 90) {
                        const isBu = (model?.maxBuUtil ?? 0) > (model?.maxCoreUtil ?? 0);
                        const label = isBu ? 'BU' : 'Core';
                        const period = decisionKpis.maxBottleneckPeriod;
                        parts.push(t('results.riskBrief.domain.capacity') + ' ' + label + ' ' + maxUtil.toFixed(1) + '%' + (period ? ' (' + period + ')' : ''));
                      }
                      if (decisionKpis.lowestBpAttainment !== null && decisionKpis.lowestBpAttainment < 0.9) {
                        const yr = decisionKpis.lowestBpYear;
                        parts.push('BP ' + yr + ' ' + t('results.riskBrief.lowestBpAttainment').replace(' :', '') + ' ' + (decisionKpis.lowestBpAttainment * 100).toFixed(1) + '%');
                      }
                      if (decisionKpis.shortageMonths > 0) {
                        parts.push(t('results.riskBrief.shortageMonths').replace(' :', '') + ' ' + decisionKpis.shortageMonths.toString());
                      }
                      if (parts.length === 0) {
                        return t('results.riskBrief.planStatus.executable') + ' - ' + t('results.keyFindings.subtitle');
                      }
                      return t('results.riskBrief.domain.capacity') + ' ' + parts.join('; ');
                    })()}
                  </Text>
                </div>
              </div>

              {/* ================================================================
                  2. Decision KPI Row
                  ================================================================ */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                  <div className="twk-card" style={{ height: '100%', textAlign: 'center', padding: '16px 12px' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('results.riskBrief.maxBottleneck')}</Text>
                    <Text strong style={{ fontSize: 22, color: decisionKpis.maxBottleneckPct >= 100 ? '#dc2626' : decisionKpis.maxBottleneckPct >= 90 ? '#f59e0b' : undefined }}>
                      {decisionKpis.maxBottleneckLabel} {decisionKpis.maxBottleneckPct.toFixed(1)}%
                    </Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{decisionKpis.maxBottleneckPeriod}</Text></div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="twk-card" style={{ height: '100%', textAlign: 'center', padding: '16px 12px' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('results.riskBrief.shortageMonths')}</Text>
                    <Text strong style={{ fontSize: 22, color: decisionKpis.shortageMonths > 0 ? '#dc2626' : undefined }}>
                      {decisionKpis.shortageMonths}
                    </Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{decisionKpis.shortageRange}</Text></div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="twk-card" style={{ height: '100%', textAlign: 'center', padding: '16px 12px' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('results.riskBrief.lowestBpAttainment')}</Text>
                    <Text strong style={{ fontSize: 22, color: decisionKpis.lowestBpAttainment !== null && decisionKpis.lowestBpAttainment < 0.9 ? '#dc2626' : decisionKpis.lowestBpAttainment !== null && decisionKpis.lowestBpAttainment < 1 ? '#f59e0b' : undefined }}>
                      {decisionKpis.lowestBpAttainment !== null ? (decisionKpis.lowestBpAttainment * 100).toFixed(1) + '%' : '-'}
                    </Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{decisionKpis.lowestBpYear}</Text></div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="twk-card" style={{ height: '100%', textAlign: 'center', padding: '16px 12px' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('results.riskBrief.dataConfidence')}</Text>
                    <Tag color={riskBrief?.confidence === 'high' ? 'green' : riskBrief?.confidence === 'medium' ? 'orange' : 'red'} style={{ fontSize: 16, padding: '2px 16px', marginTop: 4 }}>
                      {riskBrief?.confidence ? riskBrief.confidence.toUpperCase() : '-'}
                    </Tag>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{t('results.riskBrief.affectsDataConfidence')}</Text></div>
                  </div>
                </Col>
              </Row>

              {/* ================================================================
                  3. Key Findings (max 5)
                  ================================================================ */}
              <div className="twk-card" style={{ marginBottom: 16 }}>
                <div className="twk-card-header">
                  <span className="twk-card-title">{t('results.keyFindings.title')}</span>
                </div>
                <div className="twk-card-body">
                  {findings.length === 0 ? (
                    <Text type="secondary">{t('results.riskBrief.keyFindings.empty')}</Text>
                  ) : (
                    findings.slice(0, 5).map((f, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        marginBottom: idx < Math.min(findings.length, 5) - 1 ? 8 : 0,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                      }}>
                        <Space style={{ marginBottom: 6 }}>
                          <Tag color={f.severity === 'critical' ? 'red' : f.severity === 'warning' ? 'orange' : 'blue'}>
                            {t('keyFindings.severity.' + f.severity)}
                          </Tag>
                          <Tag color="default">{f.domain}</Tag>
                        </Space>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>{f.detail}</Text>
                        {f.actions.length > 0 && (
                          <Space>
                            {f.actions.map((action, ai) => (
                              <Button key={ai} size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={action.onClick}>
                                {action.label}
                              </Button>
                            ))}
                          </Space>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ================================================================
                  4. AI Analysis Tools — collapsed by default
                  ================================================================ */}
              <Collapse size="small" style={{ marginBottom: 16 }}
                items={[{
                  key: 'aiTools',
                  label: <Space><RobotOutlined /><span>{t('aiBriefExport.title')}</span></Space>,
                  children: (
                    <div>
                      <Space wrap style={{ marginBottom: 12 }}>
                        <Button type="primary" icon={<CopyOutlined />} onClick={async () => {
                          if (!analysisPayload) return;
                          const pack = buildCombinedAiBriefPack(analysisPayload);
                          const success = await copyToClipboard(pack);
                          message.success(success ? t('aiBriefExport.copied') : t('aiBriefExport.copyFailed'));
                        }}>
                          {t('aiBriefExport.copyPack')}
                        </Button>
                        <Button icon={<CopyOutlined />} onClick={async () => {
                          if (!analysisPayload) return;
                          const sanitized = buildSanitizedAnalysisContract(analysisPayload);
                          const prompt = buildChineseAiBriefPrompt(sanitized);
                          const success = await copyToClipboard(prompt);
                          message.success(success ? t('aiBriefExport.copied') : t('aiBriefExport.copyFailed'));
                        }}>
                          {t('aiBriefExport.copyPrompt')}
                        </Button>
                        <Button icon={<CopyOutlined />} onClick={async () => {
                          if (!analysisPayload) return;
                          const sanitized = buildSanitizedAnalysisContract(analysisPayload);
                          const json = JSON.stringify(sanitized, null, 2);
                          const success = await copyToClipboard(json);
                          message.success(success ? t('aiBriefExport.copied') : t('aiBriefExport.copyFailed'));
                        }}>
                          {t('aiBriefExport.copyJson')}
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={() => {
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
                        }}>
                          {t('aiBriefExport.downloadJson')}
                        </Button>
                      </Space>
                    </div>
                  ),
                }]}
              />

              {/* ================================================================
                  5. BP Gap Attribution — collapsed by default (top 3 only)
                  ================================================================ */}
              {analysisPayload.bpAttribution.topDrivers.length > 0 && (
                <Collapse size="small" style={{ marginBottom: 16 }}
                  items={[{
                    key: 'bpAttr',
                    label: <span>{t('results.riskBrief.bpAttribution')} (Top {Math.min(analysisPayload.bpAttribution.topDrivers.length, 3)})</span>,
                    children: (
                      <Table size="small" pagination={false}
                        dataSource={analysisPayload.bpAttribution.topDrivers.slice(0, 3)}
                        rowKey={(r) => r.dimension + '-' + r.label + '-' + r.period}
                        columns={[
                          { title: t('results.bpAttr.period'), dataIndex: 'period', key: 'period', width: 120 },
                          { title: t('results.bpAttr.dimension'), dataIndex: 'dimension', key: 'dimension', width: 130, render: (v) => t('attr.dimension.' + v) },
                          { title: t('results.bpAttr.driver'), dataIndex: 'label', key: 'label', width: 220 },
                          { title: t('results.bpAttr.shareOfGap'), dataIndex: 'shareOfGap', key: 'shareOfGap', width: 110, align: 'right', render: (v) => v.toFixed(1) + '%' },
                          { title: t('results.bpAttr.gapContribution'), dataIndex: 'gapContributionMillionTwd', key: 'gapContributionMillionTwd', width: 160, align: 'right', render: (v) => v.toFixed(1) + ' M TWD' },
                        ]}
                      />
                    ),
                  }]}
                />
              )}

              {/* ================================================================
                  6. Price Impact — collapsed by default
                  ================================================================ */}
              {analysisPayload.priceImpact.scenarios.length > 0 && (
                <Collapse size="small" style={{ marginBottom: 16 }}
                  items={[{
                    key: 'priceImpact',
                    label: <span>{t('results.riskBrief.priceImpact')}</span>,
                    children: (
                      <Tabs size="small"
                        items={analysisPayload.priceImpact.scenarios.map((sc) => ({
                          key: sc.scenarioId,
                          label: (sc.priceDeltaPct > 0 ? '+' : '') + (sc.priceDeltaPct * 100).toFixed(0) + '%',
                          children: (
                            <Table size="small" pagination={false} dataSource={sc.yearly} rowKey="year"
                              columns={[
                                { title: t('results.priceImpact.year'), dataIndex: 'year', key: 'year', width: 100 },
                                { title: t('results.priceImpact.baseRevenue'), dataIndex: 'baseRevenueMillionTwd', key: 'baseRevenueMillionTwd', width: 150, align: 'right', render: (v) => v.toFixed(1) + ' M TWD' },
                                { title: t('results.priceImpact.scenarioRevenue'), dataIndex: 'scenarioRevenueMillionTwd', key: 'scenarioRevenueMillionTwd', width: 150, align: 'right', render: (v) => v.toFixed(1) + ' M TWD' },
                                { title: t('results.priceImpact.revenueDelta'), dataIndex: 'revenueDeltaMillionTwd', key: 'revenueDeltaMillionTwd', width: 160, align: 'right', render: (v) => <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'} style={{ margin: 0 }}>{(v > 0 ? '+' : '') + v.toFixed(1) + ' M TWD'}</Tag> },
                              ]}
                            />
                          ),
                        }))}
                      />
                    ),
                  }]}
                />
              )}

              {/* ================================================================
                  7. Capacity Improvement Impact — collapsed by default
                  ================================================================ */}
              {analysisPayload.capacityImpact.scenarios.length > 0 && (
                <Collapse size="small" style={{ marginBottom: 16 }}
                  items={[{
                    key: 'capacityImpact',
                    label: <span>{t('results.riskBrief.capacityImpact')}</span>,
                    children: (
                      <Table size="small" pagination={false} dataSource={analysisPayload.capacityImpact.scenarios} rowKey="scenarioId"
                        columns={[
                          { title: t('results.capacityImpact.scenario'), dataIndex: 'scenarioId', key: 'scenarioId', width: 220, render: (v) => t('results.capacityImpact.scenarioName.' + v) },
                          { title: t('results.capacityImpact.shortageBefore'), dataIndex: 'shortageMonthsBefore', key: 'shortageMonthsBefore', width: 140, align: 'right' },
                          { title: t('results.capacityImpact.shortageAfter'), dataIndex: 'shortageMonthsAfter', key: 'shortageMonthsAfter', width: 140, align: 'right', render: (v, r) => <Tag color={v < r.shortageMonthsBefore ? 'green' : 'default'} style={{ margin: 0 }}>{v}</Tag> },
                        ]}
                      />
                    ),
                  }]}
                />
              )}
            </div>
          )}

          {/* Change Review View (Phase 6.2 Enhanced) */}
          {view === 'change' && (
            <div>
              {/* Viewer read-only warning */}
              {scope.role === 'viewer' && (
                <Alert
                  message={t('common.readOnlyMode')}
                  description={t('common.readOnlyDesc')}
                  type="info"
                  showIcon
                  className="abf-alert-section"
                />
              )}
              {/* Snapshot Management Section */}
              <Card
                title={t('changeReview.versionHistoryTitle')}
                bordered={false}
                size="small"
                extra={
                  <Space>
                    {/* Phase 6.2: Filter */}
                    <Select
                      value={snapshotFilter}
                      onChange={setSnapshotFilter}
                      style={{ width: 150 }}
                      options={SNAPSHOT_FILTER_OPTIONS.map(opt => ({
                        value: opt.value,
                        label: t(`changeReview.filter${opt.value === 'all' ? 'All' : opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}`),
                      }))}
                    />
                    <Button
                      type="primary"
                      icon={<CameraOutlined />}
                      onClick={() => setCreateModalOpen(true)}
                      disabled={scope.role === 'viewer'}
                    >
                      {t('changeReview.createNewVersion')}
                    </Button>
                  </Space>
                }
              >
                <Spin spinning={snapshotsLoading}>
                  {snapshots.length === 0 ? (
                    <Alert message={t('changeReview.noVersions')} type="info" showIcon />
                  ) : (
                    <Table
                      dataSource={filteredSnapshots}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: t('changeReview.versionName'),
                          dataIndex: 'name',
                          key: 'name',
                          render: (name: string, record: SnapshotListItem) => (
                            <Space direction="vertical" size={0}>
                              <Space size={4}>
                                <Text strong>{name}</Text>
                                {/* Phase 6.2: Kind tag */}
                                <Tag color={getKindColor(getEffectiveKind(record))}>
                                  {t(`versionKind.${getEffectiveKind(record) ?? 'general'}`)}
                                </Tag>
                                {/* Phase 6.2: Review status tag */}
                                <Tag color={getReviewStatusColor(getEffectiveReviewStatus(record))}>
                                  {t(`reviewStatus.${getEffectiveReviewStatus(record)}`)}
                                </Tag>
                              </Space>
                              {/* Phase 6.2: Period label */}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {getPeriodLabel(record)}
                              </Text>
                              {record.metadata?.note && (
                                <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                                  {record.metadata.note}
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
                  {/* Phase 6.2: Recommended Compare Pair */}
                  {recommendedPair.baseId && recommendedPair.targetId && (
                    <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                      <Space>
                        <Text strong>{t('changeReview.recommendedPair')}:</Text>
                        <Text>
                          {snapshots.find(s => s.id === recommendedPair.baseId)?.name}
                          {' → '}
                          {snapshots.find(s => s.id === recommendedPair.targetId)?.name}
                        </Text>
                        <Text type="secondary">({t(`changeReview.recommendedReason.${recommendedPair.reasonKey}`)})</Text>
                        <Button
                          size="small"
                          type="link"
                          onClick={handleApplyRecommended}
                        >
                          {t('changeReview.applyRecommended')}
                        </Button>
                      </Space>
                    </Card>
                  )}
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
                          title={t('changeReview.bpGapDelta')}
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
                          title={t('changeReview.maxCoreUtilDelta')}
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

          {/* Create Snapshot Modal (Phase 6.2 Enhanced) */}
          <Modal
            title={t('changeReview.createNewVersion')}
            open={createModalOpen}
            onOk={handleCreateSnapshot}
            onCancel={() => setCreateModalOpen(false)}
            confirmLoading={creating}
            width={520}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Version Name */}
              <div>
                <Text>{t('changeReview.versionName')} *</Text>
                <Input
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  placeholder={t('changeReview.snapshotNamePlaceholder')}
                  style={{ marginTop: 4 }}
                />
              </div>
              {/* Version Type (Phase 6.2) */}
              <div>
                <Text type="secondary">{t('changeReview.versionType')}</Text>
                <Select
                  style={{ width: '100%', marginTop: 4 }}
                  value={newSnapshotKind}
                  onChange={setNewSnapshotKind}
                  placeholder={t('changeReview.versionTypePlaceholder')}
                  allowClear
                  options={[
                    { value: 'working', label: t('versionKind.working') },
                    { value: 'bpBaseline', label: t('versionKind.bpBaseline') },
                    { value: 'customerUpdate', label: t('versionKind.customerUpdate') },
                    { value: 'capacityReview', label: t('versionKind.capacityReview') },
                    { value: 'scenario', label: t('versionKind.scenario') },
                    { value: 'archive', label: t('versionKind.archive') },
                  ]}
                />
              </div>
              {/* Period Label (Phase 6.2) */}
              <div>
                <Text type="secondary">{t('changeReview.periodLabel')}</Text>
                <Input
                  value={newSnapshotPeriodLabel}
                  onChange={(e) => setNewSnapshotPeriodLabel(e.target.value)}
                  placeholder={t('changeReview.periodLabelPlaceholder')}
                  style={{ marginTop: 4 }}
                />
              </div>
              {/* Review Status (Phase 6.2) */}
              <div>
                <Text type="secondary">{t('changeReview.reviewStatus')}</Text>
                <Select
                  style={{ width: '100%', marginTop: 4 }}
                  value={newSnapshotReviewStatus}
                  onChange={setNewSnapshotReviewStatus}
                  placeholder={t('changeReview.reviewStatusPlaceholder')}
                  allowClear
                  options={[
                    { value: 'draft', label: t('reviewStatus.draft') },
                    { value: 'reviewed', label: t('reviewStatus.reviewed') },
                    { value: 'locked', label: t('reviewStatus.locked') },
                    { value: 'archived', label: t('reviewStatus.archived') },
                  ]}
                />
              </div>
              {/* Description */}
              <div>
                <Text type="secondary">{t('changeReview.snapshotDescLabel')}</Text>
                <Input.TextArea
                  value={newSnapshotDesc}
                  onChange={(e) => setNewSnapshotDesc(e.target.value)}
                  placeholder={t('changeReview.snapshotDescPlaceholder')}
                  rows={2}
                  style={{ marginTop: 4 }}
                />
              </div>
              {/* Note (Phase 6.2) */}
              <div>
                <Text type="secondary">{t('changeReview.note')}</Text>
                <Input.TextArea
                  value={newSnapshotNote}
                  onChange={(e) => setNewSnapshotNote(e.target.value)}
                  placeholder={t('changeReview.notePlaceholder')}
                  rows={2}
                  style={{ marginTop: 4 }}
                />
              </div>
              {/* Immutable Warning (Phase 6.2) */}
              <Alert
                message={t('changeReview.immutableWarning')}
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
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
