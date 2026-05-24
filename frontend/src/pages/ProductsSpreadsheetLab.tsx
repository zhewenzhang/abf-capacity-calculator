import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, message, Tag, Space, Typography } from 'antd';
import { SaveOutlined, UndoOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, intColumn, floatColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getSKUs, batchSaveSKUs } from '../services/skuService';
import { ExperimentalBanner, PageLoading } from '../components/common';
import { validateSKU } from '../core/validation';
import { calculateSkuUpp, calculateSkuYieldEstimate, normalizeSkuDraft } from '../core/skuDerived';
import { currencyOrUsd, normalizeCurrencyCode } from '../core/currency';
import type { SizeCategory, ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';

const { Text } = Typography;

// --- Types — all editable fields are string | null or number | null ---
interface SheetRow {
  id?: string;
  skuCode: string | null;
  customer: string | null;
  deviceName: string | null;
  osat: string | null;
  application: string | null;
  productGrade: string | null;
  sizeCategory: string | null;
  chipLengthMm: number | null;
  chipWidthMm: number | null;
  layerCount: number | null;
  unitPrice: number | null;
  unitPriceCurrency: string | null;
  coreType: string | null;
  coreThicknessMm: number | null;
  abfType: string | null;
  upp?: number;
  yieldEstimate?: number;
  _status?: string;
  _errors?: string;
}

const EMPTY_ROW: SheetRow = {
  skuCode: null, customer: null, deviceName: null, osat: null,
  application: null, productGrade: null, sizeCategory: null,
  chipLengthMm: null, chipWidthMm: null, layerCount: null,
  unitPrice: null, unitPriceCurrency: 'USD', coreType: null, coreThicknessMm: null, abfType: null,
};

function createBlankRows(count: number): SheetRow[] {
  return Array.from({ length: count }, () => ({ ...EMPTY_ROW }));
}

function deriveRow(row: SheetRow): SheetRow {
  const derived: SheetRow = { ...row };
  if (row.chipLengthMm && row.chipWidthMm) {
    derived.upp = calculateSkuUpp(row.chipLengthMm, row.chipWidthMm);
  }
  if (row.sizeCategory && row.layerCount) {
    derived.yieldEstimate = calculateSkuYieldEstimate(row.sizeCategory as SizeCategory, row.layerCount);
  }
  return derived;
}

function validateRow(row: SheetRow): string {
  if (!row.skuCode && !row.customer && !row.deviceName && !row.chipLengthMm) return '';
  if (row.unitPriceCurrency && !normalizeCurrencyCode(row.unitPriceCurrency)) return `Invalid currency: ${row.unitPriceCurrency}`;
  const normalized = normalizeSkuDraft({ ...row, unitPriceCurrency: currencyOrUsd(row.unitPriceCurrency) } as any);
  const errors = validateSKU(normalized);
  if (errors.length > 0) return errors.map(e => e.message).join('; ');
  return '';
}

function rowToFirestore(sku: SheetRow): any {
  const data: any = {};
  if (sku.skuCode != null) data.skuCode = sku.skuCode;
  if (sku.customer != null) data.customer = sku.customer;
  if (sku.deviceName != null) data.deviceName = sku.deviceName;
  if (sku.osat != null) data.osat = sku.osat;
  if (sku.application != null) data.application = sku.application;
  if (sku.productGrade != null) data.productGrade = sku.productGrade;
  if (sku.sizeCategory != null) data.sizeCategory = sku.sizeCategory;
  if (sku.chipLengthMm != null) data.chipLengthMm = sku.chipLengthMm;
  if (sku.chipWidthMm != null) data.chipWidthMm = sku.chipWidthMm;
  if (sku.layerCount != null) data.layerCount = sku.layerCount;
  if (sku.unitPrice != null) data.unitPrice = sku.unitPrice;
  data.unitPriceCurrency = currencyOrUsd(sku.unitPriceCurrency);
  if (sku.coreType != null) data.coreType = sku.coreType;
  if (sku.coreThicknessMm != null) data.coreThicknessMm = sku.coreThicknessMm;
  if (sku.abfType != null) data.abfType = sku.abfType;
  if (sku.upp) data.upp = sku.upp;
  if (sku.yieldEstimate) data.yieldEstimate = sku.yieldEstimate;
  if (sku.id) data.id = sku.id;
  return data;
}

function isRowEmpty(r: SheetRow): boolean {
  return !r.skuCode && !r.customer && !r.deviceName && !r.chipLengthMm
    && !r.chipWidthMm && !r.layerCount && !r.unitPrice;
}

interface ProductsSpreadsheetLabProps {
  scope: ProjectScope;
}

const ProductsSpreadsheetLab: React.FC<ProductsSpreadsheetLabProps> = ({ scope }) => {
  const writable = canEdit(scope.role);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<SheetRow[]>([]);

  const loadSKUs = useCallback(async () => {
    setLoading(true);
    try {
      const skus = await getSKUs(scope);
      const sheetRows: SheetRow[] = skus.map((s: any) => ({
        id: s.id,
        skuCode: s.skuCode || null,
        customer: s.customer || null,
        deviceName: s.deviceName || null,
        osat: s.osat || null,
        application: s.application || null,
        productGrade: s.productGrade || null,
        sizeCategory: s.sizeCategory || null,
        chipLengthMm: s.chipLengthMm ?? null,
        chipWidthMm: s.chipWidthMm ?? null,
        layerCount: s.layerCount ?? null,
        unitPrice: s.unitPrice ?? null,
        unitPriceCurrency: currencyOrUsd(s.unitPriceCurrency),
        coreType: s.coreType || null,
        coreThicknessMm: s.coreThicknessMm ?? null,
        abfType: s.abfType || null,
        upp: s.upp,
        yieldEstimate: s.yieldEstimate,
        _status: '',
        _errors: '',
      }));
      setRows([...sheetRows, ...createBlankRows(50)]);
      setSavedSnapshot([...sheetRows, ...createBlankRows(50)]);
    } catch (e: any) {
      message.error(e.message || 'Failed to load SKUs');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { loadSKUs(); }, [loadSKUs]);

  const handleChange = useCallback((newRows: SheetRow[]) => {
    const derived = newRows.map(r => deriveRow(r));
    setRows(derived);
  }, []);

  const handleValidate = useCallback(() => {
    const validated = rows.map(r => {
      const error = validateRow(r);
      return {
        ...r,
        _status: error ? 'error' : (r.skuCode ? 'ok' : ''),
        _errors: error,
      };
    });
    setRows(validated);
  }, [rows]);

  const handleSave = useCallback(async () => {
    const toSave: SheetRow[] = [];
    let invalidCount = 0;

    const processed = rows.map(r => {
      const error = validateRow(r);
      if (isRowEmpty(r)) {
        return { ...r, _status: '', _errors: '' };
      }
      if (error) {
        invalidCount++;
        return { ...r, _status: 'error', _errors: error };
      }
      toSave.push(r);
      return { ...r, _status: 'ok', _errors: '' };
    });

    if (toSave.length === 0) {
      message.info('No valid rows to save');
      setRows(processed);
      return;
    }

    setSaving(true);
    try {
      const payloads = toSave.map(r => rowToFirestore(deriveRow(r)));
      await batchSaveSKUs(scope, payloads);
      message.success(`Saved ${toSave.length} rows.${invalidCount > 0 ? ` ${invalidCount} invalid rows skipped.` : ''}`);
      await loadSKUs();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [rows, scope, loadSKUs]);

  const handleAddRows = useCallback(() => {
    setRows(prev => [...prev, ...createBlankRows(20)]);
  }, []);

  const handleDiscard = useCallback(() => {
    setRows([...savedSnapshot]);
    message.info('Changes discarded');
  }, [savedSnapshot]);

  const handleExportCSV = useCallback(() => {
    const headers = ['SKU Code', 'Customer', 'Device', 'OSAT', 'Application', 'Grade', 'Size', 'Chip L', 'Chip W', 'Layers', 'Price', 'Currency', 'Core', 'Thick', 'ABF', 'UPP', 'Yield'];
    const csvRows = [headers.join(',')];
    const dataRows = rows.filter(r => !isRowEmpty(r));
    for (const r of dataRows) {
      csvRows.push([
        r.skuCode, r.customer, r.deviceName, r.osat, r.application, r.productGrade,
        r.sizeCategory, r.chipLengthMm ?? '', r.chipWidthMm ?? '', r.layerCount ?? '',
        r.unitPrice ?? '', currencyOrUsd(r.unitPriceCurrency), r.coreType, r.coreThicknessMm ?? '', r.abfType,
        r.upp ?? '', r.yieldEstimate != null ? `${(r.yieldEstimate * 100).toFixed(0)}%` : '',
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skus_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  // Columns
  const columns = useMemo(() => {
    const tc = { ...textColumn };
    const fc = { ...floatColumn };
    const ic = { ...intColumn };
    return [
      keyColumn<SheetRow, 'skuCode'>('skuCode', { ...tc, title: 'SKU Code', width: 100 }),
      keyColumn<SheetRow, 'customer'>('customer', { ...tc, title: 'Customer', width: 90 }),
      keyColumn<SheetRow, 'deviceName'>('deviceName', { ...tc, title: 'Device', width: 90 }),
      keyColumn<SheetRow, 'osat'>('osat', { ...tc, title: 'OSAT', width: 70 }),
      keyColumn<SheetRow, 'application'>('application', { ...tc, title: 'Application', width: 90 }),
      keyColumn<SheetRow, 'productGrade'>('productGrade', { ...tc, title: 'Grade', width: 70 }),
      keyColumn<SheetRow, 'sizeCategory'>('sizeCategory', { ...tc, title: 'Size', width: 70 }),
      keyColumn<SheetRow, 'chipLengthMm'>('chipLengthMm', { ...fc, title: 'Chip L (mm)', width: 80 }),
      keyColumn<SheetRow, 'chipWidthMm'>('chipWidthMm', { ...fc, title: 'Chip W (mm)', width: 80 }),
      keyColumn<SheetRow, 'layerCount'>('layerCount', { ...ic, title: 'Layers', width: 60 }),
      keyColumn<SheetRow, 'unitPrice'>('unitPrice', { ...fc, title: 'Price', width: 80 }),
      keyColumn<SheetRow, 'unitPriceCurrency'>('unitPriceCurrency', { ...tc, title: 'Currency', width: 80 }),
      keyColumn<SheetRow, 'coreType'>('coreType', { ...tc, title: 'Core', width: 80 }),
      keyColumn<SheetRow, 'coreThicknessMm'>('coreThicknessMm', { ...fc, title: 'Thick (mm)', width: 75 }),
      keyColumn<SheetRow, 'abfType'>('abfType', { ...tc, title: 'ABF', width: 60 }),
      { title: 'UPP', width: 50, disabled: true, cellRenderer: ({ rowData }: any) => rowData.upp ?? '-' },
      { title: 'Yield', width: 55, disabled: true, cellRenderer: ({ rowData }: any) => rowData.yieldEstimate != null ? `${(rowData.yieldEstimate * 100).toFixed(0)}%` : '-' },
      {
        title: 'Status',
        width: 200,
        disabled: true,
        cellRenderer: ({ rowData }: any) => {
          if (rowData._status === 'ok') return <Tag color="green">OK</Tag>;
          if (rowData._status === 'error') return <Tag color="red">{rowData._errors}</Tag>;
          return '';
        },
      },
    ];
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <ExperimentalBanner
        label="Products Spreadsheet Lab"
        description={
          <>
            Excel-like SKU management using <Text code>react-datasheet-grid</Text>.
            Supports multi-cell paste, horizontal field input, batch validation, and batch save.
            Data is written to the same Firestore <Text code>skus</Text> collection.
            <br />
            <Text type="secondary">
              Paste tip: Copy rows from Excel (without headers), select the first cell of a blank row, then Ctrl+V.
            </Text>
          </>
        }
      />

      {/* Toolbar */}
      <Space wrap style={{ marginBottom: 8 }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!writable}>
          Save Valid Rows
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleValidate}>
          Validate
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAddRows}>
          + 20 Blank Rows
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadSKUs}>
          Reload
        </Button>
        <Button icon={<UndoOutlined />} onClick={handleDiscard}>
          Discard Changes
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
          Export CSV
        </Button>
        <Text type="secondary">
          {rows.filter(r => !isRowEmpty(r)).length} rows &middot; {rows.length} total
        </Text>
      </Space>

      {/* Grid */}
      <div className="spreadsheet-wrapper">
        <DataSheetGrid<SheetRow>
          value={rows}
          onChange={handleChange}
          columns={columns}
          rowHeight={32}
          height={Math.min(600, window.innerHeight - 280)}
        />
      </div>
    </div>
  );
};

export default ProductsSpreadsheetLab;
