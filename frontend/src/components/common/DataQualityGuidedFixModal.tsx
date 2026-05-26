/**
 * Data Quality Guided Fix Modal for Forecasts (Orphan SKU)
 *
 * v1.36.0 MVP - Guided Fix Entry Point for Forecasts page
 *
 * This modal provides guided remediation options for orphan forecast issues,
 * where a forecast references a SKU that doesn't exist in the products table.
 *
 * Features:
 * - Shows clear explanation of the issue
 * - Provides multiple remediation paths (create SKU, edit forecast)
 * - Blocks Viewer role from taking action
 * - No automatic deletion or modification
 */

import React, { useMemo } from 'react';
import {
  Modal,
  Alert,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Tag,
} from 'antd';
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { canEdit } from '../../services/projectScope';
import { useI18n } from '../../i18n';
import { buildRemediationUrl } from '../../core/dataQualityRemediation';
import type { DataQualityIssue } from '../../core/dataQuality';
import type { ProjectScope } from '../../types';

const { Text, Paragraph } = Typography;

interface OrphanForecastGuidedFixModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** The DQ issue */
  issue: DataQualityIssue | null;
  /** Project scope */
  scope: ProjectScope;
  /** Callback when user chooses to edit forecast */
  onEditForecast?: () => void;
}

interface GuidedFixOption {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  action: 'navigate' | 'focus';
  targetUrl?: string;
  urlParams?: Record<string, string>;
  buttonType: 'primary' | 'default';
}

export const OrphanForecastGuidedFixModal: React.FC<OrphanForecastGuidedFixModalProps> = ({
  open,
  onClose,
  issue,
  scope,
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

  const options: GuidedFixOption[] = useMemo(() => {
    if (!orphanSkuId) return [];

    return [
      {
        id: 'create-sku',
        icon: <PlusOutlined />,
        titleKey: 'remediation.orphanForecast.createSku',
        descKey: 'remediation.orphanForecast.createSkuDesc',
        action: 'navigate',
        targetUrl: '/products',
        urlParams: { createSku: orphanSkuId },
        buttonType: 'primary',
      },
      {
        id: 'edit-forecast',
        icon: <EditOutlined />,
        titleKey: 'remediation.orphanForecast.editForecast',
        descKey: 'remediation.orphanForecast.editForecastDesc',
        action: 'focus',
        buttonType: 'default',
      },
    ];
  }, [orphanSkuId]);

  const handleOptionClick = (option: GuidedFixOption) => {
    if (!writable) return;

    if (option.action === 'navigate' && option.targetUrl) {
      const url = buildRemediationUrl(option.targetUrl, option.urlParams || {});
      navigate(url);
      onClose();
    } else if (option.action === 'focus' && onEditForecast) {
      onEditForecast();
      onClose();
    }
  };

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
      width={520}
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

      {/* Remediation options */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {options.map(option => (
          <Card
            key={option.id}
            size="small"
            hoverable={writable}
            onClick={() => handleOptionClick(option)}
            style={{
              cursor: writable ? 'pointer' : 'not-allowed',
              opacity: writable ? 1 : 0.7,
              border: option.buttonType === 'primary' ? '1px solid #1890ff' : undefined,
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                {option.icon}
                <Text strong>{t(option.titleKey)}</Text>
                {option.buttonType === 'primary' && (
                  <Tag color="blue">{t('remediation.recommended')}</Tag>
                )}
              </Space>
              <Text type="secondary">{t(option.descKey)}</Text>
              {writable && (
                <Button
                  type={option.buttonType}
                  size="small"
                  icon={<ArrowRightOutlined />}
                  style={{ marginTop: 8 }}
                >
                  {t('remediation.goToFix')}
                </Button>
              )}
            </Space>
          </Card>
        ))}
      </Space>

      <Divider />

      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('remediation.orphanForecast.note')}
      </Text>
    </Modal>
  );
};

export default OrphanForecastGuidedFixModal;
