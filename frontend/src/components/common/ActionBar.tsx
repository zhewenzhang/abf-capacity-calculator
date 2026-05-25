import React from 'react';
import { Space } from 'antd';

export interface ActionBarProps {
  /** Action buttons and controls */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Info text shown on the right side */
  info?: React.ReactNode;
}

/**
 * Standardized toolbar / action bar for page-level controls.
 * Provides consistent spacing and layout for Save, Discard, etc.
 *
 * Usage:
 * <ActionBar info="3 items selected">
 *   <Button>Save</Button>
 *   <Button>Discard</Button>
 * </ActionBar>
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  children,
  className = '',
  style,
  info,
}) => (
  <div className={`abf-toolbar ${className}`.trim()} style={style}>
    <div className="abf-toolbar-actions">
      <Space size={8} wrap>
        {children}
      </Space>
    </div>
    {info && <span className="abf-toolbar-info">{info}</span>}
  </div>
);

export default ActionBar;
