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
  Radio,
} from 'antd';
import {
  SyncOutlined,
  SaveOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getCapacityPlans, batchSaveCapacityPlans } from '../services/capacityService';
import { getParameters, saveParameters } from '../services/parameterService';
import { saveVersion, getVersions, deleteVersion, restoreVersion } from '../services/versionService';
import { generateDefaultCapacityPlans, generateMonths } from '../core/defaults';
import type { CapacityPlan, FactoryDef, ProjectParameters } from '../types';

const { Text } = Typography;

type ViewMode = 'month' | 'quarter' | 'year';

interface CapacityPlanPageProps {
  userId: string;
  projectId: string;
}

interface CellData {
  core: number;
  bu: number;
}

const QUARTERS = [
  { label: 'Q1', startMonth: 1, endMonth: 3 },
  { label: 'Q2', startMonth: 4, endMonth: 6 },
  { label: 'Q3', startMonth: 7, endMonth: 9 },
  { label: 'Q4', startMonth: 10, endMonth: 12 },
];

// Get the last month of a quarter/year
function getLastMonthOfQuarter(year: number, quarterIndex: number): string {
  const m = (quarterIndex + 1) * 3;
  return `${year}-${String(m).padStart(2, '0')}`;
}

function getLastMonthOfYear(year: number): string {
  return `${year}-12`;
}

