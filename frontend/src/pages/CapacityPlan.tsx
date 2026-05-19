import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Alert,
  Tag,
  Input,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { getCapacityPlans, saveCapacityPlan, deleteCapacityPlan } from '../services/capacityService';
import { generateDefaultCapacityPlans } from '../core/defaults';
import type { CapacityPlan } from '../types';
import { validateCapacityPlan } from '../core/validation';
import type { ColumnsType } from 'antd/es/table';

interface CapacityPlanPageProps {
  userId: string;
  projectId: string;
}

const CapacityPlanPage: React.FC<CapacityPlanPageProps> = ({ userId, projectId }) => {
  const [plans, setPlans] = useState<CapacityPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CapacityPlan | null>(null);
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCapacityPlans(userId, projectId);
      setPlans(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load capacity plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [userId, projectId]);

  const handleGenerateDefaults = async () => {
    const defaults = generateDefaultCapacityPlans();
    let count = 0;
    for (const d of defaults) {
      await saveCapacityPlan(userId, projectId, d);
      count++;
    }
    message.success(`Generated ${count} capacity plan rows`);
    loadPlans();
  };

  const handleAdd = () => {
    setEditingPlan(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (plan: CapacityPlan) => {
    setEditingPlan(plan);
    form.setFieldsValue(plan);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCapacityPlan(userId, projectId, id);
      message.success('Plan deleted');
      loadPlans();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const errors = validateCapacityPlan(values);
      if (errors.length > 0) {
        message.error(errors.map((e) => e.message).join(', '));
        return;
      }
      if (editingPlan) {
        await saveCapacityPlan(userId, projectId, { ...editingPlan, ...values });
        message.success('Plan updated');
      } else {
        await saveCapacityPlan(userId, projectId, values);
        message.success('Plan created');
      }
      setModalOpen(false);
      loadPlans();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    }
  };

  const columns: ColumnsType<CapacityPlan> = [
    { title: 'Month', dataIndex: 'month', key: 'month', sorter: (a, b) => a.month.localeCompare(b.month) },
    { title: 'Working Days', dataIndex: 'workingDays', key: 'workingDays' },
    { title: 'Core Panel/Day', dataIndex: 'corePanelPerDay', key: 'corePanelPerDay', render: (v: number) => v.toLocaleString() },
    { title: 'BU Panel/Day', dataIndex: 'buPanelPerDay', key: 'buPanelPerDay', render: (v: number) => (v === 0 ? <Tag color="orange">0</Tag> : v.toLocaleString()) },
    {
      title: 'Core Capacity',
      key: 'coreCap',
      render: (_: any, r: CapacityPlan) => (r.corePanelPerDay * r.workingDays).toLocaleString(),
    },
    {
      title: 'BU Capacity',
      key: 'buCap',
      render: (_: any, r: CapacityPlan) => (r.buPanelPerDay * r.workingDays).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CapacityPlan) => (
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
          Add Plan
        </Button>
        <Popconfirm
          title="This will generate default capacity plans for 2026-2028. Existing plans will not be overwritten. Continue?"
          onConfirm={handleGenerateDefaults}
        >
          <Button icon={<SyncOutlined />}>Generate Defaults</Button>
        </Popconfirm>
      </Space>
      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 36 }}
      />
      <Modal
        title={editingPlan ? 'Edit Capacity Plan' : 'Add Capacity Plan'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="month" label="Month (YYYY-MM)" rules={[{ required: true, pattern: /^\d{4}-\d{2}$/ }]}>
            <Input placeholder="2026-01" />
          </Form.Item>
          <Form.Item name="workingDays" label="Working Days" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="corePanelPerDay" label="Core Panel/Day" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="buPanelPerDay" label="BU Panel/Day" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CapacityPlanPage;
