import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, message, Alert, Card, Row, Col, Tag, Typography, Select } from 'antd';
import { SaveOutlined, UndoOutlined, ExperimentOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, intColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getSKUs } from '../services/skuService';
import { getForecasts, batchSaveForecasts, deleteForecast } from '../services/forecastService';
import type { SKU, Forecast, ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { ExperimentalBanner, EmptyState, PageLoading } from '../components/common';
import PageShell from '../components/layout/PageShell';

const { Text } = Typography;

// --- Types ---

interface ForecastSheetRow {
  skuId: string;
  skuCode: string;
  customer: string;
  [month: string]: string | number;  // 'jan' | 'feb' | ... | 'dec' as numbers
}

// Month keys for a single year
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
type MonthKey = typeof MONTH_KEYS[number];

// Convert month index (1-12) to month key
function monthIndexToKey(idx: number): MonthKey {
  return MONTH_KEYS[idx - 1];
}

// Convert month key to month index (1-12)
function monthKeyToIndex(key: MonthKey): number {
  return MONTH_KEYS.indexOf(key) + 1;
}

// Build month string from year and month key
function buildMonthString(year: number, key: MonthKey): string {
  const idx = monthKeyToIndex(key);
  return `${year}-${String(idx).padStart(2, '0')}`;
}

// Parse month string to year and month key
function parseMonthString(month: string): { year: number; key: MonthKey } | null {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const idx = parseInt(match[2], 10);
  if (idx < 1 || idx > 12) return null;
  return { year, key: monthIndexToKey(idx) };
}

// Available years (2026-2040)
const AVAILABLE_YEARS = Array.from({ length: 15 }, (_, i) => 2026 + i);

// Dirty key helper
function dirtyKey(skuId: string, monthKey: MonthKey): string {
  return `${skuId}||${monthKey}`;
}

// Compute dirty set
function computeDirty(
  rows: ForecastSheetRow[],
  saved: ForecastSheetRow[]
): Set<string> {
  const dirty = new Set<string>();
  rows.forEach((row, idx) => {
    const savedRow = saved[idx];
    if (!savedRow) return;
    for (const monthKey of MONTH_KEYS) {
      if (row[monthKey] !== savedRow[monthKey]) {
        dirty.add(dirtyKey(row.skuId, monthKey));
      }
    }
  });
  return dirty;
}

interface ForecastsSpreadsheetLabProps {
  scope: ProjectScope;
}

const ForecastsSpreadsheetLab: React.FC<ForecastsSpreadsheetLabProps> = ({ scope }) => {
  const writable = canEdit(scope.role);
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Year selector
  const currentYear = new Date().getFullYear();
  const defaultYear = AVAILABLE_YEARS.includes(currentYear) ? currentYear : 2026;
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  // Data
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [rows, setRows] = useState<ForecastSheetRow[]>([]);

  // Saved snapshot for discard
  const savedRowsRef = useRef<ForecastSheetRow[]>([]);

  // Dirty tracking
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());

  // ---------- Load data ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skuData, forecastData] = await Promise.all([
        getSKUs(scope),
        getForecasts(scope),
      ]);
      setSkus(skuData);
      setForecasts(forecastData);

      // Build rows for selected year
      const newRows: ForecastSheetRow[] = skuData.map((sku) => {
        const row: ForecastSheetRow = {
          skuId: sku.id,
          skuCode: sku.skuCode,
          customer: sku.customer || '',
        };
        // Initialize all months to 0
        for (const monthKey of MONTH_KEYS) {
          row[monthKey] = 0;
        }
        return row;
      });

      // Fill in existing forecast data for selected year
      for (const fc of forecastData) {
        const parsed = parseMonthString(fc.month);
        if (!parsed || parsed.year !== selectedYear) continue;
        const rowIdx = newRows.findIndex((r) => r.skuId === fc.skuId);
        if (rowIdx >= 0) {
          newRows[rowIdx][parsed.key] = fc.forecastPcs || 0;
        }
      }

      setRows(newRows);
      savedRowsRef.current = newRows.map((r) => ({ ...r }));
      setDirtySet(new Set());
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [scope, selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- Recompute dirty set ----------
  useEffect(() => {
    const dirty = computeDirty(rows, savedRowsRef.current);
    setDirtySet(dirty);
  }, [rows]);

  // ---------- Build columns ----------
  const columns = useMemo(() => {
    return [
      keyColumn<ForecastSheetRow, 'skuCode'>('skuCode', {
        ...textColumn,
        title: t('forecasts.skuCode'),
        basis: 100,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      keyColumn<ForecastSheetRow, 'customer'>('customer', {
        ...textColumn,
        title: t('forecasts.customer'),
        basis: 100,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      ...MONTH_KEYS.map((monthKey) =>
        keyColumn<ForecastSheetRow, any>(monthKey as any, {
          ...intColumn,
          title: t(`forecastsLab.months.${monthKey}`),
          basis: 70,
          grow: 0,
          shrink: 0,
          minWidth: 60,
          disabled: !writable,
        } as any)
      ),
    ];
  }, [t, writable]);

  // ---------- Row change handler ----------
  const handleRowsChange = useCallback((newRows: ForecastSheetRow[]) => {
    // Guard: Prevent state changes for viewers
    if (!writable) return;
    setRows(newRows);
  }, [writable]);

  // ---------- Save ----------
  const handleSave = async () => {
    if (dirtySet.size === 0) {
      message.info(t('capacityLab.noChanges'));
      return;
    }

    // Build forecast updates and deletions
    const updates: Array<Omit<Forecast, 'id'> & { id?: string }> = [];
    const deletions: string[] = []; // forecast IDs to delete

    for (const k of dirtySet) {
      const [skuId, monthKey] = k.split('||') as [string, MonthKey];
      const row = rows.find((r) => r.skuId === skuId);
      if (!row) continue;

      const value = row[monthKey];
      const pcs = typeof value === 'number' ? value : parseInt(String(value), 10) || 0;

      if (pcs < 0) {
        message.error(t('forecastsLab.negativeValueError'));
        return;
      }

      const month = buildMonthString(selectedYear, monthKey);

      // Find existing forecast for this skuId + month
      const existing = forecasts.find((f) => f.skuId === skuId && f.month === month);

      // Find SKU for price fallback
      const sku = skus.find((s) => s.id === skuId);

      if (pcs === 0) {
        // If value is 0 and there's an existing forecast, delete it
        if (existing?.id) {
          deletions.push(existing.id);
        }
        // If no existing forecast, nothing to do (skip)
        continue;
      }

      // Determine unit price with proper fallback chain:
      // 1. Existing forecast price (if available)
      // 2. SKU price (if available)
      // 3. Fallback to 0 with a warning (SKU might be missing price data)
      let unitPrice = 0;
      let unitPriceCurrency: 'USD' | 'TWD' | 'CNY' = 'USD';

      if (existing?.unitPrice !== undefined && existing.unitPrice !== 0) {
        // Priority 1: Use existing forecast price
        unitPrice = existing.unitPrice;
        unitPriceCurrency = existing.unitPriceCurrency || 'USD';
      } else if (sku?.unitPrice !== undefined && sku.unitPrice !== 0) {
        // Priority 2: Use SKU price
        unitPrice = sku.unitPrice;
        unitPriceCurrency = sku.unitPriceCurrency || 'USD';
      }
      // Priority 3: Fallback to 0 (price data missing)
      // Note: This means the SKU has no price configured. The forecast will be saved with 0 price.
      // Users should update the SKU price or manually edit the forecast price in the Forecasts page.

      updates.push({
        id: existing?.id,
        skuId,
        month,
        forecastPcs: pcs,
        unitPrice,
        unitPriceCurrency,
      });
    }

    if (updates.length === 0 && deletions.length === 0) {
      message.info(t('forecastsLab.noValidChanges'));
      return;
    }

    try {
      // Save updates first
      if (updates.length > 0) {
        await batchSaveForecasts(scope, updates);
      }
      // Then delete forecasts with 0 value
      for (const forecastId of deletions) {
        await deleteForecast(scope, forecastId);
      }

      const savedCount = updates.length;
      const deletedCount = deletions.length;
      if (deletedCount > 0) {
        message.success(t('forecastsLab.savedWithDeletes', { count: savedCount, deleted: deletedCount }));
      } else {
        message.success(t('forecastsLab.saved', { count: savedCount }));
      }
      await loadData();
    } catch (e: any) {
      message.error(e.message || t('capacityLab.failedToSave'));
    }
  };

  // ---------- Discard ----------
  const handleDiscard = () => {
    setRows(savedRowsRef.current.map((r) => ({ ...r })));
    setDirtySet(new Set());
    message.info(t('capacityLab.changesDiscarded'));
  };

  // ---------- Cell class name ----------
  const cellClassName = useCallback(
    (opt: { rowData: unknown; rowIndex: number; columnId?: string }) => {
      const row = opt.rowData as ForecastSheetRow;
      if (!row?.skuId) return '';
      const monthKey = opt.columnId as MonthKey | undefined;
      if (!monthKey || !MONTH_KEYS.includes(monthKey)) return '';
      return dirtySet.has(dirtyKey(row.skuId, monthKey)) ? 'dirty-cell' : '';
    },
    [dirtySet]
  );

  // ---------- Grid height ----------
  const gridHeight = useMemo(() => {
    if (typeof window === 'undefined') return 600;
    return Math.max(300, window.innerHeight - 280);
  }, []);

  // ---------- Render ----------
  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <Alert message={error} type="error" showIcon style={{ margin: 16 }} />;
  }

  if (skus.length === 0) {
    return (
      <EmptyState
        title={t('forecastsLab.noSkus')}
        description={t('forecastsLab.noSkusDesc')}
      />
    );
  }

  return (
    <PageShell variant="wide">
      {/* Experimental banner */}
      <ExperimentalBanner
        label={t('forecastsLab.experiment')}
        description={t('forecastsLab.experimentalDesc')}
      />

      {/* Toolbar */}
      <Card size="small" className="toolbar-card">
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <Tag color="orange">
              <ExperimentOutlined /> {t('forecastsLab.experiment')}
            </Tag>
          </Col>
          <Col>
            <Text>{t('forecastsLab.year')}:</Text>
          </Col>
          <Col>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 100 }}
              options={AVAILABLE_YEARS.map((y) => ({ value: y, label: String(y) }))}
            />
          </Col>
          <Col>
            <Button
              icon={<SaveOutlined />}
              type="primary"
              onClick={handleSave}
              disabled={!writable || dirtySet.size === 0}
            >
              {t('capacityLab.saveAll')} ({dirtySet.size})
            </Button>
          </Col>
          <Col>
            <Button
              icon={<UndoOutlined />}
              onClick={handleDiscard}
              disabled={dirtySet.size === 0}
            >
              {t('capacityLab.discard')}
            </Button>
          </Col>
          <Col flex="auto" />
          <Col>
            <Text type="secondary" className="abf-text-nowrap" style={{ fontSize: 12 }}>
              {skus.length} SKUs &middot; {selectedYear}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Info alert */}
      <Alert
        message={t('forecastsLab.infoTitle')}
        description={t('forecastsLab.infoDesc')}
        type="info"
        showIcon
        className="abf-alert-section"
        style={{ fontSize: 12 }}
      />

      {/* Dirty alert */}
      {dirtySet.size > 0 && (
        <Alert
          message={t('forecastsLab.dirtyCells', { count: dirtySet.size })}
          type="warning"
          showIcon
          className="abf-alert-section"
          style={{ fontSize: 12 }}
        />
      )}

      {/* Read-only warning for viewers */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('common.readOnlyDesc')}
          type="info"
          showIcon
          className="abf-alert-section"
        />
      )}

      {/* Data grid */}
      <div className="stable-spreadsheet-shell">
        <DataSheetGrid<ForecastSheetRow>
          value={rows}
          onChange={handleRowsChange}
          columns={columns}
          rowHeight={32}
          height={gridHeight}
          lockRows={true}
          cellClassName={cellClassName}
        />
      </div>
    </PageShell>
  );
};

export default ForecastsSpreadsheetLab;
