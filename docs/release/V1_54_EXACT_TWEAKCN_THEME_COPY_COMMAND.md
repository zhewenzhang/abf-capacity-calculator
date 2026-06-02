# v1.54 Exact tweakcn Theme Copy + Product UI Adaptation Command

## Mission

Implement the exact visual direction from this tweakcn theme across the ABF Capacity Calculator:

https://tweakcn.com/editor/theme

Theme reference supplied by the user:

- Primary background: `oklch(0.9940 0 0)`
- Foreground: `oklch(0 0 0)`
- Card: `oklch(0.9940 0 0)`
- Primary/mint: `oklch(0.8545 0.1675 159.6564)`
- Secondary: `oklch(0.9933 0.0011 197.1390)`
- Accent: `oklch(0.9947 0.0074 164.9465)`
- Border: `oklch(0.9722 0.0034 247.8581)`
- Input: `oklch(0.9401 0 0)`
- Radius: `1.4rem`
- Fonts:
  - Sans: `Plus Jakarta Sans`
  - Serif: `Lora`
  - Mono: `IBM Plex Mono`

This is not a generic UI polish task. It is a faithful design-system migration from tweakcn/shadcn-style tokens into the current React + Vite + Ant Design application.

## Core Problem To Fix

Previous attempts failed because they:

1. Added token names but did not truly change the visual system.
2. Kept the old dark AntD sidebar dominant.
3. Kept old blue-heavy colors instead of the mint/black/white tweakcn palette.
4. Did not use the supplied font system.
5. Did not transform layout composition.
6. Did not produce authenticated screenshots proving the final UI.

This task must fix those failures.

## Non-Negotiable Outcome

After this task, the app should visually feel like the screenshot:

- White/off-white page.
- Black primary typography.
- Mint green accent.
- Big rounded cards.
- Thin pale borders.
- Very light shadows.
- Top horizontal navigation.
- Spacious card dashboard composition.
- Inputs and buttons with pill-like radius.
- Charts and status accents use mint green.
- No dominant dark sidebar.

## Hard Constraints

1. Do not modify `firestore.rules`.
2. Do not modify `frontend/src/core/calculationEngine.ts`.
3. Do not modify business formulas.
4. Do not modify Firestore schema.
5. Do not write API keys anywhere.
6. Preserve Firebase Functions DeepSeek proxy.
7. Preserve Viewer read-only behavior.
8. Do not add Tailwind or shadcn.
9. Do not convert the app to Next.js.
10. Do not use `next/font`; this is a Vite app.
11. Use AntD theme tokens + CSS variables + local React components.
12. Windows PowerShell compatible commands only.
13. No watch or long-running foreground process.

## Required Command Log

Create and continuously update:

```text
docs/release/V1_54_EXACT_TWEAKCN_THEME_COPY_COMMAND_LOG.md
```

The log must record:

1. Branch.
2. Current commit.
3. Commands run.
4. Files changed.
5. Screenshot paths.
6. Test/lint/build results.
7. Any blockers.

## Branch

Create:

```text
xiaomi/v1-54-exact-tweakcn-theme-copy
```

Do not merge AGY branches.

## Theme Token Migration

Create:

```text
frontend/src/styles/tweakcnTheme.css
frontend/src/theme/tweakcnAntdTheme.ts
```

Then import in:

```text
frontend/src/main.tsx
```

Expected:

```ts
import './styles/tweakcnTheme.css';
```

And use in `App.tsx`:

```tsx
<ConfigProvider theme={tweakcnAntdTheme}>
```

## Exact CSS Tokens

Use the user-provided tweakcn tokens as the source of truth.

Add the following theme layer in `tweakcnTheme.css`:

