import React from 'react';

interface TwkPageProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const TwkPage: React.FC<TwkPageProps> = ({ title, subtitle, children, className }) => {
  return (
    <div className={`twk-page ${className || ''}`}>
      {(title || subtitle) && (
        <div className="twk-page-header">
          {title && <h1 className="twk-page-title">{title}</h1>}
          {subtitle && <p className="twk-page-subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default TwkPage;
