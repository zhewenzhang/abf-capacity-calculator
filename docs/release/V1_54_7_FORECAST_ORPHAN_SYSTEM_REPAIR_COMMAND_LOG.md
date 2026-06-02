# V1.54.7 Forecast Orphan System Repair — Command Log

## 1. 根因判断

**确认为系统数据一致性问题，不是用户错误。**

`deleteSKU()` 在 `skuService.ts` 中仅执行 `deleteDoc(skus/{skuId})`，不会同步删除关联的 forecast 行。Products.tsx 已有 handler 逻辑（查询关联 forecast 数量 → 先删 forecast → 再删 SKU），但**缺少确认 Modal UI**，导致用户删除产品时不知道存在关联预测。

## 2. 6 笔 Orphan Forecast 模式摘要

| 模式 | 详情 |
|------|------|
| skuId | `afc9a5ff-cfe8-41f6-adb0-16bdf361302e`（全部 6 笔相同） |
| 月份 | 2026-01, 2026-02, 2026-03, 2026-04, 2026-05, 2026-06 |
| 来源 | 用户删除了该 SKU 产品，但 forecast 未同步清理 |
| 影响 | 营收/产能计算被静默跳过（calculationEngine 以 SKU 为遍历单位），DataQuality 报错降低 confidence |

## 3. 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `frontend/src/services/forecastService.ts` | 新增 `deleteForecastsByIds()` 和 `rebindForecastsToSku()` |
| `frontend/src/pages/Products.tsx` | 新增删除确认 Modal（含关联 forecast 数量警告） |
| `frontend/src/components/common/DataQualityGuidedFixModal.tsx` | 重写：新增「清理孤兒預測」和「重新綁定到現有產品」功能 |
| `frontend/src/pages/Forecasts.tsx` | 新增「批量清理所有孤兒預測」按钮，传递 orphan/sku 数据给 Modal |
| `frontend/src/services/workspaceService.ts` | 工作区复制时过滤 orphan forecasts |
| `frontend/src/i18n/en.ts` | 新增删除确认、清理、重绑定 i18n keys |
| `frontend/src/i18n/zhTW.ts` | 同上繁中翻译 |
| `frontend/src/core/calculationEngine.test.ts` | 新增 orphan forecast 跳过测试 |
| `frontend/src/core/dataQuality.test.ts` | 新增多笔 orphan 检测测试 |
| `docs/release/V1_54_7_FORECAST_ORPHAN_SYSTEM_REPAIR_COMMAND_LOG.md` | 本日志 |

## 4. 如何避免未来再产生 Orphan

1. **Products.tsx 删除确认 Modal**：删除产品前查询关联 forecast 数量，若 > 0 则弹出确认框，明确告知「删除产品会同时删除 N 笔预测」。
2. **删除顺序安全**：先删 forecast rows → 再删 SKU → reload data。
3. **Viewer 不可执行**：所有删除/清理/重绑定按钮受 `canEdit()` 保护。
4. **Workspace 复制过滤**：`createWorkspaceFromPersonalProject()` 复制时过滤掉 orphan forecasts。

## 5. 既有 Orphan 如何清理/重绑定

### 方式一：批量清理（Forecast 页面）
- 孤儿预测 alert 下方新增「清理所有孤兒預測」按钮
- 点击后 Popconfirm 确认，一次性删除所有 orphan forecast

### 方式二：单个修复（Guided Fix Modal）
- 点击 alert 中的「立即修復」按钮打开 Modal
- **清理孤兒預測**：删除该缺失 SKU 的所有 forecast
- **重新綁定到現有產品**：选择一个现有 SKU，将 orphan forecast 转移过去
- **在產品頁建立 SKU**：跳转到 Products 页面创建缺失的 SKU

## 6. test / lint / build 结果

| 检查 | 结果 |
|------|------|
| `npm run test -- --run` | ✅ 60/61 通过（1 个已存在的 DailyOperationsWorkbench 超时，与本次无关） |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.57s |
| `git diff -- firestore.rules` | ✅ 无修改 |
| `git diff -- frontend/src/core/calculationEngine.ts` | ✅ 无修改 |
| `rg -n "sk-[A-Za-z0-9]|DEEPSEEK_API_KEY"` | ✅ 仅文档引用，无泄露 |

## 7. Commit / Branch / Push

- Branch: `xiaomi/v1-54-7-forecast-orphan-system-repair`
- Commit: 待提交

## 8. 是否可交 AGY 验收

**可以。** 所有 7 个必须完成项均已完成：
1. ✅ 查清 6 笔 orphan forecast 来源（产品删除未同步清理 forecast）
2. ✅ 修复产品删除流程（新增确认 Modal，先删 forecast 再删 SKU）
3. ✅ 预测页提供 orphan 清理/重绑定入口（批量清理 + Guided Fix Modal）
4. ✅ orphan forecast 不进入 BP/产能/AI 分析（calculationEngine 以 SKU 为遍历单位，自然跳过）
5. ✅ Viewer read-only 保持
6. ✅ 未修改 firestore.rules
7. ✅ 未修改 calculationEngine.ts
