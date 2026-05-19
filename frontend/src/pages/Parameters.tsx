import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Table,
  Button,
  Space,
  message,
  Alert,
  Popconfirm,
} from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { getParameters, saveParameters } from '../services/parameterService';
import type { ProjectParameters, SizeCategory, LayerBucket } from '../types';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS, DEFAULT_WORKING_DAYS } from '../core/defaults';

interface ParametersPageProps {
  userId: string;
  projectId: string;
}

const SIZES: SizeCategory[] = ['small', 'medium', 'large', 'xlarge'];
const BUCKETS: LayerBucket[] = ['4-8L', '10-14L', '16-20L', '20L+'];

const ParametersPage: React.FC<ParametersPageProps> = ({ userId, projectId }) => {
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadParams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getParameters(userId, projectId);
      setParams(data);
      form.setFieldsValue({
        defaultWorkingDays: data.defaultWorkingDays || DEFAULT_WORKING_DAYS,
        panelLengthMm: data.panelParams.panelLengthMm,
        panelWidthMm: data.panelParams.panelWidthMm,
        marginLengthMm: data.panelParams.marginLengthMm,
        marginWidthMm: data.panelParams.marginWidthMm,
        toleranceMm: data.panelParams.toleranceMm,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParams();
  }, [userId, projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const panelValues = form.getFieldsValue();
      if (!params) return;
      const updated: ProjectParameters = {
        defaultWorkingDays: panelValues.defaultWorkingDays || DEFAULT_WORKING_DAYS,
        yieldMatrix: params.yieldMatrix,
        panelParams: {
          panelLengthMm: panelValues.panelLengthMm,
          panelWidthMm: panelValues.panelWidthMm,
          marginLengthMm: panelValues.marginLengthMm,
          marginWidthMm: panelValues.marginWidthMm,
          toleranceMm: panelValues.toleranceMm,
        },
      };
      await saveParameters(userId, projectId, updated);
      message.success('Parameters saved');
      loadParams();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    const defaults: ProjectParameters = {
      defaultWorkingDays: DEFAULT_WORKING_DAYS,
      yieldMatrix: DEFAULT_YIELD_MATRIX,
      panelParams: DEFAULT_PANEL_PARAMS,
    };
    try {
      await saveParameters(userId, projectId, defaults);
      message.success('Defaults restored');
      loadParams();
    } catch (e: any) {
      message.error(e.message || 'Failed to restore');
    }
  };

  const handleYieldChange = (size: SizeCategory, bucket: LayerBucket, value: number | null) => {
    if (!params || value === null) return;
    const newMatrix = { ...params.yieldMatrix };
    newMatrix[size] = { ...newMatrix[size], [bucket]: value };
    setParams({ ...params, yieldMatrix: newMatrix });
  };

  const yieldColumns = [
    { title: 'Size', dataIndex: 'size', key: 'size', render: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
    ...BUCKETS.map((bucket) => ({
      title: bucket,
      dataIndex: bucket,
      key: bucket,
      render: (value: number, record: any) => (
        <InputNumber
          min={0}
          max={1}
          step={0.01}
          precision={2}
          value={value}
          onChange={(v) => handleYieldChange(record.size as SizeCategory, bucket, v)}
          style={{ width: 80 }}
        />
      ),
    })),
  ];

  const yieldData = SIZES.map((size) => {
    const row: any = { size };
    for (const bucket of BUCKETS) {
      row[bucket] = params?.yieldMatrix[size][bucket] ?? 0;
    }
    return row;
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          Save Parameters
        </Button>
        <Popconfirm title="Restore all defaults?" onConfirm={handleRestoreDefaults}>
          <Button icon={<UndoOutlined />}>Restore Defaults</Button>
        </Popconfirm>
      </Space>

      <Card title="Yield Matrix" style={{ marginBottom: 16 }}>
        <Table
          columns={yieldColumns}
          dataSource={yieldData}
          rowKey="size"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title="General & Panel Parameters">
        <Form form={form} layout="inline">
          <Form.Item name="defaultWorkingDays" label="Working Days/month">
            <InputNumber min={1} max={31} />
          </Form.Item>
          <Form.Item name="panelLengthMm" label="Panel Length (mm)">
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="panelWidthMm" label="Panel Width (mm)">
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="marginLengthMm" label="Margin Length (mm)">
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="marginWidthMm" label="Margin Width (mm)">
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="toleranceMm" label="Tolerance (mm)">
            <InputNumber min={0} step={0.01} precision={2} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ParametersPage;
