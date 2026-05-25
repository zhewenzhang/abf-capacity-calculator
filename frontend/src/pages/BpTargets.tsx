import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, message, Alert, Card, Row, Col, Space } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { DataSheetGrid, textColumn, floatColumn, keyColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { getParameters, saveParameters } from '../services/parameterService';
import type { ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { PageLoading } from '../components/common';
import {
  recordToRows,
  rowsToRecord,
  START_YEAR,
  END_YEAR,
  type BpSheetRow,
} from '../core/bpTargetsHelpers';

interface BpTargetsProps {
  scope: ProjectScope;
}

const BpTargetsPage: React.FC<BpTargetsProps> = ({ scope }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BpSheetRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<BpSheetRow[]>([]);

  const writable = canEdit(scope.role);

  // ---------- Load parameters ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getParameters(scope);
      const bpRecord = data.bpTargets?.yearlyRevenueTargetsMillionTwd || {};
      const sheetRows = recordToRows(bpRecord, t('bpTargets.targetCol'));
      
      setRows(JSON.parse(JSON.stringify(sheetRows)));
      setSavedSnapshot(JSON.parse(JSON.stringify(sheetRows)));
    } catch (e: any) {
      setError(e.message || 'Failed to load BP targets');
    } finally {
      setLoading(false);
    }
  }, [scope, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- Dirty check ----------
  const isDirty = useMemo(() => {
    if (rows.length === 0 || savedSnapshot.length === 0) return false;
    const r = rows[0];
    const s = savedSnapshot[0];
    for (let y = START_YEAR; y <= END_YEAR; y++) {
      const key = String(y);
      if (r[key] !== s[key]) {
        return true;
      }
    }
    return false;
  }, [rows, savedSnapshot]);

  // ---------- Cell styling for dirty highlight ----------
  const cellClassName = useCallback(({ rowData, columnId }: any) => {
    if (columnId === 'metric') return '';
    const y = columnId;
    if (savedSnapshot.length > 0) {
      const savedVal = savedSnapshot[0][y];
      const currentVal = rowData[y];
      if (savedVal !== currentVal) {
        return 'dirty-cell';
      }
    }
    return '';
  }, [savedSnapshot]);

  // ---------- Columns definition ----------
  const columns = useMemo(() => {
    const yearCols = [];
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      yearCols.push(
        keyColumn<BpSheetRow, any>(String(year), {
          ...floatColumn,
          title: String(year),
          basis: 110,
          grow: 0,
          shrink: 0,
          disabled: !writable,
        } as any)
      );
    }

    return [
      keyColumn<BpSheetRow, 'metric'>('metric', {
        ...textColumn,
        title: t('bpTargets.metric'),
        basis: 220,
        grow: 0,
        shrink: 0,
        disabled: true,
      } as any),
      ...yearCols,
    ];
  }, [t, writable]);

  // ---------- Save & Discard handlers ----------
  const handleSave = async () => {
    if (!isDirty) {
      message.info(t('bpTargets.noChanges'));
      return;
    }

    setSaving(true);
    try {
      const record = rowsToRecord(rows);
      
      // 先获取最新的 parameters 文档，防止意外覆盖其他配置
      const latestParams = await getParameters(scope);
      const nextParams = {
        ...latestParams,
        bpTargets: {
          mode: 'yearly' as const,
          yearlyRevenueTargetsMillionTwd: record,
        },
      };

      await saveParameters(scope, nextParams);
      message.success(t('bpTargets.saveSuccess'));
      
      // 更新备份快照
      setSavedSnapshot(JSON.parse(JSON.stringify(rows)));
    } catch (e: any) {
      message.error(e.message || 'Failed to save BP targets');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRows(JSON.parse(JSON.stringify(savedSnapshot)));
    message.info(t('bpTargets.discardSuccess'));
  };

  const handleRowsChange = (newRows: BpSheetRow[]) => {
    // Viewer True Read-only: 如果是只读用户，直接拦截变更
    if (!writable) return;
    setRows(newRows);
  };

  // ---------- Render ----------
  if (loading) return <PageLoading />;
  if (error) return <Alert message={error} type="error" showIcon style={{ margin: 16 }} />;

  return (
    <div style={{ padding: '8px 4px' }}>
      {/* Viewer read-only warning */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('common.readOnlyDesc')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Toolbar / Actions */}
      <Card className="toolbar-card">
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={!writable || !isDirty}
              >
                {t('common.save')}
              </Button>
              <Button
                icon={<UndoOutlined />}
                onClick={handleDiscard}
                disabled={!writable || !isDirty || saving}
              >
                {t('common.discard')}
              </Button>
            </Space>
          </Col>
          <Col>
            <span style={{ fontSize: 13, color: '#8c8c8c' }}>
              {t('parameters.bpTargetsNote')}
            </span>
          </Col>
        </Row>
      </Card>

      {/* Grid rendering with spreadsheet-wrapper for horizontal scroll consistency */}
      <Card style={{ marginTop: 12 }}>
        <div className="spreadsheet-wrapper">
          <DataSheetGrid<BpSheetRow>
            value={rows}
            onChange={handleRowsChange}
            columns={columns}
            rowHeight={36}
            height={120}
            lockRows={true}
            cellClassName={cellClassName}
          />
        </div>
      </Card>
    </div>
  );
};

export default BpTargetsPage;
