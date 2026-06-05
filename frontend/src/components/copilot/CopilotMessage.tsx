import React, { useState } from 'react';
import { Tag, Typography, Alert } from 'antd';
import {
  WarningOutlined,
  InfoCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '../../i18n';
import type { CopilotToolResult } from '../../core/aiCopilotTools';

const { Text } = Typography;

interface Props {
  result: CopilotToolResult;
  isLastMessage?: boolean;
}

/**
 * Simplified answer status tag.
 */
function getAnswerStatus(result: CopilotToolResult): {
  label: string;
  color: string;
} {
  if (result.confidence === 'blocked') {
    return { label: '⚠', color: 'red' };
  }
  if (result.validationIssues && result.validationIssues.length > 0) {
    return { label: '!', color: 'orange' };
  }
  return { label: '', color: 'green' };
}

/**
 * Markdown renderer with clean prose styling.
 */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="copilot-markdown-content" style={{
      fontSize: 15,
      lineHeight: 1.65,
      color: '#1a1a1a',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 style={{ fontSize: 17, fontWeight: 600, marginTop: 16, marginBottom: 6, color: '#1a1a1a' }}>
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 style={{ fontSize: 15, fontWeight: 600, marginTop: 14, marginBottom: 6, color: '#1a1a1a' }}>
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 style={{ fontSize: 14, fontWeight: 600, marginTop: 12, marginBottom: 4, color: '#1a1a1a' }}>
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: 10, lineHeight: 1.65 }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, margin: '6px 0 10px', lineHeight: 1.7 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, margin: '6px 0 10px', lineHeight: 1.7 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 4 }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 600, color: '#1a1a1a' }}>{children}</strong>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#f5f5f5',
                border: '1px solid #e8e8e8',
                fontSize: 13,
                fontFamily: 'monospace',
              }}>
                {children}
              </code>
            ) : (
              <pre style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: '#f5f5f5',
                border: '1px solid #e8e8e8',
                overflow: 'auto',
                fontSize: 13,
              }}>
                <code>{children}</code>
              </pre>
            );
          },
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1677ff' }}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Collapsible source references — shown as a single line by default.
 */
const SourceLine: React.FC<{ sources: string[]; t: (key: string) => string }> = ({ sources, t }) => {
  const [expanded, setExpanded] = useState(false);
  if (sources.length === 0) return null;

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <RightOutlined style={{ fontSize: 10 }} />
        <span>{t('copilot.source')} ({sources.length})</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: '6px 10px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
      <div
        onClick={() => setExpanded(false)}
        style={{
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        <DownOutlined style={{ fontSize: 10 }} />
        <span>{t('copilot.source')} ({sources.length})</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {sources.map((ref, i) => (
          <Tag key={i} style={{ fontSize: 11, margin: 0 }}>{ref}</Tag>
        ))}
      </div>
    </div>
  );
};

/**
 * Collapsible validation / warning info.
 */
const ValidationNotice: React.FC<{ issues: string[]; blockedReason?: string; t: (key: string) => string }> = ({
  issues,
  blockedReason,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (blockedReason) {
    return (
      <Alert
        type="error"
        showIcon
        message={blockedReason}
        banner
        style={{ marginTop: 8, fontSize: 13, borderRadius: 8 }}
      />
    );
  }

  if (issues.length === 0) return null;

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <InfoCircleOutlined style={{ fontSize: 12 }} />
        <span>{t('copilot.qualityHint.title')} ({issues.length})</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f' }}>
      <div
        onClick={() => setExpanded(false)}
        style={{
          fontSize: 12,
          color: '#8c8c8c',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        <WarningOutlined style={{ color: '#faad14', fontSize: 12 }} />
        <span>{t('copilot.qualityHint.title')} ({issues.length})</span>
      </div>
      {issues.map((issue, i) => (
        <div key={i} style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2, paddingLeft: 4 }}>
          · {issue}
        </div>
      ))}
    </div>
  );
};

const CopilotMessage: React.FC<Props> = ({ result }) => {
  const { t } = useI18n();

  const isAiResponse = result.toolName === 'DeepSeek AI' || result.toolName === 'unknown';
  const statusTag = getAnswerStatus(result);

  // Show very short warning badge if security-trimmed
  const hasBlocked = result.confidence === 'blocked';

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Status badge (only if blocked or validation warning) */}
      {hasBlocked && (
        <div style={{ marginBottom: 6 }}>
          <Tag color="red" style={{ borderRadius: 4, fontSize: 12 }}>
            {hasBlocked ? t('copilot.status.blocked') : statusTag.label}
          </Tag>
        </div>
      )}

      {/* Main content */}
      {isAiResponse ? (
        <MarkdownRenderer content={result.summary} />
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.65, color: '#1a1a1a' }}>
          {result.summary}
        </div>
      )}

      {/* Validation issues (collapsible) */}
      <ValidationNotice
        issues={result.validationIssues ?? []}
        blockedReason={result.blockedReason}
        t={t}
      />

      {/* Source references (collapsible) */}
      {!hasBlocked && result.sourceReferences.length > 0 && (
        <SourceLine sources={result.sourceReferences} t={t} />
      )}

      {/* Caveats — minimal */}
      {result.caveats.length > 0 && !hasBlocked && (
        <div style={{ marginTop: 6 }}>
          {result.caveats.map((caveat, i) => (
            <Text key={i} type="secondary" style={{ fontSize: 12, display: 'block' }}>
              · {caveat}
            </Text>
          ))}
        </div>
      )}
    </div>
  );
};

export default CopilotMessage;
