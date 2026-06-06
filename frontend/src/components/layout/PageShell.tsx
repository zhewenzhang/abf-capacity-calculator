import React from 'react';

/**
 * PageShell — reusable page width variant wrapper (v1.58.7)
 *
 * Controls the content area max-width for each page via CSS class.
 * The `.twk-main` parent is widened via `.twk-main:has(.abf-page-shell--wide)`
 * so that wide pages get more horizontal space.
 *
 * Variants:
 *   narrow   — 960px, for text-heavy / form-only pages
 *   standard — 1280px, for settings / mixed pages (default)
 *   wide     — 1560px+, for table / chart / dashboard pages
 *   full     — no constraint, for custom layouts (copilot, etc.)
 */

export type PageShellVariant = 'narrow' | 'standard' | 'wide' | 'full';

export interface PageShellProps {
  variant?: PageShellVariant;
  children: React.ReactNode;
  className?: string;
}

const PageShell: React.FC<PageShellProps> = ({
  variant = 'standard',
  children,
  className = '',
}) => {
  const classNames = [
    'abf-page-shell',
    `abf-page-shell--${variant}`,
    'twk-page',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames}>{children}</div>;
};

export default PageShell;
