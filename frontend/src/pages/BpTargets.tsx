import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, message, Alert, Tooltip, Popover, InputNumber, Space, Typography } from 'antd';
import { SaveOutlined, UndoOutlined, WarningOutlined, CheckOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, floatColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getParameters, saveParameters } from '../services/parameterService';
import { getForecasts } from '../services/forecastService';
import { getSKUs } from '../services/skuService';
import type { ProjectScope, Forecast, SKU, ProjectParameters } from '../types';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { PageLoading, ActionBar, UnitText, DataQualityAlert } from '../components/common';
import { buildDataQualitySummary } from '../core/dataQuality';
import { filterIssuesByDomain, findIssueByYear } from '../core/dataQualityVisibility';
import {
  recordToRows,
  rowsToRecord,
  START_YEAR,
  END_YEAR,
  type BpSheetRow,
} from '../core/bpTargetsHelpers';

interface BpTargetsProps {
  scope: ProjectScope;
}

const BpTargetsPage: React.FC<BpTargetsProps> = ({ scope }) => {
  const { t } = useI18n();
  const { Text } = Typography;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BpSheetRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<BpSheetRow[]>([]);

  // DQ visibility - additional data
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);

  const writable = canEdit(scope.role);

  // v1.36.0 - BP Target Quick Fix state
  const [quickFixYear, setQuickFixYear] = useState<string | null>(null);
  const [quickFixValue, setQuickFixValue] = useState<number | null>(null);
  const [quickFixSaving, setQuickFixSaving] = useState(false);

  // ---------- Load parameters ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paramData, fcData, skuData] = await Promise.all([
        getParameters(scope),
        getForecasts(scope).catch(() => [] as Forecast[]),
        getSKUs(scope).catch(() => [] as SKU[]),
      ]);
      setParams(paramData);
      setForecasts(fcData);
      setSkus(skuData);

      const bpRecord = paramData.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      const sheetRows = recordToRows(bpRecord, t('bpTargets.targetCol'));

      setRows(JSON.parse(JSON.stringify(sheetRows)));
      setSavedSnapshot(JSON.parse(JSON.stringify(sheetRows)));
    } catch (e: any) {
      setError(e.message || 'Failed to load BP targets');
    } finally {
      setLoading(false);
    }
  }, [scope, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- DQ Visibility ----------
  const dqSummary = useMemo(() => {
    if (!params || skus.length === 0) return null;
    return buildDataQualitySummary({
      skus,
      forecasts,
      capacityPlans: [],
      params,
    });
  }, [skus, forecasts, params]);

  const bpDqIssues = useMemo(() => {
    if (!dqSummary) return [];
    return filterIssuesByDomain(dqSummary, 'bp');
  }, [dqSummary]);

  // Build a map of year -> DQ issue for cell-level indicators
  const yearDqIssueMap = useMemo(() => {
    const map = new Map<string, { type: 'zero-forecast' | 'missing-target'; issue: NonNullable<ReturnType<typeof findIssueByYear>> }>();
    for (let y = START_YEAR; y <= END_YEAR; y++) {
      const zeroFcIssue = findIssueByYear(bpDqIssues, String(y), 'bp-target-zero-forecast');
      if (zeroFcIssue) {
        map.set(String(y), { type: 'zero-forecast', issue: zeroFcIssue });
        continue;
      }
      const missingTargetIssue = findIssueByYear(bpDqIssues, String(y), 'forecast-missing-bp-target');
      if (missingTargetIssue) {
        map.set(String(y), { type: 'missing-target', issue: missingTargetIssue });
      }
    }
    return map;
  }, [bpDqIssues]);

  // ---------- Dirty check ----------
  const isDirty = useMemo(() => {
    if (rows.length === 0 || savedSnapshot.length === 0) return false;
    const r = rows[0];
    const s = savedSnapshot[0];
    for (let y = START_YEAR; y <= END_YEAR; y++) {
      const key = String(y);
      if (r[key] !== s[key]) {
        return true;
      }
    }
    return false;
  }, [rows, savedSnapshot]);

  // ---------- Cell styling for dirty highlight ----------
  const cellClassName = useCallback(({ rowData, columnId }: any) => {
    if (columnId === 'metric') return '';
    const y = columnId;
    if (savedSnapshot.length > 0) {
      const savedVal = savedSnapshot[0][y];
      const currentVal = rowData[y];
      if (savedVal !== currentVal) {
        return 'dirty-cell';
      }
    }
    return '';
  }, [savedSnapshot]);

  // v1.36.0 - BP Target Quick Fix handlers (defined before columns to avoid hoisting issue)
  const handleQuickFixOpen = useCallback((year: string) => {
    if (!writable) return;
    setQuickFixYear(year);
    setQuickFixValue(null);
  }, [writable]);

  const handleQuickFixClose = useCallback(() => {
    setQuickFixYear(null);
    setQuickFixValue(null);
  }, []);

  const handleQuickFixSave = useCallback(async () => {
    if (!quickFixYear || quickFixValue === null || !writable) return;

    // Validate: must be >= 0
    if (quickFixValue < 0) {
      message.error(t('remediation.validation.bpTargetMin'));
      return;
    }

    setQuickFixSaving(true);
    try {
      const latestParams = await getParameters(scope);
      const currentTargets = latestParams.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      const updatedTargets = {
        ...currentTargets,
        [quickFixYear]: quickFixValue,
      };

      await saveParameters(scope, {
        ...latestParams,
        bpTargets: {
          mode: 'yearly' as const,
          yearlyRevenueTargetsMillionTwd: updatedTargets,
        },
      });

      message.success(t('remediation.bpTarget.saved'));
      handleQuickFixClose();
      loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setQuickFixSaving(false);
    }
  }, [quickFixYear, quickFixValue, writable, scope, t, handleQuickFixClose]);

  // ---------- Columns definition ----------
  const columns = useMemo(() => {
    const yearCols = [];
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const yearStr = String(year);
      const dqInfo = yearDqIssueMap.get(yearStr);

      // v1.36.0 - Quick Fix Popover for missing BP target
      const quickFixPopover = dqInfo?.type === 'missing-target' && writable ? (
        <Popover
          open={quickFixYear === yearStr}
          onOpenChange={(open) => open ? handleQuickFixOpen(yearStr) : handleQuickFixClose()}
          trigger="click"
          placement="bottom"
          content={
            <div style={{ width: 200 }}>
              <div style={{ marginBottom: 8 }}>
                <Text>{t('remediation.bpTarget.enterValue')}</Text>
              </div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <InputNumber
                  min={0}
                  step={1}
                  precision={0}
                  value={quickFixValue}
                  onChange={(v) => setQuickFixValue(v)}
                  placeholder="Million TWD"
                  style={{ width: '100%' }}
                  addonAfter="M TWD"
                />
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={handleQuickFixSave}
                    loading={quickFixSaving}
                    disabled={quickFixValue === null || quickFixValue < 0}
                  >
                    {t('remediation.confirmFix')}
                  </Button>
                  <Button size="small" onClick={handleQuickFixClose}>
                    {t('common.cancel')}
                  </Button>
                </Space>
              </Space>
            </div>
          }
        >
          <WarningOutlined
            style={{ color: '#faad14', marginLeft: 4, fontSize: 12, cursor: 'pointer' }}
            onClick={(e) => e.stopPropagation()}
          />
        </Popover>
      ) : dqInfo ? (
        <Tooltip title={t(dqInfo.issue.detailMessage.key, dqInfo.issue.detailMessage.params as Record<string, string | number>)}>
          <WarningOutlined style={{ color: writable ? '#faad14' : '#faad14', marginLeft: 4, fontSize: 12, cursor: writable ? 'pointer' : 'not-allowed' }} />
        </Tooltip>
      ) : null;

      yearCols.push(
        keyColumn<BpSheetRow, any>(yearStr, {
          ...floatColumn,
          title: (
            <span>
              {yearStr}
              {quickFixPopover}
            </span>
          ),
          basis: 110,
          grow: 0,
          shrink: 0,
          disabled: !writable,
        } as any)
      );
    }

    return [
      keyColumn<BpSheetRow, 'metric'>('metric', {
        ...textColumn,
        title: t('bpTargets.metric'),
        basis: 220,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      ...yearCols,
    ];
  }, [t, writable, yearDqIssueMap, quickFixYear, quickFixValue, quickFixSaving]);

  // ---------- Save & Discard handlers ----------
  const handleSave = async () => {
    if (!isDirty) {
      message.info(t('bpTargets.noChanges'));
      return;
    }

    setSaving(true);
    try {
      const record = rowsToRecord(rows);
      
      // 先获取最新的 parameters 文档，防止意外覆盖其他配置
      const latestParams = await getParameters(scope);
      const nextParams = {
        ...latestParams,
        bpTargets: {
          mode: 'yearly' as const,
          yearlyRevenueTargetsMillionTwd: record,
        },
      };

      await saveParameters(scope, nextParams);
      message.success(t('bpTargets.saveSuccess'));
      
      // 更新备份快照
      setSavedSnapshot(JSON.parse(JSON.stringify(rows)));
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.startsWith('NEGATIVE_VALUE:')) {
        const year = msg.split(':')[1];
        message.error(t('bpTargets.negativeValueError', { year }));
      } else if (msg.startsWith('INVALID_VALUE:')) {
        const year = msg.split(':')[1];
        message.error(t('bpTargets.invalidValueError', { year }));
      } else {
        message.error(msg || 'Failed to save BP targets');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRows(JSON.parse(JSON.stringify(savedSnapshot)));
    message.info(t('bpTargets.discardSuccess'));
  };

  const handleRowsChange = (newRows: BpSheetRow[]) => {
    // Viewer True Read-only: 如果是只读用户，直接拦截变更
    if (!writable) return;
    setRows(newRows);
  };

  // ---------- Render ----------
  if (loading) return <PageLoading />;
  if (error) return <Alert message={error} type="error" showIcon style={{ margin: 16 }} />;

  return (
    <div className="twk-page">
      {/* Viewer read-only warning */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('common.readOnlyDesc')}
          type="info"
          showIcon
          className="abf-alert-page"
        />
      )}

      {/* DQ Alert for BP-domain issues */}
      {bpDqIssues.length > 0 && (
        <DataQualityAlert
          issues={bpDqIssues}
          severityFilter={['warning']}
          maxIssues={3}
        />
      )}

      {/* Toolbar / Actions */}
      <ActionBar info={<><UnitText parentheses={false}>Million TWD</UnitText> • {t('parameters.bpTargetsNote')}</>}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          disabled={!writable || !isDirty}
        >
          {t('common.save')}
        </Button>
        <Button
          icon={<UndoOutlined />}
          onClick={handleDiscard}
          disabled={!writable || !isDirty || saving}
        >
          {t('common.discard')}
        </Button>
      </ActionBar>

      {/* Grid — stable shell handles border/radius/scroll */}
      <div className="stable-spreadsheet-shell" style={{ marginTop: 16 }}>
        <DataSheetGrid<BpSheetRow>
          value={rows}
          onChange={handleRowsChange}
          columns={columns}
          rowHeight={36}
          height={144}
          lockRows={true}
          cellClassName={cellClassName}
        />
      </div>
    </div>
  );
};

export default BpTargetsPage;