const CapacityPlanPage: React.FC<CapacityPlanPageProps> = ({ userId, projectId }) => {
  const [plans, setPlans] = useState<CapacityPlan[]>([]);
  const [workingDays, setWorkingDays] = useState(28);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Editable factories
  const [factories, setFactories] = useState<FactoryDef[]>([]);
  const [editingFactoryId, setEditingFactoryId] = useState<string | null>(null);
  const [editingFactoryName, setEditingFactoryName] = useState('');

  // Grid data: key = "month-factoryId" (always stored at month level)
  const [gridData, setGridData] = useState<Map<string, CellData>>(new Map());

  // All months in system: always 2026-2040, plus any extra from existing data
  const months = useMemo(() => {
    const baseMonths = generateMonths(2026, 2040);
    if (plans.length > 0) {
      const monthSet = new Set(baseMonths);
      for (const p of plans) monthSet.add(p.month);
      return Array.from(monthSet).sort();
    }
    return baseMonths;
  }, [plans]);

  // Derived display months based on view mode
  const displayMonths = useMemo(() => {
    if (viewMode === 'month') return months;
    if (viewMode === 'quarter') {
      const result: string[] = [];
      const yearSet = new Set(months.map((m) => m.split('-')[0]));
      for (const yearStr of yearSet) {
        const year = parseInt(yearStr, 10);
        for (let qi = 0; qi < 4; qi++) {
          result.push(getLastMonthOfQuarter(year, qi));
        }
      }
      return result;
    }
    // year: last month of each year
    const yearSet = new Set(months.map((m) => m.split('-')[0]));
    return Array.from(yearSet)
      .map((y) => getLastMonthOfYear(parseInt(y, 10)))
      .sort();
  }, [months, viewMode]);

  // Format display label
  const formatMonthLabel = useCallback(
    (month: string): string => {
      const [y, m] = month.split('-').map(Number);
      if (viewMode === 'month') return month;
      if (viewMode === 'quarter') {
        const qi = Math.floor((m - 1) / 3);
        return `${y} Q${qi + 1}`;
      }
      return `${y}`;
    },
    [viewMode]
  );

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

  const getCell = useCallback(
    (month: string, factoryId: string): CellData => {
      return gridData.get(`${month}-${factoryId}`) || { core: 0, bu: 0 };
    },
    [gridData]
  );

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
    setFactories([...factories, { id, name }]);
    message.success(`Added ${name}`);
  };

  const handleRemoveFactory = (factoryId: string) => {
    if (factories.length <= 1) {
      message.warning('Must have at least one factory');
      return;
    }
    setFactories(factories.filter((f) => f.id !== factoryId));
    setGridData((prev) => {
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (key.endsWith(`-${factoryId}`)) next.delete(key);
      }
      return next;
    });
    message.success('Factory removed');
  };

  // --- Batch update ---
  const [batchYear, setBatchYear] = useState(2026);
  const [batchQuarter, setBatchQuarter] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState<'year' | 'quarter'>('year');
  const [batchFactories, setBatchFactories] = useState<string[] | null>(null);
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
    message.success('Loaded default capacity for 2026-2040');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates: Array<{ month: string; factoryId: string; corePanelPerDay: number; buPanelPerDay: number }> = [];
      for (const month of months) {
        for (const factory of factories) {
          const cell = getCell(month, factory.id);
          updates.push({ month, factoryId: factory.id, corePanelPerDay: cell.core, buPanelPerDay: cell.bu });
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

  const handleAddMonth = () => {
    const lastMonth = months[months.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    const newMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    message.success(`Added ${newMonth} — edit cells and click Save`);
  };

  const handleRemoveMonth = (month: string) => {
    setGridData((prev) => {
      const next = new Map(prev);
      for (const factory of factories) {
        next.delete(`${month}-${factory.id}`);
      }
      return next;
    });
  };

  // Fill forward: from a given month, copy its value to all subsequent months
  const handleFillForward = (month: string) => {
    const monthIndex = months.indexOf(month);
    if (monthIndex < 0) return;
    const fillFrom = months.slice(monthIndex);
    setGridData((prev) => {
      const next = new Map(prev);
      for (const m of fillFrom) {
        for (const factory of factories) {
          // Use the source month's values
          const sourceKey = `${month}-${factory.id}`;
          const source = prev.get(sourceKey) || { core: 0, bu: 0 };
          next.set(`${m}-${factory.id}`, { core: source.core, bu: source.bu });
        }
      }
      return next;
    });
    message.success(`Filled ${fillFrom.length} months from ${month}`);
  };

  // --- Build grid columns ---
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
              📊 Total
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
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleRenameFactory(record.factoryId)} />
            <Popconfirm title="Remove this factory?" onConfirm={() => handleRemoveFactory(record.factoryId)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  for (const month of displayMonths) {
    const total = getMonthTotal(month);
    const label = formatMonthLabel(month);
    gridColumns.push({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
          <Space size={0} style={{ marginTop: 2 }}>
            {viewMode === 'month' && (
              <Popconfirm
                title={`Fill ${label} values to all months after?`}
                onConfirm={() => handleFillForward(month)}
              >
                <Button size="small" type="text" style={{ fontSize: 10, padding: '0 2px' }}>
                  →→
                </Button>
              </Popconfirm>
            )}
            {viewMode === 'month' && (
              <Popconfirm title={`Remove ${month}?`} onConfirm={() => handleRemoveMonth(month)}>
                <Button size="small" type="text" danger icon={<MinusOutlined />} style={{ fontSize: 10, padding: '0 2px' }} />
              </Popconfirm>
            )}
          </Space>
        </div>
      ),
      dataIndex: month,
      key: month,
      width: 95,
      render: (_: any, record) => {
        const cell = getCell(month, record.factoryId);
        if (record.isTotal) {
          return (
            <div style={{ textAlign: 'center', background: '#f0f5ff', padding: '4px 0' }}>
              <div style={{ fontWeight: 700, color: '#1890ff' }}>C: {total.core.toLocaleString()}</div>
              <div style={{ fontWeight: 700, color: '#52c41a' }}>B: {total.bu.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: '#999' }}>
                Cap: {(total.core * workingDays).toLocaleString()} / {(total.bu * workingDays).toLocaleString()}
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
              onChange={(v) => setCell(month, record.factoryId, v || 0, cell.bu)}
              style={{ width: 86 }}
              addonBefore="C"
              controls={false}
            />
            <div style={{ marginTop: 2 }}>
              <InputNumber
                size="small"
                min={0}
                value={cell.bu}
                onChange={(v) => setCell(month, record.factoryId, cell.core, v || 0)}
                style={{ width: 86 }}
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

  // --- Chart data ---
  const chartData = useMemo(() => {
    const data: any[] = [];
    for (const month of displayMonths) {
      const total = getMonthTotal(month);
      const entry: any = {
        label: formatMonthLabel(month),
        'Core Panel/Day': total.core,
        'BU Panel/Day': total.bu,
        'Core Capacity': total.core * workingDays,
        'BU Capacity': total.bu * workingDays,
      };
      for (const factory of factories) {
        const cell = getCell(month, factory.id);
        entry[`${factory.name} Core`] = cell.core;
        entry[`${factory.name} BU`] = cell.bu;
      }
      data.push(entry);
    }
    return data;
  }, [displayMonths, getMonthTotal, formatMonthLabel, getCell, factories, workingDays]);

  const availableYears = useMemo(() => {
    const years = new Set(months.map((m) => parseInt(m.split('-')[0], 10)));
    return Array.from(years).sort();
  }, [months]);

  const factoryOptions = factories.map((f) => ({ label: f.name, value: f.id }));

  // Chart lines colors
  const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2'];

  // --- Version management ---
  const [versions, setVersions] = useState<Array<{ id: string; versionName: string; createdAt: Date }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionName, setVersionName] = useState('');

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

  useEffect(() => { loadVersions(); }, [userId, projectId]);

  const handleSaveVersion = async () => {
    const name = versionName.trim() || `v${versions.length + 1}`;
    try {
      await saveVersion(userId, projectId, name, gridData, factories, workingDays);
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
      setGridData(restored.gridData);
      setFactories(restored.factories);
      setWorkingDays(restored.workingDays);
      message.success(`Restored "${ver.versionName}"`);
    } catch (e: any) {
      message.error(e.message || 'Failed to restore');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion(userId, projectId, versionId);
      message.success('Version deleted');
      loadVersions();
    } catch (e: any) {
      message.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      {/* View mode + toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle" wrap>
          <Col>
            <Text strong>View:</Text>
          </Col>
          <Col>
            <Radio.Group
              size="small"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="month"><TableOutlined /> Month</Radio.Button>
              <Radio.Button value="quarter">Quarter</Radio.Button>
              <Radio.Button value="year">Year</Radio.Button>
            </Radio.Group>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button icon={<PlusOutlined />} onClick={handleAddFactory}>Add Factory</Button>
              <Button icon={<PlusOutlined />} onClick={handleAddMonth} disabled={viewMode !== 'month'}>
                Add Month
              </Button>
              <Popconfirm title="Save all changes?" onConfirm={handleSaveAll}>
                <Button type="primary" icon={<SaveOutlined />} loading={saving}>
                  Save All ({months.length} months × {factories.length} factories)
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Batch Update */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Tabs
          size="small"
          items={[
            {
              key: 'batch',
              label: 'Batch Set / Modify',
              children: (
                <Row gutter={[12, 8]} align="middle" wrap>
                  <Col><Text strong>Time:</Text></Col>
                  <Col>
                    <Select
                      size="small"
                      value={batchMode}
                      onChange={(v) => { setBatchMode(v); if (v === 'year') setBatchQuarter(null); }}
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
                  <Col><Text strong>Factories:</Text></Col>
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
                  {batchAction === 'set' && (
                    <>
                      <Col>
                        <InputNumber size="small" min={0} placeholder="Core" value={batchCore}
                          onChange={(v) => setBatchCore(v)} style={{ width: 100 }} addonBefore="C" />
                      </Col>
                      <Col>
                        <InputNumber size="small" min={0} placeholder="BU" value={batchBu}
                          onChange={(v) => setBatchBu(v)} style={{ width: 100 }} addonBefore="B" />
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
                    Load 2026-2040 Defaults (6000 Core base, +1800 Core/yr, +10000 BU/yr)
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Capacity Grid */}
      <Card title="Capacity Plan (panels/day)">
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
            Working Days: <Text strong>{workingDays}</Text>/month (Parameters)
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 Click ✏️ to rename | Edit cells directly
          </Text>
        </Space>
      </Card>

      {/* Capacity Trend Charts */}
      <Card title="Capacity Trend" style={{ marginTop: 16 }} extra={<BarChartOutlined />}>
        <Tabs
          size="small"
          items={[
            {
              key: 'core',
              label: '🔵 Core Panel/Day',
              children: (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={displayMonths.length > 20 ? -45 : 0} textAnchor={displayMonths.length > 20 ? 'end' : 'middle'} height={displayMonths.length > 20 ? 60 : 30} />
                    <YAxis tickFormatter={(v: number) => v >= 10000 ? `${(v/1000).toFixed(0)}k` : v.toLocaleString()} />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Legend />
                    {factories.map((factory, i) => (
                      <Line
                        key={`core-${factory.id}`}
                        type="monotone"
                        dataKey={`${factory.name} Core`}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                    <ReferenceLine y={0} stroke="#999" />
                  </LineChart>
                </ResponsiveContainer>
              ),
            },
            {
              key: 'bu',
              label: '🟢 BU Panel/Day',
              children: (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={displayMonths.length > 20 ? -45 : 0} textAnchor={displayMonths.length > 20 ? 'end' : 'middle'} height={displayMonths.length > 20 ? 60 : 30} />
                    <YAxis tickFormatter={(v: number) => v >= 10000 ? `${(v/1000).toFixed(0)}k` : v.toLocaleString()} />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Legend />
                    {factories.map((factory, i) => (
                      <Line
                        key={`bu-${factory.id}`}
                        type="monotone"
                        dataKey={`${factory.name} BU`}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                    <ReferenceLine y={0} stroke="#999" />
                  </LineChart>
                </ResponsiveContainer>
              ),
            },
            {
              key: 'capacity',
              label: '📊 Monthly Capacity',
              children: (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={displayMonths.length > 20 ? -45 : 0} textAnchor={displayMonths.length > 20 ? 'end' : 'middle'} height={displayMonths.length > 20 ? 60 : 30} />
                    <YAxis tickFormatter={(v: number) => v >= 10000 ? `${(v/1000).toFixed(0)}k` : v.toLocaleString()} />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Legend />
                    <Line type="monotone" dataKey="Core Capacity" stroke="#1890ff" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="BU Capacity" stroke="#52c41a" strokeWidth={3} dot={false} />
                    <ReferenceLine y={0} stroke="#999" />
                  </LineChart>
                </ResponsiveContainer>
              ),
            },
          ]}
        />
        <Divider style={{ margin: '12px 0 8px' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          View: <Text strong>{viewMode}</Text> | Working Days: {workingDays}/month
        </Text>
      </Card>

      {/* Version Management */}
      <Card title="Version History" style={{ marginTop: 16 }}>
        <Row gutter={8} align="middle" style={{ marginBottom: 12 }}>
          <Col><Text strong>Save current as:</Text></Col>
          <Col>
            <Input
              size="small"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Q1 2027 plan"
              style={{ width: 180 }}
              onPressEnter={handleSaveVersion}
            />
          </Col>
          <Col>
            <Button size="small" type="primary" onClick={handleSaveVersion}>
              Save Version
            </Button>
          </Col>
        </Row>
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
              {
                title: 'Version',
                dataIndex: 'versionName',
                key: 'versionName',
                render: (v: string) => <Text strong>{v}</Text>,
              },
              {
                title: 'Date',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (d: any) => {
                  if (!d) return '-';
                  const date = d.toDate ? d.toDate() : d;
                  if (date instanceof Date && date.toLocaleString) return date.toLocaleString();
                  return '-';
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_: any, record: { id: string; versionName: string }) => (
                  <Space>
                    <Popconfirm title={`Restore "${record.versionName}"? This will replace your current data.`} onConfirm={() => handleRestoreVersion(record.id)}>
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
  );
};

export default CapacityPlanPage;
