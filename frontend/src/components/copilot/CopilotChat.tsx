import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Input, Button, Typography, Spin, Tag } from 'antd';
import {
  SendOutlined,
  CheckCircleOutlined,
  RobotOutlined,
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

interface ChatEntry {
  role: 'user' | 'assistant';
  content: CopilotToolResult;
  pending?: boolean;
}

const SUGGESTIONS_ZH = [
  '2026 年 BP 為什麼沒有達標？',
  '未來 6 個月最大的產能風險是什麼？',
  '哪些客戶貢獻最多營收？',
  '目前資料品質有哪些問題？',
];

const SUGGESTIONS_EN = [
  'Why did BP miss target in 2026?',
  'What is the biggest capacity risk in the next 6 months?',
  'Which customers contribute the most revenue?',
  'What data quality issues exist?',
];

const THINKING_ZH = '正在分析目前工作區資料';
const THINKING_EN = 'Analyzing the current workspace';

// --- Three-dot thinking animation ---
const ThinkingBubble: React.FC<{ message: string }> = ({ message }) => (
  <div className="ai-thinking-bubble" style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#f0f0f0', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <RobotOutlined style={{ fontSize: 14, color: '#8c8c8c' }} />
    </div>
    <div style={{
      background: '#f5f5f5', borderRadius: '4px 16px 16px 16px',
      padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <Text style={{ fontSize: 14, color: '#595959' }}>{message}</Text>
      <span style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#8c8c8c', display: 'inline-block',
            animation: 'thinkingBlink 1.4s infinite ease-in-out',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </span>
    </div>
  </div>
);

// Inject keyframes
if (typeof document !== 'undefined') {
  const id = 'ai-thinking-style';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `@keyframes thinkingBlink{0%,80%,100%{opacity:0.3}40%{opacity:1}}`;
    document.head.appendChild(s);
  }
}

const CopilotChat: React.FC<Props> = ({ context, pendingToolId, onPendingToolConsumed }) => {
  const { lang } = useI18n();
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [providerMode] = useState<ProviderMode>('deepseek-proxy');
  const [proxyHealth, setProxyHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentLang: SupportedLanguage = lang === 'zh-TW' ? 'zh-TW' : 'en';
  const suggestions = currentLang === 'zh-TW' ? SUGGESTIONS_ZH : SUGGESTIONS_EN;
  const thinkingText = currentLang === 'zh-TW' ? THINKING_ZH : THINKING_EN;

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { checkAiProxyHealth } = await import('../../services/aiChatService');
        setProxyHealth(await checkAiProxyHealth() ? 'healthy' : 'unhealthy');
      } catch { setProxyHealth('unhealthy'); }
    };
    checkHealth();
  }, []);

  // Auto-scroll when entries change (only when near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [entries]);

  const applyOutputValidation = useCallback((result: CopilotToolResult): CopilotToolResult => {
    const v = validateOutputText(result.summary, { confidence: result.confidence });
    if (v.status === 'blocked') return { ...result, summary: v.sanitizedAnswer, confidence: 'blocked', blockedReason: v.blockedReason, validationIssues: v.issues.map(i => i.message) };
    if (v.status === 'warning') return { ...result, validationIssues: [...(result.validationIssues ?? []), ...v.issues.map(i => i.message)] };
    return result;
  }, []);

  const addPendingPair = useCallback((question: string): { resolve: (r: CopilotToolResult) => void } => {
    const userResult: CopilotToolResult = {
      toolName: '', title: '', summary: question,
      facts: [], assumptions: [], inferences: [], recommendations: [],
      sourceReferences: [], confidence: 'high', caveats: [], data: {},
    };
    const pendingResult: CopilotToolResult = {
      toolName: '', title: '', summary: '',
      facts: [], assumptions: [], inferences: [], recommendations: [],
      sourceReferences: [], confidence: 'high' as const, caveats: [], data: {},
    };
    setEntries(prev => [...prev, { role: 'user', content: userResult }, { role: 'assistant', content: pendingResult, pending: true }]);
    return {
      resolve: (result: CopilotToolResult) => {
        setEntries(prev => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'assistant' && next[i].pending) {
              next[i] = { role: 'assistant', content: result };
              break;
            }
          }
          return next;
        });
      },
    };
  }, []);

  const handleSubmit = useCallback(async (question?: string) => {
    const q = (question || input).trim();
    if (!q || processing) return;
    setInput('');
    setProcessing(true);

    const pair = addPendingPair(q);

    try {
      const localResult = routeQuestion(q, context);
      if (providerMode === 'deepseek-proxy') {
        const provider = getProviderById('deepseek-proxy');
        if (!provider) throw new Error('AI provider not found');
        const config: ProviderConfig = { providerId: 'deepseek-proxy' };
        const systemPrompt = buildProviderSystemPrompt(context, 'deepseek-proxy', currentLang);
        const userMessage = buildProviderUserMessage(context, q, currentLang);
        const request = provider.buildRequest(config, systemPrompt, userMessage, {});
        const response = await provider.runCompletion(config, request);
        if (response.confidence === 'blocked' || response.isFallback) {
          pair.resolve(applyOutputValidation({ ...localResult, caveats: [...localResult.caveats, `AI: ${response.content}`] }));
        } else {
          pair.resolve(applyOutputValidation({
            toolName: 'DeepSeek AI',
            title: currentLang === 'zh-TW' ? 'AI 分析' : 'AI Analysis',
            summary: response.content,
            facts: [], assumptions: [], inferences: [], recommendations: [],
            sourceReferences: ['DeepSeek v4 Flash (Managed)'],
            confidence: 'high',
            caveats: [currentLang === 'zh-TW' ? 'AI 生成的回應 — 請以資料驗證' : 'AI-generated response — verify with data'],
            data: { tokensUsed: response.tokensUsed },
          }));
        }
      } else {
        pair.resolve(applyOutputValidation(localResult));
      }
    } catch {
      pair.resolve(applyOutputValidation({
        toolName: currentLang === 'zh-TW' ? '系統分析' : 'System Analysis',
        title: '', summary: currentLang === 'zh-TW' ? `分析時發生錯誤，請稍後重試。` : `Analysis error. Please try again.`,
        facts: [], assumptions: [], inferences: [], recommendations: [],
        sourceReferences: [], confidence: 'low',
        caveats: [currentLang === 'zh-TW' ? '系統錯誤' : 'System error'], data: {},
      }));
    }
    setProcessing(false);
  }, [input, context, processing, providerMode, currentLang, applyOutputValidation, addPendingPair]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  // Follow-up suggestions
  const followUps = useMemo(() => {
    const lastAssistant = [...entries].reverse().find(e => e.role === 'assistant' && !e.pending);
    if (!lastAssistant || lastAssistant.content.confidence === 'blocked') return [];
    if (currentLang === 'zh-TW') return ['查看 2026 年 BP 差距來源', '用圖表比較 2026-2030', '模擬單價 +5% 會怎樣'];
    return ['View 2026 BP gap source', 'Compare 2026-2030 with chart', 'Simulate price +5%'];
  }, [entries, currentLang]);

  // Auto-execute pending tool from deep-link
  useEffect(() => {
    if (pendingToolId && context) {
      setProcessing(true);
      const q = currentLang === 'zh-TW' ? '正在載入分析⋯' : 'Loading analysis…';
      const pair = addPendingPair(q);
      setTimeout(() => {
        pair.resolve(applyOutputValidation(runTool(pendingToolId, context)));
        setProcessing(false);
        onPendingToolConsumed?.();
      }, 300);
    }
  }, [pendingToolId, context, applyOutputValidation, onPendingToolConsumed, currentLang, addPendingPair]);

  return (
    <div className="ai-assistant-shell" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
    }}>
      {/* Minimal top bar — small, right-aligned */}
      <div className="ai-topbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '6px 24px',
        flexShrink: 0,
        minHeight: 36,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {proxyHealth === 'healthy' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />}
          {proxyHealth === 'checking' && <Spin size="small" style={{ fontSize: 10 }} />}
          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
            {proxyHealth === 'checking' && '檢查中⋯'}
            {proxyHealth === 'healthy' && (currentLang === 'zh-TW' ? 'DeepSeek v4 Flash · 已連線' : 'DeepSeek v4 Flash · Connected')}
            {proxyHealth === 'unhealthy' && (currentLang === 'zh-TW' ? 'AI 服務暫時不可用' : 'AI service unavailable')}
          </Text>
        </div>
      </div>

      {/* SINGLE SCROLL CONTAINER — the only scrollable area */}
      <div ref={scrollRef} className="ai-chat-main-scroll" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 24px 148px', // large bottom pad for floating composer
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%' }}>
          {/* Empty state */}
          {entries.length === 0 && (
            <div className="ai-empty" style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: '55vh',
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', marginBottom: 6, textAlign: 'center' }}>
                {currentLang === 'zh-TW' ? '今天想分析什麼？' : 'What would you like to analyze?'}
              </h2>
              <p style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 28, textAlign: 'center', maxWidth: 420 }}>
                {currentLang === 'zh-TW' ? '詢問營收、BP、產能、預測或資料品質' : 'Ask about revenue, BP, capacity, forecasts, or data quality'}
              </p>
              <div className="ai-suggestion-grid" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, width: '100%',
              }}>
                {suggestions.map((q, idx) => (
                  <div key={idx} className="ai-suggestion-card"
                    onClick={() => handleSubmit(q)}
                    style={{ padding: '12px 16px', border: '1px solid #e8e8e8', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#1a1a1a', lineHeight: 1.5, background: '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {entries.map((entry, idx) => (
            <div key={idx} style={{ marginBottom: entry.role === 'user' ? 10 : 16 }}>
              {entry.role === 'user' ? (
                <div className="ai-message-user" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '70%', padding: '10px 16px', borderRadius: 18, borderBottomRightRadius: 4, background: '#e8f5e9', color: '#1a1a1a', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {entry.content.summary}
                  </div>
                </div>
              ) : entry.pending ? (
                <div className="ai-message-assistant">
                  <ThinkingBubble message={thinkingText} />
                </div>
              ) : (
                <div className="ai-message-assistant" style={{ maxWidth: 900 }}>
                  <CopilotMessage result={entry.content} />
                  {idx === entries.length - 1 && followUps.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {followUps.map((fu, fi) => (
                        <Tag key={fi} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13, border: '1px solid #d9d9d9', background: '#fafafa', color: '#555' }}
                          onClick={() => handleSubmit(fu)}>{fu}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING COMPOSER — sticky at bottom, gradient fade */}
      <div className="ai-floating-composer" style={{
        position: 'sticky',
        bottom: 0,
        width: '100%',
        zIndex: 50,
        padding: '16px 24px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 8px))',
        background: 'linear-gradient(to top, #ffffff 70%, rgba(255,255,255,0))',
        flexShrink: 0,
      }}>
        <div className="ai-composer-inner" style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          <TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentLang === 'zh-TW' ? '詢問營收、BP、產能、預測或資料品質...' : 'Ask about revenue, BP, capacity, forecasts, or data quality...'}
            disabled={processing}
            autoSize={{ minRows: 1, maxRows: 5 }}
            style={{
              borderRadius: 14,
              resize: 'none',
              fontSize: 15,
              padding: '11px 16px',
              border: '1px solid #d9d9d9',
              background: '#fafafa',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSubmit()}
            disabled={!input.trim() || processing}
            style={{
              borderRadius: 14,
              width: 46,
              height: 46,
              flexShrink: 0,
              background: input.trim() && !processing ? '#52c41a' : '#d9d9d9',
              borderColor: input.trim() && !processing ? '#52c41a' : '#d9d9d9',
              boxShadow: input.trim() && !processing ? '0 2px 8px rgba(82,196,26,0.3)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CopilotChat;
