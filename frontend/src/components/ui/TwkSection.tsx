import React from 'react';

interface TwkSectionProps {
  title?: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TwkSection: React.FC<TwkSectionProps> = ({ title, subtitle, extra, children, className }) => {
  return (
    <div className={`twk-section ${className || ''}`}>
      {(title || extra) && (
        <div className="twk-section-header">
          <div>
            {title && <h2 className="twk-section-title">{title}</h2>}
            {subtitle && <p className="twk-section-subtitle">{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default TwkSection;
