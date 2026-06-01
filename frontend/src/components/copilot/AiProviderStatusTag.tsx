import React from 'react';
import { Tag } from 'antd';
import { useI18n } from '../../i18n';
import type { ProviderMode } from '../../core/aiProviderAdapter';

interface Props {
  mode: ProviderMode;
}

const AiProviderStatusTag: React.FC<Props> = ({ mode }) => {
  const { lang } = useI18n();
  const isZhTW = lang === 'zh-TW';

  const modeConfig: Record<ProviderMode, { color: string; label: string }> = {
    local: {
      color: 'green',
      label: isZhTW ? '本地確定性' : 'Local Deterministic',
    },
    mock: {
      color: 'blue',
      label: isZhTW ? '模擬模式' : 'Mock Provider',
    },
    'deepseek-proxy': {
      color: 'purple',
      label: isZhTW ? 'DeepSeek AI（託管）' : 'DeepSeek AI (Managed)',
    },
  };

  const config = modeConfig[mode];
  return <Tag color={config.color}>{config.label}</Tag>;
};

export default AiProviderStatusTag;
