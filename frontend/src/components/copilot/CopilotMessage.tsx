import React from 'react';
import { Card, Tag, Typography, Space, Alert, Collapse } from 'antd';
import { WarningOutlined, QuestionCircleOutlined, RobotOutlined } from '@ant-design/icons';
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

const CopilotMessage: React.FC<Props> = ({ result, showFixes = true }) => {
  const { t } = useI18n();

  const facts = result.facts;
  const assumptions = result.assumptions;
  const inferences = result.inferences;
  const recommendations = showFixes ? result.recommendations : [];

  const answerStatus = getAnswerStatus(result);
  const hasValidationIssues =
    result.validationIssues && result.validationIssues.length > 0;

  const isAiResponse = result.toolName === 'DeepSeek AI';

  return (
    <Card
      size="small"
      bordered
      style={{
        marginBottom: 12,
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
      title={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
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
      <Paragraph style={{ marginBottom: 12 }}>{result.summary}</Paragraph>

      {/* Facts */}
      {facts.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#666' }}>{t('copilot.label.fact')}</Text>
          <div style={{ marginTop: 4 }}>
            {facts.map((text, i) => (
              <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                {text}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#666' }}>{t('copilot.label.assumption')}</Text>
          <div style={{ marginTop: 4 }}>
            {assumptions.map((text, i) => (
              <Tag key={i} color="orange" style={{ marginBottom: 4 }}>
                {text}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Inferences */}
      {inferences.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#666' }}>{t('copilot.label.inference')}</Text>
          <div style={{ marginTop: 4 }}>
            {inferences.map((text, i) => (
              <Tag key={i} color="purple" style={{ marginBottom: 4 }}>
                {text}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12, color: '#666' }}>{t('copilot.label.recommendation')}</Text>
          <div style={{ marginTop: 4 }}>
            {recommendations.map((text, i) => (
              <Tag key={i} color="green" style={{ marginBottom: 4 }}>
                {text}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Viewer notice when fixes are hidden */}
      {!showFixes && result.recommendations.length > 0 && (
        <Alert
          type="info"
          showIcon
          message={t('copilot.viewer.noFixes')}
          style={{ marginTop: 8 }}
        />
      )}

      {/* Source References */}
      {result.sourceReferences.length > 0 && (
        <Collapse
          size="small"
          style={{ marginTop: 8 }}
          items={[
            {
              key: 'sources',
              label: (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {t('copilot.source')} ({result.sourceReferences.length})
                </Text>
              ),
              children: (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {result.sourceReferences.map((ref, i) => (
                    <li key={`src-${i}`}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{ref}</Text>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
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
              style={{ marginBottom: 4 }}
              banner
            />
          ))}
        </div>
      )}

      {/* Validation Issues */}
      {hasValidationIssues && (
        <div style={{ marginTop: 8 }}>
          {result.validationIssues!.map((issue, i) => (
            <Alert
              key={`val-${i}`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={issue}
              style={{ marginBottom: 4 }}
            />
          ))}
        </div>
      )}

      {/* Blocked Reason */}
      {result.confidence === 'blocked' && result.blockedReason && (
        <Alert
          type="error"
          showIcon
          message={result.blockedReason}
          style={{ marginTop: 8 }}
        />
      )}

      {/* "Why this answer?" collapsible */}
      <Collapse
        size="small"
        style={{ marginTop: 8 }}
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
              <div style={{ fontSize: 11 }}>
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