```css
:root {
  --background: oklch(0.9940 0 0);
  --foreground: oklch(0 0 0);
  --card: oklch(0.9940 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(0.9911 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.8545 0.1675 159.6564);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.9933 0.0011 197.1390);
  --secondary-foreground: oklch(0.1344 0 0);
  --muted: oklch(0.9702 0 0);
  --muted-foreground: oklch(0.4386 0 0);
  --accent: oklch(0.9947 0.0074 164.9465);
  --accent-foreground: oklch(0.6184 0.1489 155.4444);
  --destructive: oklch(0.6665 0.2111 2.8306);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9722 0.0034 247.8581);
  --input: oklch(0.9401 0 0);
  --ring: oklch(0.8545 0.1675 159.6564);
  --chart-1: oklch(0.8545 0.1675 159.6564);
  --chart-2: oklch(0.8979 0.1884 146.5522);
  --chart-3: oklch(0.6658 0.2215 29.2981);
  --chart-4: oklch(0.7507 0.1401 230.8266);
  --chart-5: oklch(0.8257 0.1067 48.5116);
  --sidebar: oklch(1.0000 0 0);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0 0 0);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9752 0.0307 168.3924);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(0.9401 0 0);
  --sidebar-ring: oklch(0 0 0);
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-serif: 'Lora', serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --radius: 1.4rem;
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --spacing: 0.27rem;
}
```

Also define app-friendly aliases:

```css
:root {
  --twk-bg: var(--background);
  --twk-fg: var(--foreground);
  --twk-card: var(--card);
  --twk-border: var(--border);
  --twk-muted: var(--muted);
  --twk-muted-fg: var(--muted-foreground);
  --twk-primary: var(--primary);
  --twk-radius: var(--radius);
}
```

## Font Implementation In Vite

Do not use this Next.js code directly:

```ts
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
```

Instead, use one of these Vite-compatible options:

### Preferred simple option

Add Google Fonts import at the top of `tweakcnTheme.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
```

Then:

```css
body {
  font-family: var(--font-sans);
}

.twk-serif {
  font-family: var(--font-serif);
}

code,
pre,
.twk-mono {
  font-family: var(--font-mono);
}
```

## App Shell Rework

The current dark sidebar is not compatible with the reference screenshot.

Replace the dominant dark sidebar with:

1. Light top navigation.
2. Brand on the left.
3. Main nav as horizontal pill/tab items.
4. Workspace, role, UID, language, currency, email, logout on the right.
5. On smaller screens, collapse nav into a drawer or compact menu.

Required classes:

```text
twk-shell
twk-topbar
twk-brand
twk-brand-title
twk-brand-subtitle
twk-nav
twk-nav-item
twk-nav-item-active
twk-userbar
twk-main
twk-page
```

Visual rules:

1. Background must be white/off-white, not navy.
2. Active nav uses white pill or mint accent, not blue rectangle.
3. Header height should be around 64px.
4. Nav text should be black/slate, not muted blue-gray.
5. Controls should have rounded pill look.

## Components To Build

Create thin UI wrappers:

```text
frontend/src/components/ui/TwkPage.tsx
frontend/src/components/ui/TwkCard.tsx
frontend/src/components/ui/TwkKpiCard.tsx
frontend/src/components/ui/TwkToolbar.tsx
frontend/src/components/ui/TwkStatusPill.tsx
frontend/src/components/ui/TwkTableShell.tsx
```

These wrappers should only handle layout/styling. Do not move business logic into them.

## AntD Theme Mapping

In `tweakcnAntdTheme.ts`, map:

```ts
token: {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  colorPrimary: 'oklch(0.8545 0.1675 159.6564)',
  colorText: 'oklch(0 0 0)',
  colorBgBase: 'oklch(0.9940 0 0)',
  colorBgContainer: 'oklch(0.9940 0 0)',
  colorBorder: 'oklch(0.9722 0.0034 247.8581)',
  borderRadius: 22,
  borderRadiusLG: 24,
  borderRadiusSM: 16,
}
```

Configure component tokens for:

1. Button
2. Card
3. Menu
4. Layout
5. Table
6. Input
7. Select
8. Segmented
9. Tabs
10. Modal
11. Drawer
12. Alert
13. Tag
14. Tooltip
15. Collapse
16. Slider

## Page-Level UX Requirements

### Operations

Must look like a card dashboard, not an enterprise table page.

Required:

1. Pipeline Readiness as big cards.
2. KPI cards similar to Total Revenue / Subscription cards in screenshot.
3. Use mint accent for ready/good state.
4. Use black bold numbers.
5. Problem Summary as rounded card.
6. AI Intelligence as insight cards.
7. Scenario shortcuts as pill actions.

