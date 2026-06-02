import React from 'react';
import { Card, Tag, Typography, Space, Alert, Collapse } from 'antd';
import {
  WarningOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../../i18n';
import type { CopilotToolResult } from '../../core/aiCopilotTools';

const { Text, Paragraph } = Typography;

interface Props {
  result: CopilotToolResult;
  showFixes?: boolean; // false for viewers
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'green',
  medium: 'orange',
  low: 'red',
  blocked: 'red',
};

// F-A-I-R 標籤顏色配置
const FAIR_BADGE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Fact: { color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff' },
  Assumption: { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
  Inference: { color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7' },
  Recommendation: { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
};

/**
 * Determine the answer status for the status tag.
 * Priority: blocked > mock > warning > needsExternalAi > deterministic
 */
function getAnswerStatus(result: CopilotToolResult): {
  i18nKey: string;
  color: string;
} {
  if (result.confidence === 'blocked') {
    return { i18nKey: 'copilot.status.blocked', color: 'red' };
  }
  if (result.isMockProvider) {
    return { i18nKey: 'copilot.status.mock', color: 'blue' };
  }
  if (result.validationIssues && result.validationIssues.length > 0) {
    return { i18nKey: 'copilot.status.warning', color: 'orange' };
  }
  if (result.toolName === 'unknown') {
    return { i18nKey: 'copilot.status.needsExternalAi', color: 'default' };
  }
  return { i18nKey: 'copilot.status.deterministic', color: 'green' };
}

/**
 * 判斷是否為 AI 回應（包含 Markdown）
 */
function isAiMarkdownResponse(result: CopilotToolResult): boolean {
  return result.toolName === 'DeepSeek AI' || result.toolName === 'unknown';
}

/**
 * F-A-I-R Badge 組件
 */
const FairBadge: React.FC<{ label: string; text?: string }> = ({ label, text }) => {
  const config = FAIR_BADGE_CONFIG[label] || FAIR_BADGE_CONFIG.Fact;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        marginRight: 8,
        marginBottom: 4,
      }}
    >
      [{label}]
      {text && <span style={{ fontWeight: 400, marginLeft: 4 }}>{text}</span>}
    </span>
  );
};

/**
 * Markdown 渲染器組件 — 安全渲染 AI 回應
 */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="copilot-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 自定義 heading 樣式
          h1: ({ children }) => (
            <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8, color: '#262626' }}>
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 style={{ fontSize: 16, fontWeight: 600, marginTop: 14, marginBottom: 6, color: '#262626' }}>
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 style={{ fontSize: 14, fontWeight: 600, marginTop: 12, marginBottom: 6, color: '#262626' }}>
              {children}
            </h5>
          ),
          // 自定義 list 樣式
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, margin: '8px 0', lineHeight: 1.8 }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, margin: '8px 0', lineHeight: 1.8 }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 4 }}>{children}</li>
          ),
          // 自定義段落樣式
          p: ({ children }) => (
            <p style={{ marginBottom: 8, lineHeight: 1.8 }}>{children}</p>
          ),
          // 自定義 bold 樣式
          strong: ({ children }) => (
            <strong style={{ fontWeight: 600, color: '#262626' }}>{children}</strong>
          ),
          // 自定義 code 樣式
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e8e8e8',
                    fontSize: 13,
                    fontFamily: 'monospace',
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e8e8e8',
                  overflow: 'auto',
                }}
              >
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * 品質提示區域 — 可摺疊的警告區塊
 */
