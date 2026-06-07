# v1.60.1 Results Risk Brief Regression Repair + Copilot Nav Cleanup — Command Log

## Baseline
- **Branch:** `xiaomi/v1-60-1-results-risk-brief-regression-copilot-nav`
- **Baseline commit (main):** `5ee609c`
- **Author:** zhewenzhang

---

## Root Cause Investigation

### Risk Brief Regression Root Cause

**The v1.59 risk brief redesign was NEVER merged to main.**

| Branch | Commit | Status |
|---|---|---|
| `xiaomi/v1-59-results-risk-brief-executive-summary` | `7bcba89` feat: redesign results risk brief executive summary | Pushed but NOT merged to main |
| `xiaomi/v1-60-global-copilot-drawer-integration` | `365082d` feat: add global copilot drawer | Pushed but NOT merged to main |

Both branches branched from the same baseline `5ee609c` on main. Neither was merged to main. When v1.60 was created from `5ee609c`, it did NOT include v1.59's changes. The `CalculationResults.tsx` in v1.60 had:
- The OLD risk brief code (no v1.59 executive summary redesign)
- Only the v1.60 drawer removal changes (remove old CopilotChat drawer, use global drawer)

The v1.59 file (`CalculationResults.tsx`) had 364 insertions + 757 deletions (massive risk brief rewrite).
The v1.60 file (`CalculationResults.tsx`) had 8 insertions + 27 deletions (just drawer removal).

Since v1.60 was deployed and became the active production code, users saw the OLD risk brief instead of the v1.59 executive summary design.

### Nav Duplication Root Cause

The v1.60 topbar AI drawer button was added but the original `PRIMARY_NAV` still had `{ key: 'copilot', icon: <RobotOutlined /> }` at index 5 (after results, before "More" dropdown). This created two AI entries: one in the main nav bar and one in the topbar right side.

---

## Fix Applied

### Part 1 — Restore Risk Brief

Cherry-picked v1.59's changes onto the current branch:
- `frontend/src/pages/CalculationResults.tsx` — v1.59's risk brief redesign (executive summary, decision KPIs, key findings, collapsed AI tools, collapsed BP attribution/price impact)
- `frontend/src/pages/CalculationResults.test.tsx` — v1.59's test file (8 tests)
- `frontend/src/i18n/zhTW.ts` — v1.59's new i18n keys
- `frontend/src/i18n/en.ts` — v1.59's new i18n keys

Then applied v1.60's drawer changes on top:
- Replaced `CopilotChat` import with `useCopilotDrawer` import
- Added `const { open: openCopilotDrawer } = useCopilotDrawer();`
- Removed `const [copilotDrawerOpen, setCopilotDrawerOpen] = useState(false);`
- Changed AI button to use `openCopilotDrawer(copilotContext)`
- Removed old Drawer with `CopilotChat`

### Part 2 — Nav Cleanup

- Removed `{ key: 'copilot', icon: <RobotOutlined /> }` from `PRIMARY_NAV`
- Kept `/copilot` route as hidden fallback (line 336, accessible via direct URL)
- Kept topbar `CopilotDrawerButton` (right-side AI assistant drawer entry)
- Kept `pageTitles.copilot` for the topbar button label

### Part 3 — Added Regression Protection

- Added 15000ms timeout to dynamic import tests in `CalculationResults.test.tsx` and `DailyOperationsWorkbench.test.tsx` to prevent flaky timeouts

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/CalculationResults.tsx` | Restored v1.59 risk brief + applied v1.60 drawer removal |
| `frontend/src/pages/CalculationResults.test.tsx` | Restored v1.59 tests + added timeout fix |
| `frontend/src/i18n/zhTW.ts` | Restored v1.59 risk brief keys |
| `frontend/src/i18n/en.ts` | Restored v1.59 risk brief keys |
| `frontend/src/App.tsx` | Removed `copilot` from `PRIMARY_NAV`; kept v1.60 drawer/button |
| `frontend/src/pages/DailyOperationsWorkbench.test.tsx` | Added timeout fix for flaky test |
| `frontend/src/App.tsx` | Version `v1.60.0` → `v1.60.1` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.60.1` |
| `frontend/package.json` | Version `1.54.0` → `1.60.1` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.60.1` |

*(Note: v1.60 component files CopilotDrawerContext.tsx, GlobalCopilotDrawer.tsx, CopilotDrawerContext.test.tsx were checked out from v1.60 branch)*

---

## Verification Results

### Lint
```
npm run lint -- --quiet
→ No errors, no warnings
```

### Build
```
npm run build
→ ✓ built in 1.45s
```

### Test
```
npm test -- --run
Test Files  63 passed (63)
Tests       1542 passed (1542)
```

### Redline checks

| Check | Result |
|---|---|
| `firestore.rules` not modified | ✅ |
| `calculationEngine.ts` not modified | ✅ |
| Version not reverted to `v1.52.0` | ✅ (only in code comments) |
| Risk Brief i18n keys present | ✅ (executiveConclusion, keyFindings, planStatus) |
| AI removed from PRIMARY_NAV | ✅ (0 matches for `key: 'copilot'`) |
| /copilot route preserved | ✅ (line 336, hidden fallback) |
| Topbar AI button still exists | ✅ (CopilotDrawerButton) |
| Old KPIs in Results page | ✅ Removed from risk brief tab |

---

## Browser QA

**Browser QA 未执行**，原因是当前环境缺少可认证浏览器或截图能力。
本次仅以 test / lint / build 与代码级检查替代，仍建议 AGY 或人工浏览器复验。

---

## Deployment

```
firebase deploy --only hosting
```

---

## Deploy URL

`https://abf-capacity-calculator.web.app`

---

## Commits

```
git add .
git commit -m "fix: restore results risk brief and clean copilot nav"
git push origin xiaomi/v1-60-1-results-risk-brief-regression-copilot-nav
```
