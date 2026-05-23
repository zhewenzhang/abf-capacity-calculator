import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  InputNumber,
  Space,
  message,
  Alert,
  Card,
  Row,
  Col,
  Popconfirm,
  Select,
  Modal,
  Form,
  Tag,
  Typography,
  Switch,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  ThunderboltOutlined,
  ClearOutlined,
  SyncOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { getForecasts, batchSaveForecasts, deleteForecast } from '../services/forecastService';
import { getSKUs } from '../services/skuService';
import type { Forecast, SKU } from '../types';
import { useI18n } from '../i18n';
import { buildYearlyGrowthForecasts } from '../core/forecastGrowth';

const { Text } = Typography;

interface ForecastsPageProps {
  userId: string;
  projectId: string;
}

// --- Period helpers ---

type ViewMode = 'month' | 'quarter' | 'year';

// Parse "2026-01" → { year: 2026, month: 1 }
function parseMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return { year: y, month: mo };
}

// Get quarter string from month: "2026-Q1"
function toQuarter(m: string): string {
  const { year, month } = parseMonth(m);
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

// Get year string from month: "2026"
function toYear(m: string): string {
  return String(parseMonth(m).year);
}

// Get months that belong to a quarter: "2026-Q1" → ["2026-01","2026-02","2026-03"]
function quarterMonths(q: string): string[] {
  const [yStr, qStr] = q.split('-Q');
  const y = parseInt(yStr, 10);
  const qNum = parseInt(qStr, 10);
  const startM = (qNum - 1) * 3 + 1;
  return [startM, startM + 1, startM + 2].map(m => `${y}-${String(m).padStart(2, '0')}`);
}

// Get months that belong to a year: "2026" → all 12 months
function yearMonths(y: string): string[] {
  const yNum = parseInt(y, 10);
  return Array.from({ length: 12 }, (_, i) => `${yNum}-${String(i + 1).padStart(2, '0')}`);
}

// Generate month range
function generateMonths(startYear: number, startMonth: number, count: number): string[] {
  const months: string[] = [];
  let y = startYear, m = startMonth;
  for (let i = 0; i < count; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// All months: 2026-01 to 2040-12 (180 months)
const ALL_MONTHS = generateMonths(2026, 1, 180);
// Default view: 2026-01 to 2030-12 (60 months)
const DEFAULT_MONTHS = generateMonths(2026, 1, 60);

// Derive quarters/years from a month list
function monthsToQuarters(months: string[]): string[] {
  const set = new Set<string>();
  months.forEach(m => set.add(toQuarter(m)));
  return Array.from(set).sort();
}
function monthsToYears(months: string[]): string[] {
  const set = new Set<string>();
  months.forEach(m => set.add(toYear(m)));
  return Array.from(set).sort();
}

const ForecastsPage: React.FC<ForecastsPageProps> = ({ userId, projectId }) => {
  const { t } = useI18n();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // editingCells stores RAW PCS values (not K)
  // key = "skuId-month", value = number (PCS)
  const [editingCells, setEditingCells] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Selection
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Batch modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchMode, setBatchMode] = useState<'set' | 'multiply' | 'growth'>('set');

  // Month view toggle
  const [showFullRange, setShowFullRange] = useState(false);
  const activeMonths = showFullRange ? ALL_MONTHS : DEFAULT_MONTHS;

  // View mode: month / quarter / year
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  // Whether editing is enabled for quarter/year views
  const [periodEditEnabled, setPeriodEditEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skuData, fcData] = await Promise.all([
        getSKUs(userId, projectId),
        getForecasts(userId, projectId),
      ]);
      setSkus(skuData);
      setForecasts(fcData);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [userId, projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build forecast lookup: skuId -> month -> Forecast
  const forecastMap = useMemo(() => {
    const map = new Map<string, Map<string, Forecast>>();
    for (const fc of forecasts) {
      if (!map.has(fc.skuId)) map.set(fc.skuId, new Map());
      map.get(fc.skuId)!.set(fc.month, fc);
    }
    return map;
  }, [forecasts]);

  // Get forecast value for a SKU+month (in PCS)
  const getFcValue = (skuId: string, month: string): number => {
    return forecastMap.get(skuId)?.get(month)?.forecastPcs ?? 0;
  };

  // Get forecast ID for a SKU+month
  const getFcId = (skuId: string, month: string): string | undefined => {
    return forecastMap.get(skuId)?.get(month)?.id;
  };

  // Aggregate monthly values to a period (quarter or year)
  const aggregatePeriod = useCallback(
    (skuId: string, period: string): number => {
      const months = viewMode === 'quarter' ? quarterMonths(period) : yearMonths(period);
      let total = 0;
      for (const m of months) {
        total += editingCells[`${skuId}::${m}`] ?? getFcValue(skuId, m);
      }
      return total;
    },
    [viewMode, editingCells, forecasts]
  );

  // Cell change handler: value is in PCS
  const handleCellChange = (skuId: string, month: string, value: number | null) => {
    const key = `${skuId}::${month}`;
    setEditingCells(prev => ({
      ...prev,
      [key]: value != null ? Math.round(value) : getFcValue(skuId, month),
    }));
  };

  // Save all edited cells
  const handleSaveAll = async () => {
    const changed = Object.entries(editingCells);
    if (changed.length === 0) {
      message.info(t('forecasts.noChanges'));
      return;
    }

    setSaving(true);
    try {
      const toSave: Array<Omit<Forecast, 'id'> & { id?: string }> = [];
      for (const [key, value] of changed) {
        const separatorIdx = key.indexOf('::');
        const skuId = key.substring(0, separatorIdx);
        const month = key.substring(separatorIdx + 2);
        const existingId = getFcId(skuId, month);
        const sku = skus.find(s => s.id === skuId);
        toSave.push({
          id: existingId,
          skuId,
          month,
          forecastPcs: value,
          unitPrice: sku?.unitPrice ?? 0,
          unitPriceCurrency: sku?.unitPriceCurrency ?? 'USD',
        });
      }

      // Batch save in chunks of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        await batchSaveForecasts(userId, projectId, toSave.slice(i, i + BATCH_SIZE));
      }

      message.success(`Saved ${changed.length} forecast values`);
      setEditingCells({});
      setPeriodEditEnabled(false);
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Discard edits
  const handleDiscardEdits = () => {
    setEditingCells({});
    setPeriodEditEnabled(false);
    message.info(t('forecasts.editsDiscarded'));
  };

  // --- Period edit: distribute even-split across months ---
  const handlePeriodCellChange = (skuId: string, period: string, valueK: number | null) => {
    // valueK is in K PCS, convert to total PCS
    const totalPcs = valueK != null ? Math.round(valueK * 1000) : 0;
    const months = viewMode === 'quarter' ? quarterMonths(period) : yearMonths(period);
    const perMonth = months.length > 0 ? Math.round(totalPcs / months.length) : 0;

    // Clear old edits for these months, then set new even-split values
    setEditingCells(prev => {
      const next = { ...prev };
      for (const m of months) {
        const k = `${skuId}::${m}`;
        next[k] = perMonth;
      }
      return next;
    });
  };

  // Get period display value (in K PCS) for quarter/year views
  const getPeriodValueK = (skuId: string, period: string): number => {
    const total = aggregatePeriod(skuId, period);
    return Math.round(total / 100) / 10; // round to 0.1K
  };

  // Check if any cell in a period is edited
  const isPeriodEdited = (skuId: string, period: string): boolean => {
    const months = viewMode === 'quarter' ? quarterMonths(period) : yearMonths(period);
    return months.some(m => editingCells[`${skuId}::${m}`] !== undefined);
  };

  // --- Batch Operations ---
  const handleBatchSet = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('forecasts.selectSkuFirst'));
      return;
    }
    try {
      const values = await batchForm.validateFields();
      const targetValueK = values.targetValue ?? 0; // in K PCS
      const targetMonths = values.targetMonths || ALL_MONTHS;

      setSaving(true);
      const toSave: Array<Omit<Forecast, 'id'> & { id?: string }> = [];
      for (const skuId of selectedRowKeys) {
        const sku = skus.find(s => s.id === skuId);
        for (const month of targetMonths) {
          const existingId = getFcId(skuId as string, month);
          toSave.push({
            id: existingId,
            skuId: skuId as string,
            month,
            forecastPcs: Math.round(targetValueK * 1000),
            unitPrice: sku?.unitPrice ?? 0,
            unitPriceCurrency: sku?.unitPriceCurrency ?? 'USD',
          });
        }
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        await batchSaveForecasts(userId, projectId, toSave.slice(i, i + BATCH_SIZE));
      }

      message.success(`Batch set ${toSave.length} values for ${selectedRowKeys.length} SKUs`);
      setBatchModalOpen(false);
      batchForm.resetFields();
      setSelectedRowKeys([]);
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to batch update');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchMultiply = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('forecasts.selectSkuFirst'));
      return;
    }
    try {
      const values = await batchForm.validateFields();
      const multiplier = values.multiplier ?? 1;
      const targetMonths = values.targetMonths || ALL_MONTHS;

      setSaving(true);
      const toSave: Array<Omit<Forecast, 'id'> & { id?: string }> = [];
      for (const skuId of selectedRowKeys) {
        const sku = skus.find(s => s.id === skuId);
        for (const month of targetMonths) {
          const current = getFcValue(skuId as string, month);
          const existingId = getFcId(skuId as string, month);
          toSave.push({
            id: existingId,
            skuId: skuId as string,
            month,
            forecastPcs: Math.round(current * multiplier),
            unitPrice: sku?.unitPrice ?? 0,
            unitPriceCurrency: sku?.unitPriceCurrency ?? 'USD',
          });
        }
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        await batchSaveForecasts(userId, projectId, toSave.slice(i, i + BATCH_SIZE));
      }

      message.success(`Multiplied ${toSave.length} values for ${selectedRowKeys.length} SKUs`);
      setBatchModalOpen(false);
      batchForm.resetFields();
      setSelectedRowKeys([]);
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to batch update');
    } finally {
      setSaving(false);
    }
  };

  const handleYearlyGrowth = async () => {
    try {
      const values = await batchForm.validateFields();
      const targetYears: string[] = values.targetYears || [];
      const growthRate = Number(values.growthRate ?? 0);

      if (targetYears.length === 0) {
        message.warning(t('forecasts.selectTargetYears'));
        return;
      }

      const targetSkuIds = selectedRowKeys.length > 0 ? selectedRowKeys.map(String) : undefined;
      const growthRatesByYear = Object.fromEntries(targetYears.map((year) => [year, growthRate]));
      const result = buildYearlyGrowthForecasts({
        skus,
        forecasts,
        targetYears,
        growthRatesByYear,
        selectedSkuIds: targetSkuIds,
      });

      if (result.generated.length === 0) {
        message.info(t('forecasts.noGrowthForecasts'));
        return;
      }

      setSaving(true);
      const BATCH_SIZE = 500;
      for (let i = 0; i < result.generated.length; i += BATCH_SIZE) {
        await batchSaveForecasts(userId, projectId, result.generated.slice(i, i + BATCH_SIZE));
      }

      message.success(
        t('forecasts.yearlyGrowthSaved')
          .replace('{count}', String(result.generatedCount))
          .replace('{skipped}', String(result.skippedSkuYears.length))
      );
      setBatchModalOpen(false);
      batchForm.resetFields();
      setSelectedRowKeys([]);
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to apply yearly growth');
    } finally {
      setSaving(false);
    }
  };

  // Fill Forward: for each selected SKU (or ALL SKUs with data), find last non-zero month and fill forward
  const handleBatchExtend = async () => {
    // If no SKUs selected, use ALL SKUs that have at least one non-zero forecast
    const targetSkus = selectedRowKeys.length > 0
      ? selectedRowKeys
      : skus.filter(sku => {
          for (const month of ALL_MONTHS) {
            if (getFcValue(sku.id, month) > 0) return true;
          }
          return false;
        }).map(s => s.id);

    if (targetSkus.length === 0) {
      message.warning('No SKUs with forecast data to extend');
      return;
    }

    setSaving(true);
    try {
      const toSave: Array<Omit<Forecast, 'id'> & { id?: string }> = [];

      for (const skuId of targetSkus) {
        // Find last non-zero month index
        let lastValue = 0;
        let lastNonZeroIdx = -1;
        for (let i = 0; i < ALL_MONTHS.length; i++) {
          // Check both saved data and edited cells
          const editedKey = `${skuId}::${ALL_MONTHS[i]}`;
          const val = editingCells[editedKey] ?? getFcValue(skuId as string, ALL_MONTHS[i]);
          if (val > 0) {
            lastValue = val;
            lastNonZeroIdx = i;
          }
        }

        if (lastNonZeroIdx < 0) continue;

        // Fill forward: overwrite ALL months after last non-zero
        for (let i = lastNonZeroIdx + 1; i < ALL_MONTHS.length; i++) {
          const month = ALL_MONTHS[i];
          const existingId = getFcId(skuId as string, month);
          const sku = skus.find(s => s.id === skuId);
          toSave.push({
            id: existingId,
            skuId: skuId as string,
            month,
            forecastPcs: lastValue,
            unitPrice: sku?.unitPrice ?? 0,
            unitPriceCurrency: sku?.unitPriceCurrency ?? 'USD',
          });
          // Also update editing cells so UI updates immediately
          setEditingCells(prev => ({ ...prev, [`${skuId}::${month}`]: lastValue }));
        }
      }

      if (toSave.length === 0) {
        message.info('No forecasts to extend');
        return;
      }

      // Batch save
      const BATCH_SIZE = 500;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        await batchSaveForecasts(userId, projectId, toSave.slice(i, i + BATCH_SIZE));
      }

      message.success(`Filled forward for ${targetSkus.length} SKUs (${toSave.length} values)`);
      setEditingCells({});
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to extend');
    } finally {
      setSaving(false);
    }
  };

  // Clear selected SKUs' forecasts
  const handleBatchClear = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('forecasts.selectSkuFirst'));
      return;
    }
    setSaving(true);
    try {
      const toDelete: string[] = [];
      for (const skuId of selectedRowKeys) {
        for (const month of ALL_MONTHS) {
          const existingId = getFcId(skuId as string, month);
          if (existingId) toDelete.push(existingId);
        }
      }

      // Delete in parallel
      await Promise.all(toDelete.map(id => deleteForecast(userId, projectId, id)));

      message.success(`Cleared ${toDelete.length} forecast values for ${selectedRowKeys.length} SKUs`);
      setSelectedRowKeys([]);
      await loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to clear');
    } finally {
      setSaving(false);
    }
  };

  // --- Download Template ---
  const handleDownloadTemplate = () => {
    const headerRow = ['SKU Code', 'Customer', 'Device', ...activeMonths];
    const dataRows = skus.map(sku => [
      sku.skuCode,
      sku.customer,
      sku.deviceName,
      ...activeMonths.map(m => {
        const pcs = getFcValue(sku.id, m);
        return pcs > 0 ? pcs / 1000 : ''; // Export in K PCS
      }),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      ...activeMonths.map(() => ({ wch: 12 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Forecast Template');
    XLSX.writeFile(wb, 'Forecast_Template.xlsx');
    message.success('Template downloaded');
  };

  // --- Import ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (rows.length < 2) {
          message.error('No data rows found');
          return;
        }

        const headerRow = rows[0] as string[];
        const monthColIndices: { index: number; month: string }[] = [];
        headerRow.forEach((col, idx) => {
          if (col && /^\d{4}-\d{2}$/.test(col.trim())) {
            monthColIndices.push({ index: idx, month: col.trim() });
          }
        });

        if (monthColIndices.length === 0) {
          message.error('No month columns found (format: YYYY-MM)');
          return;
        }

        const toSave: Array<Omit<Forecast, 'id'> & { id?: string }> = [];
        let skipped = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          const skuCode = row[0]?.toString().trim();
          if (!skuCode) continue;

          const sku = skus.find(s => s.skuCode === skuCode);
          if (!sku) {
            skipped++;
            continue;
          }

          for (const { index, month } of monthColIndices) {
            const rawVal = Number(row[index]);
            if (isNaN(rawVal) || rawVal === 0) continue;

            const existingId = getFcId(sku.id, month);
            toSave.push({
              id: existingId,
              skuId: sku.id,
              month,
              forecastPcs: Math.round(rawVal * 1000), // K PCS → PCS
              unitPrice: sku.unitPrice,
              unitPriceCurrency: sku.unitPriceCurrency ?? 'USD',
            });
          }
        }

        if (toSave.length === 0) {
          message.warning(skipped > 0 ? `No valid data. ${skipped} SKU(s) not found. Check template matches your SKUs.` : 'No valid forecast data found');
          return;
        }

        // Batch save in chunks of 500
        const BATCH_SIZE = 500;
        for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
          await batchSaveForecasts(userId, projectId, toSave.slice(i, i + BATCH_SIZE));
        }

        if (skipped > 0) {
          message.warning(`Imported ${toSave.length} values. ${skipped} SKU(s) skipped (not found in Products).`);
        } else {
          message.success(`Imported ${toSave.length} forecast values`);
        }
        await loadData();
      } catch (e: any) {
        message.error(e.message || 'Failed to import');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Columns ---
  // Month columns: values stored in PCS, displayed in K PCS (divided by 1000)
  const monthColumns: ColumnsType<any> = activeMonths.map(month => ({
    title: month,
    key: `fc-${month}`,
    width: 100,
    align: 'center' as const,
    render: (_: any, sku: SKU) => {
      const key = `${sku.id}::${month}`;
      const rawValue = editingCells[key] ?? getFcValue(sku.id, month);
      const isEdited = editingCells[key] !== undefined;
      // Display in K PCS
      const displayValue = rawValue / 1000;

      if (periodEditEnabled) {
        return (
          <InputNumber
            size="small"
            min={0}
            step={0.1}
            precision={1}
            value={displayValue}
            onChange={(val) => {
              const pcsValue = val != null ? Math.round(val * 1000) : 0;
              handleCellChange(sku.id, month, pcsValue);
            }}
            style={{
              width: '100%',
              textAlign: 'center',
              borderColor: isEdited ? '#1677ff' : undefined,
              backgroundColor: isEdited ? '#e6f4ff' : undefined,
            }}
          />
        );
      }

      // Read-only display
      return (
        <div style={{ textAlign: 'center', color: displayValue > 0 ? undefined : '#999' }}>
          {displayValue > 0 ? displayValue.toLocaleString() : '-'}
        </div>
      );
    },
  }));

  // Period columns (quarter/year): read-only by default, editable when periodEditEnabled
  const periodColumns: ColumnsType<any> = (() => {
    const periods = viewMode === 'quarter'
      ? monthsToQuarters(activeMonths)
      : monthsToYears(activeMonths);

    return periods.map(period => ({
      title: period,
      key: `fc-${period}`,
      width: 100,
      align: 'center' as const,
      render: (_: any, sku: SKU) => {
        const isEdited = isPeriodEdited(sku.id, period);
        const displayValue = getPeriodValueK(sku.id, period);

        if (periodEditEnabled) {
          return (
            <InputNumber
              size="small"
              min={0}
              step={0.1}
              precision={1}
              value={displayValue}
              onChange={(val) => handlePeriodCellChange(sku.id, period, val)}
              style={{
                width: '100%',
                textAlign: 'center',
                borderColor: isEdited ? '#1677ff' : undefined,
                backgroundColor: isEdited ? '#e6f4ff' : undefined,
              }}
            />
          );
        }

        // Read-only display
        return (
          <div style={{ textAlign: 'center', color: displayValue > 0 ? undefined : '#999' }}>
            {displayValue > 0 ? displayValue.toLocaleString() : '-'}
          </div>
        );
      },
    }));
  })();

  const columns: ColumnsType<SKU> = [
    {
      title: t('forecasts.skuCode'),
      dataIndex: 'skuCode',
      key: 'skuCode',
      width: 110,
      fixed: 'left' as const,
      sorter: (a, b) => a.skuCode.localeCompare(b.skuCode),
    },
    { title: t('forecasts.customer'), dataIndex: 'customer', key: 'customer', width: 100, fixed: 'left' as const },
    { title: t('forecasts.device'), dataIndex: 'deviceName', key: 'deviceName', width: 100, fixed: 'left' as const },
    {
      title: t('forecasts.layer'),
      key: 'layer',
      width: 50,
      align: 'center' as const,
      render: (_: any, r: SKU) => r.layerCount,
    },
    {
      title: t('forecasts.upp'),
      key: 'upp',
      width: 60,
      align: 'center' as const,
      render: (_: any, r: SKU) => {
        const upp = r.upp ?? Math.floor(244.1 / (r.chipLengthMm + 0.3)) * Math.floor(246.2 / (r.chipWidthMm + 0.3)) * 4;
        return <Tag color="blue">{upp}</Tag>;
      },
    },
    ...(viewMode === 'month' ? monthColumns : periodColumns),
  ];

  const hasChanges = Object.keys(editingCells).length > 0;
  const isPeriodView = viewMode !== 'month';
  const availableYears = monthsToYears(ALL_MONTHS).filter((year) => Number(year) > 2026);
  const batchModalTitle =
    batchMode === 'set'
      ? t('forecasts.batchSetTitle')
      : batchMode === 'multiply'
        ? t('forecasts.batchMultiplyTitle')
        : t('forecasts.yearlyGrowthTitle');
  const handleBatchModalOk =
    batchMode === 'set'
      ? handleBatchSet
      : batchMode === 'multiply'
        ? handleBatchMultiply
        : handleYearlyGrowth;

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>{t('forecasts.template')}</Button>
          </Col>
          <Col>
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>{t('forecasts.import')}</Button>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              disabled={!hasChanges}
              loading={saving}
            >
              {t('forecasts.save')} ({Object.keys(editingCells).length})
            </Button>
          </Col>
          {hasChanges && (
            <Col>
              <Button onClick={handleDiscardEdits}>{t('forecasts.discard')}</Button>
            </Col>
          )}
          <Col flex="auto" />

          {/* View mode buttons */}
          <Col>
            <Space.Compact>
              <Button
                type={viewMode === 'month' ? 'primary' : 'default'}
                onClick={() => { setViewMode('month'); setPeriodEditEnabled(false); }}
              >
                {t('forecasts.month')}
              </Button>
              <Button
                type={viewMode === 'quarter' ? 'primary' : 'default'}
                onClick={() => { setViewMode('quarter'); setPeriodEditEnabled(false); }}
              >
                {t('forecasts.quarter')}
              </Button>
              <Button
                type={viewMode === 'year' ? 'primary' : 'default'}
                onClick={() => { setViewMode('year'); setPeriodEditEnabled(false); }}
              >
                {t('forecasts.year')}
              </Button>
            </Space.Compact>
          </Col>

          {/* Edit toggle */}
          <Col>
            <Space>
              <Switch
                size="small"
                checked={periodEditEnabled}
                onChange={setPeriodEditEnabled}
                checkedChildren={t('forecasts.edit')}
                unCheckedChildren={t('forecasts.view')}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {periodEditEnabled ? t('forecasts.editing') : t('forecasts.readOnly')}
              </Text>
            </Space>
          </Col>

          <Col>
            <Button
              icon={<SyncOutlined rotate={0} />}
              onClick={() => setShowFullRange(!showFullRange)}
            >
              {showFullRange ? '2026-2040' : '2026-2030'}
            </Button>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  if (selectedRowKeys.length === 0) { message.warning(t('forecasts.selectSkuFirst')); return; }
                  setBatchMode('set');
                  setBatchModalOpen(true);
                }}
                disabled={selectedRowKeys.length === 0}
              >
                {t('forecasts.batchSet')}
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => {
                  if (selectedRowKeys.length === 0) { message.warning(t('forecasts.selectSkuFirst')); return; }
                  setBatchMode('multiply');
                  setBatchModalOpen(true);
                }}
                disabled={selectedRowKeys.length === 0}
              >
                {t('forecasts.multiply')}
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => {
                  setBatchMode('growth');
                  batchForm.setFieldsValue({ targetYears: availableYears.slice(0, 1), growthRate: 10 });
                  setBatchModalOpen(true);
                }}
              >
                {t('forecasts.yearlyGrowth')}
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={handleBatchExtend}
                loading={saving}
              >
                {t('forecasts.fillForward')}
              </Button>
              <Popconfirm title={t('forecasts.clearConfirm')} onConfirm={handleBatchClear}>
                <Button icon={<ClearOutlined />} danger disabled={selectedRowKeys.length === 0}>{t('forecasts.clear')}</Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Info bar */}
      {selectedRowKeys.length > 0 && (
        <Alert
          message={`${selectedRowKeys.length} ${t('forecasts.selectedCount')}`}
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
        />
      )}

      {isPeriodView && (
        <Alert
          message={
            periodEditEnabled
              ? `${t(`forecasts.${viewMode}`)} ${t('forecasts.editMode')}`
              : `${t(`forecasts.${viewMode}`)} ${t('forecasts.viewMode')}`
          }
          type="info"
          showIcon
          style={{ marginBottom: 8, fontSize: 12 }}
        />
      )}

      {/* Table */}
      <Table<SKU>
        columns={columns}
        dataSource={skus}
        rowKey="id"
        size="small"
        loading={loading}
        scroll={{ x: 'max-content' }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={false}
        sticky
      />

      {/* Batch Modal */}
      <Modal
        title={batchModalTitle}
        open={batchModalOpen}
        onOk={handleBatchModalOk}
        onCancel={() => { setBatchModalOpen(false); batchForm.resetFields(); }}
        confirmLoading={saving}
      >
        <Form form={batchForm} layout="vertical">
          <Text type="secondary">
            {selectedRowKeys.length > 0
              ? `${selectedRowKeys.length} ${t('forecasts.selectedCount')}`
              : t('forecasts.allSkusDefault')}
          </Text>
          {batchMode !== 'growth' && (
            <Form.Item name="targetMonths" label={t('forecasts.targetMonths')}>
              <Select
                mode="multiple"
                options={ALL_MONTHS.map(m => ({ label: m, value: m }))}
                placeholder={t('forecasts.allMonthsPlaceholder')}
              />
            </Form.Item>
          )}
          {batchMode === 'set' && (
            <Form.Item name="targetValue" label={t('forecasts.targetValue')} rules={[{ required: true }]}>
              <InputNumber min={0} step={0.1} precision={1} style={{ width: '100%' }} addonAfter="K" />
            </Form.Item>
          )}
          {batchMode === 'multiply' && (
            <Form.Item name="multiplier" label={t('forecasts.multiplier')} rules={[{ required: true }]}>
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          )}
          {batchMode === 'growth' && (
            <>
              <Alert
                type="info"
                showIcon
                style={{ margin: '12px 0' }}
                message={t('forecasts.yearlyGrowthDesc')}
              />
              <Form.Item name="targetYears" label={t('forecasts.targetYears')} rules={[{ required: true }]}>
                <Select
                  mode="multiple"
                  options={availableYears.map(year => ({ label: year, value: year }))}
                  placeholder={t('forecasts.targetYearsPlaceholder')}
                />
              </Form.Item>
              <Form.Item name="growthRate" label={t('forecasts.growthRate')} rules={[{ required: true }]}>
                <InputNumber min={-100} step={1} precision={2} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ForecastsPage;
