# v1.54 tweakcn Full Site UI Rework Command

## Goal

Rework the whole ABF Capacity Calculator UI to match the referenced tweakcn `designbyte` theme style:

https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh

This is a full-site visual system implementation, not a token-only change.

## What The Target UI Looks Like

The referenced tweakcn theme uses:

1. Very light page background.
2. White rounded cards with thin borders.
3. Large card radius, around 24px on dashboard cards.
4. Generous spacing and low-density layout.
5. Strong black/slate typography.
6. Minimal visual noise.
7. Green/mint accent for active states and charts.
8. Top horizontal navigation, not a heavy dark sidebar-first layout.
9. Dashboard/cards layout with large breathing room.
10. Subtle borders and almost no heavy shadows.
11. Clean pill tabs and small icon buttons.

## Current Product Gap

The current app still feels like Ant Design enterprise default:

1. Heavy dark sidebar.
2. Dense menu items.
3. Many nested panels/cards.
4. Small dashboard cards.
5. Sparse token changes but not enough page composition change.
6. Some pages have `db-*` classes, but not enough visual transformation.

## Important Product Decision

To make the whole app look like the target, the shell must change.

The target style is horizontal top-nav + large card canvas. The current app is dark left-sidebar navigation. Therefore this task should implement a new `tweakcn` shell:

- Light top app bar.
- Left sidebar becomes either:
  - a slim light rail, or
  - a collapsible secondary navigation.
- Main content max-width should be wider and centered where appropriate.
- Page sections should use large rounded cards.

Do not merely recolor the current dark sidebar.

## Scope

Apply the new UI system to:

1. Global app shell.
2. Navigation.
3. Workspace/language/currency controls.
4. `/operations`
5. `/dashboard`
6. `/products`
7. `/forecasts`
8. `/capacity`
9. `/parameters`
10. `/bp-targets`
11. `/results`
12. `/scenario`
13. `/copilot`

If a page cannot be deeply reworked in one pass, it must still receive the new shell, typography, card, table, button, alert, and spacing system.

## Hard Constraints

1. Do not modify `firestore.rules`.
2. Do not modify `frontend/src/core/calculationEngine.ts`.
3. Do not modify business formulas.
4. Do not modify Firestore schema.
5. Do not write API keys anywhere.
6. Preserve Firebase Functions DeepSeek proxy.
7. Preserve Viewer read-only behavior.
8. Do not add Tailwind or shadcn.
9. Do not add a large new UI framework.
10. Use AntD + CSS variables + small local components.
11. Windows PowerShell compatible commands only.
12. No watch or long-running foreground commands except a preview server started for QA.

## Required Command Log

Create and continuously update:

```text
docs/release/V1_54_TWEAKCN_FULL_SITE_UI_REWORK_COMMAND_LOG.md
```

## Recommended Architecture

### 1. Theme Tokens

Create or replace:

```text
frontend/src/styles/tweakcnTheme.css
frontend/src/theme/tweakcnAntdTheme.ts
```

The existing `designbyte.css` can be kept only if it is renamed or adapted. The final naming should make the target explicit.

Core tokens:

```css
:root {
  --twk-bg: #fafafa;
  --twk-surface: #ffffff;
  --twk-surface-muted: #f7f7f7;
  --twk-border: #eeeeee;
  --twk-border-strong: #e4e4e7;
  --twk-text: #09090b;
  --twk-muted: #71717a;
  --twk-subtle: #a1a1aa;
  --twk-accent: #4ade80;
  --twk-accent-strong: #22c55e;
  --twk-accent-soft: #dcfce7;
  --twk-radius-card: 24px;
  --twk-radius-control: 999px;
  --twk-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04);
}
```

Adjust exact values by checking the final screenshot.

### 2. App Shell

Refactor `frontend/src/App.tsx` into a shell closer to the target:

- Top horizontal app nav.
- Light background.
- Current workspace selector, role tag, UID, language, currency, email, logout remain in the top bar.
- Main navigation should become top tabs or a light rail.
- Avoid dark sidebar as the dominant visual.

Suggested classes:

```text
twk-shell
twk-topbar
twk-brand
twk-nav-tabs
twk-nav-item
twk-nav-item-active
twk-userbar
twk-main
twk-page
```

### 3. Shared Components

Create reusable presentational wrappers:

```text
frontend/src/components/ui/TwkPage.tsx
frontend/src/components/ui/TwkCard.tsx
frontend/src/components/ui/TwkKpiCard.tsx
frontend/src/components/ui/TwkSection.tsx
frontend/src/components/ui/TwkToolbar.tsx
```

