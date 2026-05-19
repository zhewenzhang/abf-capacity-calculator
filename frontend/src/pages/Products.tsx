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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { getSKUs, saveSKU, deleteSKU, batchSaveSKUs } from '../services/skuService';
import { saveVersion, getVersions, restoreVersion } from '../services/skuVersionService';
import type { SKU, SizeCategory } from '../types';
import { validateSKU } from '../core/validation';
import { DEFAULT_YIELD_MATRIX } from '../core/defaults';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ProductsPageProps {
  userId: string;
  projectId: string;
}

const SIZE_OPTIONS: { label: string; value: SizeCategory }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'XLarge', value: 'xlarge' },
];

const APPLICATION_OPTIONS = [
  'Mobile', 'Server', 'AI/ML', 'GPU', 'Automotive', 'IoT', '5G', 'Consumer', 'Networking', 'Other'
];

// UPP calculation from Excel formula
function calculateUPP(chipLengthMm: number, chipWidthMm: number): number {
  const PL = 244.1;  // panel length
  const PW = 246.2;  // panel width
  const ML = 10;     // margin length
  const MW = 5.3;    // margin width
  const T = 0.3;     // tolerance

  // Orientation 1: length along panel length
  const nL1 = Math.floor((PL - ML + T) / (chipLengthMm + T));
  const nW1 = Math.floor((PW - MW + T) / (chipWidthMm + T));
  const upp1 = Math.max(nL1 * nW1 * 4, 0);

  // Orientation 2: swapped
  const nL2 = Math.floor((PL - ML + T) / (chipWidthMm + T));
  const nW2 = Math.floor((PW - MW + T) / (chipLengthMm + T));
  const upp2 = Math.max(nL2 * nW2 * 4, 0);

  return Math.max(upp1, upp2);
}

function getYieldEstimate(sizeCategory: SizeCategory, layerCount: number): number {
  const bucket = layerCount <= 8 ? '4-8L' : layerCount <= 14 ? '10-14L' : layerCount <= 20 ? '16-20L' : '20L+';
  return DEFAULT_YIELD_MATRIX[sizeCategory][bucket] || 0;
}

function formatDate(date: Date | undefined | string): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : (date as any).toDate ? (date as any).toDate() : new Date(date);
  return d.toLocaleDateString();
}

function formatDateTime(date: Date | undefined | string): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : (date as any).toDate ? (date as any).toDate() : new Date(date);
  return d.toLocaleString();
}

