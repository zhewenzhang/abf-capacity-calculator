import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Input, Button, Typography, Spin, Tag } from 'antd';
import {
  SendOutlined,
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

// --- Suggestion prompts ---
const SUGGESTIONS_ZH = [
  '2026 年 BP 為什麼沒達標？',
  '未來 6 個月最大產能風險？',
  '哪些客戶貢獻最多營收？',
  '目前資料品質影響哪些分析？',
];

const SUGGESTIONS_EN = [
  'Why did BP miss the 2026 target?',
  'Biggest capacity risk in 6 months?',
  'Which customers drive the most revenue?',
  'What analyses are impacted by data quality?',
];

// --- Three-dot thinking animation ---
const THINKING_MESSAGES_ZH = [
  '正在分析目前工作區資料⋯',
  '正在整理 BP、產能與預測資料⋯',
  '正在核對資料來源⋯',
];

const THINKING_MESSAGES_EN = [
  'Analyzing workspace data…',
  'Processing BP, capacity and forecasts…',
  'Cross-referencing data sources…',
];

const ThinkingDots: React.FC<{ message: string }> = ({ message }) => (
  <div className="ai-message-thinking" style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
  }}>
    <div style={{
      display: 'flex',
      gap: 3,
      alignItems: 'center',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="thinking-dot" style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#52c41a',
          animation: 'blink 1.4s infinite ease-in-out',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
    <Text type="secondary" style={{ fontSize: 13, color: '#8c8c8c' }}>{message}</Text>
  </div>
);

const CopilotChat: React.FC<Props> = ({ context, pendingToolId, onPendingToolConsumed }) => {
  const { lang } = useI18n();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: CopilotToolResult; thinkingMsg?: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [providerMode] = useState<ProviderMode>('deepseek-proxy');
  const [proxyHealth, setProxyHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLang: SupportedLanguage = lang === 'zh-TW' ? 'zh-TW' : 'en';
  const suggestions = currentLang === 'zh-TW' ? SUGGESTIONS_ZH : SUGGESTIONS_EN;
  const thinkingMessages = currentLang === 'zh-TW' ? THINKING_MESSAGES_ZH : THINKING_MESSAGES_EN;

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
  }, [messages]);

  // Thinking message rotator
  useEffect(() => {
    if (processing) {
      let idx = 0;
      setThinkingMessage(thinkingMessages[0]);
      thinkingTimerRef.current = setInterval(() => {
        idx = (idx + 1) % thinkingMessages.length;
        setThinkingMessage(thinkingMessages[idx]);
      }, 4000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [processing, thinkingMessages]);

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

  // Safe wrapper for runTool with fallback
  const runToolSafe = useCallback((toolId: string, ctx: AiCopilotContext): CopilotToolResult => {
    try {
      return runTool(toolId, ctx);
    } catch {
      return {
        toolName: toolId,
        title: '',
        summary: currentLang === 'zh-TW' ? '分析時發生錯誤，請稍後重試。' : 'An error occurred. Please try again.',
        facts: [],
        assumptions: [],
        inferences: [],
        recommendations: [],
        sourceReferences: [],
        confidence: 'low',
        caveats: [currentLang === 'zh-TW' ? '工具執行失敗' : 'Tool execution failed'],
        data: {},
      };
    }
  }, [currentLang]);

  // Auto-execute pending tool from deep-link
  useEffect(() => {
    if (pendingToolId && context) {
      setProcessing(true);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: {
          toolName: currentLang === 'zh-TW' ? '系統分析' : 'System Analysis',
          title: '',
          summary: '',
          facts: [],
          assumptions: [],
          inferences: [],
          recommendations: [],
          sourceReferences: [],
          confidence: 'high',
          caveats: [],
          data: {},
        },
        thinkingMsg: currentLang === 'zh-TW' ? '正在載入分析⋯' : 'Loading analysis…',
      }]);
      setTimeout(() => {
        const result = runToolSafe(pendingToolId, context);
        const validated = applyOutputValidation(result);
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: validated };
          return next;
        });
        setProcessing(false);
        onPendingToolConsumed?.();
      }, 300);
    }
  }, [pendingToolId, context, applyOutputValidation, onPendingToolConsumed, currentLang, runToolSafe]);

  const handleSubmit = useCallback(async (question?: string) => {
    const q = (question || input).trim();
    if (!q || processing) return;

    setInput('');

    // 1. Immediately show user message
    setMessages(prev => [
      ...prev,
      { role: 'user' as const, content: { toolName: '', title: '', summary: q, facts: [], assumptions: [], inferences: [], recommendations: [], sourceReferences: [], confidence: 'high' as const, caveats: [], data: {} } as CopilotToolResult },
    ]);

    // 2. Show thinking state
    setProcessing(true);

    // 3. Run deterministic tool
    const localResult = routeQuestion(q, context);

    if (providerMode === 'deepseek-proxy') {
      try {
        const provider = getProviderById('deepseek-proxy');
        if (!provider) throw new Error('AI provider not found');

        const config: ProviderConfig = { providerId: 'deepseek-proxy' };
        const systemPrompt = buildProviderSystemPrompt(context, 'deepseek-proxy', currentLang);
        const userMessage = buildProviderUserMessage(context, q, currentLang);
        const request = provider.buildRequest(config, systemPrompt, userMessage, {});
        const response = await provider.runCompletion(config, request);

        if (response.confidence === 'blocked' || response.isFallback) {
          const fallbackResult: CopilotToolResult = {
            ...localResult,
            caveats: [...localResult.caveats, `AI: ${response.content}`],
          };
          setMessages(prev => [...prev, { role: 'assistant', content: applyOutputValidation(fallbackResult) }]);
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
          setMessages(prev => [...prev, { role: 'assistant', content: applyOutputValidation(aiResult) }]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const fallbackResult: CopilotToolResult = {
          ...localResult,
          caveats: [...localResult.caveats, `AI error: ${errorMessage}`],
        };
        setMessages(prev => [...prev, { role: 'assistant', content: applyOutputValidation(fallbackResult) }]);
      }
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: applyOutputValidation(localResult) }]);
    }

    setProcessing(false);
  }, [input, context, processing, providerMode, currentLang, applyOutputValidation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Follow-up suggestions
  const followUps = useMemo(() => {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && !m.thinkingMsg);
    if (assistantMsgs.length === 0) return [];
    const last = assistantMsgs[assistantMsgs.length - 1].content;
    if (last.confidence === 'blocked') return [];

    if (currentLang === 'zh-TW') {
      return ['查看 BP 差距來源', '比較 2026-2030', '模擬單價 +5%'];
    }
    return ['View BP gap source', 'Compare 2026-2030', 'Simulate price +5%'];
  }, [messages, currentLang]);

  // Status label
  const statusLabel = useMemo(() => {
    if (currentLang === 'zh-TW') {
      if (proxyHealth === 'checking') return '正在檢查連線⋯';
      if (proxyHealth === 'healthy') return 'DeepSeek v4 Flash · 已連線';
      return 'AI 服務暫時不可用，將使用本地分析回答';
    }
    if (proxyHealth === 'checking') return 'Checking connection…';
    if (proxyHealth === 'healthy') return 'DeepSeek v4 Flash · Connected';
    return 'AI service unavailable, using local analysis';
  }, [proxyHealth, currentLang]);

  return (
    <div className="ai-chat-layout" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#ffffff',
      position: 'relative',
    }}>
      {/* Thin top bar — minimal */}
      <div className="ai-chat-topbar" style={{
        padding: '6px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderBottom: '1px solid #f0f0f0',
        background: '#ffffff',
        minHeight: 36,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {proxyHealth === 'healthy' && (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />
          )}
          {proxyHealth === 'unhealthy' && (
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 11 }} />
          )}
          {proxyHealth === 'checking' && (
            <Spin size="small" style={{ fontSize: 10 }} />
          )}
          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{statusLabel}</Text>
        </div>
      </div>

      {/* Messages area — scrollable */}
      <div className="ai-chat-thread" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 0 16px',
        background: '#ffffff',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="ai-empty" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '55vh',
              padding: '0 24px',
            }}>
              <h2 style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: 6,
                textAlign: 'center',
              }}>
                {currentLang === 'zh-TW' ? '今天想分析什麼？' : 'What would you like to analyze?'}
              </h2>
              <p style={{
                fontSize: 14,
                color: '#8c8c8c',
                marginBottom: 28,
                textAlign: 'center',
                maxWidth: 420,
              }}>
                {currentLang === 'zh-TW'
                  ? '詢問營收、BP、產能、預測或資料品質'
                  : 'Ask about revenue, BP, capacity, forecasts, or data quality'}
              </p>

              <div className="ai-suggestion-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                maxWidth: 560,
                width: '100%',
              }}>
                {suggestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="ai-suggestion-card"
                    onClick={() => handleSubmit(q)}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid #e8e8e8',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#1a1a1a',
                      lineHeight: 1.5,
                      background: '#fafafa',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa'; }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: msg.role === 'user' ? 10 : 16, padding: '0 20px' }}>
              {msg.role === 'user' ? (
                <div className="ai-message-user" style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
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
                    {msg.content.summary}
                  </div>
                </div>
              ) : msg.thinkingMsg ? (
                <div className="ai-message-assistant">
                  <ThinkingDots message={msg.thinkingMsg || thinkingMessage} />
                </div>
              ) : (
                <div className="ai-message-assistant" style={{ maxWidth: 760 }}>
                  <CopilotMessage result={msg.content} />
                  {/* Follow-up chips after last assistant message */}
                  {idx === messages.length - 1 && !processing && followUps.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginTop: 10,
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
                          onClick={() => handleSubmit(fu)}
                        >
                          {fu}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {processing && messages.length > 0 && messages[messages.length - 1].role !== 'user' && (
            <div style={{ padding: '0 20px' }}>
              <ThinkingDots message={thinkingMessage} />
            </div>
          )}

          <div ref={messagesEndRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* Composer — fixed bottom */}
      <div className="ai-composer-shell" style={{
        borderTop: '1px solid #f0f0f0',
        background: '#ffffff',
        padding: '12px 20px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 8px))',
        flexShrink: 0,
      }}>
        <div className="ai-composer" style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentLang === 'zh-TW'
              ? '詢問營收、BP、產能、預測或資料品質⋯'
              : 'Ask about revenue, BP, capacity, forecasts, or data quality…'}
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
            icon={<SendOutlined />}
            onClick={() => handleSubmit()}
            disabled={!input.trim() || processing}
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
      </div>
    </div>
  );
};

// Inject thinking animation keyframes (safe for test environments)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink {
      0%, 80%, 100% { opacity: 0; }
      40% { opacity: 1; }
    }
  `;
  if (!document.querySelector('[data-thinking-style]')) {
    style.setAttribute('data-thinking-style', '');
    document.head.appendChild(style);
  }
}

export default CopilotChat;
