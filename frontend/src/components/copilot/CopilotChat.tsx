import React, { useState, useCallback } from 'react';
import { Input, Button, Space, Typography, Divider, Alert, Spin } from 'antd';
import { SendOutlined, SafetyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { routeQuestion, runTool } from '../../core/aiCopilotTools';
import { copyAiCopilotPrompt } from '../../core/aiCopilotExport';
import CopilotMessage from './CopilotMessage';
import CopilotQuickButtons from './CopilotQuickButtons';

const { Text } = Typography;

interface Props {
  context: AiCopilotContext;
}

const CopilotChat: React.FC<Props> = ({ context }) => {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CopilotToolResult[]>([]);
  const [processing, setProcessing] = useState(false);

  const isViewer = context.role === 'viewer';

  const handleQuickSelect = useCallback(
    (toolId: string) => {
      setProcessing(true);
      // Simulate async processing for UX feedback
      setTimeout(() => {
        const result = runTool(toolId, context);
        setHistory((prev) => [...prev, result]);
        setProcessing(false);
      }, 300);
    },
    [context]
  );

  const handleSubmit = useCallback(() => {
    const q = input.trim();
    if (!q || processing) return;
    setProcessing(true);
    setTimeout(() => {
      const result = routeQuestion(q, context);
      setHistory((prev) => [...prev, result]);
      setInput('');
      setProcessing(false);
    }, 300);
  }, [input, context, processing]);

  const handleExportPrompt = useCallback(async () => {
    await copyAiCopilotPrompt(context);
  }, [context]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header disclaimer */}
      <Alert
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        message={t('copilot.disclaimer')}
        description={t('copilot.disclaimerDetail')}
        style={{ marginBottom: 12 }}
      />

      {/* Viewer info banner */}
      {isViewer && (
        <Alert
          type="warning"
          showIcon
          message={t('copilot.viewer.noFixes')}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Quick question buttons */}
      <div style={{ marginBottom: 12 }}>
        <CopilotQuickButtons onSelect={handleQuickSelect} />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Message history */}
      <Spin spinning={processing}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: 12,
            minHeight: 0,
          }}
        >
          {history.length === 0 && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 32 }}>
              {t('copilot.input.placeholder')}
            </Text>
          )}
          {history.map((result, idx) => (
            <div key={idx}>
              <CopilotMessage result={result} showFixes={!isViewer} />
              {/* Fallback CTA for blocked/low confidence */}
              {(result.confidence === 'blocked' || result.confidence === 'low') && (
                <div style={{ marginBottom: 12, marginTop: -4, textAlign: 'right' }}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={handleExportPrompt}
                  >
                    Export Prompt Pack
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Spin>

      {/* Input area */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('copilot.input.placeholder')}
            disabled={processing}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={!input.trim() || processing}
          />
        </Space.Compact>
      </div>
    </div>
  );
};

export default CopilotChat;
