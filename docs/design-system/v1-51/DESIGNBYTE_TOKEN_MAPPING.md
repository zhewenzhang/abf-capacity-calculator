# Designbyte Token Mapping

**版本**: v1.51
**日期**: 2026-05-29

---

## Token Mapping 概述

将 tweakcn designbyte theme 的视觉特征映射到 ABF 现有 CSS token 系统。

---

## CSS Variables 定义

```css
:root {
  /* Background */
  --abf-bg-primary: #ffffff;
  --abf-bg-secondary: #f8fafc;
  --abf-bg-muted: #f1f5f9;

  /* Foreground */
  --abf-text-primary: #0f172a;
  --abf-text-secondary: #64748b;
  --abf-text-muted: #94a3b8;

  /* Border */
  --abf-border: #e2e8f0;
  --abf-border-hover: #cbd5e1;

  /* Primary (Blue) */
  --abf-primary: #2563eb;
  --abf-primary-hover: #1d4ed8;
  --abf-primary-foreground: #ffffff;

  /* Accent (Violet) */
  --abf-accent: #7c3aed;
  --abf-accent-hover: #6d28d9;
  --abf-accent-foreground: #ffffff;

  /* Status */
  --abf-success: #16a34a;
  --abf-success-light: #f0fdf4;
  --abf-warning: #d97706;
  --abf-warning-light: #fffbeb;
  --abf-error: #dc2626;
  --abf-error-light: #fef2f2;

  /* Radius */
  --abf-radius-sm: 0.25rem;
  --abf-radius-md: 0.375rem;
  --abf-radius-lg: 0.5rem;
  --abf-radius-xl: 0.75rem;

  /* Shadow */
  --abf-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --abf-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --abf-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --abf-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Spacing */
  --abf-spacing-xs: 0.25rem;
  --abf-spacing-sm: 0.5rem;
  --abf-spacing-md: 1rem;
  --abf-spacing-lg: 1.5rem;
  --abf-spacing-xl: 2rem;
}
```

---

## AntD Override 规则

### Card

```css
.ant-card {
  border-radius: var(--abf-radius-lg) !important;
  border-color: var(--abf-border) !important;
  box-shadow: var(--abf-shadow-sm) !important;
}
```

### Button

```css
.ant-btn-primary {
  background: var(--abf-primary) !important;
  border-color: var(--abf-primary) !important;
}

.ant-btn-primary:hover {
  background: var(--abf-primary-hover) !important;
  border-color: var(--abf-primary-hover) !important;
}
```

### Alert

```css
.ant-alert-success {
  background: var(--abf-success-light) !important;
  border-color: var(--abf-success) !important;
}

.ant-alert-warning {
  background: var(--abf-warning-light) !important;
  border-color: var(--abf-warning) !important;
}

.ant-alert-error {
  background: var(--abf-error-light) !important;
  border-color: var(--abf-error) !important;
}
```

### Table

```css
.ant-table-thead > tr > th {
  background: var(--abf-bg-muted) !important;
  color: var(--abf-text-secondary) !important;
}
```

---

## 设计原则

1. **不引入 Tailwind** — 使用 CSS custom properties
2. **不引入 shadcn/ui** — 保持 Ant Design
3. **渐进式** — 优先应用于新组件
4. **可回退** — 所有 override 使用 !important，便于移除
5. **一致性** — 统一使用 designbyte tokens

---

**报告生成时间**: 2026-05-29
**维护者**: Token Mapping / CSS Agent