Do not over-abstract business logic. These should be thin styling wrappers only.

### 4. Page Composition

Every major page should use:

- `TwkPage`
- large rounded cards
- consistent top section title
- consistent toolbar
- consistent table wrapper
- consistent empty/error states

## Page-Specific Requirements

### `/operations`

Target: similar to the screenshot's Cards/Dashboard layout.

Required:

1. Pipeline Readiness as large rounded card group.
2. Readiness cards equal height.
3. Issue Summary as clean card.
4. AI Intelligence cards should look like dashboard insight cards.
5. Look-ahead table in rounded card.
6. Scenario shortcuts as pill actions.
7. No duplicate page title.

### `/copilot`

Target: Claude/Gemini-like chat inside tweakcn card system.

Required:

1. Full-width clean chat canvas.
2. Large rounded message cards.
3. Markdown readable.
4. F-A-I-R badges preserved.
5. Quality warnings collapsed and quiet.
6. Quick action pills use mint/green accent.

### `/results`

Required:

1. KPI cards look like tweakcn revenue cards.
2. Charts inside large rounded cards.
3. Tables inside light bordered containers.
4. AI export / report actions in clean toolbar.

### `/scenario`

Required:

1. Controls inside large rounded card.
2. Sliders and segmented controls styled consistently.
3. Scenario comparison as grid cards.
4. Export area styled as secondary action panel.

### Data Entry Pages

For products, forecasts, capacity, parameters, BP targets:

1. Replace dense AntD default page look with `TwkPage` + `TwkCard`.
2. Toolbar controls become pill buttons / clean icon buttons.
3. Tables get lighter headers, larger row spacing, rounded outer container.
4. Forms get rounded inputs and clear label spacing.

## Browser QA Required

You must produce screenshots. Without screenshots, this task is not complete.

Use one of:

1. `agent-browser`
2. browser tooling available in Cursor
3. Playwright if already available
4. A user-provided authenticated Chrome profile

Screenshots:

```text
docs/qa/screenshots/v1-54/operations-desktop.png
docs/qa/screenshots/v1-54/operations-mobile-375.png
docs/qa/screenshots/v1-54/copilot-desktop.png
docs/qa/screenshots/v1-54/results-desktop.png
docs/qa/screenshots/v1-54/scenario-desktop.png
docs/qa/screenshots/v1-54/products-desktop.png
```

Screenshots must show real business pages, not the login page.

If authenticated state is missing, stop and ask for it. Do not claim completion.

## Visual Acceptance Criteria

The result must visibly match the reference:

1. Light global shell.
2. No dominant dark sidebar.
3. Cards have large radius and thin borders.
4. Green/mint accent appears in active states and selected metrics.
5. Navigation resembles clean top tabs or light pill navigation.
6. Typography is larger, calmer, less dense.
7. Main pages feel like a modern SaaS dashboard, not default AntD.
8. Mobile 375px has no horizontal overflow.
9. No text overlap.
10. No nested card clutter.

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

Also run:

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
```

Secret scan:

```powershell
Select-String -Path frontend\src\**\*.ts,frontend\src\**\*.tsx,functions\src\**\*.ts,docs\**\*.md -Pattern "sk-|DEEPSEEK_API_KEY=|Authorization: Bearer sk" -ErrorAction SilentlyContinue
```

## Version

Sync to:

```text
v1.54.0
```

Files:

```text
frontend/package.json
frontend/package-lock.json
frontend/src/App.tsx
frontend/src/services/snapshotService.ts
README.md
```

If functions are touched, also sync:

```text
functions/package.json
functions/package-lock.json
functions/src/index.ts health version
```

## Commit

Commit:

```text
feat: rework full site with tweakcn UI system v1.54.0
```

Push:

```text
origin/xiaomi/v1-54-tweakcn-full-site-ui-rework
```

## Final Report

Must include:

1. Start time / end time / total duration.
2. Whether Agent Team / Cursor agents were used.
3. Files changed.
4. App shell changes.
5. Token mapping.
6. Page-by-page changes.
7. Screenshot paths.
8. Whether screenshots are authenticated real app pages.
9. Test/lint/build results.
10. Secret boundary result.
11. Red-line files unchanged.
12. Whether it visually matches the tweakcn reference.
13. Whether it is ready for AGY review.
14. Whether it is ready to merge/deploy.

## Completion Rule

Do not mark complete unless:

1. Real screenshots exist.
2. Shell is visibly changed.
3. Dark sidebar is no longer the dominant UI.
4. At least 6 key pages are visibly converted.
5. Test/lint/build pass.