### Copilot

Required:

1. Chat canvas in large rounded white panel.
2. Message card style should match the card system.
3. Quick actions as pill buttons.
4. Mint accent on active provider/healthy state.
5. Markdown and F-A-I-R badges preserved.

### Results

Required:

1. Revenue and BP KPI cards should visually resemble screenshot revenue cards.
2. Use black bold metric numbers.
3. Charts use mint green first.
4. Tables sit inside rounded `TwkTableShell`.

### Scenario

Required:

1. Scenario controls in large rounded card.
2. Sliders use mint accent.
3. Comparison results in card grid.
4. Export/action area uses pill buttons.

### Data Pages

Products, Forecasts, Capacity, Parameters, BP Targets:

1. Use TwkPage.
2. Use TwkToolbar.
3. Tables have rounded shell.
4. Buttons and filters use pill controls.
5. Forms use large radius inputs.

## Chart Color Mapping

All charts should use:

1. `--chart-1` mint primary.
2. `--chart-2` green secondary.
3. `--chart-4` blue only as secondary comparison.
4. Avoid default AntD blue as dominant.

## Browser QA Required

Screenshots are mandatory.

Save to:

```text
docs/qa/screenshots/v1-54-exact/
```

Required screenshots:

1. `operations-desktop.png`
2. `operations-mobile-375.png`
3. `copilot-desktop.png`
4. `results-desktop.png`
5. `scenario-desktop.png`
6. `products-desktop.png`
7. `dashboard-desktop.png`

Screenshots must show real authenticated app pages, not the login page.

If authenticated browser state is missing, stop and ask the user. Do not claim complete.

## Visual Acceptance Gate

The final UI must satisfy:

1. It visibly resembles the tweakcn screenshot.
2. Dominant dark sidebar is gone or no longer dominant.
3. Primary accent is mint green, not old blue.
4. Cards have large radius.
5. Page density is reduced.
6. Typography uses Plus Jakarta Sans.
7. Top navigation resembles the reference.
8. Buttons and inputs have pill/large radius styling.
9. At least 7 pages visibly changed.
10. Mobile 375px has no horizontal overflow.

## Tests

Run:

```powershell
cd frontend
npm run test
npm run lint -- --quiet
npm run build
```

If functions are touched:

```powershell
cd ../functions
npm run build
```

Red line checks:

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
```

Secret scan:

```powershell
Select-String -Path frontend\src\**\*.ts,frontend\src\**\*.tsx,functions\src\**\*.ts,docs\**\*.md -Pattern "sk-|DEEPSEEK_API_KEY=|Authorization: Bearer sk" -ErrorAction SilentlyContinue
```

## Version

Sync version to:

```text
v1.54.0
```

Update:

1. `frontend/package.json`
2. `frontend/package-lock.json`
3. `frontend/src/App.tsx`
4. `frontend/src/services/snapshotService.ts`
5. `README.md`

If functions touched:

1. `functions/package.json`
2. `functions/package-lock.json`
3. `functions/src/index.ts` health version

## Commit

Commit:

```text
feat: implement exact tweakcn theme sitewide v1.54.0
```

Push:

```text
origin/xiaomi/v1-54-exact-tweakcn-theme-copy
```

## Final Report Required

Must include:

1. Start/end/total time.
2. Whether Agent Team / Cursor agents were used.
3. Exact theme token mapping.
4. Font implementation proof.
5. App shell before/after summary.
6. Page-by-page changes.
7. Screenshot paths.
8. Confirmation screenshots are authenticated app pages.
9. Test/lint/build results.
10. Secret scan result.
11. Red line files unchanged.
12. Whether the final UI resembles the tweakcn screenshot.
13. Whether it is ready for AGY review.

## Completion Rule

Do not mark complete unless:

1. Screenshots exist and are real app pages.
2. Top navigation / shell is visibly changed.
3. Mint green is the dominant accent.
4. The old dark sidebar is no longer dominant.
5. At least 7 pages are visibly converted.
6. Test/lint/build pass.
