/**
 * Tweakcn AntD Theme — v1.54.0
 *
 * Ant Design theme tokens matching tweakcn designbyte aesthetic.
 * Light shell, mint green accent, 24px card radius, generous spacing.
 *
 * Usage: <ConfigProvider theme={tweakcnAntdTheme}> in App.tsx
 */

import type { ThemeConfig } from 'antd';

export const tweakcnAntdTheme: ThemeConfig = {
  token: {
    // ---- Brand Colors — Neutral slate primary + mint accent ----
    colorPrimary: '#18181b',           // Zinc-900 — neutral primary
    colorPrimaryBg: '#f4f4f5',         // Zinc-100
    colorPrimaryBgHover: '#e4e4e7',    // Zinc-200
    colorPrimaryBorder: '#a1a1aa',     // Zinc-400
    colorPrimaryBorderHover: '#71717a', // Zinc-500
    colorPrimaryHover: '#27272a',      // Zinc-800
    colorPrimaryActive: '#3f3f46',     // Zinc-700
    colorPrimaryTextHover: '#27272a',
    colorPrimaryText: '#18181b',
    colorPrimaryTextActive: '#3f3f46',

    // ---- Link ----
    colorLink: '#18181b',
    colorLinkHover: '#27272a',
    colorLinkActive: '#3f3f46',

    // ---- Background — Very light ----
    colorBgLayout: '#fafafa',          // Zinc-50
    colorBgContainer: '#ffffff',       // White
    colorBgElevated: '#ffffff',        // White
    colorBgSpotlight: '#f4f4f5',      // Zinc-100
    colorBgMask: 'rgba(0, 0, 0, 0.3)',

    // ---- Text — Strong, clear ----
    colorText: '#09090b',              // Zinc-950
    colorTextSecondary: '#3f3f46',     // Zinc-700
    colorTextTertiary: '#71717a',      // Zinc-500
    colorTextQuaternary: '#a1a1aa',    // Zinc-400
    colorTextDescription: '#52525b',   // Zinc-600
    colorTextDisabled: '#d4d4d8',      // Zinc-300

    // ---- Border — Thin, light ----
    colorBorder: '#eeeeee',            // Zinc-200 (very light)
    colorBorderSecondary: '#f4f4f5',   // Zinc-100
    lineWidth: 1,
    lineType: 'solid',

    // ---- Status Colors — Vibrant ----
    colorSuccess: '#22c55e',           // Green-500
    colorSuccessBg: '#dcfce7',         // Green-100
    colorSuccessBorder: '#bbf7d0',     // Green-200

    colorWarning: '#f59e0b',           // Amber-500
    colorWarningBg: '#fef3c7',         // Amber-100
    colorWarningBorder: '#fde68a',     // Amber-200

    colorError: '#ef4444',             // Red-500
    colorErrorBg: '#fee2e2',           // Red-100
    colorErrorBorder: '#fecaca',       // Red-200

    colorInfo: '#3b82f6',              // Blue-500
    colorInfoBg: '#dbeafe',            // Blue-100
    colorInfoBorder: '#bfdbfe',        // Blue-200

    // ---- Typography — Larger, calmer ----
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

    // ---- Shape — Large radius ----
    borderRadius: 12,
    borderRadiusSM: 8,
    borderRadiusLG: 16,
    borderRadiusXS: 6,

    // ---- Spacing — Generous ----
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

    // ---- Shadows — Very subtle ----
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowTertiary: '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',

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
    // ---- Layout — Light shell, no dark sidebar ----
    Layout: {
      bodyBg: '#fafafa',
      headerBg: '#ffffff',
      siderBg: '#ffffff',             // Light sidebar!
      triggerBg: '#f4f4f5',
      triggerColor: '#71717a',
      zeroTriggerHeight: 48,
      lightSiderBg: '#ffffff',
    },

    // ---- Menu — Light, pill-style ----
    Menu: {
      darkItemBg: '#ffffff',
      darkItemSelectedBg: '#f4f4f5',
      darkItemHoverBg: '#f4f4f5',
      darkItemColor: '#71717a',
      darkItemSelectedColor: '#09090b',
      darkSubMenuItemBg: '#ffffff',
      itemHeight: 36,
      itemMarginBlock: 2,
      itemMarginInline: 4,
      itemPaddingInline: 12,
      iconSize: 16,
      collapsedIconSize: 18,
      itemBorderRadius: 999,
      itemActiveBg: '#f4f4f5',
      itemSelectedBg: '#f4f4f5',
      itemSelectedColor: '#09090b',
      itemHoverBg: '#f4f4f5',
      itemColor: '#71717a',
    },

    // ---- Card — Large radius, thin border ----
    Card: {
      paddingLG: 24,
      paddingSM: 16,
      headerBg: 'transparent',
      headerFontSize: 14,
      headerHeight: 52,
      headerHeightSM: 44,
      actionsBg: '#fafafa',
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#eeeeee',
      borderRadiusLG: 24,
      boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04)',
    },

    // ---- Button — Rounded pill ----
    Button: {
      borderRadius: 999,
      borderRadiusSM: 999,
      borderRadiusLG: 999,
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
      primaryShadow: 'none',
      defaultBg: '#ffffff',
      defaultBorderColor: '#eeeeee',
      defaultColor: '#09090b',
      defaultHoverBg: '#f4f4f5',
      defaultHoverBorderColor: '#e4e4e7',
      defaultHoverColor: '#09090b',
      ghostBg: 'transparent',
    },

    // ---- Table — Light, spacious ----
    Table: {
      headerBg: '#fafafa',
      headerColor: '#71717a',
      headerSortActiveBg: '#f4f4f5',
      headerSortHoverBg: '#f4f4f5',
      bodySortBg: '#fafafa',
      rowHoverBg: '#fafafa',
      rowSelectedBg: '#dcfce7',
      rowSelectedHoverBg: '#bbf7d0',
      rowExpandedBg: '#fafafa',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellPaddingBlockMD: 12,
      cellPaddingInlineMD: 12,
      cellPaddingBlockSM: 10,
      cellPaddingInlineSM: 10,
      borderColor: '#eeeeee',
      headerBorderRadius: 0,
      footerBg: '#fafafa',
      footerColor: '#71717a',
      fontSize: 13,
      fontSizeSM: 12,
      stickyScrollBarBg: '#d4d4d8',
    },

    // ---- Input — Rounded ----
    Input: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      paddingInline: 12,
      activeBorderColor: '#a1a1aa',
      hoverBorderColor: '#d4d4d8',
      activeShadow: '0 0 0 2px rgba(161, 161, 170, 0.15)',
      addonBg: '#fafafa',
    },

    // ---- Select — Rounded ----
    Select: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      optionSelectedBg: '#dcfce7',
      optionSelectedColor: '#15803d',
      optionActiveBg: '#f4f4f5',
      optionFontSize: 14,
      optionLineHeight: 1.5,
      singleItemHeightLG: 40,
      multipleItemBg: '#f4f4f5',
      multipleItemBorderColor: '#eeeeee',
      multipleItemHeight: 28,
      selectorBg: '#ffffff',
    },

    // ---- Modal — Large radius ----
    Modal: {
      titleFontSize: 18,
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
      padding: 24,
      paddingLG: 32,
      paddingSM: 16,
      borderRadiusLG: 24,
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    },

    // ---- Drawer ----
    Drawer: {
      paddingLG: 24,
      paddingSM: 16,
      colorBgElevated: '#ffffff',
    },

    // ---- Alert — Rounded ----
    Alert: {
      borderRadiusLG: 16,
      paddingSM: 12,
      paddingLG: 16,
      withDescriptionPadding: '16px 16px',
      fontSize: 13,
      fontSizeLG: 14,
      lineHeightSM: 1.5,
      lineHeightLG: 1.5,
      colorInfoBg: '#dbeafe',
      colorInfoBorder: '#bfdbfe',
      colorSuccessBg: '#dcfce7',
      colorSuccessBorder: '#bbf7d0',
      colorWarningBg: '#fef3c7',
      colorWarningBorder: '#fde68a',
      colorErrorBg: '#fee2e2',
      colorErrorBorder: '#fecaca',
    },

    // ---- Tag — Pill ----
    Tag: {
      borderRadiusSM: 999,
      fontSizeSM: 11,
      fontSize: 12,
      lineHeightSM: 1.5,
      lineHeight: 1.5,
      defaultBg: '#f4f4f5',
      defaultColor: '#3f3f46',
    },

    // ---- Tabs ----
    Tabs: {
      cardPadding: '8px 16px',
      cardPaddingSM: '6px 12px',
      cardHeight: 40,
      cardGutter: 4,
      inkBarColor: '#22c55e',
      itemActiveColor: '#09090b',
      itemHoverColor: '#27272a',
      itemSelectedColor: '#09090b',
      itemColor: '#71717a',
    },

    // ---- Segmented — Pill ----
    Segmented: {
      borderRadius: 12,
      borderRadiusSM: 8,
      itemActiveBg: '#ffffff',
      itemHoverBg: '#f4f4f5',
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#09090b',
      trackBg: '#f4f4f5',
      trackPadding: 4,
    },

    // ---- Collapse — Rounded ----
    Collapse: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 16,
      borderlessContentBg: '#fafafa',
    },

    // ---- Tooltip ----
    Tooltip: {
      colorBgSpotlight: '#18181b',
      colorTextLightSolid: '#ffffff',
      borderRadius: 8,
      paddingSM: 8,
      paddingLG: 12,
      fontSize: 12,
    },

    // ---- Slider — Mint accent ----
    Slider: {
      railBg: '#e4e4e7',
      railHoverBg: '#d4d4d8',
      trackBg: '#22c55e',
      trackHoverBg: '#16a34a',
      handleColor: '#22c55e',
      handleActiveColor: '#16a34a',
      dotBorderColor: '#e4e4e7',
      dotActiveBorderColor: '#22c55e',
    },

    // ---- Switch — Mint accent ----
    Switch: {
      colorPrimary: '#22c55e',
      colorPrimaryHover: '#16a34a',
    },

    // ---- Checkbox ----
    Checkbox: {
      colorPrimary: '#22c55e',
      borderRadiusSM: 4,
    },

    // ---- Radio ----
    Radio: {
      buttonBg: '#ffffff',
      buttonCheckedBg: '#dcfce7',
      buttonColor: '#71717a',
      dotSize: 8,
    },

    // ---- DatePicker ----
    DatePicker: {
      cellHoverWithRangeBg: '#dcfce7',
      cellActiveWithRangeBg: '#bbf7d0',
      cellRangeBorderColor: '#86efac',
    },

    // ---- Upload ----
    Upload: {
      actionsColor: '#71717a',
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
      contentFontSize: 28,
      fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    },

    // ---- Descriptions ----
    Descriptions: {
      titleMarginBottom: 12,
      itemPaddingBottom: 12,
    },

    // ---- Form ----
    Form: {
      labelColor: '#09090b',
      labelFontSize: 14,
      labelHeight: 36,
      verticalLabelPadding: '0 0 8px',
      itemMarginBottom: 20,
    },

    // ---- Pagination ----
    Pagination: {
      itemActiveBg: '#22c55e',
      borderRadius: 8,
    },
  },
};

export default tweakcnAntdTheme;
