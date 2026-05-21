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
    // Brand
    colorPrimary: '#1677ff',

    // Typography
    fontSize: 14,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,

    // Shape
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,

    // Spacing
    padding: 16,
    paddingSM: 12,
    paddingXS: 8,

    // Borders
    lineWidth: 1,
    lineType: 'solid' as const,

    // Shadows
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',

    // Semantic colors
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
  },
  components: {
    Card: {
      headerPadding: 12,
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: 'rgba(0, 0, 0, 0.88)',
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
      defaultBg: '#fafafa',
    },
    Alert: {
      paddingXS: 12,
    },
    Tabs: {
      cardPaddingSM: '6px 16px',
    },
  },
};

export default antdTheme;
