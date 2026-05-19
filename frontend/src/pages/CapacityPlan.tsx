import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Alert,
  Tag,
  Card,
  Row,
  Col,
  DatePicker,
  Typography,
  Divider,
} from 'antd';
import { SyncOutlined, SaveOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getCapacityPlans, batchSaveCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { generateDefaultCapacityPlans, generateMonths, DEFAULT_FACTORIES } from '../core/defaults';
import type { CapacityPlan } from '../types';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface CapacityPlanPageProps {
  userId: string;
  projectId: string;
}

// Cell key: "month-factoryId" (factoryId = "total" for aggregate, or factory.id)
interface CellData {
  core: number;
  bu: number;
}

const CapacityPlanPage: React.FC<CapacityPlanPageProps> = ({ userId, projectId }) => {
  const [plans, setPlans] = useState<CapacityPlan[]>([]);
  const [workingDays, setWorkingDays] = useState(28);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const factories = DEFAULT_FACTORIES;

  // Grid data: key = "month-factoryId"
  const [gridData, setGridData] = useState<Map<string, CellData>>(new Map());

  // Months to display
  const months = useMemo(() => {
    if (plans.length > 0) {
      const monthSet = new Set(plans.map((p) => p.month));
      return Array.from(monthSet).sort();
    }
    return generateMonths(2026, 2028);
  }, [plans]);

  // Load from Firestore
  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const [planData, params] = await Promise.all([
        getCapacityPlans(userId, projectId),
        getParameters(userId, projectId),
      ]);
      setPlans(planData);
      if (params.defaultWorkingDays) {
        setWorkingDays(params.defaultWorkingDays);
      }

      // Build grid from plans
      const dataMap = new Map<string, CellData>();
      for (const plan of planData) {
        const key = `${plan.month}-${plan.factoryId}`;
        dataMap.set(key, { core: plan.corePanelPerDay, bu: plan.buPanelPerDay });
      }
      setGridData(dataMap);
    } catch (e: any) {
      setError(e.message || 'Failed to load capacity plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [userId, projectId]);

  // Get cell value
  const getCell = useCallback(
    (month: string, factoryId: string): CellData => {
      return gridData.get(`${month}-${factoryId}`) || { core: 0, bu: 0 };
    },
    [gridData]
  );

  // Set cell value
  const setCell = useCallback(
    (month: string, factoryId: string, core: number, bu: number) => {
      setGridData((prev) => {
        const next = new Map(prev);
        next.set(`${month}-${factoryId}`, { core, bu });
        return next;
      });
    },
    []
  );

  // Compute total for a month by summing all factories
  const getMonthTotal = useCallback(
    (month: string): CellData => {
      let totalCore = 0;
      let totalBu = 0;
      for (const factory of factories) {
        const cell = getCell(month, factory.id);
        totalCore += cell.core;
        totalBu += cell.bu;
      }
      return { core: totalCore, bu: totalBu };
    },
    [getCell, factories]
  );

  // Batch update selected months
  const [selectedMonths, setSelectedMonths] = useState<string[] | null>(null);
  const [batchCore, setBatchCore] = useState<number | null>(null);
  const [batchBu, setBatchBu] = useState<number | null>(null);

  const handleBatchUpdate = () => {
    if (!selectedMonths || selectedMonths.length === 0) {
      message.warning('Select a date range first');
      return;
    }
    if (batchCore === null && batchBu === null) {
      message.warning('Enter at least Core or BU value');
      return;
    }
    setGridData((prev) => {
      const next = new Map(prev);
      for (const month of selectedMonths) {
        for (const factory of factories) {
          const existing = prev.get(`${month}-${factory.id}`) || { core: 0, bu: 0 };
          next.set(`${month}-${factory.id}`, {
            core: batchCore !== null ? batchCore : existing.core,
            bu: batchBu !== null ? batchBu : existing.bu,
          });
        }
      }
      return next;
    });
    message.success(`Updated ${selectedMonths.length} months × ${factories.length} factories`);
  };

  const handleDateRange = (_: any, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      const selected = months.filter((m) => m >= dateStrings[0] && m <= dateStrings[1]);
      setSelectedMonths(selected);
    } else {
      setSelectedMonths(null);
    }
  };

  // Load defaults
  const handleGenerateDefaults = () => {
    const defaults = generateDefaultCapacityPlans();
    setGridData((prev) => {
      const next = new Map(prev);
      for (const d of defaults) {
        // Spread evenly across factories for default
        const perFactory = Math.floor(d.corePanelPerDay / factories.length);
        const remainder = d.corePanelPerDay - perFactory * factories.length;
        for (let i = 0; i < factories.length; i++) {
          const factoryCore = perFactory + (i < remainder ? 1 : 0);
          const factoryBu = Math.floor(d.buPanelPerDay / factories.length);
          next.set(`${d.month}-${factories[i].id}`, {
            core: factoryCore,
            bu: factoryBu,
          });
        }
      }
      return next;
    });
    message.success('Loaded default capacity for 2026-2028');
  };

  // Save all
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Array<{ month: string; factoryId: string; corePanelPerDay: number; buPanelPerDay: number }> = [];
      for (const month of months) {
        for (const factory of factories) {
          const cell = getCell(month, factory.id);
          updates.push({
            month,
            factoryId: factory.id,
            corePanelPerDay: cell.core,
            buPanelPerDay: cell.bu,
          });
        }
      }
      await batchSaveCapacityPlans(userId, projectId, updates, workingDays);
      message.success(`Saved ${updates.length} rows`);
      loadPlans();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Add month
  const handleAddMonth = () => {
    const lastMonth = months[months.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    const newMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    message.success(`Added ${newMonth} — edit cells and click Save`);
  };

  // Remove month
  const handleRemoveMonth = (month: string) => {
    setGridData((prev) => {
      const next = new Map(prev);
      for (const factory of factories) {
        next.delete(`${month}-${factory.id}`);
      }
      return next;
    });
  };

  // Build columns
  const gridColumns: ColumnsType<{ key: string; label: string; isTotal: boolean }> = [
    {
      title: 'Factory / Category',
      dataIndex: 'label',
      key: 'label',
      width: 160,
      fixed: 'left' as const,
      render: (text: string, record) => (
        <Text strong={record.isTotal} style={record.isTotal ? { color: '#1890ff' } : {}}>
          {text}
        </Text>
      ),
    },
  ];

  for (const month of months) {
    const total = getMonthTotal(month);
    gridColumns.push({
      title: (
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          <div style={{ fontWeight: 600 }}>{month}</div>
          <div style={{ color: '#1890ff' }}>C: {total.core.toLocaleString()}</div>
          <div style={{ color: '#52c41a' }}>B: {total.bu.toLocaleString()}</div>
          <Button
            size="small"
            type="text"
            danger
            icon={<MinusOutlined />}
            onClick={() => handleRemoveMonth(month)}
          />
        </div>
      ),
      dataIndex: month,
      key: month,
      width: 130,
      render: (_: any, record) => {
        const cell = getCell(month, record.isTotal ? '__total__' : record.key);
        if (record.isTotal) {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1890ff' }}>{total.core.toLocaleString()}</div>
              <div style={{ fontWeight: 700, color: '#52c41a' }}>{total.bu.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                Cap C: {(total.core * workingDays).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#999' }}>
                Cap B: {(total.bu * workingDays).toLocaleString()}
              </div>
            </div>
          );
        }
        return (
          <div style={{ textAlign: 'center' }}>
            <InputNumber
              size="small"
              min={0}
              value={cell.core}
              onChange={(v) => setCell(month, record.key, v || 0, cell.bu)}
              style={{ width: 90 }}
              addonBefore="C"
            />
            <div style={{ marginTop: 2 }}>
              <InputNumber
                size="small"
                min={0}
                value={cell.bu}
                onChange={(v) => setCell(month, record.key, cell.core, v || 0)}
                style={{ width: 90 }}
                addonBefore="B"
              />
            </div>
          </div>
        );
      },
    });
  }

  const gridRows = [
    { key: '__total__', label: 'Total', isTotal: true },
    ...factories.map((f) => ({ key: f.id, label: f.name, isTotal: false })),
  ];

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Text strong>Batch Set:</Text>
          </Col>
          <Col>
            <RangePicker picker="month" onChange={handleDateRange} />
            {selectedMonths && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {selectedMonths.length} months
              </Tag>
            )}
          </Col>
          <Col>
            <InputNumber
              size="small"
              min={0}
              placeholder="Core"
              value={batchCore}
              onChange={(v) => setBatchCore(v)}
              style={{ width: 100 }}
              addonBefore="C"
            />
          </Col>
          <Col>
            <InputNumber
              size="small"
              min={0}
              placeholder="BU"
              value={batchBu}
              onChange={(v) => setBatchBu(v)}
              style={{ width: 100 }}
              addonBefore="B"
            />
          </Col>
          <Col>
            <Button size="small" onClick={handleBatchUpdate} disabled={!selectedMonths}>
              Apply to Range
            </Button>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button icon={<SyncOutlined />} onClick={handleGenerateDefaults}>
                Defaults 2026-28
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleAddMonth}>
                Add Month
              </Button>
              <Popconfirm title="Save all changes to Firestore?" onConfirm={handleSaveAll}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving}>
                  Save All ({months.length} months)
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Capacity Grid */}
      <Card title="Capacity Plan (panels/day per factory)">
        <Table
          columns={gridColumns}
          dataSource={gridRows}
          rowKey="key"
          size="small"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          sticky
        />
        <Divider style={{ margin: '12px 0 8px' }} />
        <Space>
          <Tag color="blue">C = Core</Tag>
          <Tag color="green">B = BU</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Working Days: <Text strong>{workingDays}</Text> (set in Parameters)
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default CapacityPlanPage;
