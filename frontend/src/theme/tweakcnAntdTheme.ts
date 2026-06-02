/**
 * Exact tweakcn AntD Theme — v1.54.0
 *
 * Maps user-provided tweakcn oklch tokens into Ant Design's ThemeConfig.
 * Source: https://tweakcn.com/editor/theme
 *
 * Font: Plus Jakarta Sans (via Google Fonts in tweakcnTheme.css)
 * Primary: mint green ≈ #4ade80
 * Background: off-white ≈ #fcfcfc
 * Radius: 1.4rem ≈ 22px
 */

import type { ThemeConfig } from 'antd';

export const tweakcnAntdTheme: ThemeConfig = {
  token: {
    // ---- Primary: mint green oklch(0.8545 0.1675 159.6564) → #4ade80 ----
    colorPrimary: '#4ade80',
    colorPrimaryBg: '#f0fdf4',
    colorPrimaryBgHover: '#dcfce7',
    colorPrimaryBorder: '#86efac',
    colorPrimaryBorderHover: '#4ade80',
    colorPrimaryHover: '#22c55e',
    colorPrimaryActive: '#16a34a',
    colorPrimaryTextHover: '#16a34a',
    colorPrimaryText: '#15803d',
    colorPrimaryTextActive: '#14532d',

    // ---- Link ----
    colorLink: '#15803d',
    colorLinkHover: '#166534',
    colorLinkActive: '#14532d',

    // ---- Background: oklch(0.9940 0 0) → #fcfcfc ----
    colorBgLayout: '#fcfcfc',
    colorBgContainer: '#fcfcfc',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#f7f7f7',
    colorBgMask: 'rgba(0, 0, 0, 0.25)',

    // ---- Text: oklch(0 0 0) → #000000 ----
    colorText: '#000000',
    colorTextSecondary: '#1a1a1a',
    colorTextTertiary: '#6b6b6b',
    colorTextQuaternary: '#a3a3a3',
    colorTextDescription: '#525252',
    colorTextDisabled: '#d4d4d4',

    // ---- Border: oklch(0.9722 0.0034 247.8581) → #f1f5f9 ----
    colorBorder: '#f1f5f9',
    colorBorderSecondary: '#f7f7f7',
    lineWidth: 1,
    lineType: 'solid',

    // ---- Status ----
    colorSuccess: '#4ade80',
    colorSuccessBg: '#f0fdf4',
    colorSuccessBorder: '#dcfce7',

    colorWarning: '#f59e0b',
    colorWarningBg: '#fef9ee',
    colorWarningBorder: '#fde68a',

    colorError: '#dc2626',
    colorErrorBg: '#fef2f2',
    colorErrorBorder: '#fecaca',

    colorInfo: '#60a5fa',
    colorInfoBg: '#eff6ff',
    colorInfoBorder: '#bfdbfe',

    // ---- Typography: Plus Jakarta Sans ----
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 16,
    fontSizeXL: 18,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontFamilyCode: "'IBM Plex Mono', monospace",
    lineHeight: 1.6,
    lineHeightLG: 1.5,
    lineHeightSM: 1.5,

    // ---- Shape: 1.4rem ≈ 22px ----
    borderRadius: 22,
    borderRadiusSM: 16,
    borderRadiusLG: 22,
    borderRadiusXS: 12,

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

    // ---- Shadows: exact tweakcn values ----
    boxShadow: '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
    boxShadowSecondary: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
    boxShadowTertiary: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',

    // ---- Control ----
    controlHeight: 38,
    controlHeightSM: 30,
    controlHeightLG: 46,
    controlHeightXS: 24,

    // ---- Motion ----
    motionDurationFast: '0.15s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },

  components: {
    // ---- Layout: white sidebar (unused now, but set for safety) ----
    Layout: {
      bodyBg: '#fcfcfc',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      triggerBg: '#f7f7f7',
      triggerColor: '#6b6b6b',
      zeroTriggerHeight: 48,
      lightSiderBg: '#ffffff',
    },

    // ---- Menu ----
    Menu: {
      darkItemBg: '#ffffff',
      darkItemSelectedBg: '#f0fdf4',
      darkItemHoverBg: '#f7f7f7',
      darkItemColor: '#6b6b6b',
      darkItemSelectedColor: '#000000',
      darkSubMenuItemBg: '#ffffff',
      itemHeight: 36,
      itemMarginBlock: 2,
      itemMarginInline: 4,
      itemPaddingInline: 12,
      iconSize: 16,
      collapsedIconSize: 18,
      itemBorderRadius: 999,
      itemActiveBg: '#f0fdf4',
      itemSelectedBg: '#f0fdf4',
      itemSelectedColor: '#000000',
      itemHoverBg: '#f7f7f7',
      itemColor: '#6b6b6b',
    },

    // ---- Card: 1.4rem radius ----
    Card: {
      paddingLG: 24,
      paddingSM: 16,
      headerBg: 'transparent',
      headerFontSize: 14,
      headerHeight: 52,
      headerHeightSM: 44,
      actionsBg: '#fcfcfc',
      colorBgContainer: '#fcfcfc',
      colorBorderSecondary: '#f1f5f9',
      borderRadiusLG: 22,
      boxShadowTertiary: '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
    },

    // ---- Button: pill radius ----
    Button: {
      borderRadius: 999,
      borderRadiusSM: 999,
      borderRadiusLG: 999,
      controlHeight: 38,
      controlHeightSM: 30,
      controlHeightLG: 46,
      paddingContentHorizontal: 18,
      paddingContentHorizontalSM: 14,
      paddingContentHorizontalLG: 22,
      onlyIconSize: 18,
      onlyIconSizeSM: 14,
      onlyIconSizeLG: 22,
      fontWeight: 600,
      primaryShadow: 'none',
      defaultBg: '#ffffff',
      defaultBorderColor: '#f1f5f9',
      defaultColor: '#000000',
      defaultHoverBg: '#f7f7f7',
      defaultHoverBorderColor: '#e5e5e5',
      defaultHoverColor: '#000000',
      ghostBg: 'transparent',
    },

    // ---- Table ----
    Table: {
      headerBg: '#f7f7f7',
      headerColor: '#6b6b6b',
      headerSortActiveBg: '#f0fdf4',
      headerSortHoverBg: '#f0fdf4',
      bodySortBg: '#f7f7f7',
      rowHoverBg: '#f7f7f7',
      rowSelectedBg: '#f0fdf4',
      rowSelectedHoverBg: '#dcfce7',
      rowExpandedBg: '#f7f7f7',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellPaddingBlockMD: 12,
      cellPaddingInlineMD: 12,
      cellPaddingBlockSM: 10,
      cellPaddingInlineSM: 10,
      borderColor: '#f1f5f9',
      headerBorderRadius: 0,
      footerBg: '#f7f7f7',
      footerColor: '#6b6b6b',
      fontSize: 13,
      fontSizeSM: 12,
      stickyScrollBarBg: '#d4d4d4',
    },

    // ---- Input: 1.4rem radius ----
    Input: {
      borderRadius: 22,
      controlHeight: 38,
      controlHeightSM: 30,
      controlHeightLG: 46,
      paddingInline: 14,
      activeBorderColor: '#4ade80',
      hoverBorderColor: '#d4d4d4',
      activeShadow: '0 0 0 2px rgba(74, 222, 128, 0.15)',
      addonBg: '#f7f7f7',
    },

    // ---- Select ----
    Select: {
      borderRadius: 22,
      controlHeight: 38,
      controlHeightSM: 30,
      controlHeightLG: 46,
      optionSelectedBg: '#f0fdf4',
      optionSelectedColor: '#15803d',
      optionActiveBg: '#f7f7f7',
      optionFontSize: 14,
      optionLineHeight: 1.5,
      singleItemHeightLG: 40,
      multipleItemBg: '#f7f7f7',
      multipleItemBorderColor: '#f1f5f9',
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
      borderRadiusLG: 22,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    },

    // ---- Drawer ----
    Drawer: {
      paddingLG: 24,
      paddingSM: 16,
      colorBgElevated: '#ffffff',
    },

    // ---- Alert ----
    Alert: {
      borderRadiusLG: 22,
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
      colorSuccessBorder: '#dcfce7',
      colorWarningBg: '#fef9ee',
      colorWarningBorder: '#fde68a',
      colorErrorBg: '#fef2f2',
      colorErrorBorder: '#fecaca',
    },

    // ---- Tag: pill ----
    Tag: {
      borderRadiusSM: 999,
      fontSizeSM: 11,
      fontSize: 12,
      lineHeightSM: 1.5,
      lineHeight: 1.5,
      defaultBg: '#f7f7f7',
      defaultColor: '#1a1a1a',
    },

    // ---- Tabs ----
    Tabs: {
      cardPadding: '8px 16px',
      cardPaddingSM: '6px 12px',
      cardHeight: 40,
      cardGutter: 4,
      inkBarColor: '#4ade80',
      itemActiveColor: '#000000',
      itemHoverColor: '#1a1a1a',
      itemSelectedColor: '#000000',
      itemColor: '#6b6b6b',
    },

    // ---- Segmented ----
    Segmented: {
      borderRadius: 22,
      borderRadiusSM: 16,
      itemActiveBg: '#ffffff',
      itemHoverBg: '#f7f7f7',
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#000000',
      trackBg: '#f7f7f7',
      trackPadding: 4,
    },

    // ---- Collapse ----
    Collapse: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 22,
      borderlessContentBg: '#fcfcfc',
    },

    // ---- Tooltip ----
    Tooltip: {
      colorBgSpotlight: '#1a1a1a',
      colorTextLightSolid: '#ffffff',
      borderRadius: 12,
      paddingSM: 8,
      paddingLG: 12,
      fontSize: 12,
    },

    // ---- Slider: mint accent ----
    Slider: {
      railBg: '#e5e5e5',
      railHoverBg: '#d4d4d4',
      trackBg: '#4ade80',
      trackHoverBg: '#22c55e',
      handleColor: '#4ade80',
      handleActiveColor: '#22c55e',
      dotBorderColor: '#e5e5e5',
      dotActiveBorderColor: '#4ade80',
    },

    // ---- Switch: mint accent ----
    Switch: {
      colorPrimary: '#4ade80',
      colorPrimaryHover: '#22c55e',
    },

    // ---- Checkbox ----
    Checkbox: {
      colorPrimary: '#4ade80',
      borderRadiusSM: 6,
    },

    // ---- Radio ----
    Radio: {
      buttonBg: '#ffffff',
      buttonCheckedBg: '#f0fdf4',
      buttonColor: '#6b6b6b',
      dotSize: 8,
    },

    // ---- DatePicker ----
    DatePicker: {
      cellHoverWithRangeBg: '#f0fdf4',
      cellActiveWithRangeBg: '#dcfce7',
      cellRangeBorderColor: '#86efac',
    },

    // ---- Upload ----
    Upload: {
      actionsColor: '#6b6b6b',
    },

    // ---- Badge ----
    Badge: {
      dotSize: 8,
      textFontSize: 12,
      textFontSizeSM: 10,
      textFontWeight: 700,
    },

    // ---- Statistic ----
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },

    // ---- Descriptions ----
    Descriptions: {
      titleMarginBottom: 12,
      itemPaddingBottom: 12,
    },

    // ---- Form ----
    Form: {
      labelColor: '#000000',
      labelFontSize: 14,
      labelHeight: 36,
      verticalLabelPadding: '0 0 8px',
      itemMarginBottom: 20,
    },

    // ---- Pagination ----
    Pagination: {
      itemActiveBg: '#4ade80',
      borderRadius: 12,
    },
  },
};

export default tweakcnAntdTheme;
