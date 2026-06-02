import React from 'react';

interface TwkTableShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TwkTableShell: React.FC<TwkTableShellProps> = ({ children, className, style }) => {
  return (
    <div className={`twk-table-shell ${className || ''}`} style={style}>
      {children}
    </div>
  );
};

export default TwkTableShell;
