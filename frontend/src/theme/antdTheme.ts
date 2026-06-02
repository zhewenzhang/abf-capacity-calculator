/**
 * Ant Design Theme Configuration — v1.54.0 (deprecated, see tweakcnAntdTheme.ts)
 *
 * Comprehensive theme tokens inspired by tweakcn/designbyte.
 * Maps shadcn/ui design language to AntD component tokens.
 *
 * Design Principles:
 * - Off-white / slate backgrounds (not pure white)
 * - Professional blue/indigo primary (not purple gradients)
 * - Subtle shadows, 1px borders, 8px radius
 * - Clean typography with clear hierarchy
 * - Modern SaaS dashboard feel (like Claude/Gemini/Linear)
 *
 * Usage: <ConfigProvider theme={antdTheme}> in App.tsx
 */

import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // ---- Brand Colors ----
    colorPrimary: '#2563eb',           // Blue-600 — professional, trustworthy
    colorPrimaryBg: '#dbeafe',         // Blue-100
    colorPrimaryBgHover: '#bfdbfe',    // Blue-200
    colorPrimaryBorder: '#93c5fd',     // Blue-300
    colorPrimaryBorderHover: '#60a5fa', // Blue-400
    colorPrimaryHover: '#1d4ed8',      // Blue-700
    colorPrimaryActive: '#1e40af',     // Blue-800
    colorPrimaryTextHover: '#1d4ed8',
    colorPrimaryText: '#2563eb',
    colorPrimaryTextActive: '#1e40af',

    // ---- Link ----
    colorLink: '#2563eb',
    colorLinkHover: '#1d4ed8',
    colorLinkActive: '#1e40af',

    // ---- Background ----
    colorBgLayout: '#f8fafc',          // Slate-50
    colorBgContainer: '#ffffff',       // White — card/surface
    colorBgElevated: '#ffffff',        // White — elevated surface
    colorBgSpotlight: '#f1f5f9',      // Slate-100 — muted background
    colorBgMask: 'rgba(0, 0, 0, 0.45)',

    // ---- Text ----
    colorText: '#0f172a',              // Slate-900 — primary text
    colorTextSecondary: '#475569',     // Slate-600 — secondary text
    colorTextTertiary: '#94a3b8',      // Slate-400 — muted text
    colorTextQuaternary: '#cbd5e1',    // Slate-300 — disabled text
    colorTextDescription: '#64748b',   // Slate-500 — description text
    colorTextDisabled: '#cbd5e1',      // Slate-300

    // ---- Border ----
    colorBorder: '#e2e8f0',            // Slate-200 — default border
    colorBorderSecondary: '#f1f5f9',   // Slate-100 — subtle border
    lineWidth: 1,
    lineType: 'solid',

    // ---- Status Colors ----
    colorSuccess: '#16a34a',           // Green-600
    colorSuccessBg: '#f0fdf4',         // Green-50
    colorSuccessBorder: '#bbf7d0',     // Green-200

    colorWarning: '#d97706',           // Amber-600
    colorWarningBg: '#fffbeb',         // Amber-50
    colorWarningBorder: '#fde68a',     // Amber-200

    colorError: '#dc2626',             // Red-600
    colorErrorBg: '#fef2f2',           // Red-50
    colorErrorBorder: '#fecaca',       // Red-200

    colorInfo: '#2563eb',              // Blue-600
    colorInfoBg: '#eff6ff',            // Blue-50
    colorInfoBorder: '#bfdbfe',        // Blue-200

    // ---- Typography ----
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 16,
    fontSizeXL: 18,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace`,
    lineHeight: 1.5,
    lineHeightLG: 1.5,
    lineHeightSM: 1.5,

    // ---- Shape ----
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 12,
    borderRadiusXS: 4,

    // ---- Spacing ----
    padding: 16,
    paddingSM: 12,
    paddingXS: 8,
    paddingLG: 24,
    paddingXL: 32,
    margin: 16,
    marginSM: 12,
    marginXS: 8,
    marginLG: 24,
    marginXL: 32,

    // ---- Shadows ----
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    boxShadowTertiary: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

    // ---- Control ----
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,
    controlHeightXS: 24,

    // ---- Motion ----
    motionDurationFast: '0.15s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },

  components: {
    // ---- Layout ----
    Layout: {
      bodyBg: '#f8fafc',
      headerBg: '#ffffff',
      siderBg: '#0f172a',            // Dark sidebar like modern SaaS
      triggerBg: '#1e293b',
      triggerColor: '#e2e8f0',
      zeroTriggerHeight: 48,
      lightSiderBg: '#ffffff',
    },

    // ---- Menu ----
    Menu: {
      darkItemBg: '#0f172a',
      darkItemSelectedBg: '#1e293b',
      darkItemHoverBg: '#1e293b',
      darkItemColor: '#94a3b8',
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: '#0f172a',
      itemHeight: 40,
      itemMarginBlock: 4,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      iconSize: 16,
      collapsedIconSize: 18,
      itemBorderRadius: 8,
      itemActiveBg: '#dbeafe',
      itemSelectedBg: '#dbeafe',
      itemSelectedColor: '#2563eb',
      itemHoverBg: '#f1f5f9',
      itemColor: '#475569',
    },

    // ---- Card ----
    Card: {
      paddingLG: 20,
      paddingSM: 16,
      headerBg: 'transparent',
      headerFontSize: 14,
      headerHeight: 52,
      headerHeightSM: 44,
      actionsBg: '#f8fafc',
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e2e8f0',
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },

    // ---- Button ----
    Button: {
      borderRadius: 8,
      borderRadiusSM: 6,
      borderRadiusLG: 10,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      paddingContentHorizontal: 16,
      paddingContentHorizontalSM: 12,
      paddingContentHorizontalLG: 20,
      onlyIconSize: 18,
      onlyIconSizeSM: 14,
      onlyIconSizeLG: 22,
      fontWeight: 500,
      primaryShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      defaultBg: '#ffffff',
      defaultBorderColor: '#e2e8f0',
      defaultColor: '#0f172a',
      defaultHoverBg: '#f8fafc',
      defaultHoverBorderColor: '#cbd5e1',
      defaultHoverColor: '#0f172a',
      ghostBg: 'transparent',
    },

    // ---- Table ----
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSortActiveBg: '#f1f5f9',
      headerSortHoverBg: '#f1f5f9',
      bodySortBg: '#fafafa',
      rowHoverBg: '#f8fafc',
      rowSelectedBg: '#dbeafe',
      rowSelectedHoverBg: '#bfdbfe',
      rowExpandedBg: '#f8fafc',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      cellPaddingBlockMD: 10,
      cellPaddingInlineMD: 12,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 8,
      borderColor: '#e2e8f0',
      headerBorderRadius: 0,
      footerBg: '#f8fafc',
      footerColor: '#475569',
      fontSize: 13,
      fontSizeSM: 12,
      stickyScrollBarBg: '#cbd5e1',
    },

    // ---- Input ----
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      paddingInline: 12,
      activeBorderColor: '#2563eb',
      hoverBorderColor: '#cbd5e1',
      activeShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)',
      addonBg: '#f8fafc',
    },

    // ---- Select ----
    Select: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      optionSelectedBg: '#dbeafe',
      optionSelectedColor: '#2563eb',
      optionActiveBg: '#f1f5f9',
      optionFontSize: 14,
      optionLineHeight: 1.5,
      singleItemHeightLG: 40,
      multipleItemBg: '#f1f5f9',
      multipleItemBorderColor: '#e2e8f0',
      multipleItemHeight: 28,
      selectorBg: '#ffffff',
    },

    // ---- Modal ----
    Modal: {
      titleFontSize: 18,
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
      padding: 24,
      paddingLG: 32,
      paddingSM: 16,
      borderRadiusLG: 16,
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },

    // ---- Drawer ----
    Drawer: {
      paddingLG: 24,
      paddingSM: 16,
      colorBgElevated: '#ffffff',
    },

    // ---- Alert ----
    Alert: {
      borderRadiusLG: 10,
      paddingSM: 12,
      paddingLG: 16,
      withDescriptionPadding: '16px 16px',
      fontSize: 13,
      fontSizeLG: 14,
      lineHeightSM: 1.5,
      lineHeightLG: 1.5,
      colorInfoBg: '#eff6ff',
      colorInfoBorder: '#bfdbfe',
      colorSuccessBg: '#f0fdf4',
      colorSuccessBorder: '#bbf7d0',
      colorWarningBg: '#fffbeb',
      colorWarningBorder: '#fde68a',
      colorErrorBg: '#fef2f2',
      colorErrorBorder: '#fecaca',
    },

    // ---- Tag ----
    Tag: {
      borderRadiusSM: 9999,  // Pill shape
      fontSizeSM: 11,
      fontSize: 12,
      lineHeightSM: 1.5,
      lineHeight: 1.5,
      defaultBg: '#f1f5f9',
      defaultColor: '#475569',
    },

    // ---- Tabs ----
    Tabs: {
      cardPadding: '8px 16px',
      cardPaddingSM: '6px 12px',
      cardHeight: 40,
      cardGutter: 4,
      inkBarColor: '#2563eb',
      itemActiveColor: '#2563eb',
      itemHoverColor: '#1d4ed8',
      itemSelectedColor: '#2563eb',
      itemColor: '#475569',
    },

    // ---- Segmented ----
    Segmented: {
      borderRadius: 8,
      borderRadiusSM: 6,
      itemActiveBg: '#ffffff',
      itemHoverBg: '#f1f5f9',
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#2563eb',
      trackBg: '#f1f5f9',
      trackPadding: 4,
    },

    // ---- Collapse ----
    Collapse: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 10,
      borderlessContentBg: '#f8fafc',
    },

    // ---- Tooltip ----
    Tooltip: {
      colorBgSpotlight: '#0f172a',
      colorTextLightSolid: '#ffffff',
      borderRadius: 8,
      paddingSM: 8,
      paddingLG: 12,
      fontSize: 12,
    },

    // ---- Slider ----
    Slider: {
      railBg: '#e2e8f0',
      railHoverBg: '#cbd5e1',
      trackBg: '#2563eb',
      trackHoverBg: '#1d4ed8',
      handleColor: '#2563eb',
      handleActiveColor: '#1d4ed8',
      dotBorderColor: '#e2e8f0',
      dotActiveBorderColor: '#2563eb',
    },

    // ---- Switch ----
    Switch: {
      colorPrimary: '#2563eb',
      colorPrimaryHover: '#1d4ed8',
    },

    // ---- Checkbox ----
    Checkbox: {
      colorPrimary: '#2563eb',
      borderRadiusSM: 4,
    },

    // ---- Radio ----
    Radio: {
      buttonBg: '#ffffff',
      buttonCheckedBg: '#dbeafe',
      buttonColor: '#475569',
      dotSize: 8,
    },

    // ---- DatePicker ----
    DatePicker: {
      cellHoverWithRangeBg: '#dbeafe',
      cellActiveWithRangeBg: '#bfdbfe',
      cellRangeBorderColor: '#93c5fd',
    },

    // ---- Upload ----
    Upload: {
      actionsColor: '#475569',
    },

    // ---- Badge ----
    Badge: {
      dotSize: 8,
      textFontSize: 12,
      textFontSizeSM: 10,
      textFontWeight: 600,
    },

    // ---- Statistic ----
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
      fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    },

    // ---- Descriptions ----
    Descriptions: {
      titleMarginBottom: 12,
      itemPaddingBottom: 12,
    },

    // ---- Form ----
    Form: {
      labelColor: '#0f172a',
      labelFontSize: 14,
      labelHeight: 36,
      verticalLabelPadding: '0 0 8px',
      itemMarginBottom: 20,
    },

    // ---- Pagination ----
    Pagination: {
      itemActiveBg: '#2563eb',
      borderRadius: 8,
    },
  },
};

export default antdTheme;
