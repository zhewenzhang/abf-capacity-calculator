import React, { useState, useCallback } from 'react';
import { Input, Button, Space, Typography, Divider, Alert, Spin } from 'antd';
import { SendOutlined, SafetyOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { routeQuestion, runTool } from '../../core/aiCopilotTools';
import { copyAiCopilotPrompt } from '../../core/aiCopilotExport';
import { validateProviderOutput as validateOutputText } from '../../core/aiCopilotOutputValidation';
import { getProviderById, type ProviderConfig } from '../../core/aiProviderAdapter';
import { buildProviderSystemPrompt, buildProviderUserMessage } from '../../core/aiProviderPromptPack';
import CopilotMessage from './CopilotMessage';
import CopilotQuickButtons from './CopilotQuickButtons';
import AiProviderSettingsDrawer from './AiProviderSettingsDrawer';
import AiProviderStatusTag from './AiProviderStatusTag';

const { Text } = Typography;

interface Props {
  context: AiCopilotContext;
}

type ProviderMode = 'local' | 'mock' | 'external-byok' | 'deepseek';

const CopilotChat: React.FC<Props> = ({ context }) => {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CopilotToolResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [providerMode, setProviderMode] = useState<ProviderMode>('local');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deepseekSessionKey, setDeepseekSessionKey] = useState('');

  const isViewer = context.role === 'viewer';

  const applyOutputValidation = useCallback(
    (result: CopilotToolResult): CopilotToolResult => {
      // Run real text-level output validation on the summary text
      const validation = validateOutputText(result.summary, {
        confidence: result.confidence,
      });

      if (validation.status === 'blocked') {
        return {
          ...result,
          summary: validation.sanitizedAnswer,
          confidence: 'blocked',
          blockedReason: validation.blockedReason,
          validationIssues: validation.issues.map((i) => i.message),
        };
      }

      if (validation.status === 'warning') {
        return {
          ...result,
          validationIssues: [
            ...(result.validationIssues ?? []),
            ...validation.issues.map((i) => i.message),
          ],
        };
      }

      return result;
    },
    []
  );

  const handleModeChange = useCallback((mode: ProviderMode) => {
    setProviderMode(mode);
  }, []);

  const handleQuickSelect = useCallback(
    (toolId: string) => {
      setProcessing(true);
      // Simulate async processing for UX feedback
      setTimeout(() => {
        const result = runTool(toolId, context);
        // Validate output text through safety layer (all provider modes)
        const validated = applyOutputValidation(result);
        setHistory((prev) => [...prev, validated]);
        setProcessing(false);
      }, 300);
    },
    [context, applyOutputValidation]
  );

  const handleSubmit = useCallback(async () => {
    const q = input.trim();
    if (!q || processing) return;
    setProcessing(true);

    // Always use deterministic tools as primary
    const result = routeQuestion(q, context);

    if (providerMode === 'external-byok') {
      // External BYOK: show blocked message, fall back to deterministic tools
      const blockedResult: CopilotToolResult = {
        ...result,
        caveats: [...result.caveats, t('copilot.provider.notEnabled')],
        blockedReason: t('copilot.provider.notEnabled'),
        confidence: 'blocked',
      };
      const validated = applyOutputValidation(blockedResult);
      setHistory((prev) => [...prev, validated]);
    } else if (providerMode === 'mock') {
      // Mock mode: deterministic tools are primary, note enhanced response availability
      const mockResult: CopilotToolResult = {
        ...result,
        caveats: [...result.caveats, 'Mock provider enhanced response available'],
        isMockProvider: true,
      };
      const validated = applyOutputValidation(mockResult);
      setHistory((prev) => [...prev, validated]);
    } else if (providerMode === 'deepseek') {
      // DeepSeek mode: call DeepSeek provider with session key
      if (!deepseekSessionKey || deepseekSessionKey.trim().length === 0) {
        const blockedResult: CopilotToolResult = {
          ...result,
          caveats: [...result.caveats, t('copilot.provider.deepseekKeyRequired')],
          blockedReason: t('copilot.provider.deepseekKeyRequired'),
          confidence: 'blocked',
        };
        const validated = applyOutputValidation(blockedResult);
        setHistory((prev) => [...prev, validated]);
      } else {
        try {
          const provider = getProviderById('deepseek');
          if (!provider) {
            throw new Error('DeepSeek provider not found');
          }

          const config: ProviderConfig = {
            providerId: 'deepseek',
            apiKey: deepseekSessionKey,
          };

          // Validate config
          const validation = provider.validateConfig(config);
          if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
          }

          // Build prompt pack
          const systemPrompt = buildProviderSystemPrompt(context, 'deepseek');
          const userMessage = buildProviderUserMessage(context, q);

          // Build request
          const request = provider.buildRequest(config, systemPrompt, userMessage, {});

          // Call DeepSeek
          const response = await provider.runCompletion(config, request);

          if (response.confidence === 'blocked' || response.isFallback) {
            // DeepSeek failed, fall back to deterministic
            const fallbackResult: CopilotToolResult = {
              ...result,
              caveats: [...result.caveats, `DeepSeek fallback: ${response.content}`],
              blockedReason: response.content,
              confidence: 'low',
            };
            const validated = applyOutputValidation(fallbackResult);
            setHistory((prev) => [...prev, validated]);
          } else {
            // DeepSeek succeeded, validate output
            const aiResult: CopilotToolResult = {
              toolName: 'DeepSeek AI',
              title: 'DeepSeek AI Response',
              summary: response.content,
              facts: [],
              assumptions: [],
              inferences: [],
              recommendations: [],
              sourceReferences: ['DeepSeek v4 Flash'],
              confidence: 'high',
              caveats: ['AI-generated response - verify with data'],
              data: { tokensUsed: response.tokensUsed },
            };
            const validated = applyOutputValidation(aiResult);
            setHistory((prev) => [...prev, validated]);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const fallbackResult: CopilotToolResult = {
            ...result,
            caveats: [...result.caveats, `DeepSeek error: ${errorMessage}`],
            blockedReason: `DeepSeek error: ${errorMessage}`,
            confidence: 'low',
          };
          const validated = applyOutputValidation(fallbackResult);
          setHistory((prev) => [...prev, validated]);
        }
      }
    } else {
      // Local mode: also validate through safety layer
      const validated = applyOutputValidation(result);
      setHistory((prev) => [...prev, validated]);
    }

    setInput('');
    setProcessing(false);
  }, [input, context, processing, providerMode, deepseekSessionKey, t, applyOutputValidation]);

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
      {/* Header disclaimer with provider controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <Alert
          type="info"
          showIcon
          icon={<SafetyOutlined />}
          message={t('copilot.disclaimer')}
          description={t('copilot.disclaimerDetail')}
          style={{ flex: 1 }}
        />
        <Space direction="vertical" size={4} align="end">
          <Button
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
            disabled={isViewer}
            size="small"
          >
            {t('copilot.provider.settings')}
          </Button>
          <AiProviderStatusTag mode={providerMode} />
        </Space>
      </div>

      {/* External BYOK alert */}
      {providerMode === 'external-byok' && (
        <Alert
          type="warning"
          showIcon
          message={t('copilot.provider.notEnabled')}
          description={t('copilot.provider.externalDesc')}
          style={{ marginBottom: 12 }}
        />
      )}

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

      {/* Provider Settings Drawer */}
      <AiProviderSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentMode={providerMode}
        onModeChange={handleModeChange}
        isViewer={isViewer}
        deepseekApiKey={deepseekSessionKey}
        onDeepseekApiKeyChange={setDeepseekSessionKey}
        onClearDeepseekApiKey={() => setDeepseekSessionKey('')}
      />
    </div>
  );
};

export default CopilotChat;
