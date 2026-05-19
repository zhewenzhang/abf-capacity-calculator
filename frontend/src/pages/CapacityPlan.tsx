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
  Typography,
  Divider,
  Input,
  Select,
  Tabs,
} from 'antd';
import {
  SyncOutlined,
  SaveOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getCapacityPlans, batchSaveCapacityPlans } from '../services/capacityService';
import { getParameters, saveParameters } from '../services/parameterService';
import { generateDefaultCapacityPlans, generateMonths } from '../core/defaults';
import type { CapacityPlan, FactoryDef, ProjectParameters } from '../types';

const { Text } = Typography;

interface CapacityPlanPageProps {
  userId: string;
  projectId: string;
}

interface CellData {
  core: number;
  bu: number;
}

// Quarter definitions
const QUARTERS = [
  { label: 'Q1', startMonth: 1, endMonth: 3 },
  { label: 'Q2', startMonth: 4, endMonth: 6 },
  { label: 'Q3', startMonth: 7, endMonth: 9 },
  { label: 'Q4', startMonth: 10, endMonth: 12 },
];

const CapacityPlanPage: React.FC<CapacityPlanPageProps> = ({ userId, projectId }) => {
  const [plans, setPlans] = useState<CapacityPlan[]>([]);
  const [workingDays, setWorkingDays] = useState(28);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable factories
  const [factories, setFactories] = useState<FactoryDef[]>([]);
  const [editingFactoryId, setEditingFactoryId] = useState<string | null>(null);
  const [editingFactoryName, setEditingFactoryName] = useState('');

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
      setWorkingDays(params.defaultWorkingDays || 28);

      // Load factories from params (or use defaults)
      const loadedFactories = (params as any).factories;
      if (loadedFactories && loadedFactories.length > 0) {
        setFactories(loadedFactories);
      } else {
        const defaults: FactoryDef[] = [
          { id: 'fab-a', name: 'Fab A' },
          { id: 'fab-b', name: 'Fab B' },
          { id: 'fab-c', name: 'Fab C' },
        ];
        setFactories(defaults);
        await saveParameters(userId, projectId, {
          ...params,
          factories: defaults,
        } as unknown as ProjectParameters);
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

  // --- Factory management ---
  const handleRenameFactory = (factoryId: string) => {
    setEditingFactoryId(factoryId);
    const factory = factories.find((f) => f.id === factoryId);
    setEditingFactoryName(factory?.name || '');
  };

  const handleSaveFactoryName = () => {
    if (!editingFactoryId || !editingFactoryName.trim()) {
      message.warning('Factory name cannot be empty');
      return;
    }
    const updated = factories.map((f) =>
      f.id === editingFactoryId ? { ...f, name: editingFactoryName.trim() } : f
    );
    setFactories(updated);
    setEditingFactoryId(null);
    setEditingFactoryName('');
    message.success('Factory name updated');
  };

  const handleAddFactory = () => {
    const id = `fab-${Date.now()}`;
    const name = `Fab ${String.fromCharCode(65 + factories.length)}`;
    const updated = [...factories, { id, name }];
    setFactories(updated);
    message.success(`Added ${name}`);
  };

  const handleRemoveFactory = (factoryId: string) => {
    if (factories.length <= 1) {
      message.warning('Must have at least one factory');
      return;
    }
    const updated = factories.filter((f) => f.id !== factoryId);
    setFactories(updated);
    setGridData((prev) => {
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (key.endsWith(`-${factoryId}`)) {
          next.delete(key);
        }
      }
      return next;
    });
    message.success('Factory removed');
  };

  // --- Batch update: year/quarter + factories + clear ---
  const [batchYear, setBatchYear] = useState(2026);
  const [batchQuarter, setBatchQuarter] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState<'year' | 'quarter'>('year');
  const [batchFactories, setBatchFactories] = useState<string[] | null>(null); // null = all factories
  const [batchCore, setBatchCore] = useState<number | null>(null);
  const [batchBu, setBatchBu] = useState<number | null>(null);
  const [batchAction, setBatchAction] = useState<'set' | 'clear'>('set');

  const getBatchMonths = useCallback(() => {
    if (batchMode === 'year') {
      return months.filter((m) => m.startsWith(`${batchYear}-`));
    } else {
      const q = QUARTERS.find((q) => q.label === `Q${batchQuarter}`);
      if (!q) return [];
      return months.filter((m) => {
        const [y, monthNum] = m.split('-').map(Number);
        return y === batchYear && monthNum >= q.startMonth && monthNum <= q.endMonth;
      });
    }
  }, [batchMode, batchYear, batchQuarter, months]);

  const getBatchFactories = useCallback(() => {
    if (batchFactories && batchFactories.length > 0) {
      return factories.filter((f) => batchFactories.includes(f.id));
    }
    return factories;
  }, [batchFactories, factories]);

  const handleBatchApply = () => {
    const targetMonths = getBatchMonths();
    const targetFactories = getBatchFactories();
    if (targetMonths.length === 0) {
      message.warning('No months in selected range');
      return;
    }
    if (batchAction === 'set' && batchCore === null && batchBu === null) {
      message.warning('Enter at least Core or BU value');
      return;
    }
    setGridData((prev) => {
      const next = new Map(prev);
      for (const month of targetMonths) {
        for (const factory of targetFactories) {
          if (batchAction === 'clear') {
            next.set(`${month}-${factory.id}`, { core: 0, bu: 0 });
          } else {
            const existing = prev.get(`${month}-${factory.id}`) || { core: 0, bu: 0 };
            next.set(`${month}-${factory.id}`, {
              core: batchCore !== null ? batchCore : existing.core,
              bu: batchBu !== null ? batchBu : existing.bu,
            });
          }
        }
      }
      return next;
    });
    const timeLabel = batchMode === 'year' ? `${batchYear}` : `${batchYear} Q${batchQuarter}`;
    const factoryLabel =
      batchFactories && batchFactories.length > 0
        ? `${batchFactories.length} factories`
        : 'all factories';
    const actionLabel = batchAction === 'clear' ? 'Cleared' : 'Updated';
    message.success(`${actionLabel}: ${targetMonths.length} months × ${factoryLabel} in ${timeLabel}`);
  };

  // Load defaults
  const handleGenerateDefaults = () => {
    const defaults = generateDefaultCapacityPlans();
    setGridData((prev) => {
      const next = new Map(prev);
      for (const d of defaults) {
        const perFactoryCore = Math.floor(d.corePanelPerDay / factories.length);
        const remainderCore = d.corePanelPerDay - perFactoryCore * factories.length;
        const perFactoryBu = Math.floor(d.buPanelPerDay / factories.length);
        const remainderBu = d.buPanelPerDay - perFactoryBu * factories.length;
        for (let i = 0; i < factories.length; i++) {
          next.set(`${d.month}-${factories[i].id}`, {
            core: perFactoryCore + (i < remainderCore ? 1 : 0),
            bu: perFactoryBu + (i < remainderBu ? 1 : 0),
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
      const params = await getParameters(userId, projectId);
      await saveParameters(userId, projectId, {
        ...params,
        factories: factories,
      } as unknown as ProjectParameters);
      await batchSaveCapacityPlans(userId, projectId, updates, workingDays);
      message.success(`Saved ${updates.length} rows + ${factories.length} factories`);
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
  const gridColumns: ColumnsType<{ key: string; label: string; isTotal: boolean; factoryId: string }> = [
    {
      title: 'Factory',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      fixed: 'left' as const,
      render: (text: string, record) => {
        if (record.isTotal) {
          return (
            <Text strong style={{ color: '#1890ff', fontSize: 13 }}>
              📊 Total (all factories)
            </Text>
          );
        }
        if (editingFactoryId === record.factoryId) {
          return (
            <Space size={4}>
              <Input
                size="small"
                value={editingFactoryName}
                onChange={(e) => setEditingFactoryName(e.target.value)}
                onPressEnter={handleSaveFactoryName}
                style={{ width: 120 }}
                autoFocus
              />
              <Button size="small" type="link" onClick={handleSaveFactoryName}>
                ✓
              </Button>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Text>{text}</Text>
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleRenameFactory(record.factoryId)}
            />
            <Popconfirm title="Remove this factory?" onConfirm={() => handleRemoveFactory(record.factoryId)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  for (const month of months) {
    const total = getMonthTotal(month);
    gridColumns.push({
      title: (
        <div style={{ textAlign: 'center', fontSize: 11 }}>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{month}</div>
          <div style={{ color: '#1890ff', fontSize: 10 }}>C: {total.core.toLocaleString()}</div>
          <div style={{ color: '#52c41a', fontSize: 10 }}>B: {total.bu.toLocaleString()}</div>
          <div style={{ color: '#999', fontSize: 9 }}>
            Cap: {(total.core * workingDays).toLocaleString()}/{(total.bu * workingDays).toLocaleString()}
          </div>
          <Button
            size="small"
            type="text"
            danger
            icon={<MinusOutlined />}
            onClick={() => handleRemoveMonth(month)}
            style={{ marginTop: 2 }}
          />
        </div>
      ),
      dataIndex: month,
      key: month,
      width: 140,
      render: (_: any, record) => {
        const cell = getCell(month, record.factoryId);
        if (record.isTotal) {
          return (
            <div style={{ textAlign: 'center', background: '#f0f5ff', padding: '4px 0' }}>
              <div style={{ fontWeight: 700, color: '#1890ff' }}>C: {total.core.toLocaleString()}</div>
              <div style={{ fontWeight: 700, color: '#52c41a' }}>B: {total.bu.toLocaleString()}</div>
            </div>
          );
        }
        return (
          <div style={{ textAlign: 'center' }}>
            <InputNumber
              size="small"
              min={0}
              value={cell.core}
              onChange={(v) => setCell(month, record.factoryId, v || 0, cell.bu)}
              style={{ width: 100 }}
              addonBefore="C"
              controls={false}
            />
            <div style={{ marginTop: 2 }}>
              <InputNumber
                size="small"
                min={0}
                value={cell.bu}
                onChange={(v) => setCell(month, record.factoryId, cell.core, v || 0)}
                style={{ width: 100 }}
                addonBefore="B"
                controls={false}
              />
            </div>
          </div>
        );
      },
    });
  }

  const gridRows = [
    { key: '__total__', label: 'Total', isTotal: true, factoryId: '__total__' },
    ...factories.map((f) => ({ key: f.id, label: f.name, isTotal: false, factoryId: f.id })),
  ];

  const availableYears = useMemo(() => {
    const years = new Set(months.map((m) => parseInt(m.split('-')[0], 10)));
    return Array.from(years).sort();
  }, [months]);

  const factoryOptions = factories.map((f) => ({ label: f.name, value: f.id }));

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* Batch Update Card */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Tabs
          size="small"
          items={[
            {
              key: 'batch',
              label: 'Batch Set / Modify',
              children: (
                <Row gutter={[12, 8]} align="middle" wrap>
                  {/* Time range */}
                  <Col>
                    <Text strong>Time:</Text>
                  </Col>
                  <Col>
                    <Select
                      size="small"
                      value={batchMode}
                      onChange={(v) => {
                        setBatchMode(v);
                        if (v === 'year') setBatchQuarter(null);
                      }}
                      style={{ width: 100 }}
                      options={[
                        { label: 'Year', value: 'year' },
                        { label: 'Quarter', value: 'quarter' },
                      ]}
                    />
                  </Col>
                  <Col>
                    <Select
                      size="small"
                      value={batchYear}
                      onChange={setBatchYear}
                      style={{ width: 90 }}
                      options={availableYears.map((y) => ({ label: String(y), value: y }))}
                    />
                  </Col>
                  {batchMode === 'quarter' && (
                    <Col>
                      <Select
                        size="small"
                        value={batchQuarter}
                        onChange={setBatchQuarter}
                        style={{ width: 80 }}
                        placeholder="Quarter"
                        options={[
                          { label: 'Q1', value: 1 },
                          { label: 'Q2', value: 2 },
                          { label: 'Q3', value: 3 },
                          { label: 'Q4', value: 4 },
                        ]}
                      />
                    </Col>
                  )}

                  {/* Factory selector */}
                  <Col>
                    <Text strong>Factories:</Text>
                  </Col>
                  <Col>
                    <Select
                      size="small"
                      mode="multiple"
                      value={batchFactories || undefined}
                      onChange={(v) => setBatchFactories(v.length > 0 ? v : null)}
                      style={{ minWidth: 160 }}
                      placeholder="All factories"
                      options={factoryOptions}
                      allowClear
                    />
                  </Col>

                  {/* Action type */}
                  <Col>
                    <Select
                      size="small"
                      value={batchAction}
                      onChange={(v) => setBatchAction(v)}
                      style={{ width: 100 }}
                      options={[
                        { label: '✏️ Set', value: 'set' },
                        { label: '🗑️ Clear', value: 'clear' },
                      ]}
                    />
                  </Col>

                  {/* Values */}
                  {batchAction === 'set' && (
                    <>
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
                    </>
                  )}

                  <Col>
                    <Tag color="blue">
                      {getBatchMonths().length} months × {(batchFactories?.length || factories.length)} factories
                    </Tag>
                  </Col>
                  <Col>
                    <Button size="small" type="primary" onClick={handleBatchApply}>
                      {batchAction === 'clear' ? 'Clear Selected' : 'Apply'}
                    </Button>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'defaults',
              label: 'Defaults',
              children: (
                <Space>
                  <Button icon={<SyncOutlined />} onClick={handleGenerateDefaults}>
                    Load 2026-2028 Defaults (6000 Core, 0 BU base)
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Capacity Grid */}
      <Card
        title="Capacity Plan (panels/day)"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleAddFactory}>
              Add Factory
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleAddMonth}>
              Add Month
            </Button>
            <Popconfirm title="Save all changes?" onConfirm={handleSaveAll}>
              <Button type="primary" icon={<SaveOutlined />} loading={saving}>
                Save All ({months.length} months × {factories.length} factories)
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          columns={gridColumns}
          dataSource={gridRows}
          rowKey="key"
          size="small"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          sticky
          rowClassName={(record) => (record.isTotal ? 'total-row' : '')}
        />
        <Divider style={{ margin: '12px 0 8px' }} />
        <Space wrap>
          <Tag color="blue">C = Core</Tag>
          <Tag color="green">B = BU</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Working Days: <Text strong>{workingDays}</Text>/month (set in Parameters)
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Cap = Panel/Day × {workingDays}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 Click ✏️ to rename | Edit cells directly for month-level tweaks
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default CapacityPlanPage;
