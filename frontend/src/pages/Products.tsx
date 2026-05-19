import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Alert,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSKUs, saveSKU, deleteSKU } from '../services/skuService';
import type { SKU, SizeCategory } from '../types';
import { validateSKU } from '../core/validation';
import type { ColumnsType } from 'antd/es/table';

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

const ProductsPage: React.FC<ProductsPageProps> = ({ userId, projectId }) => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadSKUs();
  }, [userId, projectId]);

  const handleAdd = () => {
    setEditingSku(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (sku: SKU) => {
    setEditingSku(sku);
    form.setFieldsValue(sku);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSKU(userId, projectId, id);
      message.success('SKU deleted');
      loadSKUs();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete SKU');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const errors = validateSKU(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      if (editingSku) {
        await saveSKU(userId, projectId, { ...editingSku, ...values });
        message.success('SKU updated');
      } else {
        await saveSKU(userId, projectId, values);
        message.success('SKU created');
      }
      setModalOpen(false);
      loadSKUs();
    } catch (e: any) {
      message.error(e.message || 'Failed to save SKU');
    }
  };

  const columns: ColumnsType<SKU> = [
    { title: 'SKU Code', dataIndex: 'skuCode', key: 'skuCode', sorter: (a, b) => a.skuCode.localeCompare(b.skuCode) },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName' },
    { title: 'OSAT', dataIndex: 'osat', key: 'osat' },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade' },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory', render: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
    { title: 'Chip (mm)', key: 'chip', render: (_: any, r: SKU) => `${r.chipLengthMm} × ${r.chipWidthMm}` },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount' },
    { title: 'Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `$${v.toFixed(4)}` },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SKU) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this SKU?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add SKU
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={skus}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={editingSku ? 'Edit SKU' : 'Add SKU'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="skuCode" label="SKU Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customer" label="Customer" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="deviceName" label="Device Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="osat" label="OSAT">
            <Input />
          </Form.Item>
          <Form.Item name="application" label="Application">
            <Input />
          </Form.Item>
          <Form.Item name="productGrade" label="Product Grade">
            <Input />
          </Form.Item>
          <Form.Item name="sizeCategory" label="Size Category" rules={[{ required: true }]}>
            <Select options={SIZE_OPTIONS} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chipLengthMm" label="Chip Length (mm)" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chipWidthMm" label="Chip Width (mm)" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="layerCount" label="Layer Count" rules={[{ required: true }]}>
            <InputNumber min={2} step={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unitPrice" label="Unit Price ($)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} precision={4} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
