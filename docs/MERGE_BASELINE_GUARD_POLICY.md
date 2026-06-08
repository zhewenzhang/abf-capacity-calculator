# Merge Baseline Guard Policy

## Problem

As of June 2026, ALL feature branches (v1.58.6 through v1.61.2) were pushed to remote but **NEVER merged to main**. Each new branch was created from `5ee609c` (the original v1.58.0 baseline on main), losing all previous work. This caused cascading regressions across 9 consecutive release attempts.

## Root Cause

**Systemic workflow failure:** no enforced policy required feature branches to merge into main before the next branch was created.

## Policy

### 1. Every feature branch MUST merge into main

Before creating a new feature branch:
1. The previous branch must be merged to main (via PR or direct push)
2. The new branch must be created FROM main (not from another feature branch)

### 2. Pre-merge verification

Before merging any branch to main, run:

```bash
cd frontend
npm run lint -- --quiet
npm run build
npm test -- --run
npm run verify:release-baseline
```

All must pass before merge.

### 3. verify:release-baseline checks

This script (`scripts/verify-release-baseline.cjs`) validates that ALL required features are present:

| Check | File | Pattern |
|---|---|---|
| Version ≥ v1.60 | package.json | version >= 1.60.0 |
| Global AI Drawer | App.tsx | CopilotDrawerProvider, CopilotDrawerButton, GlobalCopilotDrawer |
| | components/copilot/CopilotDrawerContext.tsx | CopilotDrawerProvider |
| Risk Brief | pages/CalculationResults.tsx | executiveConclusion, findings, planStatus |
| PageShell Wide Layout | components/layout/PageShell.tsx | PageShell |
| | styles/tweakcnTheme.css | abf-page-shell--wide |
| Operations page | pages/DailyOperationsWorkbench.tsx | PageShell variant="wide" |
| | pages/DailyOperationsWorkbench.tsx | metricsYear, annualRevenue |
| Results page | pages/CalculationResults.tsx | PageShell variant="wide" |
| Parameters page | pages/Parameters.tsx | PageShell variant="standard" |
| AiCopilot | pages/AiCopilot.tsx | PageShell variant="full" |
| BP Simulation | pages/BpTargets.tsx | simActive, handleSaveVersion |
| AI not in PRIMARY_NAV | App.tsx | NOT key: 'copilot' |
| No regressed content | DailyOperationsWorkbench.tsx | NOT 問題摘要, NOT 今日行動建議 |
| i18n parity | zhTW.ts vs en.ts | Key count within tolerance |

### 4. Branch naming convention

```
xiaomi/v<major>.<minor>.<patch>-<short-description>
```

### 5. Version tagging

After merging to main, tag the merge commit:

```bash
git tag v<major>.<minor>.<patch>
git push origin v<major>.<minor>.<patch>
```

### 6. Rollback procedure

If a merge causes issues:
1. `git revert <merge-commit>`
2. Fix the issue
3. Re-merge

## Current Baseline (as of v1.61.2)

- **Baseline commit on main:** `5ee609c` (needs update)
- **All features combined in:** `xiaomi/v1-61-2-page-width-regression-repair` (6 commits ahead of main)
- **Required actions:**
  1. Merge v1.61.2 branch into main
  2. Tag with `v1.61.2`
  3. Create future branches from updated main

## Enforcement

This policy is enforced by:
- `scripts/verify-release-baseline.cjs` — automated pre-deploy check
- Manual code review for all PRs to main
- Git branch protection rules (recommended: require passing CI checks before merge)
