import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Alert,
  Card,
  Row,
  Col,
  DatePicker,
  Typography,
  Tooltip,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  HistoryOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { getSKUs, saveSKU, deleteSKU, batchSaveSKUs } from '../services/skuService';
import { saveVersion, getVersions, restoreVersion, deleteVersion } from '../services/skuVersionService';
import type { CurrencyCode, SKU, SizeCategory, ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';
import { normalizeCurrencyCode } from '../core/currency';
import { validateSKU } from '../core/validation';
import { DEFAULT_YIELD_MATRIX } from '../core/defaults';
import { useI18n } from '../i18n';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ProductsPageProps {
  scope: ProjectScope;
}

const SIZE_OPTIONS: { label: string; value: SizeCategory }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'XLarge', value: 'xlarge' },
];

const APP_OPTIONS = [
  'Mobile', 'Server', 'AI/ML', 'GPU', 'Automotive', 'IoT', '5G', 'Consumer', 'Networking', 'Other'
].map(a => ({ label: a, value: a }));

const CORE_TYPE_OPTIONS = ['E705G', 'E795G', 'E705GLH', 'E795GLH'].map(c => ({ label: c, value: c }));
const ABF_TYPE_OPTIONS = ['GL102', 'GL107', 'GXT31', 'GZ41'].map(a => ({ label: a, value: a }));
const CURRENCY_OPTIONS: { label: string; value: CurrencyCode }[] = [
  { label: 'USD', value: 'USD' },
  { label: 'TWD (NTD)', value: 'TWD' },
  { label: 'CNY (RMB)', value: 'CNY' },
];

// UPP calculation
function calculateUPP(chipLengthMm: number, chipWidthMm: number): number {
  const PL = 244.1, PW = 246.2, ML = 10, MW = 5.3, T = 0.3;
  const nL1 = Math.floor((PL - ML + T) / (chipLengthMm + T));
  const nW1 = Math.floor((PW - MW + T) / (chipWidthMm + T));
  const nL2 = Math.floor((PL - ML + T) / (chipWidthMm + T));
  const nW2 = Math.floor((PW - MW + T) / (chipLengthMm + T));
  return Math.max(nL1 * nW1 * 4, nL2 * nW2 * 4, 0);
}

function getYieldEstimate(sizeCategory: SizeCategory, layerCount: number): number {
  const bucket = layerCount <= 8 ? '4-8L' : layerCount <= 14 ? '10-14L' : layerCount <= 20 ? '16-20L' : '20L+';
  return DEFAULT_YIELD_MATRIX[sizeCategory][bucket] || 0;
}

function formatDate(date: any): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString();
}

function formatDateTime(date: any): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString();
}

