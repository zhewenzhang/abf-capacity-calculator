/**
 * Data Quality Guided Fix Modal for Forecasts (Orphan SKU)
 *
 * v1.54.7 — Enhanced with actual cleanup and rebind functionality.
 *
 * This modal provides guided remediation options for orphan forecast issues,
 * where a forecast references a SKU that doesn't exist in the products table.
 *
 * Features:
 * - Shows clear explanation of the issue
 * - Provides multiple remediation paths (create SKU, clean orphans, rebind)
 * - Clean Orphans: deletes all orphan forecasts for the missing SKU
 * - Rebind: transfers orphan forecasts to an existing SKU
 * - Blocks Viewer role from taking action
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Alert,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Tag,
  Select,
  Popconfirm,
  message,
} from 'antd';
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { canEdit } from '../../services/projectScope';
import { deleteForecastsByIds, rebindForecastsToSku } from '../../services/forecastService';
import { useI18n } from '../../i18n';
import { buildRemediationUrl } from '../../core/dataQualityRemediation';
import type { DataQualityIssue } from '../../core/dataQuality';
import type { ProjectScope, SKU } from '../../types';

const { Text, Paragraph } = Typography;

interface OrphanForecastGuidedFixModalProps {
  open: boolean;
  onClose: () => void;
  issue: DataQualityIssue | null;
  scope: ProjectScope;
  /** All orphan forecasts for the same skuId (may span multiple months) */
  orphanForecasts?: Array<{ id: string; month: string; skuId: string; forecastPcs?: number }>;
  /** Available SKUs for rebind target selection */
  availableSkus?: SKU[];
  /** Called after successful cleanup/rebind to refresh data */
  onSuccess?: () => void;
  onEditForecast?: () => void;
}

