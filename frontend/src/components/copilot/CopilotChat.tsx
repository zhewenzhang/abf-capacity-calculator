import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Input, Button, Space, Typography, Spin, Tag, Tooltip, Card, Row, Col } from 'antd';
import {
  SendOutlined,
  DownloadOutlined,
  SettingOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  CloudOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
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
import AiProviderSettingsDrawer from './AiProviderSettingsDrawer';
import AiProviderStatusTag from './AiProviderStatusTag';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Props {
  context: AiCopilotContext;
  pendingToolId?: string | null;
  onPendingToolConsumed?: () => void;
}

// Example questions for empty state
const EXAMPLE_QUESTIONS_ZH = [
  { icon: <DollarOutlined />, text: '2026 年 BP 為什麼沒有達標？', tool: 'bpGap' },
  { icon: <CloudOutlined />, text: '未來 6 個月最大的產能風險是什麼？', tool: 'capacityRisk' },
  { icon: <WarningOutlined />, text: '哪些客戶貢獻最多營收？', tool: 'dataProblems' },
  { icon: <QuestionCircleOutlined />, text: '目前資料品質有哪些問題？', tool: 'dataProblems' },
];

const EXAMPLE_QUESTIONS_EN = [
  { icon: <DollarOutlined />, text: 'Why did BP miss target in 2026?', tool: 'bpGap' },
  { icon: <CloudOutlined />, text: 'What is the biggest capacity risk in the next 6 months?', tool: 'capacityRisk' },
  { icon: <WarningOutlined />, text: 'Which customers contribute the most revenue?', tool: 'dataProblems' },
  { icon: <QuestionCircleOutlined />, text: 'What data quality issues exist?', tool: 'dataProblems' },
];

const CopilotChat: React.FC<Props> = ({ context, pendingToolId, onPendingToolConsumed }) => {
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
  const exampleQuestions = currentLang === 'zh-TW' ? EXAMPLE_QUESTIONS_ZH : EXAMPLE_QUESTIONS_EN;

  // Check proxy health
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

  // Auto-scroll to bottom
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

  // Auto-execute pending tool from deep-link
  useEffect(() => {
    if (pendingToolId && context) {
      setProcessing(true);
      setTimeout(() => {
        const result = runTool(pendingToolId, context);
        const validated = applyOutputValidation(result);
        setHistory((prev) => [...prev, validated]);
        setProcessing(false);
        onPendingToolConsumed?.();
      }, 300);
    }
  }, [pendingToolId, context, applyOutputValidation, onPendingToolConsumed]);

  const handleModeChange = useCallback((mode: ProviderMode) => {
    setProviderMode(mode);
  }, []);

  const handleSubmit = useCallback(async () => {
    const q = input.trim();
    if (!q || processing) return;
    setProcessing(true);

    // Always run deterministic tool as base
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
          const fallbackResult: CopilotToolResult = {
            ...localResult,
            caveats: [...localResult.caveats, `AI: ${response.content}`],
          };
          const validated = applyOutputValidation(fallbackResult);
          setHistory((prev) => [...prev, validated]);
        } else {
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

  // Generate follow-up suggestions based on last result
  const followUps = useMemo(() => {
    if (history.length === 0) return [];
    const last = history[history.length - 1];
    if (last.confidence === 'blocked') return [];

    if (currentLang === 'zh-TW') {
      return [
        '查看 2026 年 BP 差距來源',
        '用圖表比較 2026-2030',
        '模擬單價 +5% 會怎樣',
      ];
    }
    return [
      'View 2026 BP gap source',
      'Compare 2026-2030 with chart',
      'Simulate price +5%',
    ];
  }, [history, currentLang]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxWidth: 960,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}>
        <Space>
          <RobotOutlined style={{ fontSize: 20, color: '#2563eb' }} />
          <Text strong style={{ fontSize: 15 }}>{t('copilot.title')}</Text>
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

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {/* Empty state */}
        {history.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            textAlign: 'center',
          }}>
            <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Title level={4} style={{ color: '#8c8c8c', marginBottom: 8 }}>
              {currentLang === 'zh-TW' ? '今天想分析什麼？' : 'What would you like to analyze?'}
            </Title>
            <Text type="secondary" style={{ marginBottom: 24, maxWidth: 480 }}>
              {t('copilot.description')}
            </Text>

            {/* Example question cards */}
            <Row gutter={[12, 12]} style={{ maxWidth: 600 }}>
              {exampleQuestions.map((q, idx) => (
                <Col xs={12} key={idx}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => {
                      setInput(q.text);
                      // Auto-submit after a short delay
                      setTimeout(() => {
                        const toolResult = runTool(q.tool, context);
                        const validated = applyOutputValidation(toolResult);
                        setHistory((prev) => [...prev, validated]);
                      }, 100);
                    }}
                    style={{ cursor: 'pointer', borderRadius: 10 }}
                  >
                    <Space>
                      {q.icon}
                      <Text style={{ fontSize: 12 }}>{q.text}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* Message list */}
        {history.map((result, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
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

        {/* Follow-up chips */}
        {history.length > 0 && !processing && followUps.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {followUps.map((fu: string, idx: number) => (
              <Tag
                key={idx}
                color="blue"
                style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16 }}
                onClick={() => {
                  setInput(fu);
                  setTimeout(() => {
                    const localResult = routeQuestion(fu, context);
                    const validated = applyOutputValidation(localResult);
                    setHistory((prev) => [...prev, validated]);
                    setInput('');
                  }, 100);
                }}
              >
                {fu}
              </Tag>
            ))}
          </div>
        )}

        {/* Loading state */}
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

      {/* Input area */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid #f0f0f0',
        background: '#fff',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('copilot.input.placeholder')}
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
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {currentLang === 'zh-TW'
              ? 'DeepSeek v4 Flash · 伺服器託管金鑰 · 無需 API 金鑰'
              : 'DeepSeek v4 Flash · Server-Managed Key · No API key required'}
          </Text>
        </div>
      </div>

      {/* Settings Drawer */}
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
