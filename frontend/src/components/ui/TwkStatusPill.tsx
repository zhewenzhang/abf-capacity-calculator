import React from 'react';

type StatusVariant = 'ready' | 'warning' | 'blocked' | 'default';

interface TwkStatusPillProps {
  status: StatusVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TwkStatusPill: React.FC<TwkStatusPillProps> = ({ status, children, className, style }) => {
  return (
    <span className={`twk-status-pill twk-status-pill--${status} ${className || ''}`} style={style}>
      {children}
    </span>
  );
};

export default TwkStatusPill;
