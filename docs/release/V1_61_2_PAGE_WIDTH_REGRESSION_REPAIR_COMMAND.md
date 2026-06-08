# v1.61.2 Page Width Regression Repair — Command Log

## Baseline
- **Branch:** `xiaomi/v1-61-2-page-width-regression-repair`
- **Baseline:** v1.61.1 (xiaomi/v1-61-1-release-regression-repair)

---

## Root Cause

**v1.58.7 PageShell wide layout was never included in any subsequent branch.** All feature branches (v1.58.7 through v1.61.1) were pushed but NEVER merged to main. v1.61.1 had the v1.60.4 combined branch which included features but NOT the PageShell component and CSS (v1.58.7).

## Fix Applied

1. **Cherry-picked PageShell component files** from v1.58.7 branch:
   - `PageShell.tsx` — component with 4 variants (wide/standard/narrow/full)
   - `PageShell.test.tsx` — test file (7 tests)
   - `tweakcnTheme.css` — CSS rules for `.abf-page-shell` with `.twk-main:has()` selectors

2. **Applied PageShell to all 12 pages**:
   - `wide`: Operations, Results, Products, Forecasts, Capacity, Scenario, BP Targets, and 3 spreadsheet-lab pages
   - `standard`: Parameters
   - `full`: AiCopilot

3. **Updated verify:release-baseline** to check for PageShell across key pages

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/layout/PageShell.tsx` | **New** from v1.58.7 |
| `frontend/src/components/layout/PageShell.test.tsx` | **New** from v1.58.7 (7 tests) |
| `frontend/src/styles/tweakcnTheme.css` | Added `.abf-page-shell` CSS variants |
| All 12 page files | Wrapped root with `<PageShell variant="...">` |
| `scripts/verify-release-baseline.cjs` | Added PageShell checks |
| Version files | `v1.61.1` → `v1.61.2` |

## Verification

| Test | Result |
|---|---|
| `npm run lint -- --quiet` | ✅ Pass |
| `npm run build` | ✅ Pass (947ms) |
| `npm test -- --run` | ✅ 64 files, 1546 tests passed |
| `npm run verify:release-baseline` | ✅ All checks passed |

## Deployment

```
firebase deploy --only hosting
```
