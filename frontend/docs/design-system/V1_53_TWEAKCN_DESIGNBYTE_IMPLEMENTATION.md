# v1.53 Tweakcn/Designbyte Implementation Guide

## Overview

This document describes how the tweakcn/designbyte theme has been translated and implemented in the ABF Capacity Calculator project, which uses React + Ant Design (not shadcn/Tailwind).

## Design Principles

Inspired by [tweakcn.com/themes/cmcup07dt000104l4hj4eferh](https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh):

- **Background**: Clean off-white / slate (not pure white)
- **Cards**: White background, 1px border, subtle shadow, 8px radius
- **Primary Color**: Professional blue / indigo (not purple gradients)
- **Text**: Slate-900 / Slate-600 / Slate-500 hierarchy
- **Table Headers**: Light gray background
- **Alerts**: Low-saturation backgrounds and borders
- **Buttons**: Clean with clear hover/focus states
- **Tags/Badges**: shadcn-like pill shapes
- **Layout**: Modern SaaS dashboard feel (like Claude/Gemini/Linear)

## Architecture

### File Structure

```
src/
├── styles/
│   └── designbyte.css          # CSS Custom Properties (--db-* tokens)
├── theme/
│   └── antdTheme.ts            # AntD ConfigProvider theme tokens
├── main.tsx                    # Imports designbyte.css
└── App.tsx                     # Uses ConfigProvider with antdTheme
```

### CSS Custom Properties (designbyte.css)

All design tokens use the `--db-` prefix:

| Category | Token | Value | Description |
|----------|-------|-------|-------------|
| Background | `--db-bg-page` | `#f8fafc` | Page background (slate-50) |
| Background | `--db-bg-card` | `#ffffff` | Card background (white) |
| Background | `--db-bg-muted` | `#f1f5f9` | Muted background (slate-100) |
| Text | `--db-text-primary` | `#0f172a` | Primary text (slate-900) |
| Text | `--db-text-secondary` | `#475569` | Secondary text (slate-600) |
| Text | `--db-text-muted` | `#94a3b8` | Muted text (slate-400) |
| Primary | `--db-primary` | `#2563eb` | Primary blue (blue-600) |
| Primary | `--db-primary-hover` | `#1d4ed8` | Primary hover (blue-700) |
| Primary | `--db-primary-light` | `#dbeafe` | Primary light bg (blue-100) |
| Border | `--db-border` | `#e2e8f0` | Default border (slate-200) |
| Border | `--db-border-hover` | `#cbd5e1` | Border hover (slate-300) |
| Radius | `--db-radius` | `8px` | Default radius |
| Radius | `--db-radius-lg` | `12px` | Large radius |
| Radius | `--db-radius-full` | `9999px` | Pill shape |
| Shadow | `--db-shadow-sm` | `0 1px 3px...` | Small shadow |
| Shadow | `--db-shadow` | `0 4px 6px...` | Default shadow |
| Spacing | `--db-space-4` | `16px` | Default spacing |
| Typography | `--db-text-base` | `14px` | Base font size |
| Typography | `--db-font-sans` | `-apple-system...` | Font family |

### Component Classes (designbyte.css)

| Class | Description |
|-------|-------------|
| `.db-page` | Page container with max-width and padding |
| `.db-page-header` | Page header section |
| `.db-page-title` | Page title |
| `.db-page-subtitle` | Page subtitle |
| `.db-card` | Card with border, shadow, radius |
| `.db-card-header` | Card header with border-bottom |
| `.db-card-title` | Card title |
| `.db-card-body` | Card body with padding |
| `.db-card-footer` | Card footer with border-top |
| `.db-kpi` | KPI metric card |
| `.db-kpi-label` | KPI label |
| `.db-kpi-value` | KPI value (large text) |
| `.db-kpi-change` | KPI change indicator |
| `.db-toolbar` | Toolbar with flex layout |
| `.db-toolbar-group` | Toolbar button group |
| `.db-tag` | Pill-shaped tag |
| `.db-tag--primary` | Primary colored tag |
| `.db-tag--success` | Success colored tag |
| `.db-tag--warning` | Warning colored tag |
| `.db-tag--error` | Error colored tag |
| `.db-alert` | Alert with low-saturation colors |
| `.db-alert--info` | Info alert |
| `.db-alert--success` | Success alert |
| `.db-alert--warning` | Warning alert |
| `.db-alert--error` | Error alert |
| `.db-chat` | Chat interface container |
| `.db-chat-header` | Chat header |
| `.db-chat-messages` | Chat messages area |
| `.db-chat-input-area` | Chat input area |
| `.db-chat-input` | Chat input wrapper |
| `.db-chat-bubble` | Chat message bubble |
| `.db-chat-bubble--ai` | AI message bubble |
| `.db-markdown` | Markdown content styles |
| `.db-divider` | Horizontal divider |
| `.db-empty` | Empty state |
| `.db-empty-icon` | Empty state icon |
| `.db-empty-title` | Empty state title |
| `.db-empty-description` | Empty state description |
| `.db-pill` | Quick action pill button |
| `.db-pill--active` | Active pill button |
| `.db-table-wrapper` | Table wrapper with border |
| `.db-section-header` | Section header |
| `.db-section-title` | Section title |
| `.db-section-subtitle` | Section subtitle |

### AntD Theme Tokens (antdTheme.ts)

The `antdTheme` object is passed to `<ConfigProvider theme={antdTheme}>` in App.tsx.

#### Global Tokens

