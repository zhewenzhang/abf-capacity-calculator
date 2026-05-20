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

const CORE_TYPE_OPTIONS = ['E705G', 'E795G', 'E705GLH', 'E795GLH'].map(c => ({ label: c, value: c }));
const ABF_TYPE_OPTIONS = ['GL102', 'GL107', 'GXT31', 'GZ41'].map(a => ({ label: a, value: a }));

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
      values.upp = calculateUPP(values.chipLengthMm, values.chipWidthMm);
      values.yieldEstimate = getYieldEstimate(values.sizeCategory, values.layerCount);
      await saveSKU(userId, projectId, { ...sku, ...values });
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
          const chipLengthMm = parseFloat(row['Chip Length (mm)'] || row['Chip Length'] || row['chipLengthMm'] || row['Length (mm)']);
          const chipWidthMm = parseFloat(row['Chip Width (mm)'] || row['Chip Width'] || row['chipWidthMm'] || row['Width (mm)']);
          const layerCount = parseInt(row['Layers'] || row['layerCount'] || row['Layer Count']);
          const sizeCategory = (row['Size'] || row['sizeCategory'] || 'medium').toLowerCase() as SizeCategory;
          const skuCode = row['SKU Code'] || row['skuCode'] || row['SKU'];
          const customer = row['Customer'] || row['customer'] || '';
          if (!skuCode || !customer) continue;

          const rawYield = parseFloat(row['Yield Rate'] || row['yieldEstimate'] || row['Yield']);
          const yieldEstimate = (rawYield > 0 && rawYield <= 1) ? rawYield : getYieldEstimate(sizeCategory, layerCount);

          imported.push({
            skuCode, customer,
            deviceName: row['Device'] || row['deviceName'] || row['Device Name'] || '',
            osat: row['OSAT'] || row['osat'] || '',
            application: row['Application'] || row['application'] || '',
            productGrade: row['Grade'] || row['productGrade'] || '',
            sizeCategory, chipLengthMm, chipWidthMm, layerCount,
            unitPrice: parseFloat(row['Price'] || row['unitPrice'] || row['Unit Price']) || 0,
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
    { title: 'Chip (mm)', key: 'chip', width: 100, render: (_: any, r: SKU) => `${r.chipLengthMm} × ${r.chipWidthMm}` },
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
        return `${Math.round(y * 100)}%`;
      },
    },
    { title: 'Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 80, render: (v: number) => `$${v?.toFixed(1)}` },
    { title: 'Core', dataIndex: 'coreType', key: 'coreType', width: 90, render: (v: string) => v || '-' },
    { title: 'Core Thick', key: 'coreThick', width: 80, render: (_: any, r: SKU) => r.coreThicknessMm ? `${r.coreThicknessMm}mm` : '-' },
    { title: 'ABF', dataIndex: 'abfType', key: 'abfType', width: 80, render: (v: string) => v || '-' },
    {
      title: 'Updated', key: 'updatedAt', width: 90,
      render: (_: any, r: SKU) => (
        <Tooltip title={formatDateTime(r.updatedAt || r.createdAt)}>
          {formatDate(r.updatedAt || r.createdAt)}
        </Tooltip>
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 100, fixed: 'right' as const,
      render: (_: any, record: SKU) => {
        const editing = isEditing(record);
        return editing ? (
          <Space>
            <Button size="small" type="primary" icon={<SaveOutlined />} disabled>Save</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={handleEditCancel}>Cancel</Button>
          </Space>
        ) : (
          <Space>
            <Button size="small" type="link" onClick={() => handleEditStart(record)}><EditOutlined /></Button>
            <Popconfirm title="Delete this SKU?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" type="link" danger><DeleteOutlined /></Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStart} disabled={addMode || editingKey !== null}>
              Add SKU
            </Button>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Download Template
            </Button>
          </Col>
          <Col>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>Import Excel/CSV</Button>
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
                placeholder="Version name" 
                style={{ width: 140 }} 
                onPressEnter={handleSaveVersion} 
              />
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

      {/* Table with inline editing */}
      <Table<SKU>
        columns={columns}
        dataSource={filteredSkus}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        scroll={{ x: 'max-content' }}
        className="editable-table"
        rowClassName={(record) => isEditing(record) ? 'editing-row' : ''}
        expandable={{
          expandedRowKeys: editingKey ? [editingKey] : [],
          expandIcon: () => null,
          expandedRowRender: (sku) => (
            <EditFormRow sku={sku} onSave={handleEditSave} onCancel={handleEditCancel} />
          ),
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
      <Card size="small" style={{ marginTop: 16 }} title="📋 Import/Export Guide">
        <Space direction="vertical" size={8}>
          <div>
            <Text strong>Download Template: </Text>
            <Text type="secondary">Click "Download Template" to get a pre-formatted Excel file with sample data</Text>
          </div>
          <div>
            <Text strong>Import Format: </Text>
            <Text type="secondary">Excel/CSV — SKU Code, Customer, Device, OSAT, Application, Grade, Size (small/medium/large/xlarge), Chip Length, Chip Width, Layers, Price</Text>
          </div>
          <div>
            <Text strong>Auto-calculated: </Text>
            <Text type="secondary">UPP & Yield are automatically calculated from chip dimensions and size category</Text>
          </div>
          <div>
            <Text strong>Inline Editing: </Text>
            <Text type="secondary">Click the edit icon to modify a row directly. Changes are saved inline without expanding.</Text>
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
}> = ({ sku, onSave, onCancel }) => {
  const [form] = Form.useForm();

  return (
    <div style={{ padding: '12px 24px', background: '#f0f5ff' }}>
      <Form form={form} layout="vertical" initialValues={sku}>
        <Row gutter={16}>
          {/* Row 1: Basic Info */}
          <Col span={3}><Form.Item name="skuCode" label="SKU Code" rules={[{ required: true, message: 'Required' }]}><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="customer" label="Customer" rules={[{ required: true, message: 'Required' }]}><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="deviceName" label="Device"><Input /></Form.Item></Col>
          <Col span={2}><Form.Item name="osat" label="OSAT"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="application" label="Application"><Select options={APP_OPTIONS} /></Form.Item></Col>
          <Col span={2}><Form.Item name="productGrade" label="Grade"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="sizeCategory" label="Size" rules={[{ required: true, message: 'Required' }]}><Select options={SIZE_OPTIONS} /></Form.Item></Col>
          <Col span={5}></Col>
        </Row>
        <Row gutter={16}>
          {/* Row 2: Dimensions */}
          <Col span={3}><Form.Item name="chipLengthMm" label="Chip Length (mm)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="chipWidthMm" label="Chip Width (mm)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0.01} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="layerCount" label="Layers" rules={[{ required: true, message: 'Required' }]}><InputNumber min={2} step={2} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="yieldEstimate" label="Yield Rate"><InputNumber min={0} max={1} step={0.01} precision={3} style={{ width: '100%' }} addonAfter="%" /></Form.Item></Col>
          <Col span={3}><Form.Item name="unitPrice" label="Unit Price ($)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0} step={0.01} precision={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={9}></Col>
        </Row>
        <Row gutter={16}>
          {/* Row 3: Material Info */}
          <Col span={4}><Form.Item name="coreType" label="Core Type"><Select options={CORE_TYPE_OPTIONS} allowClear /></Form.Item></Col>
          <Col span={3}><Form.Item name="coreThicknessMm" label="Core Thickness (mm)"><InputNumber min={0} step={0.1} precision={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={4}><Form.Item name="abfType" label="ABF Type"><Select options={ABF_TYPE_OPTIONS} allowClear /></Form.Item></Col>
          <Col span={13} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Space size="middle">
              <Tag color="blue">UPP & Yield auto-calculated</Tag>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(sku, form)}>Save</Button>
              <Button icon={<CloseOutlined />} onClick={onCancel}>Cancel</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