const QualityHints: React.FC<{ issues: string[]; t: (key: string) => string }> = ({ issues, t }) => {
  if (issues.length === 0) return null;

  return (
    <Collapse
      size="small"
      style={{ marginTop: 12, marginBottom: 8 }}
      items={[
        {
          key: 'quality-hints',
          label: (
            <Space>
              <InfoCircleOutlined style={{ color: '#faad14' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('copilot.qualityHint.title')} ({issues.length})
              </Text>
            </Space>
          ),
          children: (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {issues.map((issue, i) => (
                <div key={i} style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <WarningOutlined style={{ color: '#faad14', marginTop: 3, fontSize: 11 }} />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
};

/**
 * 建議行動區域 — 淺色背景，不可點擊
 */
const RecommendationBlock: React.FC<{ recommendations: string[]; t: (key: string) => string }> = ({
  recommendations,
  t,
}) => {
  if (recommendations.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 16px',
        backgroundColor: '#f6ffed',
        border: '1px solid #b7eb8f',
        borderRadius: 8,
      }}
    >
      <Text strong style={{ fontSize: 13, color: '#52c41a', marginBottom: 8, display: 'block' }}>
        {t('copilot.label.recommendation')}
      </Text>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {recommendations.map((rec, i) => (
          <li key={i} style={{ marginBottom: 4, fontSize: 13, lineHeight: 1.6 }}>
            {rec}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d9f7be' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <CheckCircleOutlined style={{ marginRight: 4 }} />
          {t('copilot.qualityHint.humanConfirm')} · {t('copilot.qualityHint.noAutoWrite')}
        </Text>
      </div>
    </div>
  );
};

const CopilotMessage: React.FC<Props> = ({ result, showFixes = true }) => {
  const { t } = useI18n();

  const facts = result.facts;
  const assumptions = result.assumptions;
  const inferences = result.inferences;
  const recommendations = showFixes ? result.recommendations : [];

  const answerStatus = getAnswerStatus(result);
  const hasValidationIssues =
    result.validationIssues && result.validationIssues.length > 0;

  const isAiResponse = isAiMarkdownResponse(result);

  // 分離 validation issues 為「品質提示」和「嚴重問題」
  const qualityHints = (result.validationIssues ?? []).filter(
    (issue) =>
      !issue.includes('blocked') &&
      !issue.includes('禁止') &&
      !issue.includes('不能')
  );

  return (
    <Card
      size="small"
      bordered
      style={{
        marginBottom: 12,
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      title={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space wrap>
            {isAiResponse ? (
              <RobotOutlined style={{ color: '#2563eb', fontSize: 16 }} />
            ) : (
              <Tag color="geekblue">{result.toolName}</Tag>
            )}
            <Text strong>{result.title}</Text>
            <Tag color={CONFIDENCE_COLOR[result.confidence] ?? 'default'}>
              {t(`copilot.confidence.${result.confidence}`)}
            </Tag>
            <Tag
              color={answerStatus.color}
              data-testid="answer-status-tag"
            >
              {t(answerStatus.i18nKey)}
            </Tag>
          </Space>
        </Space>
      }
    >
      {/* 主要內容 — Markdown 渲染 */}
      {isAiResponse ? (
        <MarkdownRenderer content={result.summary} />
      ) : (
        <Paragraph style={{ marginBottom: 12 }}>{result.summary}</Paragraph>
      )}

      {/* F-A-I-R 標籤 Badge 區域 */}
      {(facts.length > 0 || assumptions.length > 0 || inferences.length > 0) && (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6, display: 'block' }}>
            F-A-I-R 分類
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {facts.map((text, i) => (
              <FairBadge key={`fact-${i}`} label="Fact" text={text} />
            ))}
            {assumptions.map((text, i) => (
              <FairBadge key={`assumption-${i}`} label="Assumption" text={text} />
            ))}
            {inferences.map((text, i) => (
              <FairBadge key={`inference-${i}`} label="Inference" text={text} />
            ))}
          </div>
        </div>
      )}

      {/* 建議行動 — 獨立淺色區塊 */}
      <RecommendationBlock recommendations={recommendations} t={t} />

      {/* Viewer notice when fixes are hidden */}
      {!showFixes && result.recommendations.length > 0 && (
        <Alert
          type="info"
          showIcon
          message={t('copilot.viewer.noFixes')}
          style={{ marginTop: 8 }}
        />
      )}

      {/* Source References — 更易讀的樣式 */}
      {result.sourceReferences.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            backgroundColor: '#fafafa',
            borderRadius: 6,
            border: '1px solid #f0f0f0',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
            {t('copilot.source')} ({result.sourceReferences.length})
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {result.sourceReferences.map((ref, i) => (
              <Tag key={`src-${i}`} style={{ fontSize: 11, margin: 0 }}>
                {ref}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Caveats */}
      {result.caveats.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {result.caveats.map((caveat, i) => (
            <Alert
              key={i}
              type="warning"
              showIcon
              message={caveat}
              style={{ marginBottom: 4, fontSize: 12 }}
              banner
            />
          ))}
        </div>
      )}

      {/* 品質提示 — 收斂式警告 */}
      <QualityHints issues={qualityHints} t={t} />

      {/* Blocked Reason */}
      {result.confidence === 'blocked' && result.blockedReason && (
        <Alert
          type="error"
          showIcon
          message={result.blockedReason}
          style={{ marginTop: 8 }}
        />
      )}

      {/* "Why this answer?" collapsible — 視覺弱化 */}
      <Collapse
        size="small"
        style={{ marginTop: 12, backgroundColor: '#fafafa' }}
        items={[
          {
            key: 'why',
            label: (
              <Text type="secondary" style={{ fontSize: 11 }}>
                <QuestionCircleOutlined style={{ marginRight: 4 }} />
                {t('copilot.whyThisAnswer')}
              </Text>
            ),
            children: (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">{t('copilot.why.toolUsed')}</Text>{' '}
                  <Tag color="geekblue">{result.toolName}</Tag>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">{t('copilot.why.dataAnalyzed')}</Text>
                  <div style={{ marginTop: 2 }}>
                    {facts.length > 0 ? (
                      facts.map((f, i) => (
                        <Tag key={`why-f-${i}`} color="blue" style={{ marginBottom: 2, fontSize: 10 }}>
                          {f}
                        </Tag>
                      ))
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">{t('copilot.why.caveats')}</Text>
                  <div style={{ marginTop: 2 }}>
                    {result.caveats.length > 0 ? (
                      result.caveats.map((c, i) => (
                        <Tag key={`why-c-${i}`} color="orange" style={{ marginBottom: 2, fontSize: 10 }}>
                          {c}
                        </Tag>
                      ))
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </div>
                </div>
                <div>
                  <Text type="secondary">{t('copilot.why.validationStatus')}</Text>{' '}
                  {hasValidationIssues ? (
                    <Tag color="orange">{t('copilot.why.validationWarning')}</Tag>
                  ) : (
                    <Tag color="green">{t('copilot.why.validationPassed')}</Tag>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default CopilotMessage;
