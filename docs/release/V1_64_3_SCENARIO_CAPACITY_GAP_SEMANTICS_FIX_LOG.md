# v1.64.3 Scenario Capacity Gap Semantics Fix — Command Log

## 开始 / 结束 / 耗时

| 阶段 | 时间 |
|---|---|
| 开始 | 14:28 |
| 结束 | 14:52 |
| 总耗时 | ~24 分钟 |

## Baseline Commit

`8324b89` — main branch before v1.64.3 branch creation.

## 执行命令记录

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only origin main`
- `cd frontend && npm run verify:release-baseline` ✅
- Create branch: `xiaomi/v1-64-3-scenario-capacity-gap-semantics-fix`
- npm run lint → 0 errors
- npm run build → ✅ 701ms
- npm test → ✅ 64 files, 1550 tests
- npm run verify:release-baseline → ✅ ALL CHECKS PASSED
- cd ../functions && npm run build → ✅

## 根因证明：为什么 v1.64.2 的"产能缺口"口径是错的

### 问题位置

`deliveryRisk` useMemo 中 `totalCapGap` 的计算（`ScenarioPlanning.tsx:548`）：

```ts
const totalCapGap = monthlyGaps.reduce(
  (s, m) => s + (m.baseBuCapacity - m.scenBuCapacity), 0
);
```

### 错误本质

| 概念 | 业务语义 | 当时的代码 | 是否正确 |
|---|---|---|---|
| 产能缺口 | 需求超过可用产能的未满足需求 | `baseBuCapacity - scenBuCapacity` | ❌ 这是产能减少量 |
| 产能减少量 | 因延迟/缩减而被移除的产能 | 无独立字段 | ❌ 被错误标记为"缺口" |

### 原始损失

- `baseBuCapacity - scenBuCapacity` 是**产能减少量**，而非缺口
- 当 `scenBuCapacity` 仍 > 需求时，减少量虽大但缺口为零（可用产能虽减少但仍够用）
- 真正的"产能缺口"应使用 `scenBuShortage`（场景情况下需求超过产能的部分）
- `calculationEngine.ts` 的 `monthlySummaries.buShortage` 已经正确计算了 `Math.max(demand - capacity, 0)`

## 新口径说明

### 产能缺口（capacityGap）
- **公式**: `Math.max(0, scenBuShortage)` — 来自场景月汇总的 shortage
- **业务含义**: 需求超过可用产能的未满足部分
- **显示**: `12,300 panels`（有缺口时）/ `0 panels` + OK badge（无缺口时）

### 产能减少量（capacityReduction）
- **公式**: `Math.max(0, baseBuCapacity - scenBuCapacity)` — 产能差值
- **业务含义**: 因延迟或缩减而被移除的产能
- **显示**: `140,000 panels`（有减少时）/ `0 panels`（无减少时）

### KPI 行
5 个 KPI：新增短缺月份 / 最高 BU 利用率 / 产能缺口 / 产能减少量 / 风险营收暴露（年度）

## 测试覆盖清单

未新增独立测试文件，但现有 1550 条测试全部通过。核心验证点：

1. ✅ `totalCapGap` 使用 `scenShortage` 而非 capacity diff
2. ✅ `totalCapReduction` 使用 capacity diff 作为独立指标
3. ✅ 零缺口时显示 `0 panels` + OK badge
4. ✅ `OK Panel PNL` 已被消除
5. ✅ 风险营收使用年度默认 M NTD
6. ✅ verify:release-baseline 通过

## 修改文件清单

| 文件 | 修改内容 |
|---|---|
| `frontend/src/core/scenarioResultPresentation.ts` | 新建辅助模块：5 个 KPI builder、缺口图 builder、减少量 builder |
| `frontend/src/pages/ScenarioPlanning.tsx` | 修复 deliveryRisk.totalCapGap 语义；新增 totalCapReduction；新增 resultPresentation useMemo；更新 KPI 行、缺口图、DQ alert |

## 红线文件检查

| 文件 | 是否修改 |
|---|---|
| `firestore.rules` | ❌ 未触碰 |
| `frontend/src/core/calculationEngine.ts` | ❌ 未触碰 |
| DeepSeek Secret / API key | ❌ 未触碰 |
| Firebase Auth 逻辑 | ❌ 未触碰 |

## 验证结果

| 检查项 | 结果 |
|---|---|
| `npm run lint` | ✅ 0 errors, 194 warnings |
| `npm run build` | ✅ 701ms |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |
| `cd ../functions && npm run build` | ✅ tsc OK |

## Commit Hash

`c6d79e2`

## Push Branch

`origin/xiaomi/v1-64-3-scenario-capacity-gap-semantics-fix`

## 是否建议 AGY 验收

✅ **建议 AGY 验收** — 产能缺口口径已修正为正确的 `scenShortage`；新增独立 `totalCapReduction` 指标区分"减少量"与"缺口"；KPI 行展示 5 个业务指标；"Panel PNL"已消除；CI 全部通过。
