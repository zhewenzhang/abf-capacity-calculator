import React from 'react';
import { Drawer, Radio, Input, Button, Space, Alert, Typography, Divider } from 'antd';
import { LockOutlined, ClearOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  currentMode: 'local' | 'mock' | 'external-byok' | 'deepseek';
  onModeChange: (mode: 'local' | 'mock' | 'external-byok' | 'deepseek') => void;
  isViewer: boolean;
  deepseekApiKey: string;
  onDeepseekApiKeyChange: (key: string) => void;
  onClearDeepseekApiKey: () => void;
}

const AiProviderSettingsDrawer: React.FC<Props> = ({
  open,
  onClose,
  currentMode,
  onModeChange,
  isViewer,
  deepseekApiKey,
  onDeepseekApiKeyChange,
  onClearDeepseekApiKey,
}) => {
  const { t } = useI18n();

  return (
    <Drawer
      title={t('copilot.provider.settings')}
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
    >
      {isViewer && (
        <Alert
          message={t('copilot.provider.viewerReadonly')}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Text strong>{t('copilot.provider.mode')}</Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      <Radio.Group
        value={currentMode}
        onChange={(e) => onModeChange(e.target.value)}
        disabled={isViewer}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="local">
            <Text>{t('copilot.provider.local')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('copilot.provider.localDesc')}
            </Text>
          </Radio>

          <Radio value="mock">
            <Text>{t('copilot.provider.mock')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('copilot.provider.mockDesc')}
            </Text>
          </Radio>

          <Radio value="external-byok" disabled title={t('copilot.provider.notEnabled')}>
            <Text type="secondary">{t('copilot.provider.external')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('copilot.provider.externalDesc')}
            </Text>
          </Radio>

          <Radio value="deepseek">
            <Text>{t('copilot.provider.deepseek')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('copilot.provider.deepseekDesc')}
            </Text>
          </Radio>
        </Space>
      </Radio.Group>

      {currentMode === 'mock' && (
        <Alert
          message={t('copilot.provider.mockInfo')}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      {currentMode === 'external-byok' && (
        <>
          <Divider />
          <Text strong>{t('copilot.provider.keyLabel')}</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Password
                placeholder={t('copilot.provider.keyPlaceholder')}
                value=""
                disabled
                prefix={<LockOutlined />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('copilot.provider.sessionOnly')}
                  </Text>
                }
              />
              <Alert
                message={t('copilot.provider.keyWarning')}
                type="warning"
                showIcon
                style={{ fontSize: 12 }}
              />
              <Button
                icon={<ClearOutlined />}
                disabled
                size="small"
              >
                {t('copilot.provider.clearKey')}
              </Button>
            </Space>
          </div>
        </>
      )}

      {currentMode === 'deepseek' && (
        <>
          <Divider />
          <Text strong>{t('copilot.provider.deepseekKeyLabel')}</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Password
                placeholder={t('copilot.provider.deepseekKeyPlaceholder')}
                value={deepseekApiKey}
                onChange={(e) => onDeepseekApiKeyChange(e.target.value)}
                disabled={isViewer}
                prefix={<LockOutlined />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('copilot.provider.sessionOnly')}
                  </Text>
                }
              />
              <Alert
                message={t('copilot.provider.deepseekKeyWarning')}
                type="warning"
                showIcon
                style={{ fontSize: 12 }}
              />
              <Button
                icon={<ClearOutlined />}
                onClick={onClearDeepseekApiKey}
                disabled={isViewer}
                size="small"
              >
                {t('copilot.provider.clearKey')}
              </Button>
            </Space>
          </div>
        </>
      )}
    </Drawer>
  );
};

export default AiProviderSettingsDrawer;
