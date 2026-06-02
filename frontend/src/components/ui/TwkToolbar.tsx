import React from 'react';

interface TwkToolbarProps {
  children: React.ReactNode;
  className?: string;
}

const TwkToolbar: React.FC<TwkToolbarProps> = ({ children, className }) => {
  return (
    <div className={`twk-toolbar ${className || ''}`}>
      {children}
    </div>
  );
};

export const TwkToolbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={`twk-toolbar-group ${className || ''}`}>{children}</div>;
};

export default TwkToolbar;