const ProductsPage: React.FC<ProductsPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const writable = canEdit(scope.role);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline add form
  const [addMode, setAddMode] = useState(false);
  const [addForm] = Form.useForm();

  // Inline editing
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Date filter
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Versions
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionName, setVersionName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Download template ---
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'SKU Code': 'SKU-001',
        'Customer': 'Customer A',
        'Device Name': 'Device X',
        'OSAT': 'ASE',
        'Application': 'Mobile',
        'Grade': 'Auto',
        'Size': 'medium',
        'Chip Length (mm)': 10.5,
        'Chip Width (mm)': 8.2,
        'Layer Count': 10,
        'Yield Rate': 0.92,
        'Unit Price': 2.5,
        'Currency': 'USD',
        'Core Type': 'E705G',
        'Core Thickness (mm)': 0.8,
        'ABF Type': 'GL102',
      },
      {
        'SKU Code': 'SKU-002',
        'Customer': 'Customer B',
        'Device Name': 'Device Y',
        'OSAT': 'Amkor',
        'Application': 'Server',
        'Grade': 'Industrial',
        'Size': 'large',
        'Chip Length (mm)': 15.0,
        'Chip Width (mm)': 12.0,
        'Layer Count': 14,
        'Yield Rate': 0.85,
        'Unit Price': 5.8,
        'Currency': 'TWD',
        'Core Type': 'E795G',
        'Core Thickness (mm)': 1.0,
        'ABF Type': 'GL107',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for better UX
    ws['!cols'] = [
      { wch: 15 }, // SKU Code
      { wch: 15 }, // Customer
      { wch: 15 }, // Device Name
      { wch: 10 }, // OSAT
      { wch: 12 }, // Application
      { wch: 12 }, // Grade
      { wch: 10 }, // Size
      { wch: 18 }, // Chip Length
      { wch: 18 }, // Chip Width
      { wch: 14 }, // Layer Count
      { wch: 14 }, // Yield Rate
      { wch: 14 }, // Unit Price
      { wch: 12 }, // Currency
      { wch: 14 }, // Core Type
      { wch: 18 }, // Core Thickness
      { wch: 12 }, // ABF Type
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SKU Template');
    XLSX.writeFile(wb, 'SKU_Import_Template.xlsx');
    message.success('Template downloaded');
  };

  const loadSKUs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSKUs(scope);
      setSkus(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load SKUs');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    setVersionsLoading(true);
    try {
      const v = await getVersions(scope);
      setVersions(v);
    } catch {
      // ignore
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    loadSKUs();
    loadVersions();
  }, [scope]);

  // Filter by date
  const filteredSkus = useMemo(() => {
    if (!dateRange) return skus;
    return skus.filter((s) => {
      const d = s.updatedAt || s.createdAt;
      if (!d) return false;
      const date = d instanceof Date ? d : (d as any).toDate ? (d as any).toDate() : new Date(d);
      const dateStr = date.toISOString().split('T')[0];
      return dateStr >= dateRange[0] && dateStr <= dateRange[1];
    });
  }, [skus, dateRange]);

  // --- Inline add ---
  const handleAddStart = () => {
    setAddMode(true);
    addForm.resetFields();
  };

  const handleAddCancel = () => {
    setAddMode(false);
    addForm.resetFields();
  };

  const handleAddSave = async () => {
    try {
      const values = await addForm.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      values.unitPriceCurrency = values.unitPriceCurrency ?? 'USD';
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(scope, values);
      message.success('SKU added');
      setAddMode(false);
      addForm.resetFields();
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to save SKU');
    }
  };

  // --- Inline edit ---
  const isEditing = (record: SKU) => record.id === editingKey;

  const handleEditStart = (sku: SKU) => {
    setEditingKey(sku.id);
  };

  const handleEditCancel = () => {
    setEditingKey(null);
  };

  const handleEditSave = async (sku: SKU, form: any) => {
    try {
      const values = await form.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      values.unitPriceCurrency = values.unitPriceCurrency ?? sku.unitPriceCurrency ?? 'USD';
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(scope, { ...sku, ...values });
      message.success('SKU updated');
      setEditingKey(null);
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to update SKU');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSKU(scope, id);
      message.success('SKU deleted');
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete SKU');
    }
  };

  // --- Batch import ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);

        const imported: Array<any> = [];
        for (const row of rows) {
          const chipLengthMm = parseFloat(row['Chip Length (mm)'] || row['Chip Length'] || row['chipLengthMm'] || row['Length (mm)']);
          const chipWidthMm = parseFloat(row['Chip Width (mm)'] || row['Chip Width'] || row['chipWidthMm'] || row['Width (mm)']);
          const layerCount = parseInt(row['Layers'] || row['layerCount'] || row['Layer Count']);
          const sizeCategory = (row['Size'] || row['sizeCategory'] || 'medium').toLowerCase() as SizeCategory;
          const skuCode = row['SKU Code'] || row['skuCode'] || row['SKU'];
          const customer = row['Customer'] || row['customer'] || '';
          if (!skuCode || !customer) continue;

          const rawYield = parseFloat(row['Yield Rate'] || row['yieldEstimate'] || row['Yield']);
          const yieldEstimate = (rawYield > 0 && rawYield <= 1) ? rawYield : getYieldEstimate(sizeCategory, layerCount);
          const rawCurrency = row['Currency'] || row['Price Currency'] || row['unitPriceCurrency'] || row['Unit Price Currency'] || 'USD';
          const unitPriceCurrency = normalizeCurrencyCode(rawCurrency);
          if (!unitPriceCurrency) {
            message.error(`${t('products.invalidCurrency')}: ${rawCurrency}`);
            return;
          }

          imported.push({
            skuCode, customer,
            deviceName: row['Device'] || row['deviceName'] || row['Device Name'] || '',
            osat: row['OSAT'] || row['osat'] || '',
            application: row['Application'] || row['application'] || '',
            productGrade: row['Grade'] || row['productGrade'] || '',
            sizeCategory, chipLengthMm, chipWidthMm, layerCount,
            unitPrice: parseFloat(row['Price'] || row['unitPrice'] || row['Unit Price']) || 0,
            unitPriceCurrency,
            upp: calculateUPP(chipLengthMm, chipWidthMm),
            yieldEstimate,
            coreType: row['Core Type'] || row['coreType'] || '',
            coreThicknessMm: parseFloat(row['Core Thickness'] || row['Core Thickness (mm)'] || row['coreThicknessMm']) || undefined,
            abfType: row['ABF Type'] || row['abfType'] || '',
          });
        }

        if (imported.length === 0) {
          message.error('No valid SKUs found in file');
          return;
        }

        await batchSaveSKUs(scope, imported);
        message.success(`Imported ${imported.length} SKUs`);
        loadSKUs();
        loadVersions();
      } catch (e: any) {
        message.error(e.message || 'Failed to import');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Version management ---
  const handleSaveVersion = async () => {
    const name = versionName.trim() || `SKU v${versions.length + 1}`;
    try {
      await saveVersion(scope, name, skus);
      message.success(`Version "${name}" saved`);
      setVersionName('');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to save version');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const vList = await getVersions(scope);
      const ver = vList.find((v) => v.id === versionId);
      if (!ver) return;
      const restored = restoreVersion(ver);
      for (const sku of restored.skus) {
        await saveSKU(scope, sku);
      }
      message.success(`Restored "${ver.versionName}" with ${restored.skus.length} SKUs`);
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to restore');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion(scope, versionId);
      message.success('Version deleted');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  // --- Table columns ---
  const columns: ColumnsType<SKU> = [
    { title: t('products.skuCode'), dataIndex: 'skuCode', key: 'skuCode', width: 120, sorter: (a, b) => a.skuCode.localeCompare(b.skuCode) },
    { title: t('products.customer'), dataIndex: 'customer', key: 'customer', width: 100 },
    { title: t('products.deviceName'), dataIndex: 'deviceName', key: 'deviceName', width: 100 },
    { title: t('products.osat'), dataIndex: 'osat', key: 'osat', width: 70 },
    { title: t('products.application'), dataIndex: 'application', key: 'application', width: 80 },
    { title: t('products.productGrade'), dataIndex: 'productGrade', key: 'productGrade', width: 60 },
    { title: t('products.sizeCategory'), dataIndex: 'sizeCategory', key: 'sizeCategory', width: 70, render: (v: string) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { title: t('products.chipLength').replace(' (mm)', ''), key: 'chip', width: 100, render: (_: any, r: SKU) => `${r.chipLengthMm} × ${r.chipWidthMm}` },
    { title: t('products.layerCount'), dataIndex: 'layerCount', key: 'layerCount', width: 60, align: 'center' as const },
    {
      title: t('products.upp'), key: 'upp', width: 60, align: 'center' as const,
      render: (_: any, r: SKU) => {
        const upp = r.upp ?? calculateUPP(r.chipLengthMm, r.chipWidthMm);
        return <Tooltip title="Auto-calculated from chip dimensions"><Tag color="blue">{upp}</Tag></Tooltip>;
      },
    },
    {
      title: t('products.yieldRate'), key: 'yield', width: 60, align: 'center' as const,
      render: (_: any, r: SKU) => {
        const y = r.yieldEstimate ?? getYieldEstimate(r.sizeCategory, r.layerCount);
        return `${Math.round(y * 100)}%`;
      },
    },
    {
      title: t('products.unitPrice'), dataIndex: 'unitPrice', key: 'unitPrice', width: 110, align: 'right' as const,
      render: (v: number, r: SKU) => `${v?.toFixed(2)} ${r.unitPriceCurrency ?? 'USD'}`,
    },
    { title: t('products.coreType'), dataIndex: 'coreType', key: 'coreType', width: 90, render: (v: string) => v || '-' },
    { title: t('products.coreThickness').replace(' (mm)', ''), key: 'coreThick', width: 80, render: (_: any, r: SKU) => r.coreThicknessMm ? `${r.coreThicknessMm}mm` : '-' },
    { title: t('products.abfType'), dataIndex: 'abfType', key: 'abfType', width: 80, render: (v: string) => v || '-' },
    {
      title: t('common.edit') + ' / ' + t('products.delete'), key: 'updatedAt', width: 90,
      render: (_: any, r: SKU) => (
        <Tooltip title={formatDateTime(r.updatedAt || r.createdAt)}>
          {formatDate(r.updatedAt || r.createdAt)}
        </Tooltip>
      ),
    },
    {
      title: t('common.actions'), key: 'actions', width: 100, fixed: 'right' as const,
      render: (_: any, record: SKU) => {
        const editing = isEditing(record);
        return editing ? (
          <Space>
            <Button size="small" type="primary" icon={<SaveOutlined />} disabled>{t('products.save')}</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={handleEditCancel}>{t('products.cancel')}</Button>
          </Space>
        ) : (
          <Space>
            <Button size="small" type="link" onClick={() => handleEditStart(record)} disabled={!writable}><EditOutlined /></Button>
            <Popconfirm title={t('products.deleteConfirm')} onConfirm={() => handleDelete(record.id)} disabled={!writable}>
              <Button size="small" type="link" danger disabled={!writable}><DeleteOutlined /></Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="abf-page">
      {error && <Alert message={error} type="error" showIcon className="abf-alert-page" />}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('common.readOnlyDesc')}
          type="info" showIcon className="abf-alert-page"
        />
      )}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStart} disabled={!writable || addMode || editingKey !== null}>
              {t('products.addSku')}
            </Button>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              {t('products.downloadTemplate')}
            </Button>
          </Col>
          <Col>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} disabled={!writable}>{t('products.import')}</Button>
          </Col>
          <Col>
            <RangePicker
              size="small"
              onChange={(_, dateStrings: string[]) => {
                if (dateStrings[0] && dateStrings[1]) setDateRange([dateStrings[0], dateStrings[1]]);
                else setDateRange(null);
              }}
              placeholder={['From', 'To']}
            />
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Input
                size="small"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={t('products.template')}
                style={{ width: 140 }}
                onPressEnter={handleSaveVersion}
              />
              <Button size="small" icon={<SaveOutlined />} onClick={handleSaveVersion} disabled={!writable}>{t('products.save')}</Button>
              <Button size="small" icon={<HistoryOutlined />} onClick={() => document.getElementById('sku-versions-section')?.scrollIntoView({ behavior: 'smooth' })}>{t('common.template')}</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Inline Add Form */}
      {addMode && (
        <Card size="small" style={{ marginBottom: 8, background: '#f0f5ff', borderColor: '#91d5ff' }}>
          <Form form={addForm} layout="inline">
            <Row gutter={8} style={{ width: '100%' }}>
              <Col span={2}><Form.Item name="skuCode" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" placeholder={t('products.skuCode')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={2}><Form.Item name="customer" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" placeholder={t('products.customer')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={2}><Form.Item name="deviceName" style={{ margin: 0 }}><Input size="small" placeholder={t('products.deviceName')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="osat" style={{ margin: 0 }}><Input size="small" placeholder="OSAT" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="application" style={{ margin: 0 }}><Select size="small" placeholder={t('products.application')} style={{ width: '100%' }} options={APP_OPTIONS} /></Form.Item></Col>
              <Col span={1}><Form.Item name="productGrade" style={{ margin: 0 }}><Input size="small" placeholder={t('products.productGrade')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="sizeCategory" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: '100%' }} options={SIZE_OPTIONS} /></Form.Item></Col>
              <Col span={1}><Form.Item name="chipLengthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} placeholder="L" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="chipWidthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} placeholder="W" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="layerCount" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={2} step={2} placeholder={t('products.layerCount')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="unitPrice" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0} step={0.01} precision={4} placeholder={t('products.unitPrice')} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="unitPriceCurrency" initialValue="USD" style={{ margin: 0 }}><Select size="small" options={CURRENCY_OPTIONS} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.chipLengthMm !== cur.chipLengthMm || prev.chipWidthMm !== cur.chipWidthMm}>
                  {({ getFieldValue }) => {
                    const l = getFieldValue('chipLengthMm');
                    const w = getFieldValue('chipWidthMm');
                    const upp = (l && w) ? calculateUPP(l, w) : '-';
                    return <Tag color="blue" style={{ marginTop: 4 }}>{t('products.upp')}: {upp}</Tag>;
                  }}
                </Form.Item>
              </Col>
              <Col span={1}>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.sizeCategory !== cur.sizeCategory || prev.layerCount !== cur.layerCount}>
                  {({ getFieldValue }) => {
                    const sc = getFieldValue('sizeCategory');
                    const lc = getFieldValue('layerCount');
                    const y = (sc && lc) ? getYieldEstimate(sc, lc) : '-';
                    return typeof y === 'number' ? <Tag color="green" style={{ marginTop: 4 }}>{t('products.yieldRate')}: {(y * 100).toFixed(1)}%</Tag> : null;
                  }}
                </Form.Item>
              </Col>
              <Col span={1.5}>
                <Space>
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleAddSave}>{t('products.save')}</Button>
                  <Button size="small" icon={<CloseOutlined />} onClick={handleAddCancel}>{t('products.cancel')}</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* Table with inline editing */}
      <Table<SKU>
        columns={columns}
        dataSource={filteredSkus}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} ${t('products.title')}` }}
        scroll={{ x: 'max-content' }}
        className="editable-table"
        rowClassName={(record) => isEditing(record) ? 'editing-row' : ''}
        expandable={{
          expandedRowKeys: editingKey ? [editingKey] : [],
          expandIcon: () => null,
          expandedRowRender: (sku) => (
            <EditFormRow sku={sku} onSave={handleEditSave} onCancel={handleEditCancel} t={t} />
          ),
        }}
      />

      {/* Version History */}
      <div id="sku-versions-section" style={{ marginTop: 16 }}>
        <Card title={t('common.template') + ' - ' + t('products.title')} extra={<HistoryOutlined />}>
          {versionsLoading ? (
            <Text type="secondary">{t('common.loading')}</Text>
          ) : versions.length === 0 ? (
            <Text type="secondary">{t('common.noData')}</Text>
          ) : (
            <Table size="small" dataSource={versions} rowKey="id" pagination={{ pageSize: 10 }} columns={[
              { title: t('products.template'), dataIndex: 'versionName', key: 'versionName', render: (v: string) => <Text strong>{v}</Text> },
              { title: t('products.title'), key: 'count', render: (_: any, r: any) => r.skus?.length || 0 },
              { title: t('forecasts.year'), dataIndex: 'createdAt', key: 'createdAt', render: (d: any) => formatDateTime(d) },
              {
                title: t('common.actions'), key: 'actions',
                render: (_: any, record: { id: string; versionName: string }) => (
                  <Space>
                    <Popconfirm title={`${t('common.confirm')} "${record.versionName}"?`} onConfirm={() => handleRestoreVersion(record.id)}>
                      <Button size="small" type="primary">{t('products.template')}</Button>
                    </Popconfirm>
                    <Popconfirm title={t('products.deleteConfirm')} onConfirm={() => handleDeleteVersion(record.id)}>
                      <Button size="small" danger>{t('common.delete')}</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]} />
          )}
        </Card>
      </div>

      {/* Import hint */}
      <Card size="small" style={{ marginTop: 16 }} title={`📋 ${t('products.import')}/${t('common.export')} ${t('common.template')}`}>
        <Space direction="vertical" size={8}>
          <div>
            <Text strong>{t('products.downloadTemplate')}: </Text>
            <Text type="secondary">{t('products.template')} - {t('common.template')}</Text>
          </div>
          <div>
            <Text strong>{t('products.import')} {t('common.template')}: </Text>
            <Text type="secondary">Excel/CSV — SKU Code, Customer, Device, OSAT, Application, Grade, Size (small/medium/large/xlarge), Chip Length, Chip Width, Layers, Price, Currency</Text>
          </div>
          <div>
            <Text strong>{t('products.upp')} & {t('products.yieldRate')}: </Text>
            <Text type="secondary">{t('products.upp')} & {t('products.yieldRate')} - {t('products.title')}</Text>
          </div>
          <div>
            <Text strong>{t('products.edit')}: </Text>
            <Text type="secondary">{t('products.edit')} - {t('products.save')}</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ProductsPage;

// Edit form component for expanded row
const EditFormRow: React.FC<{
  sku: SKU;
  onSave: (sku: SKU, form: any) => void;
  onCancel: () => void;
  t: (key: string) => string;
}> = ({ sku, onSave, onCancel, t }) => {
  const [form] = Form.useForm();

  return (
    <div style={{ padding: '12px 24px', background: '#f0f5ff' }}>
      <Form form={form} layout="vertical" initialValues={sku}>
        <Row gutter={16}>
          {/* Row 1: Basic Info */}
          <Col span={3}><Form.Item name="skuCode" label={t('products.skuCode')} rules={[{ required: true, message: t('common.required') }]}><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="customer" label={t('products.customer')} rules={[{ required: true, message: t('common.required') }]}><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="deviceName" label={t('products.deviceName')}><Input /></Form.Item></Col>
          <Col span={2}><Form.Item name="osat" label="OSAT"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="application" label={t('products.application')}><Select options={APP_OPTIONS} /></Form.Item></Col>
          <Col span={2}><Form.Item name="productGrade" label={t('products.productGrade')}><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="sizeCategory" label={t('products.sizeCategory')} rules={[{ required: true, message: t('common.required') }]}><Select options={SIZE_OPTIONS} /></Form.Item></Col>
          <Col span={5}></Col>
        </Row>
        <Row gutter={16}>
          {/* Row 2: Dimensions */}
          <Col span={3}><Form.Item name="chipLengthMm" label={t('products.chipLength')} rules={[{ required: true, message: t('common.required') }]}><InputNumber min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="chipWidthMm" label={t('products.chipWidth')} rules={[{ required: true, message: t('common.required') }]}><InputNumber min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="layerCount" label={t('products.layerCount')} rules={[{ required: true, message: t('common.required') }]}><InputNumber min={2} step={2} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="yieldEstimate" label={t('products.yieldRate')}><InputNumber min={0} max={1} step={0.01} precision={3} style={{ width: '100%' }} addonAfter="%" /></Form.Item></Col>
          <Col span={3}><Form.Item name="unitPrice" label={t('products.unitPrice')} rules={[{ required: true, message: t('common.required') }]}><InputNumber min={0} step={0.01} precision={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="unitPriceCurrency" label={t('products.unitPriceCurrency')} initialValue={sku.unitPriceCurrency ?? 'USD'}><Select options={CURRENCY_OPTIONS} /></Form.Item></Col>
          <Col span={6}></Col>
        </Row>
        <Row gutter={16}>
          {/* Row 3: Material Info */}
          <Col span={4}><Form.Item name="coreType" label={t('products.coreType')}><Select options={CORE_TYPE_OPTIONS} allowClear /></Form.Item></Col>
          <Col span={3}><Form.Item name="coreThicknessMm" label={t('products.coreThickness')}><InputNumber min={0} step={0.1} precision={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="abfType" label={t('products.abfType')}><Select options={ABF_TYPE_OPTIONS} allowClear /></Form.Item></Col>
          <Col span={13} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Space size="middle">
              <Tag color="blue">{t('products.upp')} & {t('products.yieldRate')} - {t('products.save')}</Tag>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(sku, form)}>{t('products.save')}</Button>
              <Button icon={<CloseOutlined />} onClick={onCancel}>{t('products.cancel')}</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