export const OrphanForecastGuidedFixModal: React.FC<OrphanForecastGuidedFixModalProps> = ({
  open,
  onClose,
  issue,
  scope,
  orphanForecasts = [],
  availableSkus = [],
  onSuccess,
  onEditForecast,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const writable = canEdit(scope.role);

  // Extract orphan SKU ID from issue evidence
  const orphanSkuId = useMemo(() => {
    if (!issue) return null;
    return issue.evidence?.skuId as string ?? null;
  }, [issue]);

  // Extract month from issue
  const month = useMemo(() => {
    if (!issue) return null;
    return issue.evidence?.month as string ?? null;
  }, [issue]);

  // All orphan forecast IDs for this skuId
  const orphanForecastIds = useMemo(() => {
    return orphanForecasts.map(f => f.id);
  }, [orphanForecasts]);

  // Rebind state
  const [rebindTargetSkuId, setRebindTargetSkuId] = useState<string | null>(null);
  const [rebindLoading, setRebindLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);

  // Handle clean orphan forecasts
  const handleCleanOrphans = async () => {
    if (!writable || orphanForecastIds.length === 0) return;
    setCleanLoading(true);
    try {
      const count = await deleteForecastsByIds(scope, orphanForecastIds);
      message.success(t('remediation.orphanForecast.cleanOrphansSuccess', { count }));
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Failed to clean orphan forecasts');
    } finally {
      setCleanLoading(false);
    }
  };

  // Handle rebind to existing SKU
  const handleRebind = async () => {
    if (!writable || !rebindTargetSkuId || orphanForecastIds.length === 0) return;
    setRebindLoading(true);
    try {
      const targetSku = availableSkus.find(s => s.id === rebindTargetSkuId);
      const count = await rebindForecastsToSku(scope, orphanForecastIds, rebindTargetSkuId);
      message.success(t('remediation.orphanForecast.rebindSuccess', {
        count,
        skuCode: targetSku?.skuCode || rebindTargetSkuId,
      }));
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Failed to rebind forecasts');
    } finally {
      setRebindLoading(false);
    }
  };

  // Reset state when issue changes
  React.useEffect(() => {
    setRebindTargetSkuId(null);
  }, [issue]);

  if (!issue || !orphanSkuId) return null;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          {t('remediation.orphanForecast.title')}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      maskClosable
    >
      {/* Viewer warning */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('remediation.viewerBlocked')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Issue explanation */}
      <Alert
        type="error"
        showIcon
        message={t('remediation.orphanForecast.issueTitle')}
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              {t('remediation.orphanForecast.issueDesc', { skuId: orphanSkuId, month: month || '-' })}
            </Paragraph>
            <Space wrap>
              <Tag color="red">{orphanSkuId}</Tag>
              {month && <Tag color="orange">{month}</Tag>}
              {orphanForecasts.length > 1 && (
                <Tag color="volcano">{orphanForecasts.length} months affected</Tag>
              )}
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {/* Impact explanation */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Text strong>{t('remediation.orphanForecast.impactTitle')}</Text>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>{t('remediation.orphanForecast.impactRevenue')}</li>
          <li>{t('remediation.orphanForecast.impactAttributes')}</li>
          <li>{t('remediation.orphanForecast.impactConfidence')}</li>
        </ul>
      </Card>

      <Divider>{t('remediation.orphanForecast.optionsTitle')}</Divider>

      {/* Option 1: Create SKU */}
      {writable && (
        <Card
          size="small"
          hoverable
          onClick={() => {
            navigate(buildRemediationUrl('/products', { createSku: orphanSkuId }));
            onClose();
          }}
          style={{ marginBottom: 12, cursor: 'pointer', border: '1px solid #1890ff' }}
        >
          <Space>
            <PlusOutlined />
            <Text strong>{t('remediation.orphanForecast.createSku')}</Text>
            <Tag color="blue">{t('remediation.recommended')}</Tag>
          </Space>
          <br />
          <Text type="secondary">{t('remediation.orphanForecast.createSkuDesc')}</Text>
        </Card>
      )}

      {/* Option 2: Clean Orphan Forecasts */}
      {writable && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <DeleteOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>{t('remediation.orphanForecast.cleanOrphans')}</Text>
            </Space>
            <Text type="secondary">{t('remediation.orphanForecast.cleanOrphansDesc')}</Text>
            <Popconfirm
              title={t('remediation.orphanForecast.cleanOrphansConfirm', {
                count: orphanForecastIds.length,
                skuId: orphanSkuId,
              })}
              onConfirm={handleCleanOrphans}
              okText={t('products.delete')}
              okButtonProps={{ danger: true }}
              cancelText={t('products.cancel')}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={cleanLoading}
              >
                {t('remediation.orphanForecast.cleanOrphans')} ({orphanForecastIds.length})
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}

      {/* Option 3: Rebind to Existing SKU */}
      {writable && availableSkus.length > 0 && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <SwapOutlined style={{ color: '#fa8c16' }} />
              <Text strong>{t('remediation.orphanForecast.rebindToSku')}</Text>
            </Space>
            <Text type="secondary">{t('remediation.orphanForecast.rebindToSkuDesc')}</Text>
            <div style={{ marginTop: 8 }}>
              <Text style={{ marginRight: 8 }}>{t('remediation.orphanForecast.rebindSelectSku')}</Text>
              <Select
                showSearch
                placeholder="Select SKU..."
                style={{ width: 280 }}
                optionFilterProp="label"
                value={rebindTargetSkuId}
                onChange={setRebindTargetSkuId}
                options={availableSkus.map(s => ({
                  label: `${s.skuCode} — ${s.customer}`,
                  value: s.id,
                }))}
              />
            </div>
            {rebindTargetSkuId && (
              <Popconfirm
                title={t('remediation.orphanForecast.rebindConfirm', {
                  count: orphanForecastIds.length,
                  skuCode: availableSkus.find(s => s.id === rebindTargetSkuId)?.skuCode || '',
                })}
                onConfirm={handleRebind}
                okText={t('remediation.orphanForecast.rebindToSku')}
                cancelText={t('products.cancel')}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<SwapOutlined />}
                  loading={rebindLoading}
                >
                  {t('remediation.orphanForecast.rebindToSku')}
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Card>
      )}

      {/* Option 4: Edit Forecast Reference (hint) */}
      {writable && (
        <Card
          size="small"
          hoverable
          onClick={() => { onEditForecast?.(); onClose(); }}
          style={{ marginBottom: 12, cursor: 'pointer' }}
        >
          <Space>
            <EditOutlined />
            <Text strong>{t('remediation.orphanForecast.editForecast')}</Text>
          </Space>
          <br />
          <Text type="secondary">{t('remediation.orphanForecast.editForecastDesc')}</Text>
        </Card>
      )}
    </Modal>
  );
};

export default OrphanForecastGuidedFixModal;
