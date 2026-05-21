import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Modal,
  Space,
  Tag,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useList, useDelete, useCreate, useUpdate } from '@refinedev/core';
import { ExperimentalBanner } from '../components/common';
import { validateSKU } from '../core/validation';
import { DEFAULT_YIELD_MATRIX } from '../core/defaults';
import type { SKU, SizeCategory } from '../types';

const { Text } = Typography;
const VALID_SIZES: SizeCategory[] = ['small', 'medium', 'large', 'xlarge'];
const CORE_TYPES = ['E705G', 'E795G', 'E705GLH', 'E795GLH'];
const ABF_TYPES = ['GL102', 'GL107', 'GXT31', 'GZ41'];
const LAYER_BUCKETS = ['4-8L', '10-14L', '16-20L', '20L+'];

interface ProductsRefineLabProps {
  userId: string;
  projectId: string;
}

const ProductsRefineLab: React.FC<ProductsRefineLabProps> = ({ userId, projectId }) => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Refine hooks
  const meta = useMemo(() => ({ userId, projectId }), [userId, projectId]);
  const { result: listResult, query: listQuery } = useList<SKU>({ resource: 'skus', meta });
  const { mutate: mutateDelete } = useDelete<SKU>();
  const { mutate: mutateCreate } = useCreate<SKU>();
  const { mutate: mutateUpdate } = useUpdate<SKU>();

  const skus = (listResult?.data ?? []) as SKU[];
  const isLoading = listQuery.isLoading;

  // Compute UPP
  const calcUpp = useCallback((chipL: number, chipW: number): number | undefined => {
    if (!chipL || !chipW) return undefined;
    const areaMm2 = chipL * chipW;
    if (areaMm2 <= 20) return 396;
    if (areaMm2 <= 50) return 200;
    if (areaMm2 <= 100) return 99;
    if (areaMm2 <= 200) return 35;
    return 12;
  }, []);

  // Compute yield estimate
  const calcYield = useCallback((size: SizeCategory, layers: number): number | undefined => {
    if (!size || !layers) return undefined;
    const bucket = LAYER_BUCKETS.find((b) => {
      if (b === '4-8L') return layers >= 4 && layers <= 8;
      if (b === '10-14L') return layers >= 10 && layers <= 14;
      if (b === '16-20L') return layers >= 16 && layers <= 20;
      return layers > 20;
    });
    return bucket ? DEFAULT_YIELD_MATRIX[size][bucket as keyof typeof DEFAULT_YIELD_MATRIX.small] : undefined;
  }, []);

  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({ unitPrice: 0, layerCount: 8 });
    setEditingId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (record: SKU) => {
    form.setFieldsValue(record);
    setEditingId(record.id);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    mutateDelete({ resource: 'skus', id, meta }, { onSuccess: () => message.success('SKU deleted') });
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const sku = values as Partial<SKU>;
      const errors = validateSKU(sku);
      if (errors.length > 0) {
        form.setFields(errors.map((e) => ({ name: e.field, errors: [e.message] })));
        return;
      }
      // Auto-calc UPP and yield
      const upp = calcUpp(sku.chipLengthMm!, sku.chipWidthMm!);
      const yieldEstimate = calcYield(sku.sizeCategory!, sku.layerCount!);
      const payload = { ...sku, upp, yieldEstimate };

      if (editingId) {
        mutateUpdate({ resource: 'skus', id: editingId, values: payload, meta }, { onSuccess: () => { message.success('SKU updated'); setModalOpen(false); } });
      } else {
        mutateCreate({ resource: 'skus', values: payload, meta }, { onSuccess: () => { message.success('SKU created'); setModalOpen(false); } });
      }
    });
  };

  const columns: ColumnsType<SKU> = [
    { title: 'SKU Code', dataIndex: 'skuCode', key: 'skuCode', width: 100, ellipsis: true },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', width: 90, ellipsis: true },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName', width: 90, ellipsis: true },
    { title: 'OSAT', dataIndex: 'osat', key: 'osat', width: 70 },
    { title: 'Application', dataIndex: 'application', key: 'application', width: 90, ellipsis: true },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade', width: 70 },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Chip (mm)', key: 'chip', width: 80, render: (_: any, r: SKU) => `${r.chipLengthMm}×${r.chipWidthMm}` },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount', width: 60, align: 'right' },
    {
      title: 'UPP',
      dataIndex: 'upp',
      key: 'upp',
      width: 50,
      align: 'right',
      render: (v: number | undefined, r: SKU) => v ?? calcUpp(r.chipLengthMm, r.chipWidthMm) ?? '-',
    },
    {
      title: 'Yield',
      dataIndex: 'yieldEstimate',
      key: 'yieldEstimate',
      width: 60,
      align: 'right',
      render: (v: number | undefined, r: SKU) => {
        const est = v ?? calcYield(r.sizeCategory, r.layerCount);
        return est ? `${(est * 100).toFixed(0)}%` : '-';
      },
    },
    {
      title: 'Price (USD)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 80,
      align: 'right',
      render: (v: number) => v != null ? v.toFixed(2) : '-',
    },
    { title: 'Core', dataIndex: 'coreType', key: 'coreType', width: 80, ellipsis: true },
    {
      title: 'Thick',
      dataIndex: 'coreThicknessMm',
      key: 'coreThicknessMm',
      width: 55,
      align: 'right',
      render: (v: number | undefined) => v != null ? `${v}mm` : '-',
    },
    { title: 'ABF', dataIndex: 'abfType', key: 'abfType', width: 60, ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: any, r: SKU) => (
        <Space size={4}>
          <Tooltip title="Edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)} /></Tooltip>
          <Popconfirm title="Delete this SKU?" onConfirm={() => handleDelete(r.id)}>
            <Tooltip title="Delete"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Auto-calc UPP / yield on form change
  const watchChipL = Form.useWatch('chipLengthMm', form);
  const watchChipW = Form.useWatch('chipWidthMm', form);
  const watchSize = Form.useWatch('sizeCategory', form);
  const watchLayers = Form.useWatch('layerCount', form);

  React.useEffect(() => {
    if (watchChipL && watchChipW) {
      form.setFieldValue('upp', calcUpp(watchChipL, watchChipW));
    }
  }, [watchChipL, watchChipW, form, calcUpp]);

  React.useEffect(() => {
    if (watchSize && watchLayers) {
      form.setFieldValue('yieldEstimate', calcYield(watchSize, watchLayers));
    }
  }, [watchSize, watchLayers, form, calcYield]);

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <ExperimentalBanner
        label="Products Refine Lab"
        description={
          <>
            Experimental SKU management using <Text code>@refinedev/core</Text> + <Text code>@refinedev/react-router</Text>
            with existing Ant Design components. Data is shared with the production Products page.
            <br />
            <Text type="secondary">Not included: Excel import/export, template download, SKU version history.</Text>
          </>
        }
      />

      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Add SKU
        </Button>
      </div>

      <Table<SKU>
        columns={columns}
        dataSource={skus}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
        className="app-table"
      />

      <Modal
        title={editingId ? 'Edit SKU' : 'Create SKU'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item label="SKU Code" name="skuCode" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Customer" name="customer" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Device Name" name="deviceName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="OSAT" name="osat"><Input /></Form.Item>
          <Form.Item label="Application" name="application"><Input /></Form.Item>
          <Form.Item label="Product Grade" name="productGrade"><Input /></Form.Item>
          <Form.Item label="Size Category" name="sizeCategory" rules={[{ required: true }]}>
            <Select>
              {VALID_SIZES.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Space>
            <Form.Item label="Chip Length (mm)" name="chipLengthMm" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.1} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Chip Width (mm)" name="chipWidthMm" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.1} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item label="Layer Count" name="layerCount" rules={[{ required: true }]}>
            <InputNumber min={2} step={2} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="UPP" name="upp">
            <InputNumber disabled style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="Yield Estimate" name="yieldEstimate">
            <InputNumber disabled formatter={(v: any) => v != null ? `${((v as number) * 100).toFixed(0)}%` : ''} style={{ width: 100 }} parser={(v: any) => Number(String(v).replace('%', '')) / 100} />
          </Form.Item>
          <Form.Item label="Unit Price (USD)" name="unitPrice" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="Core Type" name="coreType">
            <Select allowClear>
              {CORE_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Core Thickness (mm)" name="coreThicknessMm">
            <InputNumber min={0} step={0.01} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="ABF Type" name="abfType">
            <Select allowClear>
              {ABF_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsRefineLab;
