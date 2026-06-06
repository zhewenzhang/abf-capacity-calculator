# v1.60 Global Copilot Drawer Integration — Command Log

## Baseline
- **Branch:** `xiaomi/v1-60-global-copilot-drawer-integration`
- **Baseline commit (main):** `5ee609c` — docs: add v1.58 AI assistant conversational analytics command log
- **Author:** zhewenzhang

---

## Root Cause Analysis

**Key finding: There is NO architectural reason why the Results page sidebar AI can't use DeepSeek.** Both the full /copilot page and the Results drawer use:

1. Same `<CopilotChat>` component
2. Same `buildAiCopilotContext()` builder for data context
3. Same `proxyProvider.runCompletion()` calling `callAiChatProxy()` → Firebase Functions
4. Same `getAuth()` + `getIdToken()` for authentication
5. Same React contexts (I18n, Workspace, AppPrefs)

The only differences were:
- `destroyOnClose` on the Results Drawer caused CopilotChat to remount every time, resetting health checks and provider state
- Drawer width was 480px (vs. full page's 800px)
- `pendingToolId` optional props not passed (irrelevant to API calls)

**The fix focuses on:** creating a shared global drawer that keeps CopilotChat mounted across opens (`destroyOnClose={false}`) and that both the topbar and Results page can trigger.

---

## New Shared Architecture

### New files
| File | Purpose |
|---|---|
| `components/copilot/CopilotDrawerContext.tsx` | React context providing `isOpen`, `open(context?)`, `close()` |
| `components/copilot/GlobalCopilotDrawer.tsx` | Drawer component using Ant Design Drawer + CopilotChat |
| `core/aiCopilotContext.ts` — `buildMinimalAiCopilotContext()` | Creates valid context with empty analytics data for generic questions |

### Modified files
| File | Change |
|---|---|
| `App.tsx` | Added `CopilotDrawerProvider` wrapper, `GlobalCopilotDrawer` component, `CopilotDrawerButton` in topbar (before language switcher) |
| `CalculationResults.tsx` | Removed old local `Drawer` + `CopilotChat` + `copilotDrawerOpen` state; replaced with `useCopilotDrawer().open(context)` |
| Version files | Updated to v1.60.0 |

### Architecture Flow

```
Topbar button → useCopilotDrawer().open() → GlobalCopilotDrawer shown
                                                  ↓
                                          If page context provided:
                                            → CopilotChat with analytics data
                                          If no context (topbar open):
                                            → buildMinimalAiCopilotContext(role)
                                            → CopilotChat with empty analytics
                                                  ↓
                                          Drawer header has "Open full page" link
                                          → navigates to /copilot

Results page button → useCopilotDrawer().open(copilotContext)
                                                  ↓
                                          CopilotChat with full Results context
```

### Key Design Decisions
- `destroyOnClose={false}` on the drawer preserves session state across opens
- Drawer width: 560px (wider than old 480px)
- `buildMinimalAiCopilotContext()` avoids duplicating data loading in the drawer
- Pages with data context (Results) pass it explicitly when opening
- CopilotChat itself is unchanged — no refactoring needed

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/copilot/CopilotDrawerContext.tsx` | **New** — Context provider for global drawer state |
| `frontend/src/components/copilot/CopilotDrawerContext.test.tsx` | **New** — 2 tests |
| `frontend/src/components/copilot/GlobalCopilotDrawer.tsx` | **New** — Drawer component with CopilotChat |
| `frontend/src/core/aiCopilotContext.ts` | Added `buildMinimalAiCopilotContext()` function |
| `frontend/src/App.tsx` | Added `CopilotDrawerProvider`, `CopilotDrawerButton`, `GlobalCopilotDrawer` |
| `frontend/src/pages/CalculationResults.tsx` | Removed old local Drawer + CopilotChat; uses global drawer |
| `frontend/src/App.tsx` | Version `v1.58.0` → `v1.60.0` |
| `frontend/src/services/snapshotService.ts` | Version `v1.54.0` → `v1.60.0` |
| `frontend/package.json` | Version `1.54.0` → `1.60.0` |
| `frontend/package-lock.json` | Version `1.54.0` → `1.60.0` |
| `docs/release/V1_60_..._COMMAND_LOG.md` | **New** — this file |

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
→ ✓ built in 909ms
```

### Test
```
npm test -- --run
Test Files  62 passed (62)
Tests       1534 passed (1534)
```

### Redline checks

| Check | Result |
|---|---|
| `firestore.rules` not modified | ✅ |
| `calculationEngine.ts` not modified | ✅ |
| Version not reverted to `v1.52.0` | ✅ (only in code comments) |
| No API key / BYOK input in drawer | ✅ (drawer has no API key UI) |
| No M USD default display | ✅ (only in docs/tests) |
| No 問題摘要 / 今日行動建議 regression | ✅ |
| Topbar still `ABF CSS` horizontal nav | ✅ |
| /copilot full page not modified | ✅ (AiCopilot.tsx not changed) |

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
git commit -m "feat: add global copilot drawer"
git push origin xiaomi/v1-60-global-copilot-drawer-integration
```

### Commit hash
(To be filled after commit)

### Push branch
`xiaomi/v1-60-global-copilot-drawer-integration`
