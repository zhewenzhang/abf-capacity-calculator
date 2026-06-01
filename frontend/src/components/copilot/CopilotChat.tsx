import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, Space, Typography, Spin, Tag, Tooltip } from 'antd';
import {
  SendOutlined,
  DownloadOutlined,
  SettingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { routeQuestion, runTool } from '../../core/aiCopilotTools';
import { copyAiCopilotPrompt } from '../../core/aiCopilotExport';
import { validateProviderOutput as validateOutputText } from '../../core/aiCopilotOutputValidation';
import { getProviderById, type ProviderConfig, type ProviderMode } from '../../core/aiProviderAdapter';
import { buildProviderSystemPrompt, buildProviderUserMessage, type SupportedLanguage } from '../../core/aiProviderPromptPack';
import CopilotMessage from './CopilotMessage';
import CopilotQuickButtons from './CopilotQuickButtons';
import AiProviderSettingsDrawer from './AiProviderSettingsDrawer';
import AiProviderStatusTag from './AiProviderStatusTag';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Props {
  context: AiCopilotContext;
}

const CopilotChat: React.FC<Props> = ({ context }) => {
  const { t, lang } = useI18n();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CopilotToolResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [providerMode, setProviderMode] = useState<ProviderMode>('deepseek-proxy');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proxyHealth, setProxyHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isViewer = context.role === 'viewer';
  const currentLang: SupportedLanguage = lang === 'zh-TW' ? 'zh-TW' : 'en';

  // 检查 proxy 健康状态
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { checkAiProxyHealth } = await import('../../services/aiChatService');
        const healthy = await checkAiProxyHealth();
        setProxyHealth(healthy ? 'healthy' : 'unhealthy');
      } catch {
        setProxyHealth('unhealthy');
      }
    };
    checkHealth();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const applyOutputValidation = useCallback(
    (result: CopilotToolResult): CopilotToolResult => {
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
      setTimeout(() => {
        const result = runTool(toolId, context);
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

    // 始终运行确定性工具作为基础
    const localResult = routeQuestion(q, context);

    if (providerMode === 'deepseek-proxy') {
      try {
        const provider = getProviderById('deepseek-proxy');
        if (!provider) {
          throw new Error('AI provider not found');
        }

        const config: ProviderConfig = {
          providerId: 'deepseek-proxy',
        };

        const systemPrompt = buildProviderSystemPrompt(context, 'deepseek-proxy', currentLang);
        const userMessage = buildProviderUserMessage(context, q, currentLang);
        const request = provider.buildRequest(config, systemPrompt, userMessage, {});
        const response = await provider.runCompletion(config, request);

        if (response.confidence === 'blocked' || response.isFallback) {
          // 降级到确定性工具
          const fallbackResult: CopilotToolResult = {
            ...localResult,
            caveats: [...localResult.caveats, `AI: ${response.content}`],
          };
          const validated = applyOutputValidation(fallbackResult);
          setHistory((prev) => [...prev, validated]);
        } else {
          // AI 响应成功
          const aiResult: CopilotToolResult = {
            toolName: 'DeepSeek AI',
            title: currentLang === 'zh-TW' ? 'AI 分析' : 'AI Analysis',
            summary: response.content,
            facts: [],
            assumptions: [],
            inferences: [],
            recommendations: [],
            sourceReferences: ['DeepSeek v4 Flash (Managed)'],
            confidence: 'high',
            caveats: [currentLang === 'zh-TW'
              ? 'AI 生成的回應 — 請以資料驗證'
              : 'AI-generated response — verify with data'],
            data: { tokensUsed: response.tokensUsed },
          };
          const validated = applyOutputValidation(aiResult);
          setHistory((prev) => [...prev, validated]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const fallbackResult: CopilotToolResult = {
          ...localResult,
          caveats: [...localResult.caveats, `AI error: ${errorMessage}`],
        };
        const validated = applyOutputValidation(fallbackResult);
        setHistory((prev) => [...prev, validated]);
      }
    } else {
      // Local 或 Mock 模式
      const validated = applyOutputValidation(localResult);
      setHistory((prev) => [...prev, validated]);
    }

    setInput('');
    setProcessing(false);
  }, [input, context, processing, providerMode, currentLang, applyOutputValidation]);

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
    <div className="twk-chat" style={{ height: '100%' }}>
      {/* 頂部欄 — Designbyte style */}
      <div className="twk-chat-header">
        <Space>
          <RobotOutlined style={{ fontSize: 24, color: 'var(--twk-text)' }} />
          <Title level={5} style={{ margin: 0 }}>
            {currentLang === 'zh-TW' ? 'AI 資料助手' : 'AI Data Copilot'}
          </Title>
          <AiProviderStatusTag mode={providerMode} />
        </Space>
        <Space>
          <Tooltip title={currentLang === 'zh-TW' ? 'AI 服務狀態' : 'AI Service Status'}>
            {proxyHealth === 'healthy' ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                {currentLang === 'zh-TW' ? '已連線' : 'Connected'}
              </Tag>
            ) : proxyHealth === 'unhealthy' ? (
              <Tag icon={<ExclamationCircleOutlined />} color="warning">
                {currentLang === 'zh-TW' ? '無法使用' : 'Unavailable'}
              </Tag>
            ) : (
              <Tag color="processing">
                {currentLang === 'zh-TW' ? '檢查中...' : 'Checking...'}
              </Tag>
            )}
          </Tooltip>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
            disabled={isViewer}
            size="small"
          >
            {t('copilot.provider.settings')}
          </Button>
        </Space>
      </div>

      {/* 消息區域 — Designbyte style */}
      <div className="twk-chat-messages">
        {/* 空狀態 */}
        {history.length === 0 && (
          <div className="twk-empty" style={{ minHeight: 400 }}>
            <RobotOutlined className="twk-empty-icon" />
            <Title level={4} className="twk-empty-title">
              {currentLang === 'zh-TW' ? '有什麼可以幫您的嗎？' : 'How can I help you today?'}
            </Title>
            <Text className="twk-empty-description">
              {currentLang === 'zh-TW'
                ? '詢問您的產能資料，或嘗試下方的快捷操作。'
                : 'Ask about your capacity data, or try a quick action below.'}
            </Text>
            <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span
                className="twk-pill"
                onClick={() => handleQuickSelect('dataProblems')}
              >
                <ThunderboltOutlined /> {currentLang === 'zh-TW' ? '資料問題' : 'Data Problems'}
              </span>
              <span
                className="twk-pill"
                onClick={() => handleQuickSelect('capacityRisk')}
              >
                <ThunderboltOutlined /> {currentLang === 'zh-TW' ? '產能風險' : 'Capacity Risk'}
              </span>
              <span
                className="twk-pill"
                onClick={() => handleQuickSelect('bpGap')}
              >
                <ThunderboltOutlined /> {currentLang === 'zh-TW' ? 'BP 差距' : 'BP Gap'}
              </span>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {history.map((result, idx) => (
          <div key={idx} className="twk-chat-bubble">
            <CopilotMessage result={result} showFixes={!isViewer} />
            {/* Fallback CTA */}
            {(result.confidence === 'blocked' || result.confidence === 'low') && (
              <div style={{ marginTop: 8, textAlign: 'right' }}>
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

        {/* 加載狀態 */}
        {processing && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {currentLang === 'zh-TW' ? '分析中...' : 'Analyzing...'}
            </Text>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 底部區域 — Designbyte style */}
      <div className="twk-chat-input-area">
        {/* 快捷按鈕 */}
        <div style={{ marginBottom: 12 }}>
          <CopilotQuickButtons onSelect={handleQuickSelect} />
        </div>

        {/* 輸入框 */}
        <div className="twk-chat-input">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentLang === 'zh-TW'
              ? '詢問您的產能資料...'
              : 'Ask about your capacity data...'}
            disabled={processing}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{
              borderRadius: 12,
              resize: 'none',
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={!input.trim() || processing}
            style={{
              borderRadius: 12,
              width: 48,
              height: 48,
            }}
          />
        </div>

        {/* 底部信息 */}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {currentLang === 'zh-TW'
              ? 'DeepSeek v4 Flash · 伺服器託管金鑰 · 無需 API 金鑰'
              : 'DeepSeek v4 Flash · Server-Managed Key · No API key required'}
          </Text>
        </div>
      </div>

      {/* Provider Settings Drawer */}
      <AiProviderSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentMode={providerMode}
        onModeChange={handleModeChange}
        isViewer={isViewer}
        proxyHealth={proxyHealth}
      />
    </div>
  );
};

export default CopilotChat;
