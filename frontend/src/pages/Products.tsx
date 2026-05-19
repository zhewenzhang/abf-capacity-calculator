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

const APP_OPTIONS = [
  'Mobile', 'Server', 'AI/ML', 'GPU', 'Automotive', 'IoT', '5G', 'Consumer', 'Networking', 'Other'
].map(a => ({ label: a, value: a }));

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

const ProductsPage: React.FC<ProductsPageProps> = ({ userId, projectId }) => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline add form
  const [addMode, setAddMode] = useState(false);
  const [addForm] = Form.useForm();

  // Expanded row for editing
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

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
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(userId, projectId, values);
      message.success('SKU added');
      setAddMode(false);
      addForm.resetFields();
      loadSKUs();
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to save SKU');
    }
  };

  // --- Inline edit via expandable row ---
  const handleEditStart = (sku: SKU) => {
    setExpandedKeys([sku.id]);
  };

  const handleEditCancel = () => {
    setExpandedKeys([]);
  };

  const handleEditSave = async (sku: SKU, form: any) => {
    try {
      const values = await form.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(userId, projectId, { ...sku, ...values });
      message.success('SKU updated');
      setExpandedKeys([]);
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
          const sizeCategory = (row['Size'] || row['sizeCategory'] || 'medium').toLowerCase() as SizeCategory;
          const skuCode = row['SKU Code'] || row['skuCode'] || row['SKU'];
          const customer = row['Customer'] || row['customer'] || '';
          if (!skuCode || !customer) continue;
          imported.push({
            skuCode, customer,
            deviceName: row['Device'] || row['deviceName'] || row['Device Name'] || '',
            osat: row['OSAT'] || row['osat'] || '',
            application: row['Application'] || row['application'] || '',
            productGrade: row['Grade'] || row['productGrade'] || '',
            sizeCategory, chipLengthMm, chipWidthMm, layerCount,
            unitPrice: parseFloat(row['Price'] || row['unitPrice'] || row['Unit Price']) || 0,
            upp: calculateUPP(chipLengthMm, chipWidthMm),
            yieldEstimate: getYieldEstimate(sizeCategory, layerCount),
          });
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
      const { deleteVersion } = await import('../services/skuVersionService');
      await deleteVersion(userId, projectId, versionId);
      message.success('Version deleted');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  // --- Table columns ---
  const columns: ColumnsType<SKU> = [
    { title: 'SKU Code', dataIndex: 'skuCode', key: 'skuCode', width: 120, sorter: (a, b) => a.skuCode.localeCompare(b.skuCode) },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', width: 100 },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName', width: 100 },
    { title: 'OSAT', dataIndex: 'osat', key: 'osat', width: 70 },
    { title: 'App', dataIndex: 'application', key: 'application', width: 80 },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade', width: 60 },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory', width: 70, render: (v: string) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { title: 'Chip (mm)', key: 'chip', width: 90, render: (_: any, r: SKU) => `${r.chipLengthMm} × ${r.chipWidthMm}` },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount', width: 60, align: 'center' as const },
    {
      title: 'UPP', key: 'upp', width: 60, align: 'center' as const,
      render: (_: any, r: SKU) => {
        const upp = r.upp ?? calculateUPP(r.chipLengthMm, r.chipWidthMm);
        return <Tooltip title="Auto-calculated from chip dimensions"><Tag color="blue">{upp}</Tag></Tooltip>;
      },
    },
    {
      title: 'Yield', key: 'yield', width: 60, align: 'center' as const,
      render: (_: any, r: SKU) => {
        const y = r.yieldEstimate ?? getYieldEstimate(r.sizeCategory, r.layerCount);
        return `${(y * 100).toFixed(1)}%`;
      },
    },
    { title: 'Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 80, render: (v: number) => `$${v?.toFixed(4)}` },
    {
      title: 'Updated', key: 'updatedAt', width: 90,
      render: (_: any, r: SKU) => (
        <Tooltip title={formatDateTime(r.updatedAt || r.createdAt)}>
          {formatDate(r.updatedAt || r.createdAt)}
        </Tooltip>
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
      render: (_: any, record: SKU) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleEditStart(record)}><EditOutlined /></Button>
          <Popconfirm title="Delete this SKU?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger><DeleteOutlined /></Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStart} disabled={addMode}>
              Add SKU
            </Button>
          </Col>
          <Col>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>Import Excel/CSV</Button>
          </Col>
          <Col>
            <RangePicker size="small" onChange={(_, dateStrings: string[]) => {
              if (dateStrings[0] && dateStrings[1]) setDateRange([dateStrings[0], dateStrings[1]]);
              else setDateRange(null);
            }} placeholder={['From', 'To']} />
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Input size="small" value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="Version name" style={{ width: 140 }} onPressEnter={handleSaveVersion} />
              <Button size="small" icon={<SaveOutlined />} onClick={handleSaveVersion}>Save Version</Button>
              <Button size="small" icon={<HistoryOutlined />} onClick={() => document.getElementById('sku-versions-section')?.scrollIntoView({ behavior: 'smooth' })}>Versions</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Inline Add Form */}
      {addMode && (
        <Card size="small" style={{ marginBottom: 8, background: '#f0f5ff', borderColor: '#91d5ff' }}>
          <Form form={addForm} layout="inline">
            <Row gutter={8} style={{ width: '100%' }}>
              <Col span={2}><Form.Item name="skuCode" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" placeholder="SKU Code" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={2}><Form.Item name="customer" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" placeholder="Customer" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={2}><Form.Item name="deviceName" style={{ margin: 0 }}><Input size="small" placeholder="Device" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="osat" style={{ margin: 0 }}><Input size="small" placeholder="OSAT" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="application" style={{ margin: 0 }}><Select size="small" placeholder="App" style={{ width: '100%' }} options={APP_OPTIONS} /></Form.Item></Col>
              <Col span={1}><Form.Item name="productGrade" style={{ margin: 0 }}><Input size="small" placeholder="Grade" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1.5}><Form.Item name="sizeCategory" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: '100%' }} options={SIZE_OPTIONS} /></Form.Item></Col>
              <Col span={1}><Form.Item name="chipLengthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} placeholder="L" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="chipWidthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} placeholder="W" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="layerCount" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={2} step={2} placeholder="Layers" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}><Form.Item name="unitPrice" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0} step={0.01} precision={4} placeholder="Price" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={1}>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.chipLengthMm !== cur.chipLengthMm || prev.chipWidthMm !== cur.chipWidthMm}>
                  {({ getFieldValue }) => {
                    const l = getFieldValue('chipLengthMm');
                    const w = getFieldValue('chipWidthMm');
                    const upp = (l && w) ? calculateUPP(l, w) : '-';
                    return <Tag color="blue" style={{ marginTop: 4 }}>UPP: {upp}</Tag>;
                  }}
                </Form.Item>
              </Col>
              <Col span={1}>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.sizeCategory !== cur.sizeCategory || prev.layerCount !== cur.layerCount}>
                  {({ getFieldValue }) => {
                    const sc = getFieldValue('sizeCategory');
                    const lc = getFieldValue('layerCount');
                    const y = (sc && lc) ? getYieldEstimate(sc, lc) : '-';
                    return typeof y === 'number' ? <Tag color="green" style={{ marginTop: 4 }}>Yield: {(y * 100).toFixed(1)}%</Tag> : null;
                  }}
                </Form.Item>
              </Col>
              <Col span={1.5}>
                <Space>
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleAddSave}>Save</Button>
                  <Button size="small" icon={<CloseOutlined />} onClick={handleAddCancel}>Cancel</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* Table with expandable edit rows */}
      <Table<SKU>
        columns={columns}
        dataSource={filteredSkus}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpand: (expanded, record) => {
            setExpandedKeys(expanded ? [record.id] : []);
          },
          expandedRowRender: (sku) => {
            return <EditFormRow sku={sku} onSave={(form) => handleEditSave(sku, form)} onCancel={handleEditCancel} />;
          },
        }}
      />

      {/* Version History */}
      <div id="sku-versions-section" style={{ marginTop: 16 }}>
        <Card title="SKU Version History" extra={<HistoryOutlined />}>
          {versionsLoading ? (
            <Text type="secondary">Loading...</Text>
          ) : versions.length === 0 ? (
            <Text type="secondary">No versions saved yet</Text>
          ) : (
            <Table size="small" dataSource={versions} rowKey="id" pagination={{ pageSize: 10 }} columns={[
              { title: 'Version', dataIndex: 'versionName', key: 'versionName', render: (v: string) => <Text strong>{v}</Text> },
              { title: 'SKUs', key: 'count', render: (_: any, r: any) => r.skus?.length || 0 },
              { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (d: any) => formatDateTime(d) },
              {
                title: 'Actions', key: 'actions',
                render: (_: any, record: { id: string; versionName: string }) => (
                  <Space>
                    <Popconfirm title={`Restore "${record.versionName}"?`} onConfirm={() => handleRestoreVersion(record.id)}>
                      <Button size="small" type="primary">Restore</Button>
                    </Popconfirm>
                    <Popconfirm title="Delete?" onConfirm={() => handleDeleteVersion(record.id)}>
                      <Button size="small" danger>Delete</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]} />
          )}
        </Card>
      </div>

      {/* Import hint */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          📋 <strong>Import format:</strong> Excel/CSV — SKU Code, Customer, Device, OSAT, Application, Grade, Size (small/medium/large/xlarge), Chip Length, Chip Width, Layers, Price | UPP & Yield auto-calculated
        </Text>
      </Card>
    </div>
  );
};

// Edit form rendered in expanded row
const EditFormRow: React.FC<{
  sku: SKU;
  onSave: (form: any) => void;
  onCancel: () => void;
}> = ({ sku, onSave, onCancel }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
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
  }, [sku.id, form]);

  return (
    <div style={{ padding: '8px 16px', background: '#fafafa' }}>
      <Text strong style={{ marginBottom: 8, display: 'block' }}>Editing: {sku.skuCode}</Text>
      <Form form={form} layout="inline">
        <Row gutter={8} style={{ width: '100%' }}>
          <Col span={2}><Form.Item name="skuCode" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={2}><Form.Item name="customer" style={{ margin: 0 }} rules={[{ required: true }]}><Input size="small" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={2}><Form.Item name="deviceName" style={{ margin: 0 }}><Input size="small" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1.5}><Form.Item name="osat" style={{ margin: 0 }}><Input size="small" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1.5}><Form.Item name="application" style={{ margin: 0 }}><Select size="small" style={{ width: '100%' }} options={APP_OPTIONS} /></Form.Item></Col>
          <Col span={1}><Form.Item name="productGrade" style={{ margin: 0 }}><Input size="small" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1.5}><Form.Item name="sizeCategory" style={{ margin: 0 }} rules={[{ required: true }]}><Select size="small" style={{ width: '100%' }} options={SIZE_OPTIONS} /></Form.Item></Col>
          <Col span={1}><Form.Item name="chipLengthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1}><Form.Item name="chipWidthMm" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1}><Form.Item name="layerCount" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={2} step={2} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1}><Form.Item name="unitPrice" style={{ margin: 0 }} rules={[{ required: true }]}><InputNumber size="small" min={0} step={0.01} precision={4} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={1.5}>
            <Space>
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => onSave(form)}>Save</Button>
              <Button size="small" icon={<CloseOutlined />} onClick={onCancel}>Cancel</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ProductsPage;
