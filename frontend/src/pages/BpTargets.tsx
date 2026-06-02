import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, message, Alert, Space, InputNumber, Typography } from 'antd';
import { SaveOutlined, UndoOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, floatColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getParameters, saveParameters } from '../services/parameterService';
import { getForecasts } from '../services/forecastService';
import { getSKUs } from '../services/skuService';
import type { ProjectScope, Forecast, SKU, ProjectParameters } from '../types';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { PageLoading, ActionBar, DataQualityAlert } from '../components/common';
import { buildDataQualitySummary } from '../core/dataQuality';
import { filterIssuesByDomain } from '../core/dataQualityVisibility';
import { normalizeCurrencySettings } from '../core/currency';
import {
  buildVisibleYears,
  buildBpSheetRows,
  rowsToBpTargetRecord,
  validateYearInput,
  type BpSheetRow,
} from '../core/bpTargetsHelpers';

const { Text } = Typography;

interface BpTargetsProps {
  scope: ProjectScope;
}

const BpTargetsPage: React.FC<BpTargetsProps> = ({ scope }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BpSheetRow[]>([]);
  const [savedRecord, setSavedRecord] = useState<Record<string, number>>({});
  const [visibleYears, setVisibleYears] = useState<string[]>([]);

  // DQ visibility
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);

  // Insert year input
  const [insertYearValue, setInsertYearValue] = useState<number | null>(null);

  const writable = canEdit(scope.role);

  // ---------- Rebuild rows from record + years ----------
  const rebuildRows = useCallback((record: Record<string, number>, years: string[], paramsData: ProjectParameters) => {
    const currencySettings = normalizeCurrencySettings(paramsData.currencySettings);
    const sheetRows = buildBpSheetRows(record, {
      targetTwd: t('bpTargets.targetTwd'),
      targetCny: t('bpTargets.targetCny'),
      targetUsd: t('bpTargets.targetUsd'),
      yoyGrowth: t('bpTargets.yoyGrowth'),
    }, currencySettings, years);
    return sheetRows;
  }, [t]);

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
      const years = buildVisibleYears(bpRecord);
      setVisibleYears(years);

      const sheetRows = rebuildRows(bpRecord, years, paramData);
      setRows(sheetRows);
      setSavedRecord({ ...bpRecord });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load BP targets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scope, rebuildRows]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- DQ Visibility ----------
  const dqSummary = useMemo(() => {
    if (!params || skus.length === 0) return null;
    return buildDataQualitySummary({ skus, forecasts, capacityPlans: [], params });
  }, [skus, forecasts, params]);

  const bpDqIssues = useMemo(() => {
    if (!dqSummary) return [];
    return filterIssuesByDomain(dqSummary, 'bp');
  }, [dqSummary]);

  // ---------- Dirty check ----------
  const isDirty = useMemo(() => {
    const twdRow = rows.find((r) => r.metricType === 'targetTwd');
    if (!twdRow) return false;
    for (const year of visibleYears) {
      const current = twdRow[year];
      const saved = savedRecord[year];
      const currentNum = current === null || current === undefined || String(current).trim() === '' ? null : Number(current);
      const savedNum = saved === undefined || saved === null ? null : saved;
      if (currentNum !== savedNum) return true;
    }
    return false;
  }, [rows, savedRecord, visibleYears]);

  // ---------- Cell styling for dirty highlight ----------
  const cellClassName = useCallback(({ rowData, columnId }: { rowData: unknown; columnId?: string }) => {
    if (!columnId || columnId === 'metric') return '';
    const row = rowData as BpSheetRow;
    // Only highlight dirty on TWD row
    if (row.metricType !== 'targetTwd') return 'read-only-row';
    const savedVal = savedRecord[columnId];
    const currentVal = row[columnId];
    const savedNum = savedVal === undefined || savedVal === null ? null : savedVal;
    const currentNum = currentVal === null || currentVal === undefined || String(currentVal).trim() === '' ? null : Number(currentVal);
    if (savedNum !== currentNum) return 'dirty-cell';
    return '';
  }, [savedRecord]);

  // ---------- onChange: only allow edits on TWD row ----------
  const handleRowsChange = useCallback((newRows: BpSheetRow[]) => {
    if (!writable) return;

    // Find which row changed
    const oldTwd = rows.find((r) => r.metricType === 'targetTwd');
    const newTwd = newRows.find((r) => r.metricType === 'targetTwd');
    if (!oldTwd || !newTwd) return;

    // Check if TWD row actually changed
    let twdChanged = false;
    for (const year of visibleYears) {
      if (oldTwd[year] !== newTwd[year]) {
        twdChanged = true;
        break;
      }
    }

    if (!twdChanged) return; // Ignore changes to derived rows

    // Rebuild derived rows from the new TWD values
    const updatedRecord: Record<string, number> = {};
    for (const year of visibleYears) {
      const val = newTwd[year];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        updatedRecord[year] = Number(val);
      }
    }

    if (!params) return;
    const newRows2 = rebuildRows(updatedRecord, visibleYears, params);
    setRows(newRows2);
  }, [writable, rows, visibleYears, params, rebuildRows]);

  // ---------- Year controls ----------
  const handleAddPrevYear = useCallback(() => {
    if (!writable || visibleYears.length === 0) return;
    const minYear = Math.min(...visibleYears.map(Number));
    const newYear = String(minYear - 1);
    if (newYear < '2000') {
      message.error(t('bpTargets.invalidYearError'));
      return;
    }
    const newYears = [newYear, ...visibleYears];
    setVisibleYears(newYears);
    if (params) {
      const bpRecord = params.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      setRows(rebuildRows(bpRecord, newYears, params));
    }
  }, [writable, visibleYears, params, rebuildRows, t]);

  const handleAddNextYear = useCallback(() => {
    if (!writable || visibleYears.length === 0) return;
    const maxYear = Math.max(...visibleYears.map(Number));
    const newYear = String(maxYear + 1);
    if (newYear > '2100') {
      message.error(t('bpTargets.invalidYearError'));
      return;
    }
    const newYears = [...visibleYears, newYear];
    setVisibleYears(newYears);
    if (params) {
      const bpRecord = params.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      setRows(rebuildRows(bpRecord, newYears, params));
    }
  }, [writable, visibleYears, params, rebuildRows, t]);

  const handleInsertYear = useCallback(() => {
    if (!writable || insertYearValue === null) return;
    const yearStr = String(insertYearValue);
    const validationError = validateYearInput(yearStr);
    if (validationError) {
      message.error(t('bpTargets.invalidYearError'));
      return;
    }
    if (visibleYears.includes(yearStr)) {
      message.error(t('bpTargets.yearExistsError', { year: yearStr }));
      return;
    }
    const newYears = [...visibleYears, yearStr].sort();
    setVisibleYears(newYears);
    if (params) {
      const bpRecord = params.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      setRows(rebuildRows(bpRecord, newYears, params));
    }
    setInsertYearValue(null);
  }, [writable, insertYearValue, visibleYears, params, rebuildRows, t]);

  // ---------- Save & Discard ----------
  const handleSave = async () => {
    if (!isDirty) {
      message.info(t('bpTargets.noChanges'));
      return;
    }
    setSaving(true);
    try {
      const record = rowsToBpTargetRecord(rows, visibleYears);
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
      setSavedRecord({ ...record });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
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
    if (!params) return;
    const years = buildVisibleYears(savedRecord);
    setVisibleYears(years);
    setRows(rebuildRows(savedRecord, years, params));
    message.info(t('bpTargets.discardSuccess'));
  };

  // ---------- Columns definition ----------
  const columns = useMemo(() => {
    const yearCols = visibleYears.map((yearStr) =>
      keyColumn<BpSheetRow, any>(yearStr, {
        ...floatColumn,
        title: yearStr,
        basis: 100,
        grow: 0,
        shrink: 0,
      } as any)
    );

    return [
      keyColumn<BpSheetRow, 'metric'>('metric', {
        ...textColumn,
        title: t('bpTargets.metric'),
        basis: 200,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      ...yearCols,
    ];
  }, [t, visibleYears]);

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

      {/* DQ Alert */}
      {bpDqIssues.length > 0 && (
        <DataQualityAlert issues={bpDqIssues} severityFilter={['warning']} maxIssues={3} />
      )}

      {/* Hint */}
      <Alert
        message={t('bpTargets.hint')}
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
      />

      {/* Year controls */}
      {writable && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button size="small" icon={<MinusOutlined />} onClick={handleAddPrevYear}>
            {t('bpTargets.addPrevYear')}
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddNextYear}>
            {t('bpTargets.addNextYear')}
          </Button>
          <Space size={4}>
            <InputNumber
              size="small"
              min={2000}
              max={2100}
              precision={0}
              value={insertYearValue}
              onChange={(v) => setInsertYearValue(v)}
              placeholder={t('bpTargets.insertYearPlaceholder')}
              style={{ width: 140 }}
            />
            <Button
              size="small"
              onClick={handleInsertYear}
              disabled={insertYearValue === null}
            >
              {t('bpTargets.insertYear')}
            </Button>
          </Space>
        </div>
      )}

      {/* Toolbar */}
      <ActionBar info={<Text type="secondary" style={{ fontSize: 12 }}>{t('bpTargets.hint')}</Text>}>
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

      {/* Grid */}
      <div className="stable-spreadsheet-shell" style={{ marginTop: 16 }}>
        <DataSheetGrid<BpSheetRow>
          value={rows}
          onChange={handleRowsChange}
          columns={columns}
          rowHeight={36}
          height={36 * 4 + 36} // 4 rows + header
          lockRows={true}
          cellClassName={cellClassName}
        />
      </div>
    </div>
  );
};

export default BpTargetsPage;
