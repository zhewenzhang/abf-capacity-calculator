import React from 'react';

interface TwkCardProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

const TwkCard: React.FC<TwkCardProps> = ({ title, extra, children, footer, className, style, noPadding }) => {
  return (
    <div className={`twk-card ${className || ''}`} style={style}>
      {(title || extra) && (
        <div className="twk-card-header">
          {title && <div className="twk-card-title">{title}</div>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="twk-card-body" style={noPadding ? { padding: 0 } : undefined}>
        {children}
      </div>
      {footer && <div className="twk-card-footer">{footer}</div>}
    </div>
  );
};

export default TwkCard;
