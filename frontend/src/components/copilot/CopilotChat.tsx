import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Input, Button, Typography, Spin, Tag } from 'antd';
import {
  SendOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';
import type { AiCopilotContext } from '../../core/aiCopilotContext';
import type { CopilotToolResult } from '../../core/aiCopilotTools';
import { routeQuestion, runTool } from '../../core/aiCopilotTools';
import { validateProviderOutput as validateOutputText } from '../../core/aiCopilotOutputValidation';
import { getProviderById, type ProviderConfig, type ProviderMode } from '../../core/aiProviderAdapter';
import { buildProviderSystemPrompt, buildProviderUserMessage, type SupportedLanguage } from '../../core/aiProviderPromptPack';
import CopilotMessage from './CopilotMessage';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  context: AiCopilotContext;
  pendingToolId?: string | null;
  onPendingToolConsumed?: () => void;
}

// Suggestion prompts for empty state
const SUGGESTIONS_ZH = [
  '2026 年 BP 為什麼沒有達標？',
  '未來 6 個月最大的產能風險是什麼？',
  '哪些客戶貢獻最多營收？',
  '目前資料品質會影響哪些分析？',
];

const SUGGESTIONS_EN = [
  'Why did BP miss target in 2026?',
  'What is the biggest capacity risk in the next 6 months?',
  'Which customers contribute the most revenue?',
  'What data quality issues exist?',
];

