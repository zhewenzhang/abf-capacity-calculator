/**
 * Ant Design theme tokens for ABF Capacity Calculator.
 *
 * This is the single source of truth for design tokens.
 * All pages should consume tokens via ConfigProvider (App.tsx)
 * or the shared components in components/common/.
 *
 * Do not introduce a second UI system (MUI, shadcn, Tailwind, etc.).
 * Ant Design is the only UI framework for this project.
 */

import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // Brand - Designbyte Primary Blue
    colorPrimary: '#2563eb',

    // Typography
    fontSize: 14,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,

    // Shape - Designbyte radius
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 12,

    // Spacing
    padding: 16,
    paddingSM: 12,
    paddingXS: 8,

    // Borders - Designbyte border color
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    lineWidth: 1,
    lineType: 'solid' as const,

    // Shadows - Designbyte shadows
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',

    // Background - Designbyte background
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    // Text - Designbyte text colors
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#cbd5e1',

    // Semantic colors - Designbyte status colors
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#2563eb',
  },
  components: {
    Card: {
      headerPadding: 12,
    },
    Table: {
      headerBg: '#f1f5f9',
      headerColor: '#64748b',
      fontWeightStrong: 600,
      cellPaddingBlock: 6,
      cellPaddingInline: 12,
      fontSize: 13,
      headerBorderRadius: 0,
    },
    Statistic: {
      contentFontSize: 20,
      titleFontSize: 13,
    },
    Tag: {
      defaultBg: '#f1f5f9',
    },
    Alert: {
      paddingXS: 12,
    },
    Tabs: {
      cardPaddingSM: '6px 16px',
    },
    Button: {
      borderRadius: 6,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
  },
};

export default antdTheme;
