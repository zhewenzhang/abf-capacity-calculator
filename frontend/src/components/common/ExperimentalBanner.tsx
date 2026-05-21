import React from 'react';
import { Alert, Typography } from 'antd';
import { ExperimentOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface ExperimentalBannerProps {
  /** Short label shown in the alert message line */
  label?: string;
  /** Detailed description of why this is experimental */
  description?: React.ReactNode;
  /** Whether the banner can be dismissed */
  closable?: boolean;
}

/**
 * Standard banner for experimental pages.
 * Used on Capacity Lab and any other page that is not production-ready.
 */
export const ExperimentalBanner: React.FC<ExperimentalBannerProps> = ({
  label = 'EXPERIMENTAL',
  description,
  closable = true,
}) => (
  <Alert
    message={
      <Text strong>
        <ExperimentOutlined style={{ marginRight: 6 }} /> {label}
      </Text>
    }
    description={
      description || (
        <Text type="secondary">
          This page is an experimental feature. It is preserved for evaluation but not recommended
          as the primary production workflow yet.
        </Text>
      )
    }
    type="warning"
    showIcon
    icon={<InfoCircleOutlined />}
    closable={closable}
    style={{ marginBottom: 12 }}
  />
);

export default ExperimentalBanner;
