# V1.56.3 Global Number Formatting Standardization — Command Log

## Baseline

- **Baseline commit**: `b4d8cc22cb06f0443bf3533379f30875c171ba2b`
- **Branch**: `xiaomi/v1-56-3-global-number-formatting`

## Anti-Regression Checklist

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `b4d8cc2` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| Version | ✅ v1.56.3 |

## Formatter Design

### New Functions Added to `formatters.ts`

| Function | Purpose | Example Output |
|----------|---------|----------------|
| `formatPlainMoney(value, currency)` | Currency without $/NT$/¥ symbols | `3,500.4M TWD` |
| `formatDelta(value, {suffix})` | Signed number with thousands separators | `+3,500.5`, `-8,510.7M TWD` |

### Updated Functions

| Function | Change |
|----------|--------|
| `formatBpMillionTwd` | Now uses `toLocaleString` for thousands separators |
| `formatBpGapMillionTwd` | Now uses `toLocaleString` for thousands separators |
| `formatShortNumber` | Now uses `toLocaleString` for thousands separators |
| `formatNumberWithSign` | Now uses `toLocaleString` for thousands separators |

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Update APP_VERSION to v1.56.3 |
| `frontend/src/core/formatters.ts` | Add formatPlainMoney, formatDelta; update existing formatters |
| `frontend/src/core/formatters.test.ts` | Update test expectations for thousands separators |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Use formatters for KPI strip, BP analysis, scenario delta |

## Pages Fixed

| Page | Sections Fixed |
|------|---------------|
| Operations | KPI strip (revenue), BP KPI cards, BP gap table, scenario v2 delta |

## Number Formatting Rules

| Type | Format | Example |
|------|--------|---------|
| Integer | Thousands separators | `127,838,000` |
| Decimal | Thousands separators + decimal | `3,500.5` |
| Currency (M) | `X,XXX.XM CURRENCY` | `3,500.4M TWD` |
| Percentage | No thousands separators | `97.3%` |
| Delta positive | `+X,XXX.X` | `+3,500.5` |
| Delta negative | `-X,XXX.X` | `-8,510.7` |
| null/undefined/NaN | Em dash | `—` |

## test / lint / build

| Check | Result |
|-------|--------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ Success |
| `npm run test -- --run` | ✅ 61/61 files, 1520/1520 tests |

## Red-line Checks

| File | Status |
|------|--------|
| firestore.rules | ✅ Not modified |
| calculationEngine.ts | ✅ Not modified |

## Deploy

- **Command**: `firebase deploy --only hosting`
- **URL**: https://abf-capacity-calculator.web.app

## Post-deploy Canary

| Page | HTTP Status |
|------|-------------|
| `/` | ✅ 200 |
| `/operations` | ✅ 200 |
| `/scenario` | ✅ 200 |

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.56.3`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `0f1c433`
- **Main merge commit**: `f0d6ddb`
- **Push**: ✅ origin/main and origin/xiaomi/v1-56-3-global-number-formatting