const CopilotChat: React.FC<Props> = ({ context, pendingToolId, onPendingToolConsumed }) => {
  const { lang } = useI18n();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CopilotToolResult[]>([]);
  const [userQuestions, setUserQuestions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [providerMode] = useState<ProviderMode>('deepseek-proxy');
  const [proxyHealth, setProxyHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const isViewer = context.role === 'viewer';
  const currentLang: SupportedLanguage = lang === 'zh-TW' ? 'zh-TW' : 'en';
  const suggestions = currentLang === 'zh-TW' ? SUGGESTIONS_ZH : SUGGESTIONS_EN;

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

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, userQuestions]);

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

  const handleSubmit = useCallback(async (question?: string) => {
    const q = (question || input).trim();
    if (!q || processing) return;

    setInput('');
    setUserQuestions((prev) => [...prev, q]);
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
            caveats: [],
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

    setProcessing(false);
  }, [input, context, processing, providerMode, currentLang, applyOutputValidation]);

  const handleSuggestionClick = useCallback((question: string) => {
    handleSubmit(question);
  }, [handleSubmit]);

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
        '查看 BP 差距來源',
        '比較 2026-2030',
        '模擬單價 +5%',
      ];
    }
    return [
      'View BP gap source',
      'Compare 2026-2030',
      'Simulate price +5%',
    ];
  }, [history, currentLang]);

  // Provider status label
  const statusLabel = useMemo(() => {
    if (currentLang === 'zh-TW') {
      if (proxyHealth === 'checking') return '正在檢查連線⋯';
      if (proxyHealth === 'healthy') return 'DeepSeek v4 Flash · 已連線';
      return 'AI 服務暫時不可用，將使用本地分析回答';
    }
    if (proxyHealth === 'checking') return 'Checking connection...';
    if (proxyHealth === 'healthy') return 'DeepSeek v4 Flash · Connected';
    return 'AI service unavailable, using local analysis';
  }, [proxyHealth, currentLang]);

  return (
    <div className="ai-chat-layout" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxWidth: 820,
      margin: '0 auto',
      width: '100%',
      background: '#fff',
      borderRadius: 0,
      boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
    }}>
      {/* Thin top bar */}
      <div className="ai-chat-topbar" style={{
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        minHeight: 44,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
            {statusLabel}
          </Text>
          {proxyHealth === 'checking' && (
            <Spin size="small" style={{ fontSize: 10 }} />
          )}
          {proxyHealth === 'healthy' && (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          )}
          {proxyHealth === 'unhealthy' && (
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 12 }} />
          )}
        </div>
        {!isViewer && (
          <Button
            type="text"
            size="small"
            onClick={() => setShowSettingsDrawer(true)}
            style={{ fontSize: 12, color: '#8c8c8c' }}
          >
            {currentLang === 'zh-TW' ? '設定' : 'Settings'}
          </Button>
        )}
      </div>

      {/* Messages area — scrollable */}
      <div className="ai-chat-thread" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 0',
        background: '#fff',
      }}>
        {/* Empty state */}
        {history.length === 0 && (
          <div className="ai-empty" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60%',
            padding: '0 20px',
          }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              {currentLang === 'zh-TW' ? '今天想分析什麼？' : 'What would you like to analyze?'}
            </h2>
            <p style={{
              fontSize: 14,
              color: '#8c8c8c',
              marginBottom: 32,
              textAlign: 'center',
              maxWidth: 420,
            }}>
              {currentLang === 'zh-TW'
                ? '詢問營收、BP、產能、預測或資料品質'
                : 'Ask about revenue, BP, capacity, forecast, or data quality'}
            </p>

            <div className="ai-suggestion-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              maxWidth: 520,
              width: '100%',
            }}>
              {suggestions.map((q, idx) => (
                <div
                  key={idx}
                  className="ai-suggestion-card"
                  onClick={() => handleSuggestionClick(q)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #e8e8e8',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#333',
                    lineHeight: 1.5,
                    background: '#fafafa',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#d9d9d9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.borderColor = '#e8e8e8';
                  }}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {history.length > 0 && (
          <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
            {userQuestions.map((q, idx) => (
              <React.Fragment key={idx}>
                {/* User message bubble */}
                <div
                  className="ai-message-user"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: 12,
                    padding: '0 20px',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '10px 16px',
                    borderRadius: 18,
                    borderBottomRightRadius: 4,
                    background: '#e8f5e9',
                    color: '#1a1a1a',
                    fontSize: 15,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {q}
                  </div>
                </div>

                {/* AI answer message */}
                {history[idx] && (
                  <div
                    className="ai-message-assistant"
                    style={{
                      marginBottom: 16,
                      padding: '0 20px',
                    }}
                  >
                    <div style={{
                      maxWidth: 760,
                    }}>
                      <CopilotMessage
                        result={history[idx]}
                        isLastMessage={idx === history.length - 1}
                      />
                    </div>

                    {/* Follow-up chips (only after last message) */}
                    {idx === history.length - 1 && !processing && followUps.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 8,
                        marginBottom: 4,
                      }}>
                        {followUps.map((fu, fi) => (
                          <Tag
                            key={fi}
                            style={{
                              cursor: 'pointer',
                              padding: '4px 12px',
                              borderRadius: 16,
                              fontSize: 13,
                              border: '1px solid #d9d9d9',
                              background: '#fafafa',
                              color: '#555',
                            }}
                            onClick={() => handleSuggestionClick(fu)}
                          >
                            {fu}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Loading indicator */}
            {processing && (
              <div className="ai-message-assistant" style={{ padding: '0 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <Spin size="small" />
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {currentLang === 'zh-TW' ? '分析中⋯' : 'Analyzing...'}
                  </Text>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer — fixed at bottom */}
      <div
        ref={composerRef}
        className="ai-composer-shell"
        style={{
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 8px))',
          flexShrink: 0,
        }}
      >
        <div className="ai-composer" style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentLang === 'zh-TW'
                ? '詢問營收、BP、產能、預測或資料品質...'
                : 'Ask about revenue, BP, capacity, forecast, or data quality...'
            }
            disabled={processing}
            autoSize={{ minRows: 1, maxRows: 5 }}
            style={{
              borderRadius: 12,
              resize: 'none',
              fontSize: 15,
              padding: '10px 14px',
              border: '1px solid #d9d9d9',
              background: '#fafafa',
            }}
          />
          <Button
            type="primary"
            icon={processing ? <StopOutlined /> : <SendOutlined />}
            onClick={() => handleSubmit()}
            disabled={(!input.trim() || processing) && !processing}
            style={{
              borderRadius: 12,
              width: 44,
              height: 44,
              flexShrink: 0,
              background: input.trim() && !processing ? '#52c41a' : '#d9d9d9',
              borderColor: input.trim() && !processing ? '#52c41a' : '#d9d9d9',
            }}
          />
        </div>
        {proxyHealth === 'unhealthy' && (
          <div style={{ maxWidth: 760, margin: '4px auto 0' }}>
            <Text style={{ fontSize: 11, color: '#faad14' }}>
              {currentLang === 'zh-TW'
                ? 'AI 服務暫時不可用，將使用本地分析回答'
                : 'AI service temporarily unavailable, using local analysis'}
            </Text>
          </div>
        )}
      </div>

      {/* Settings Drawer (lazy import triggers) */}
      {showSettingsDrawer && (
        <LazySettingsDrawer
          open={showSettingsDrawer}
          onClose={() => setShowSettingsDrawer(false)}
          proxyHealth={proxyHealth}
          isViewer={isViewer}
          currentLang={currentLang}
        />
      )}
    </div>
  );
};

/** Lazy-loaded settings drawer to keep main bundle small */
const LazySettingsDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  proxyHealth: 'checking' | 'healthy' | 'unhealthy';
  isViewer: boolean;
  currentLang: SupportedLanguage;
}> = (props) => {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    import('./AiProviderSettingsDrawer').then((mod) => {
      setComponent(() => mod.default);
    });
  }, []);

  if (!Component) return null;
  return (
    <Component
      open={props.open}
      onClose={props.onClose}
      currentMode="deepseek-proxy"
      onModeChange={() => {}}
      isViewer={props.isViewer}
      proxyHealth={props.proxyHealth}
    />
  );
};

export default CopilotChat;
