import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Alert,
  Input,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { getForecasts, saveForecast, deleteForecast } from '../services/forecastService';
import { getSKUs } from '../services/skuService';
import { generateMonths } from '../core/defaults';
import type { Forecast, SKU } from '../types';
import { validateForecast } from '../core/validation';
import type { ColumnsType } from 'antd/es/table';

interface ForecastsPageProps {
  userId: string;
  projectId: string;
}

const ForecastsPage: React.FC<ForecastsPageProps> = ({ userId, projectId }) => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fcData, skuData] = await Promise.all([
        getForecasts(userId, projectId),
        getSKUs(userId, projectId),
      ]);
      setForecasts(fcData);
      setSkus(skuData);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, projectId]);

  const handleGenerate = async () => {
    if (skus.length === 0) {
      message.warning('Add SKUs first before generating forecasts');
      return;
    }
    const months = generateMonths(2026, 2028);
    const existing = new Map<string, Forecast>();
    for (const f of forecasts) {
      existing.set(`${f.skuId}-${f.month}`, f);
    }
    let created = 0;
    for (const sku of skus) {
      for (const month of months) {
        const key = `${sku.id}-${month}`;
        if (!existing.has(key)) {
          await saveForecast(userId, projectId, {
            skuId: sku.id,
            month,
            forecastPcs: 0,
            unitPrice: sku.unitPrice,
          });
          created++;
        }
      }
    }
    message.success(`Generated ${created} forecast rows`);
    loadData();
  };

  const handleAdd = () => {
    setEditingForecast(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (fc: Forecast) => {
    setEditingForecast(fc);
    form.setFieldsValue(fc);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteForecast(userId, projectId, id);
      message.success('Forecast deleted');
      loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const errors = validateForecast(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      if (editingForecast) {
        await saveForecast(userId, projectId, { ...editingForecast, ...values });
        message.success('Forecast updated');
      } else {
        await saveForecast(userId, projectId, values);
        message.success('Forecast created');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    }
  };

  const skuMap = new Map<string, SKU>();
  for (const s of skus) skuMap.set(s.id, s);

  const columns: ColumnsType<Forecast> = [
    { title: 'SKU', dataIndex: 'skuId', key: 'sku', render: (id: string) => skuMap.get(id)?.skuCode || id },
    { title: 'Month', dataIndex: 'month', key: 'month', sorter: (a, b) => a.month.localeCompare(b.month) },
    {
      title: 'Forecast PCS',
      dataIndex: 'forecastPcs',
      key: 'forecastPcs',
      sorter: (a, b) => a.forecastPcs - b.forecastPcs,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (v: number) => `$${v.toFixed(4)}`,
    },
    {
      title: 'Revenue',
      key: 'revenue',
      render: (_: any, r: Forecast) => `$${(r.forecastPcs * r.unitPrice).toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Forecast) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Forecast
        </Button>
        <Button icon={<ThunderboltOutlined />} onClick={handleGenerate}>
          Generate 2026-2028
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={forecasts}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 50 }}
      />
      <Modal
        title={editingForecast ? 'Edit Forecast' : 'Add Forecast'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="skuId" label="SKU" rules={[{ required: true }]}>
            <Select options={skus.map((s) => ({ label: s.skuCode, value: s.id }))} />
          </Form.Item>
          <Form.Item name="month" label="Month (YYYY-MM)" rules={[{ required: true, pattern: /^\d{4}-\d{2}$/ }]}>
            <Input placeholder="2026-01" />
          </Form.Item>
          <Form.Item name="forecastPcs" label="Forecast PCS" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unitPrice" label="Unit Price ($)">
            <InputNumber min={0} step={0.01} precision={4} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ForecastsPage;
