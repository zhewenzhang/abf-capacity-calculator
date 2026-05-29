import React from 'react';
import { Tag } from 'antd';

interface Props {
  mode: 'local' | 'mock' | 'external-byok' | 'deepseek';
}

const modeConfig: Record<
  Props['mode'],
  { color: string; label: string }
> = {
  local: { color: 'green', label: 'Local Deterministic' },
  mock: { color: 'blue', label: 'Mock Provider' },
  'external-byok': { color: 'red', label: 'External (Disabled)' },
  deepseek: { color: 'purple', label: 'DeepSeek AI' },
};

const AiProviderStatusTag: React.FC<Props> = ({ mode }) => {
  const config = modeConfig[mode];
  return <Tag color={config.color}>{config.label}</Tag>;
};

export default AiProviderStatusTag;
