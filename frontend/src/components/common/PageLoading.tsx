import React from 'react';
import { Spin } from 'antd';

const PageLoading: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}
  >
    <Spin size="large" />
  </div>
);

export default PageLoading;
