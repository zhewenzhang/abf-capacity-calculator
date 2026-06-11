# v1.64.1 Scenario Result UI and Capacity Gap Fix — Log

## 根因说明

### 问题 1：顶部质量警告 Alert 与标题/描述挤压重叠

**根因**：
- `PageHeader` 组件使用 `marginBottom: 16`
- Alert 只有 `marginBottom: 16`，**缺少 `marginTop`**，导致 Alert 直接紧贴 PageHeader 底部
- Tabs 只有 `marginTop: 8`，空间紧凑
- 当 `showDqWarning` 为 true 时，黄色 Alert 的内容（图标 + 多行文字）与 PageHeader 的描述文字视觉上挤压在一起

**修复**：
- 所有 Alert 增加 `marginTop: 8`
- Tabs 的 `marginTop: 8` 改为 `marginTop: 16`
- 确保 PageHeader → Alert → Tabs 之间有稳定间距

### 问题 2：「产能缺口」KPI 显示 "OK Panel PNL"

**根因**：
- 代码使用 `{(totalCapGap / 1000).toFixed(0)}K Panel PNL`
- 当 `totalCapGap = 0` 时，计算结果为 `0K Panel PNL`
- `0K` 在常用 UI 字体中视觉上形似 `OK`
- 单位 `Panel PNL` 是重复/错误的简称（Panel = PNL 的一部分）

**修复**：
- 用 `toLocaleString()` 代替 `/1000` 显示精确数值
- 单位改为 `panels`
- 有缺口时显示实际值 + "延迟期间累计缺口"
- 无缺口时显示 "0 panels" + "未触发短缺，产能余裕下降"
- 状态 "OK" 仅作 Badge 使用，不拼入主值
- 消除所有 `Panel PNL` 字符串

## 修复后的显示规则

| 场景 | 主值 | 副文案 | 边框颜色 |
|---|---|---|---|
| 有实际缺口 (totalCapGap > 0) | `12,300 panels` | 延迟期间累计缺口 | 橙色 (S.warning) |
| 无缺口但产能下降 (totalCapGap = 0) | `0 panels` | 未触发短缺，产能余裕下降 | 绿色 (S.accent) |

## 修改文件清单

| 文件 | 修改内容 |
|---|---|
| `frontend/src/pages/ScenarioPlanning.tsx` | 1) Alert 增加 `marginTop: 8`；2) Tabs `marginTop: 8` → `marginTop: 16`；3) 消除 3 处 `Panel PNL`；4) 修复产能缺口 KPI 显示规则 |

## 验证结果

| 检查项 | 结果 |
|---|---|
| `npm run lint` | ✅ 0 errors, 189 warnings |
| `npm run build` | ✅ Built in 990ms |
| `npm test -- --run` | ✅ 64 files, 1550 tests |
| `npm run verify:release-baseline` | ✅ ALL CHECKS PASSED |

## 红线文件

未修改红线文件：
- `firestore.rules` — 未触碰 ✅
- `frontend/src/core/calculationEngine.ts` — 未触碰 ✅
- DeepSeek Secret/API key — 未触碰 ✅
- Firebase Auth 逻辑 — 未触碰 ✅
