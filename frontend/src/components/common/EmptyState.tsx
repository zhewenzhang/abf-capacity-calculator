import React from 'react';
import { Empty, Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  image?: React.ReactNode;
}

/**
 * Reusable empty state component for consistent UX across pages.
 * Uses Ant Design Empty component with optional action button.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  image,
}) => {
  return (
    <div className="empty-state-container">
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Title level={5} style={{ marginBottom: 4 }}>{title}</Title>
            {description && (
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                {description}
              </Paragraph>
            )}
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
