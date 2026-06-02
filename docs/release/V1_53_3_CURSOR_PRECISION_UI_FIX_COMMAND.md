# v1.53.3 Cursor Precision UI Fix Command

## Purpose

Fix the exact UI issues marked by the user in the Daily Operations Workbench screenshot.

This task is intentionally narrow. Do not redesign the whole app. Do not start new feature work.

## User-Marked Issues From Screenshot

### Issue 1 - Sidebar brand block is cramped and visually overlapping

Location:

- Left sidebar top brand block.
- Current visible text:
  - `ABF 計算`
  - `ABF產能分析平台`

Problem:

- The brand title and subtitle are too close.
- Subtitle visually collides with the title area.
- The red annotation indicates the top logo/brand region is not polished.

Expected:

- Brand area should have clean vertical hierarchy.
- `ABF 計算` should be the main title.
- `ABF產能分析平台` should be a smaller subtitle beneath it.
- No overlap, no cramped baseline, no clipping.
- The whole brand block should align with the Designbyte/tweakcn style.

### Issue 2 - Duplicate page title should be removed

Location:

- Main page area on `/operations`.
- There is a top page title `每日營運工作台`.
- The content header repeats the same `每日營運工作台`.

Problem:

- The user marked the repeated in-content title and wrote `刪掉`.
- The page title appears twice and wastes vertical space.

Expected:

- Keep only one primary `每日營運工作台` title.
- Remove the duplicated content-level title block inside `DailyOperationsWorkbench`.
- Preserve a concise subtitle only if it adds value and does not duplicate the header.
- If the App-level header already provides the page title, the Workbench content should start directly with `Pipeline Readiness`.

### Issue 3 - Pipeline Readiness cards are visually flat and uneven

Location:

- `/operations` > `Pipeline Readiness`.

Problem:

- The readiness cards are arranged in a same-row flat layout.
- The user annotation says: `一樣平行的設計，現在高高低低的。`
- Cards have inconsistent vertical rhythm because some cards have action links, some do not, some status labels sit at different heights.
- It looks like a line of small boxes rather than a polished readiness dashboard.

Expected:

- Readiness cards must use a responsive CSS grid, not a fragile horizontal row.
- All cards should have equal height.
- Icon/status/title/action positions should be consistent.
- Status pill should sit in the same vertical position.
- Action link should reserve space even when absent, or layout should align without jumping.
- At desktop width, cards should form a balanced grid.
- At 375px mobile, cards should stack or use two columns without horizontal overflow.
- Use Designbyte classes and tokens:
  - `db-card`
  - `db-kpi` or a new `db-readiness-card`
  - `db-tag`
  - `db-toolbar` only if needed

### Issue 4 - Visible version is stale

Location:

- Left sidebar bottom.
- Screenshot shows `v1.52.0`.

Problem:

- Current work is v1.53.x, but the visible version still appears as `v1.52.0`.

Expected:

- Sync visible version to the intended release version for this branch.
- If this fix is v1.53.3, show `v1.53.3`.
- Also update:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `frontend/src/App.tsx`
  - `frontend/src/services/snapshotService.ts`

## Hard Constraints

1. Do not modify `firestore.rules`.
2. Do not modify `frontend/src/core/calculationEngine.ts`.
3. Do not modify business formulas.
4. Do not modify Firebase Functions or DeepSeek API key handling unless needed for version sync.
5. Do not write API keys anywhere.
6. Preserve Viewer read-only.
7. Use Windows PowerShell compatible commands.
8. Do not use watch or long-running foreground processes except a local preview server started in a hidden/background process for screenshot QA.
9. Keep the scope narrow to the screenshot-marked UI issues.

## Required Files To Inspect

- `frontend/src/App.tsx`
- `frontend/src/pages/DailyOperationsWorkbench.tsx`
- `frontend/src/styles/designbyte.css`
- `frontend/src/theme/antdTheme.ts`
- `frontend/src/services/snapshotService.ts`
- `frontend/package.json`
- `frontend/package-lock.json`

## Implementation Guidance

### Sidebar brand

Find the sidebar brand block in `App.tsx`.

Apply a more stable structure, for example:

```tsx
<div className="db-sidebar-brand">
  <div className="db-sidebar-brand-title">ABF 計算</div>
  <div className="db-sidebar-brand-subtitle">ABF產能分析平台</div>
</div>
```

Add CSS in `designbyte.css`:

```css
.db-sidebar-brand {
  padding: 20px 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.db-sidebar-brand-title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  color: #ffffff;
  letter-spacing: 0;
}

.db-sidebar-brand-subtitle {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.72);
  white-space: normal;
}
```

Adjust exact values based on current sidebar width.

### Remove duplicated Operations content title

In `DailyOperationsWorkbench.tsx`, remove or hide the duplicate `db-page-header` section if the global app header already shows `每日營運工作台`.

Do not remove the real route title in the top app layout.

### Readiness grid

In `DailyOperationsWorkbench.tsx`, refactor the `Pipeline Readiness` card area into a stable grid.

Recommended CSS:

```css
.db-readiness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.db-readiness-card {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px;
  border: 1px solid var(--db-border);
  border-radius: var(--db-radius-lg);
  background: var(--db-bg-card);
  box-shadow: var(--db-shadow-xs);
}

.db-readiness-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.db-readiness-title {
  margin-top: 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--db-text-primary);
}

.db-readiness-footer {
  min-height: 24px;
  display: flex;
  align-items: center;
}
```

The final design should avoid the high-low visual effect.

## Browser QA Requirement

Use `agent-browser` if available.

Minimum screenshots:

- `docs/qa/screenshots/v1-53-3/operations-desktop.png`
- `docs/qa/screenshots/v1-53-3/operations-mobile-375.png`

Screenshot rules:

1. Screenshot must show the actual `/operations` page, not the login page.
2. If authenticated state is unavailable, stop and report:
   `Blocked by missing authenticated browser state`.
3. Do not claim visual QA is complete without real screenshots.

## Verification Commands

Run:

```powershell
cd frontend
npm run test
npm run lint -- --quiet
npm run build
```

Then:

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
```

Secret grep:

```powershell
Select-String -Path frontend\src\**\*.ts,frontend\src\**\*.tsx,docs\**\*.md -Pattern "sk-|DEEPSEEK_API_KEY=|Authorization: Bearer sk" -ErrorAction SilentlyContinue
```

## Commit

Commit message:

```text
fix: refine operations UI precision issues v1.53.3
```

Push branch:

```text
origin/xiaomi/v1-53-product-ui-system-marathon
```

## Final Report Must Include

1. Whether the sidebar brand overlap is fixed.
2. Whether the duplicate Operations title is removed.
3. Whether Pipeline Readiness cards now align consistently.
4. Whether the visible version is synced.
5. Screenshot paths.
6. Test/lint/build results.
7. Secret boundary result.
8. Whether `firestore.rules` and `calculationEngine.ts` are untouched.
9. Commit hash and push status.
