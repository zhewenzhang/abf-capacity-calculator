# v1.54.1 Topbar Cleanup Command

## Goal

Clean up the top navigation bar according to the user's latest UI direction.

This is a narrow navigation refinement task, not a full UI redesign.

## User Requirements

1. Keep visible version `v1.54.0` in the web navigation bar for now.
2. Change the product title from `ABF 計算` to:

```text
ABF CSS
```

3. Move these items out of the always-visible topbar and into the user menu:
   - `owner`
   - `UID`
   - data/workspace selector, such as `ABF20260523`
4. Keep the user menu idea.
5. Reduce wasted topbar space.
6. Do not expand into a full information architecture redesign in this task.

## Current Problem

The current topbar shows too many utility items inline:

- product title
- version
- page navigation
- workspace selector
- owner role
- UID button
- language switch
- currency switch
- full email
- logout

This causes the functional navigation to run out of space and display incompletely.

## Target Topbar Shape

Desktop topbar should be closer to:

```text
ABF CSS   v1.54.0   工作台  儀表板  產品  預測  產能...       繁中  TWD  [User Menu]
```

User menu should contain:

```text
davezhangus@gmail.com
Workspace: ABF20260523
Role: owner
UID: [copy/show uid]
Currency: USD / TWD / CNY
Language: EN / 繁中
Version: v1.54.0
Logout
```

If language/currency remain visible in the topbar, they should be compact. The most important required change is moving workspace/owner/UID into the user menu.

## Hard Constraints

1. Do not modify `firestore.rules`.
2. Do not modify `frontend/src/core/calculationEngine.ts`.
3. Do not modify business formulas.
4. Do not modify Firebase Functions or DeepSeek proxy.
5. Do not write API keys anywhere.
6. Preserve Viewer read-only behavior.
7. Keep the scope narrow.
8. Windows PowerShell compatible commands.
9. No watch or long-running foreground command.

## Required Command Log

Create and update:

```text
docs/release/V1_54_1_TOPBAR_CLEANUP_COMMAND_LOG.md
```

Record:

1. Branch.
2. Current commit.
3. Files inspected.
4. Changes made.
5. Test/lint/build results.
6. Screenshot path or authenticated-state blocker.

## Branch

Work on the active v1.54 branch if it exists, otherwise create:

```text
xiaomi/v1-54-1-topbar-cleanup
```

Do not merge any `origin/agy/*` branch.

## Files To Inspect

- `frontend/src/App.tsx`
- `frontend/src/styles/tweakcnTheme.css`
- `frontend/src/styles/designbyte.css` if still used
- `frontend/src/theme/tweakcnAntdTheme.ts` or `antdTheme.ts`
- `frontend/src/i18n/en.ts`
- `frontend/src/i18n/zhTW.ts`

## Implementation Requirements

### 1. Brand title

Change the visible brand title to:

```text
ABF CSS
```

Do not show the old `ABF 計算` title in the topbar.

### 2. Keep version visible

Keep `v1.54.0` visible near the brand title.

Do not move version fully into user menu yet.

### 3. User menu

Create or update a compact user menu in the topbar.

Preferred trigger:

- avatar / initials
- email shortened
- user icon
- dropdown caret

Menu content:

- email
- workspace/data selector `ABF20260523` or current workspace id/name
- role `owner`
- UID item
- language selection
- currency selection
- version info
- logout

### 4. Workspace/data selector

Move the always-visible workspace/data selector from the topbar into the user menu.

It may be shown in the menu as:

```text
Workspace
ABF20260523
```

If switching workspace is supported, preserve the switching behavior inside the menu.

### 5. Owner role

Move visible `owner` role tag into the user menu.

It should not consume topbar horizontal space.

### 6. UID

Move visible `UID` button into the user menu.

Preserve its existing behavior if it copies or reveals UID.

### 7. Language and currency

Recommended:

- Keep compact visible `繁中` and `TWD` pills if space allows.
- Also expose language/currency inside user menu.

Required:

- Do not let language/currency consume excessive width.
- Do not show three currency buttons if it causes nav truncation.

### 8. Responsive behavior

At 1440px:

- All primary nav items should be readable.
- No overlap.

At 1024px:

- Utility controls should collapse before primary nav disappears.

At 375px:

- Use compact menu/drawer behavior.
- No horizontal overflow.

## Suggested AntD Components

Use existing AntD components:

- `Dropdown`
- `Menu`
- `Avatar`
- `Button`
- `Space`
- `Divider`
- `Typography.Text`

Avoid large new dependencies.

## Suggested CSS Classes

Add/update in theme CSS:

```text
twk-brand
twk-brand-title
twk-version-pill
twk-topbar
twk-user-menu-trigger
twk-user-menu-meta
twk-compact-pill
```

## Browser QA

If authenticated browser state is available, capture:

```text
docs/qa/screenshots/v1-54-1/topbar-desktop.png
docs/qa/screenshots/v1-54-1/topbar-mobile-375.png
```

Screenshots must show:

1. `ABF CSS`
2. `v1.54.0`
3. No visible `owner` tag in topbar
4. No visible `UID` button in topbar
5. No visible `ABF20260523` workspace selector in topbar
6. User menu trigger visible
7. Primary nav not cut off

If authenticated state is missing, report:

```text
Blocked by missing authenticated browser state
```

Do not claim Browser QA is complete without real screenshots.

## Verification Commands

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

Secret scan:

```powershell
Select-String -Path frontend\src\**\*.ts,frontend\src\**\*.tsx,functions\src\**\*.ts,docs\**\*.md -Pattern "sk-|DEEPSEEK_API_KEY=|Authorization: Bearer sk" -ErrorAction SilentlyContinue
```

## Commit

Commit:

```text
fix: simplify topbar user controls v1.54.1
```

Push:

```text
origin/xiaomi/v1-54-1-topbar-cleanup
```

If working on the existing v1.54 branch, push that branch instead and report the branch name clearly.

## Final Report Must Include

1. Whether title is changed to `ABF CSS`.
2. Whether `v1.54.0` remains visible.
3. Whether workspace selector moved into user menu.
4. Whether `owner` moved into user menu.
5. Whether `UID` moved into user menu.
6. Whether primary nav has more usable room.
7. Screenshot paths or authenticated-state blocker.
8. Test/lint/build results.
9. Secret boundary result.
10. Commit hash and push branch.
