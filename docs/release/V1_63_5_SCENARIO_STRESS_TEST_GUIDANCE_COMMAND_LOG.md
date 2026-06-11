# v1.63.5 Scenario Stress Test Guidance — Command Log

## Release Scope

AGY confirmed v1.63.4 model math is correct, but the page lacked explanation for low-stress scenarios, causing users to think the system was broken.

v1.63.5 adds stress level classification, clear explanatory badges, and one-click stress test suggestion buttons.

## Changes

### Stress Level Classification & Badge
- Added `stressInfo` useMemo that computes **low / medium / high** stress level from:
  - `shortageMonthCount.delta` (from `displayTemplateScenarioDeltas`)
  - `maxBuUtilPct` (max scenario BU utilization %)
  - `totalCapGap` (total BU capacity reduction across all months)
- Thresholds:
  - **LOW**: `shortageDelta ≤ 0` AND `maxUtil ≤ 30%` AND `capGap ≤ 50K` → green badge
  - **MEDIUM**: `shortageDelta > 0` OR `maxUtil > 30%` OR `capGap > 50K` → orange badge
  - **HIGH**: `shortageDelta > 3` OR `maxUtil > 85%` OR `capGap > 150K` → red badge
- Badge displayed as a colored `span` in the results card area (between KPI row and charts)

### Low-Stress Explanation
- When stress is **LOW**, shows clear Chinese explanation:
  > "产能基线利用率仅 X%，产能十分宽松。当前模拟参数不足以触发短缺。建议尝试加大压力参数以观察产能瓶颈效应。"
- When stress is **MEDIUM**, explains whether shortage exists or utilization is approaching limits
- When stress is **HIGH**, warns about severe capacity pressure

### One-Click Stress Test Suggestion Buttons
- Three buttons visible only when stress level is LOW:
  1. **套用强压力测试** → runs `capacityDelay` with `delayMonths=6, delayRatio=40`
  2. **延长延迟至 6 个月** → runs `capacityDelay` with `delayMonths=6` (keeps current `delayRatio`)
  3. **提高预测 30%** → runs `forecastAdjustment` with `forecastAdjustPercent=30`
- Each button:
  - Calls `runOperationalScenario` directly with custom params (bypasses form state)
  - Updates `templateResult` and switches to results tab
  - Does NOT save or modify any formal data
  - Shows italic "仅模拟，不保存" label
- New handlers: `handleStrongStressTest`, `handleExtendDelay`, `handleIncreaseForecast`

### Constraints Followed
- ✅ Used existing `recharts` — no new chart library imports
- ✅ Used only existing antd components (`Card`, `Row`, `Col`, `Button`, `Space`, `Text`) — no new imports
- ✅ Minimal page structure changes — stress UI sits between KPI row and charts row
- ✅ Amounts remain in M NTD
- ✅ Buttons only change simulation parameters, never save formal data

## Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 189 warnings (pre-existing + minor `any` types) |
| `npm run build` | ✅ Built in 1.02s |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | Added `stressInfo` useMemo; added 3 one-click stress test handlers (`handleStrongStressTest`, `handleExtendDelay`, `handleIncreaseForecast`); added stress level badge + explanation + suggestion buttons in render section |
| `frontend/src/App.tsx` | APP_VERSION → v1.63.5 |
| `frontend/package.json` | version → 1.63.5 |
| `docs/release/V1_63_5_SCENARIO_STRESS_TEST_GUIDANCE_COMMAND_LOG.md` | Created this log |

## Merge & Deploy

| Step | Action | Result |
|---|---|---|
| 1 | Create `xiaomi/v1-63-5-scenario-stress-test-guidance` branch | ✅ Created from v1.63.4 + stress test commits |
| 2 | Push branch to origin | ✅ `origin/xiaomi/v1-63-5-scenario-stress-test-guidance` |
| 3 | FF-only merge to main | ✅ Fast-forward `6f78de0..d261b01` |
| 4 | Tag v1.63.5 | ✅ Created and pushed |
| 5 | Build frontend | ✅ 695ms |
| 6 | Deploy Firebase Hosting | ✅ **Deploy complete!** |
| 7 | Functions deploy | 🚫 Skipped (hosting only) |

### Post-deploy Canary

| Check | Result |
|---|---|
| `curl` HTML source | ✅ `index-CAguVv5i.js` matches local build |
| Version string in deployed JS | ✅ `v1.63.5` found in live `index-CAguVv5i.js` |
| Hosting URL | ✅ `https://abf-capacity-calculator.web.app` |

## Version

`v1.62.3` → `v1.63.5`
