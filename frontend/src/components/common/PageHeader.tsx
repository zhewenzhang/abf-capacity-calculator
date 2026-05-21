import React from 'react';
import { Typography, Space } from 'antd';

const { Title } = Typography;

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description shown below the title */
  description?: React.ReactNode;
  /** Optional actions (buttons, etc.) shown on the right */
  actions?: React.ReactNode;
}

/**
 * Consistent page header with title, optional description, and optional actions.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
    <div>
      <Title level={4} style={{ margin: 0 }}>
        {title}
      </Title>
      {description && (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          {description}
        </Typography.Text>
      )}
    </div>
    {actions && <Space>{actions}</Space>}
  </div>
);

export default PageHeader;