| Token | Value | Description |
|-------|-------|-------------|
| `colorPrimary` | `#2563eb` | Primary blue |
| `colorBgLayout` | `#f8fafc` | Page background |
| `colorBgContainer` | `#ffffff` | Card background |
| `colorText` | `#0f172a` | Primary text |
| `colorTextSecondary` | `#475569` | Secondary text |
| `colorBorder` | `#e2e8f0` | Default border |
| `borderRadius` | `8` | Default radius |
| `fontSize` | `14` | Base font size |

#### Component Tokens

| Component | Token | Value | Description |
|-----------|-------|-------|-------------|
| Layout | `siderBg` | `#0f172a` | Dark sidebar |
| Menu | `darkItemBg` | `#0f172a` | Dark menu background |
| Card | `borderRadiusLG` | `12` | Card radius |
| Button | `borderRadius` | `8` | Button radius |
| Table | `headerBg` | `#f8fafc` | Table header background |
| Input | `borderRadius` | `8` | Input radius |
| Alert | `borderRadiusLG` | `10` | Alert radius |
| Tag | `borderRadiusSM` | `9999` | Pill shape |
| Tabs | `inkBarColor` | `#2563eb` | Tab indicator color |
| Segmented | `trackBg` | `#f1f5f9` | Segmented background |
| Collapse | `borderRadiusLG` | `10` | Collapse radius |
| Tooltip | `colorBgSpotlight` | `#0f172a` | Tooltip background |
| Slider | `trackBg` | `#2563eb` | Slider track color |

## Page Implementations

### /copilot (AI Data Copilot)

**Components Updated**:
- `CopilotChat.tsx` — Uses designbyte classes
- `CopilotMessage.tsx` — Uses react-markdown for rendering

**Classes Used**:
- `.db-chat` — Main container
- `.db-chat-header` — Top bar
- `.db-chat-messages` — Message area
- `.db-chat-input-area` — Input area
- `.db-chat-input` — Input wrapper
- `.db-chat-bubble` — Message bubble
- `.db-empty` — Empty state
- `.db-pill` — Quick action buttons

**Features**:
- Markdown rendering (headings, bold, lists, code)
- F-A-I-R badges with color coding
- Quality hints (collapsible warnings)
- Recommendation block with human confirmation notice

### /operations (Daily Operations Workbench)

**Current State**: Uses AntD Card + inline styles with MetricCard/SectionCard components.

**Future Enhancement**: Can integrate designbyte classes for KPI cards, toolbar, and section headers.

### /scenario (Scenario Planning)

**Current State**: Uses AntD Card + Slider with inline styles.

**Future Enhancement**: Can integrate designbyte classes for controls, comparison cards, and alerts.

### /results (Calculation Results)

**Current State**: Uses AntD Table + Tabs with inline styles.

**Future Enhancement**: Can integrate designbyte classes for summary cards, chart wrappers, and tables.

## Responsive Design

The designbyte.css includes responsive breakpoints:

```css
@media (max-width: 768px) {
  .db-page { padding: 16px; }
  .db-card-header { padding: 12px 16px; }
  .db-card-body { padding: 16px; }
  .db-kpi-value { font-size: 20px; }
  .db-toolbar { flex-direction: column; }
}

@media (max-width: 480px) {
  .db-page { padding: 12px; }
  .db-page-title { font-size: 18px; }
  .db-kpi-value { font-size: 18px; }
}
```

## Evidence of Implementation

### 1. main.tsx Import

```typescript
import './index.css'
import './styles/designbyte.css'  // ← v1.53 added
```

### 2. ConfigProvider Theme

```typescript
import { antdTheme } from './theme/antdTheme';

<ConfigProvider theme={antdTheme}>
  {/* App content */}
</ConfigProvider>
```

### 3. dist CSS Bundle

The built CSS bundle (`dist/assets/index-*.css`) contains all `--db-*` custom properties.

### 4. Component Usage

```tsx
// CopilotChat.tsx
<div className="db-chat">
  <div className="db-chat-header">...</div>
  <div className="db-chat-messages">...</div>
  <div className="db-chat-input-area">...</div>
</div>
```

## Screenshots

Screenshots should be saved to `docs/qa/screenshots/v1-53/`:

1. `copilot-desktop.png` — Desktop view of /copilot page
2. `copilot-mobile-375.png` — Mobile view (375px width)
3. `operations-desktop.png` — Desktop view of /operations page
4. `operations-mobile-375.png` — Mobile view (375px width)
5. `scenario-desktop.png` — Desktop view of /scenario page
6. `results-desktop.png` — Desktop view of /results page

## Migration Notes

### From v1.52.4 to v1.53.0

1. **New Files**:
   - `src/styles/designbyte.css` — CSS custom properties and component classes
   - `docs/design-system/V1_53_TWEAKCN_DESIGNBYTE_IMPLEMENTATION.md` — This document

2. **Modified Files**:
   - `src/main.tsx` — Added designbyte.css import
   - `src/theme/antdTheme.ts` — Expanded component tokens
   - `src/components/copilot/CopilotChat.tsx` — Uses designbyte classes
   - `src/App.tsx` — Version updated to v1.53.0
   - `src/services/snapshotService.ts` — Version updated to v1.53.0
   - `package.json` — Version updated to v1.53.0

3. **Breaking Changes**: None. All changes are additive.

4. **Dependencies**: No new dependencies added (react-markdown and remark-gfm were added in v1.52.4).

## Future Enhancements

1. **Operations Page**: Integrate designbyte classes for KPI cards and toolbar
2. **Scenario Page**: Integrate designbyte classes for controls and comparison cards
3. **Results Page**: Integrate designbyte classes for summary cards and tables
4. **Dark Mode**: Add dark mode support using CSS custom properties
5. **Animation**: Add transition animations for interactive elements
