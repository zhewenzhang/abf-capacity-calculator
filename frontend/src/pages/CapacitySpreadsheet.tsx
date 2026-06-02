import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, message, Alert, Card, Row, Col, Tag, Tabs, Space, Typography } from 'antd';
import { SaveOutlined, UndoOutlined, ExperimentOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, intColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getCapacityPlans, batchSaveCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import type { CapacityMetric, ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { ExperimentalBanner, EmptyState, PageLoading } from '../components/common';

const { Text } = Typography;

// --- Types ---

interface CapacitySheetRow {
  factoryId: string;
  factoryName: string;
  [month: string]: string | number;
}

function dirtyKey(metric: CapacityMetric, factoryId: string, month: string): string {
  return JSON.stringify([metric, factoryId, month]);
}

// Generate months inline
function genMonths(startYear: number, startMonth: number, count: number): string[] {
  const months: string[] = [];
  let y = startYear, m = startMonth;
  for (let i = 0; i < count; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

const DEFAULT_MONTHS = genMonths(2026, 1, 60); // 2026-01 to 2030-12

// Compute dirty set from current rows vs saved snapshots
function computeDirty(
  rows: CapacitySheetRow[],
  saved: CapacitySheetRow[],
  metric: CapacityMetric
): Set<string> {
  const dirty = new Set<string>();
  rows.forEach((row, idx) => {
    const savedRow = saved[idx];
    if (!savedRow) return;
    for (const month of DEFAULT_MONTHS) {
      if (row[month] !== savedRow[month]) {
        dirty.add(dirtyKey(metric, row.factoryId, month));
      }
    }
  });
  return dirty;
}

interface CapacitySpreadsheetProps {
  scope: ProjectScope;
}

const CapacitySpreadsheet: React.FC<CapacitySpreadsheetProps> = ({ scope }) => {
  const writable = canEdit(scope.role);
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved data
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  const [workingDays, setWorkingDays] = useState(22);

  // Saved snapshots for discard & dirty comparison
  const savedCoreRef = useRef<CapacitySheetRow[]>([]);
  const savedBuRef = useRef<CapacitySheetRow[]>([]);

  // Grid data: separate for Core and BU
  const [coreRows, setCoreRows] = useState<CapacitySheetRow[]>([]);
  const [buRows, setBuRows] = useState<CapacitySheetRow[]>([]);

  // Dirty tracking — computed via useEffect
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());

  // ---------- Load data ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planData, params] = await Promise.all([
        getCapacityPlans(scope),
        getParameters(scope),
      ]);
      const factoryList = params.factories ?? [];
      setFactories(factoryList);
      setWorkingDays(params.defaultWorkingDays ?? 22);

      // Build row objects
      const core: CapacitySheetRow[] = [];
      const bu: CapacitySheetRow[] = [];
      for (const f of factoryList) {
        const coreRow: CapacitySheetRow = { factoryId: f.id, factoryName: f.name };
        const buRow: CapacitySheetRow = { factoryId: f.id, factoryName: f.name };
        for (const month of DEFAULT_MONTHS) {
          const plan = planData.find((p: any) => p.factoryId === f.id && p.month === month);
          coreRow[month] = plan?.corePanelPerDay ?? 0;
          buRow[month] = plan?.buPanelPerDay ?? 0;
        }
        core.push(coreRow);
        bu.push(buRow);
      }
      setCoreRows(core);
      setBuRows(bu);
      savedCoreRef.current = core.map((r) => ({ ...r }));
      savedBuRef.current = bu.map((r) => ({ ...r }));
      setDirtySet(new Set());
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- Recompute dirty set when rows change ----------
  useEffect(() => {
    const coreDirty = computeDirty(coreRows, savedCoreRef.current, 'core');
    const buDirty = computeDirty(buRows, savedBuRef.current, 'bu');
    const combined = new Set([...coreDirty, ...buDirty]);
    setDirtySet(combined);
  }, [coreRows, buRows]);

  // ---------- Build columns using keyColumn ----------
  // keyColumn(fieldName, columnType) correctly reads/writes a specific field
  // on the row object. This is the CORRECT way to use react-datasheet-grid
  // with object-based rows.
  const columns = useMemo(() => {
    return [
      keyColumn<CapacitySheetRow, 'factoryName'>('factoryName', {
        ...textColumn,
        title: t('capacity.factory'),
        basis: 120,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      ...DEFAULT_MONTHS.map((month) =>
        keyColumn<CapacitySheetRow, any>(month as any, {
          ...intColumn,
          title: month,
          basis: 80,
          grow: 0,
          shrink: 0,
          minWidth: 60,
          disabled: !writable,
        } as any)
      ),
    ];
  }, [t, writable]);

  // ---------- Row change handlers ----------
  const handleCoreRowsChange = useCallback((newRows: CapacitySheetRow[]) => {
    // Guard: Prevent state changes for viewers
    if (!writable) return;
    setCoreRows(newRows);
  }, [writable]);

  const handleBuRowsChange = useCallback((newRows: CapacitySheetRow[]) => {
    // Guard: Prevent state changes for viewers
    if (!writable) return;
    setBuRows(newRows);
  }, [writable]);

  // ---------- Dirty count per tab ----------
  const coreDirtyCount = useMemo(() => {
    let count = 0;
    for (const k of dirtySet) {
      const [metric] = JSON.parse(k) as [CapacityMetric, string, string];
      if (metric === 'core') count++;
    }
    return count;
  }, [dirtySet]);

  const buDirtyCount = useMemo(() => {
    let count = 0;
    for (const k of dirtySet) {
      const [metric] = JSON.parse(k) as [CapacityMetric, string, string];
      if (metric === 'bu') count++;
    }
    return count;
  }, [dirtySet]);

  // ---------- Save All ----------
  const handleSaveAll = async () => {
    if (dirtySet.size === 0) {
      message.info(t('capacityLab.noChanges'));
      return;
    }

    const updatesMap = new Map<
      string,
      { month: string; factoryId: string; corePanelPerDay: number; buPanelPerDay: number }
    >();

    for (const k of dirtySet) {
      const [metric, factoryId, month] = JSON.parse(k) as [CapacityMetric, string, string];
      const mapKey = `${month}||${factoryId}`;

      if (!updatesMap.has(mapKey)) {
        const coreVal = coreRows.find((r) => r.factoryId === factoryId)?.[month] ?? 0;
        const buVal = buRows.find((r) => r.factoryId === factoryId)?.[month] ?? 0;
        updatesMap.set(mapKey, {
          month,
          factoryId,
          corePanelPerDay: Number(coreVal) || 0,
          buPanelPerDay: Number(buVal) || 0,
        });
      }

      const entry = updatesMap.get(mapKey)!;
      if (metric === 'core') {
        entry.corePanelPerDay = Number(coreRows.find((r) => r.factoryId === factoryId)?.[month]) || 0;
      } else {
        entry.buPanelPerDay = Number(buRows.find((r) => r.factoryId === factoryId)?.[month]) || 0;
      }
    }

    const updates = Array.from(updatesMap.values());

    try {
      await batchSaveCapacityPlans(scope, updates, workingDays);
      message.success(`${t('capacityLab.saved')} ${dirtySet.size} ${t('capacityLab.changedCells')} (${updates.length} ${t('capacityLab.planRecords')})`);
      await loadData();
    } catch (e: any) {
      message.error(e.message || t('capacityLab.failedToSave'));
    }
  };

  // ---------- Discard ----------
  const handleDiscard = () => {
    setCoreRows(savedCoreRef.current.map((r) => ({ ...r })));
    setBuRows(savedBuRef.current.map((r) => ({ ...r })));
    setDirtySet(new Set());
    message.info(t('capacityLab.changesDiscarded'));
  };

  // ---------- Cell class name builder ----------
  const buildCellClassName = useCallback(
    (metric: CapacityMetric) => {
      return (opt: { rowData: unknown; rowIndex: number; columnId?: string }) => {
        const row = opt.rowData as CapacitySheetRow;
        if (!row?.factoryId) return '';
        const month = opt.columnId;
        if (!month || !DEFAULT_MONTHS.includes(month)) return '';
        return dirtySet.has(dirtyKey(metric, row.factoryId, month)) ? 'dirty-cell' : '';
      };
    },
    [dirtySet]
  );

  // ---------- Grid height ----------
  const gridHeight = useMemo(() => {
    if (typeof window === 'undefined') return 600;
    return Math.max(300, window.innerHeight - 220);
  }, []);

  // ---------- Tab items ----------
  const tabItems = [
    {
      key: 'core',
      label: (
        <Space>
          {t('capacityLab.core')}
          {coreDirtyCount > 0 && <Tag color="orange">{coreDirtyCount}</Tag>}
        </Space>
      ),
      children: (
        <div className="stable-spreadsheet-shell">
          <DataSheetGrid<CapacitySheetRow>
            value={coreRows}
            onChange={handleCoreRowsChange}
            columns={columns}
            rowHeight={36}
            height={gridHeight}
            lockRows={true}
            cellClassName={buildCellClassName('core')}
          />
        </div>
      ),
    },
    {
      key: 'bu',
      label: (
        <Space>
          {t('capacityLab.bu')}
          {buDirtyCount > 0 && <Tag color="orange">{buDirtyCount}</Tag>}
        </Space>
      ),
      children: (
        <div className="stable-spreadsheet-shell">
          <DataSheetGrid<CapacitySheetRow>
            value={buRows}
            onChange={handleBuRowsChange}
            columns={columns}
            rowHeight={36}
            height={gridHeight}
            lockRows={true}
            cellClassName={buildCellClassName('bu')}
          />
        </div>
      ),
    },
  ];

  // ---------- Render ----------
  if (loading) return <PageLoading />;
  if (error) return <Alert message={error} type="error" showIcon style={{ margin: 16 }} />;
  if (factories.length === 0) {
    return (
      <EmptyState
        title={t('capacityLab.noFactories')}
        description={t('capacityLab.setupFactories')}
      />
    );
  }

  return (
    <div className="twk-page">
      {/* Experimental banner */}
      <ExperimentalBanner
        label={t('capacityLab.experiment')}
        description={t('capacityLab.experimentalDesc')}
      />
      {/* Toolbar */}
      <Card size="small" className="abf-toolbar" style={{ marginBottom: 8 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col>
            <Tag color="orange">
              <ExperimentOutlined /> {t('capacityLab.experiment')}
            </Tag>
          </Col>
          <Col>
            <Button
              icon={<SaveOutlined />}
              type="primary"
              onClick={handleSaveAll}
              disabled={!writable || dirtySet.size === 0}
            >
              {t('capacityLab.saveAll')} ({dirtySet.size})
            </Button>
          </Col>
          <Col>
            <Button icon={<UndoOutlined />} onClick={handleDiscard} disabled={dirtySet.size === 0}>
              {t('capacityLab.discard')}
            </Button>
          </Col>
          <Col flex="auto" />
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {factories.length} {t('capacityLab.factories')} &middot; {DEFAULT_MONTHS.length} {t('capacityLab.months')} (2026-01 ~ 2030-12) &middot; {t('capacityLab.workingDays')}: {workingDays}/mo
            </Text>
          </Col>
        </Row>
      </Card>

      <Alert
        message={t('capacityLab.experimentTag')}
        description={t('capacityLab.experimentDesc')}
        type="info"
        showIcon
        style={{ marginBottom: 8, fontSize: 12 }}
      />

      {dirtySet.size > 0 && (
        <Alert
          message={`${dirtySet.size} ${t('capacityLab.dirtyCells')} ${coreDirtyCount} ${t('capacityLab.coreLabel')}, ${buDirtyCount} ${t('common.bu')}`}
          type="warning"
          showIcon
          style={{ marginBottom: 8, fontSize: 12 }}
        />
      )}

      {/* Read-only warning for viewers */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('common.readOnlyDesc')}
          type="info"
          showIcon
          className="abf-alert-section"
        />
      )}

      <Tabs defaultActiveKey="core" items={tabItems} size="small" />
    </div>
  );
};

export default CapacitySpreadsheet;
