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
} from '@ant-design/icons';
import { useI18n } from '../../i18n';

interface Props {
  onSelect: (toolId: string) => void;
}

const QUICK_QUESTIONS: Array<{ toolId: string; labelKey: string; icon: React.ReactNode }> = [
  { toolId: 'dataProblems', labelKey: 'copilot.quick.dataProblems', icon: <WarningOutlined /> },
  { toolId: 'capacityRisk', labelKey: 'copilot.quick.capacityRisk', icon: <AlertOutlined /> },
  { toolId: 'bpGap', labelKey: 'copilot.quick.bpGap', icon: <SwapOutlined /> },
  { toolId: 'suggestFixes', labelKey: 'copilot.quick.suggestFixes', icon: <ToolOutlined /> },
  { toolId: 'scenarioImpact', labelKey: 'copilot.quick.scenarioImpact', icon: <ExperimentOutlined /> },
  { toolId: 'lookAhead', labelKey: 'copilot.quick.lookAhead', icon: <EyeOutlined /> },
  { toolId: 'workbenchOverview', labelKey: 'copilot.quick.workbenchOverview', icon: <DashboardOutlined /> },
];

const CopilotQuickButtons: React.FC<Props> = ({ onSelect }) => {
  const { t } = useI18n();

  return (
    <Space wrap size={[8, 8]}>
      {QUICK_QUESTIONS.map((q) => (
        <Tooltip key={q.toolId} title={t(q.labelKey)}>
          <Button
            size="small"
            icon={q.icon}
            onClick={() => onSelect(q.toolId)}
          >
            {t(q.labelKey)}
          </Button>
        </Tooltip>
      ))}
    </Space>
  );
};

export default CopilotQuickButtons;
