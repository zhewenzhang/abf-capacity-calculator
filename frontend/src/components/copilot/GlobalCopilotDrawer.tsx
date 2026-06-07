import React, { useMemo } from 'react';
import { Drawer, Button, Space, Typography } from 'antd';
import { RobotOutlined, CloseOutlined, FullscreenOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCopilotDrawer } from './CopilotDrawerContext';
import { useActiveScope } from '../../context/WorkspaceContext';
import { buildMinimalAiCopilotContext } from '../../core/aiCopilotContext';
import CopilotChat from './CopilotChat';
import { useI18n } from '../../i18n';

const { Text } = Typography;

const GlobalCopilotDrawer: React.FC = () => {
  const { isOpen, close, context } = useCopilotDrawer();
  const scope = useActiveScope();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Use provided context (from page) or build minimal context for generic questions
  const effectiveContext = useMemo(() => {
    if (context) return context;
    return buildMinimalAiCopilotContext(scope.role);
  }, [context, scope.role]);

  const handleOpenFullPage = () => {
    close();
    navigate('/copilot');
  };

  return (
    <Drawer
      title={
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <RobotOutlined style={{ fontSize: 18, color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>{t('menu.copilot')}</span>
            <Text type="secondary" style={{ fontSize: 11 }}>DeepSeek · {t('aiBriefExport.guardrails.note').substring(0, 8)}</Text>
          </Space>
          <Space>
            <Button
              type="text"
              size="small"
              icon={<FullscreenOutlined />}
              onClick={handleOpenFullPage}
              title={t('aiBriefExport.title')}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={close}
            />
          </Space>
        </Space>
      }
      open={isOpen}
      onClose={close}
      width={560}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      destroyOnClose={false}
      maskStyle={{ background: 'rgba(0,0,0,0.15)' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CopilotChat context={effectiveContext} />
      </div>
    </Drawer>
  );
};

export default GlobalCopilotDrawer;
