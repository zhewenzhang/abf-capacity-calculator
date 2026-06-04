# V1.57.2 Workbench Look-Ahead Risk Radar — Command Log

## Baseline

- **Baseline commit**: `fc26aee9bc94d31b056d15f1ce71db59b008e788`
- **Branch**: `xiaomi/v1-57-2-workbench-lookahead-risk-radar`

## Anti-Regression Checklist

| Check | Status |
|-------|--------|
| Based on latest main | ✅ `fc26aee` |
| ABF CSS brand | ✅ Found (2 occurrences) |
| v1.52.0 residue | ✅ None |
| Topbar (PRIMARY_NAV) | ✅ Present |
| Pipeline Readiness (twk-readiness-grid) | ✅ Present |
| No Issues Summary block | ✅ Confirmed |
| No Action Recommendations | ✅ Confirmed |
| Version | ✅ v1.57.2 |

## 修改文件

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Update APP_VERSION to v1.57.2 |
| `frontend/src/i18n/en.ts` | Add 21 Risk Radar i18n keys |
| `frontend/src/i18n/zhTW.ts` | Add 21 Risk Radar i18n keys |
| `frontend/src/pages/DailyOperationsWorkbench.tsx` | Replace Look-Ahead table with Risk Radar |

## 旧「前瞻焦点」如何替换

旧实现：简单 Ant Design Table 显示 6 个月的 Core/BU 利用率、瓶颈、短缺。

新实现：四层结构的 Risk Radar：
1. **一句话风险结论** — 自然语言总结风险状况
2. **风险时间轴** — 横向月份卡片，颜色编码风险等级
3. **Top 3 风险月份卡片** — 排序后展示最需要关注的月份
4. **明细折叠** — 默认收起的详细表格

## 风险判定规则

```typescript
function classifyRisk(coreUtil, buUtil, hasShortage):
  overload: hasShortage || maxUtil >= 100%
  risk:     maxUtil >= 90%
  watch:    maxUtil >= 80%
  safe:     maxUtil < 80%

  bottleneck:
    bu:   BU >= Core && BU >= 80%
    core: Core > BU && Core >= 80%
    none: otherwise
```

## test / lint / build

| Check | Result |
|-------|--------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ Success |
| `npm run test -- --run` | ✅ 61/61 files, 1532/1532 tests |

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

## Online Bundle Verification

- `ABF CSS`: ✅ Found (2 times)
- `v1.57.2`: ✅ Found (1 time)
- `v1.52.0`: ✅ Not found

## Commit / Push

- **Feature branch commit**: `af5c578`
- **Main merge commit**: `825dbbe`
- **Push**: ✅ origin/main and origin/xiaomi/v1-57-2-workbench-lookahead-risk-radar
