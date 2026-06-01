import React from 'react';
import { Drawer, Radio, Button, Alert, Typography, Divider, Tag, Space, Card } from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloudServerOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { ProviderMode } from '../../core/aiProviderAdapter';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  currentMode: ProviderMode;
  onModeChange: (mode: ProviderMode) => void;
  isViewer: boolean;
  proxyHealth: 'checking' | 'healthy' | 'unhealthy';
}

const AiProviderSettingsDrawer: React.FC<Props> = ({
  open,
  onClose,
  currentMode,
  onModeChange,
  isViewer,
  proxyHealth,
}) => {
  const { t, lang } = useI18n();
  const isZhTW = lang === 'zh-TW';

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

      {/* AI 服务状态卡片 */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <CloudServerOutlined style={{ fontSize: 18, color: '#52c41a' }} />
            <Text strong>{isZhTW ? 'AI 服務狀態' : 'AI Service Status'}</Text>
          </Space>
          <Space>
            {proxyHealth === 'healthy' ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                {isZhTW ? '已連線' : 'Connected'}
              </Tag>
            ) : proxyHealth === 'unhealthy' ? (
              <Tag icon={<ExclamationCircleOutlined />} color="error">
                {isZhTW ? '無法使用' : 'Unavailable'}
              </Tag>
            ) : (
              <Tag color="processing">
                {isZhTW ? '檢查中...' : 'Checking...'}
              </Tag>
            )}
            <Text type="secondary">DeepSeek v4 Flash</Text>
          </Space>
        </Space>
      </Card>

      {/* Provider 模式选择 */}
      <Text strong>{t('copilot.provider.mode')}</Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      <Radio.Group
        value={currentMode}
        onChange={(e) => onModeChange(e.target.value)}
        disabled={isViewer}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="deepseek-proxy">
            <Space>
              <Text>{isZhTW ? 'DeepSeek AI（託管模式）' : 'DeepSeek AI (Managed)'}</Text>
              <Tag color="blue">{isZhTW ? '推薦' : 'Recommended'}</Tag>
            </Space>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isZhTW
                ? '使用伺服器託管的 DeepSeek 進行 AI 分析，無需 API 金鑰。'
                : 'AI-powered analysis using server-managed DeepSeek. No API key required.'}
            </Text>
          </Radio>

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
        </Space>
      </Radio.Group>

      {/* 模式说明 */}
      {currentMode === 'deepseek-proxy' && (
        <Card
          size="small"
          style={{ marginTop: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}
        >
          <Space direction="vertical">
            <Space>
              <SafetyOutlined style={{ color: '#1890ff' }} />
              <Text strong>{isZhTW ? '安全代理' : 'Secure Proxy'}</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isZhTW
                ? 'API 金鑰由伺服器端管理，無需設定。所有請求通過 Firebase Functions 安全代理。'
                : 'API key is managed server-side. No configuration needed. All requests go through Firebase Functions secure proxy.'}
            </Text>
          </Space>
        </Card>
      )}

      {currentMode === 'mock' && (
        <Alert
          message={t('copilot.provider.mockInfo')}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      {/* 无 API Key 提示 */}
      <Divider />
      <Alert
        message={isZhTW ? '無需 API 金鑰' : 'No API Key Required'}
        description={isZhTW
          ? 'DeepSeek API 金鑰由伺服器端管理，您無需輸入或管理任何金鑰。'
          : 'DeepSeek API key is managed server-side. You don\'t need to input or manage any keys.'}
        type="success"
        showIcon
        icon={<SafetyOutlined />}
      />
    </Drawer>
  );
};

export default AiProviderSettingsDrawer;
