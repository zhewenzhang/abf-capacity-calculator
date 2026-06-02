import React from 'react';

interface TwkKpiCardProps {
  label: string;
  value: React.ReactNode;
  change?: { value: string; direction: 'up' | 'down' };
  accent?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const TwkKpiCard: React.FC<TwkKpiCardProps> = ({ label, value, change, accent, className, style, onClick }) => {
  return (
    <div
      className={`twk-kpi ${className || ''}`}
      style={{ ...style, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <div className="twk-kpi-label">{label}</div>
      <div className={`twk-kpi-value ${accent ? 'twk-kpi-accent' : ''}`}>{value}</div>
      {change && (
        <span className={`twk-kpi-change twk-kpi-change--${change.direction}`}>
          {change.direction === 'up' ? '↑' : '↓'} {change.value}
        </span>
      )}
    </div>
  );
};

export default TwkKpiCard;