const ProductsPage: React.FC<ProductsPageProps> = ({ userId, projectId }) => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Inline new row
  const [inlineMode, setInlineMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm] = Form.useForm();

  // Date filter
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Versions
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionName, setVersionName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSKUs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSKUs(userId, projectId);
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
      const v = await getVersions(userId, projectId);
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
  }, [userId, projectId]);

  // Filter by date
  const filteredSkus = useMemo(() => {
    if (!dateRange) return skus;
    return skus.filter((s) => {
      const d = s.updatedAt || s.createdAt;
      if (!d) return false;
      const date = d instanceof Date ? d : (d as any).toDate ? (d as any).toDate() : new Date(d);
      return date >= dateRange[0] && date <= dateRange[1];
    });
  }, [skus, dateRange]);

  // --- Inline add ---
  const handleInlineAdd = () => {
    setInlineMode(true);
    form.resetFields();
  };

  const handleInlineCancel = () => {
    setInlineMode(false);
    form.resetFields();
  };

  const handleInlineSave = async () => {
    try {
      const values = await form.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      // Calculate UPP
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(userId, projectId, values);
      message.success('SKU added');
      setInlineMode(false);
      form.resetFields();
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to save SKU');
    }
  };

  // --- Inline edit ---
  const handleInlineEdit = (sku: SKU) => {
    setEditingId(sku.id);
    editForm.setFieldsValue({
      skuCode: sku.skuCode,
      customer: sku.customer,
      deviceName: sku.deviceName,
      osat: sku.osat,
      application: sku.application,
      productGrade: sku.productGrade,
      sizeCategory: sku.sizeCategory,
      chipLengthMm: sku.chipLengthMm,
      chipWidthMm: sku.chipWidthMm,
      layerCount: sku.layerCount,
      unitPrice: sku.unitPrice,
    });
  };

  const handleInlineEditCancel = () => {
    setEditingId(null);
    editForm.resetFields();
  };

  const handleInlineEditSave = async (sku: SKU) => {
    try {
      const values = await editForm.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(userId, projectId, { ...sku, ...values });
      message.success('SKU updated');
      setEditingId(null);
      editForm.resetFields();
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to update SKU');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSKU(userId, projectId, id);
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
          const chipLengthMm = parseFloat(row['Chip Length'] || row['chipLengthMm'] || row['Length (mm)']);
          const chipWidthMm = parseFloat(row['Chip Width'] || row['chipWidthMm'] || row['Width (mm)']);
          const layerCount = parseInt(row['Layers'] || row['layerCount'] || row['Layer Count']);
          const sizeCategory = (row['Size'] || row['sizeCategory'] || 'medium').toLowerCase();
          const sku = {
            skuCode: row['SKU Code'] || row['skuCode'] || row['SKU'],
            customer: row['Customer'] || row['customer'] || '',
            deviceName: row['Device'] || row['deviceName'] || row['Device Name'] || '',
            osat: row['OSAT'] || row['osat'] || '',
            application: row['Application'] || row['application'] || '',
            productGrade: row['Grade'] || row['productGrade'] || '',
            sizeCategory,
            chipLengthMm,
            chipWidthMm,
            layerCount,
            unitPrice: parseFloat(row['Price'] || row['unitPrice'] || row['Unit Price']),
            upp: calculateUPP(chipLengthMm, chipWidthMm),
            yieldEstimate: getYieldEstimate(sizeCategory as SizeCategory, layerCount),
          };
          if (!sku.skuCode || !sku.customer) continue;
          imported.push(sku);
        }

        if (imported.length === 0) {
          message.error('No valid SKUs found in file');
          return;
        }

        await batchSaveSKUs(userId, projectId, imported);
        message.success(`Imported ${imported.length} SKUs`);
        loadSKUs();
        loadVersions();
      } catch (e: any) {
        message.error(e.message || 'Failed to import');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Version management ---
  const handleSaveVersion = async () => {
    const name = versionName.trim() || `SKU v${versions.length + 1}`;
    try {
      await saveVersion(userId, projectId, name, skus);
      message.success(`Version "${name}" saved`);
      setVersionName('');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to save version');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const vList = await getVersions(userId, projectId);
      const ver = vList.find((v) => v.id === versionId);
      if (!ver) return;
      const restored = restoreVersion(ver);
      // Save each restored SKU
      for (const sku of restored.skus) {
        await saveSKU(userId, projectId, sku);
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
      // Import from skuVersionService
      const { deleteVersion } = await import('../services/skuVersionService');
      await deleteVersion(userId, projectId, versionId);
      message.success('Version deleted');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  // --- Columns ---
  const columns: ColumnsType<SKU> = [
    { title: 'SKU Code', dataIndex: 'skuCode', key: 'skuCode', width: 120, sorter: (a, b) => a.skuCode.localeCompare(b.skuCode) },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', width: 100 },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName', width: 100 },
    { title: 'OSAT', dataIndex: 'osat', key: 'osat', width: 80 },
    { title: 'App', dataIndex: 'application', key: 'application', width: 90 },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade', width: 70 },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory', width: 80, render: (v: string) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { title: 'Chip (mm)', key: 'chip', width: 100, render: (_: any, r: SKU) => `${r.chipLengthMm} × ${r.chipWidthMm}` },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount', width: 70, align: 'center' as const },
    {
      title: 'UPP',
      key: 'upp',
      width: 70,
      align: 'center' as const,
      render: (_: any, r: SKU) => (
        <Tooltip title={`=MAX(⌊(244.1-10+0.3)/(${r.chipLengthMm}+0.3)⌋×⌊(246.2-5.3+0.3)/(${r.chipWidthMm}+0.3)⌋×4, swapped)`}>
          <Tag color="blue">{r.upp || calculateUPP(r.chipLengthMm, r.chipWidthMm)}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Yield',
      key: 'yield',
      width: 70,
      align: 'center' as const,
      render: (_: any, r: SKU) => {
        const y = r.yieldEstimate ?? getYieldEstimate(r.sizeCategory, r.layerCount);
        return `${(y * 100).toFixed(1)}%`;
      },
    },
    { title: 'Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 90, render: (v: number) => `$${v?.toFixed(4)}` },
    {
      title: 'Updated',
      key: 'updatedAt',
      width: 100,
      render: (_: any, r: SKU) => (
        <Tooltip title={formatDateTime(r.updatedAt || r.createdAt)}>
          {formatDate(r.updatedAt || r.createdAt)}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: SKU) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button size="small" type="link" onClick={() => handleInlineEditSave(record)}>
                <SaveOutlined />
              </Button>
              <Button size="small" type="link" onClick={handleInlineEditCancel}>
                <CloseOutlined />
              </Button>
            </Space>
          );
        }
        return (
          <Space>
            <Button size="small" type="link" onClick={() => handleInlineEdit(record)}>
              <EditOutlined />
            </Button>
            <Popconfirm title="Delete this SKU?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" type="link" danger>
                <DeleteOutlined />
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // Inline add row form
  const inlineAddRow = inlineMode ? [
    {
      title: (
        <Text strong style={{ color: '#1890ff' }}>➕ New SKU</Text>
      ),
      dataIndex: 'form',
      key: 'form',
      colSpan: 14,
      render: () => null,
    },
    { title: 'SKU Code', key: 'skuCode', dataIndex: 'skuCode', width: 120, render: () => <Form.Item name="skuCode" style={{ margin: 0 }}><Input size="small" placeholder="SKU Code" /></Form.Item> },
    { title: 'Customer', key: 'customer', width: 100, render: () => <Form.Item name="customer" style={{ margin: 0 }}><Input size="small" placeholder="Customer" /></Form.Item> },
    { title: 'Device', key: 'deviceName', width: 100, render: () => <Form.Item name="deviceName" style={{ margin: 0 }}><Input size="small" placeholder="Device" /></Form.Item> },
    { title: 'OSAT', key: 'osat', width: 80, render: () => <Form.Item name="osat" style={{ margin: 0 }}><Input size="small" placeholder="OSAT" /></Form.Item> },
    { title: 'App', key: 'application', width: 90, render: () => (
      <Form.Item name="application" style={{ margin: 0 }}>
        <Select size="small" placeholder="App" options={APPLICATION_OPTIONS.map(a => ({ label: a, value: a }))} />
      </Form.Item>
    )},
    { title: 'Grade', key: 'productGrade', width: 70, render: () => <Form.Item name="productGrade" style={{ margin: 0 }}><Input size="small" placeholder="Grade" /></Form.Item> },
    { title: 'Size', key: 'sizeCategory', width: 80, render: () => (
      <Form.Item name="sizeCategory" style={{ margin: 0 }} rules={[{ required: true }]}>
        <Select size="small" options={SIZE_OPTIONS} />
      </Form.Item>
    )},
    { title: 'Chip L', key: 'chipLengthMm', width: 80, render: () => <Form.Item name="chipLengthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item> },
    { title: 'Chip W', key: 'chipWidthMm', width: 80, render: () => <Form.Item name="chipWidthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item> },
    { title: 'Layers', key: 'layerCount', width: 70, render: () => <Form.Item name="layerCount" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={2} step={2} style={{ width: '100%' }} /></Form.Item> },
    { title: 'UPP', key: 'upp', width: 70, render: () => (
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.chipLengthMm !== cur.chipLengthMm || prev.chipWidthMm !== cur.chipWidthMm}>
        {({ getFieldValue }) => {
          const l = getFieldValue('chipLengthMm');
          const w = getFieldValue('chipWidthMm');
          const upp = (l && w) ? calculateUPP(l, w) : '-';
          return <Tag color="blue">{upp}</Tag>;
        }}
      </Form.Item>
    )},
    { title: 'Yield', key: 'yield', width: 70, render: () => (
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.sizeCategory !== cur.sizeCategory || prev.layerCount !== cur.layerCount}>
        {({ getFieldValue }) => {
          const sc = getFieldValue('sizeCategory');
          const lc = getFieldValue('layerCount');
          const y = (sc && lc) ? getYieldEstimate(sc, lc) : '-';
          return typeof y === 'number' ? `${(y * 100).toFixed(1)}%` : '-';
        }}
      </Form.Item>
    )},
    { title: 'Price', key: 'unitPrice', width: 90, render: () => <Form.Item name="unitPrice" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0} step={0.01} precision={4} style={{ width: '100%' }} /></Form.Item> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: () => (
        <Space>
          <Button size="small" type="link" onClick={handleInlineSave}><SaveOutlined /></Button>
          <Button size="small" type="link" onClick={handleInlineCancel}><CloseOutlined /></Button>
        </Space>
      ),
    },
  ] : [];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleInlineAdd} disabled={inlineMode}>
              Add SKU
            </Button>
          </Col>
          <Col>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              Import Excel/CSV
            </Button>
          </Col>
          <Col>
            <RangePicker
              size="small"
              onChange={(_, dateStrings: string[]) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
              placeholder={['From date', 'To date']}
            />
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Input
                size="small"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Version name"
                style={{ width: 140 }}
                onPressEnter={handleSaveVersion}
              />
              <Button size="small" icon={<SaveOutlined />} onClick={handleSaveVersion}>
                Save Version
              </Button>
              <Button size="small" icon={<HistoryOutlined />} onClick={() => {
                const el = document.getElementById('sku-versions-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Versions
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table<SKU>
        columns={inlineMode ? (inlineAddRow as any) : columns}
        dataSource={inlineMode ? [...filteredSkus] : filteredSkus}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
      />

      {/* Version History */}
      <div id="sku-versions-section" style={{ marginTop: 16 }}>
        <Card title="SKU Version History" extra={<HistoryOutlined />}>
          {versionsLoading ? (
            <Text type="secondary">Loading...</Text>
          ) : versions.length === 0 ? (
            <Text type="secondary">No versions saved yet</Text>
          ) : (
            <Table
              size="small"
              dataSource={versions}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Version', dataIndex: 'versionName', key: 'versionName', render: (v: string) => <Text strong>{v}</Text> },
                { title: 'SKUs', key: 'count', render: (_: any, r: any) => r.skus?.length || 0 },
                { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (d: any) => formatDateTime(d) },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_: any, record: { id: string; versionName: string }) => (
                    <Space>
                      <Popconfirm title={`Restore "${record.versionName}"?`} onConfirm={() => handleRestoreVersion(record.id)}>
                        <Button size="small" type="primary">Restore</Button>
                      </Popconfirm>
                      <Popconfirm title="Delete this version?" onConfirm={() => handleDeleteVersion(record.id)}>
                        <Button size="small" danger>Delete</Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      {/* Import template download hint */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          📋 <strong>Import format:</strong> Excel/CSV columns — SKU Code, Customer, Device, OSAT, Application, Grade, Size (small/medium/large/xlarge), Chip Length, Chip Width, Layers, Price
          {' '}| UPP and Yield are auto-calculated
        </Text>
      </Card>
    </div>
  );
};

export default ProductsPage;
