import React from 'react';
import { Card, Tag, Typography, Space, Alert } from 'antd';
import { useI18n } from '../../i18n';
import type { CopilotToolResult } from '../../core/aiCopilotTools';

const { Text, Paragraph } = Typography;

interface Props {
  result: CopilotToolResult;
  showFixes?: boolean; // false for viewers
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'green',
  medium: 'gold',
  low: 'red',
  blocked: 'default',
};

const CopilotMessage: React.FC<Props> = ({ result, showFixes = true }) => {
  const { t } = useI18n();

  const facts = result.facts;
  const assumptions = result.assumptions;
  const inferences = result.inferences;
  const recommendations = showFixes ? result.recommendations : [];

  return (
    <Card
      size="small"
      bordered
      style={{ marginBottom: 12 }}
      title={
        <Space>
          <Text strong>{result.title}</Text>
          <Tag color={CONFIDENCE_COLOR[result.confidence] ?? 'default'}>
            {t(`copilot.confidence.${result.confidence}`)}
          </Tag>
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
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t('copilot.source')}: {result.sourceReferences.join(', ')}
          </Text>
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
              style={{ marginBottom: 4 }}
              banner
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default CopilotMessage;
