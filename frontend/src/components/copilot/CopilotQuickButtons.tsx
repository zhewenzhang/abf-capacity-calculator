import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import {
  WarningOutlined,
  AlertOutlined,
  SwapOutlined,
  ToolOutlined,
  ExperimentOutlined,
  EyeOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';

interface Props {
  onSelect: (toolId: string) => void;
}

const QUICK_QUESTIONS: Array<{
  toolId: string;
  labelKey: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { toolId: 'dataProblems', labelKey: 'copilot.quick.dataProblems', icon: <WarningOutlined />, color: '#ff4d4f' },
  { toolId: 'capacityRisk', labelKey: 'copilot.quick.capacityRisk', icon: <AlertOutlined />, color: '#fa8c16' },
  { toolId: 'bpGap', labelKey: 'copilot.quick.bpGap', icon: <SwapOutlined />, color: '#722ed1' },
  { toolId: 'suggestFixes', labelKey: 'copilot.quick.suggestFixes', icon: <ToolOutlined />, color: '#13c2c2' },
  { toolId: 'scenarioImpact', labelKey: 'copilot.quick.scenarioImpact', icon: <ExperimentOutlined />, color: '#eb2f96' },
  { toolId: 'lookAhead', labelKey: 'copilot.quick.lookAhead', icon: <EyeOutlined />, color: '#1890ff' },
  { toolId: 'workbenchOverview', labelKey: 'copilot.quick.workbenchOverview', icon: <DashboardOutlined />, color: '#52c41a' },
];

const CopilotQuickButtons: React.FC<Props> = ({ onSelect }) => {
  const { t, lang } = useI18n();
  const isZhTW = lang === 'zh-TW';

  return (
    <div>
      <Space wrap size={[8, 8]}>
        {QUICK_QUESTIONS.map((q) => (
          <Tooltip key={q.toolId} title={t(q.labelKey)}>
            <Button
              size="small"
              icon={q.icon}
              onClick={() => onSelect(q.toolId)}
              style={{
                borderRadius: 8,
                borderColor: q.color,
                color: q.color,
              }}
            >
              {t(q.labelKey)}
            </Button>
          </Tooltip>
        ))}
      </Space>
      <div style={{ marginTop: 8 }}>
        <Space>
          <ThunderboltOutlined style={{ color: '#8c8c8c' }} />
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            {isZhTW ? '快捷操作' : 'Quick Actions'}
          </span>
        </Space>
      </div>
    </div>
  );
};

export default CopilotQuickButtons;
