# v1.54.7 Forecast Orphan System Repair — CC Command

## 背景

线上「预测」页面出现：

> 侦测到 6 笔孤儿预测  
> 2026-01 月的预测引用了不存在的 skuId afc9a5ff-cfe8-41f6-adb0-16bdf361302e。  
> 2026-02 月的预测引用了不存在的 skuId afc9a5ff-cfe8-41f6-adb0-16bdf361302e。  
> 2026-03 月的预测引用了不存在的 skuId afc9a5ff-cfe8-41f6-adb0-16bdf361302e。  
> +3 more

这不是应该让用户自己猜的错误。它代表 `forecasts` 集合里存在 `skuId`，但当前 `skus` 集合里没有对应 SKU。

初步源码证据：

- `frontend/src/services/skuService.ts`
  - `deleteSKU(scope, skuId)` 只执行 `deleteDoc(skus/{skuId})`。
  - 没有同步删除、归档、重绑定该 SKU 的 forecast rows。
- `frontend/src/pages/Products.tsx`
  - 删除产品时直接调用 `deleteSKU(scope, id)`。
  - 没有提示该 SKU 下有多少 forecast，也没有 cascade cleanup 选项。
- `frontend/src/core/dataQuality.ts`
  - orphan forecast 检查是正确的，但目前只是报警。

## 必须遵守

1. 全程中文回报。
2. 创建并持续更新命令日志：
   `docs/release/V1_54_7_FORECAST_ORPHAN_SYSTEM_REPAIR_COMMAND_LOG.md`
3. 先查根因，再修复。
4. 不得修改 `firestore.rules`。
5. 不得修改 `frontend/src/core/calculationEngine.ts`。
6. 不得泄露 API key。
7. 保持 Viewer read-only。
8. 不得把 AGY review branch 合进产品分支。

## 阶段 1：根因调查

请先只读调查并记录：

1. 当前 workspace/project 下 6 笔 orphan forecast：
   - forecast doc id
   - skuId
   - month
   - forecastPcs
   - unitPrice / currency
   - createdAt / updatedAt 如有
2. 检查该 skuId 是否曾经存在于：
   - 当前 `skus`
   - snapshots/version records
   - demo/import docs
   - deleted product logs 如有
3. 判断 orphan 来源：
   - 产品被删除，但 forecast 未同步删除
   - 产品重新导入导致 SKU id 变化
   - workspace copy 不完整
   - import/restore 流程写入了不存在的 skuId
   - 其他

## 阶段 2：防止未来再产生 orphan

修复产品删除流程，不允许静默留下 orphan forecast。

建议实现：

1. 在 `forecastService.ts` 新增：
   - `getForecastsBySku(scope, skuId)` 已存在，可复用。
   - `deleteForecastsBySku(scope, skuId)` 或 `deleteForecastsByIds(scope, ids)`。
2. 在 `Products.tsx` 删除产品前：
   - 查询该 SKU 关联 forecast 数量。
   - 如果数量 > 0，弹出确认：
     - 「此产品仍有 N 笔预测。删除产品会同时删除这些预测，避免留下孤儿预测。」
     - 按钮：取消 / 删除产品与预测。
   - Viewer 不可执行。
3. 删除动作必须按安全顺序：
   - 删除 forecast rows。
   - 删除 SKU。
   - reload data。
4. 不要默默 cascade；必须让用户知道会删除关联预测。

## 阶段 3：修复既有 orphan 数据体验

Forecast 页面目前只显示 orphan 报警，不足够。请新增可操作的修复入口。

至少实现以下之一，优先级从高到低：

1. 在 orphan alert 中提供「清理孤儿预测」按钮：
   - 列出受影响 skuId、月份、数量。
   - 用户确认后删除这些 orphan forecast rows。
   - Viewer 禁用。
2. 提供「重新绑定到现有产品」：
   - 选择一个现有 SKU，把 orphan forecast 的 `skuId` 改成该 SKU。
   - 适合用户知道这些预测属于哪个产品的场景。
3. 保留「建立缺失产品」作为备选，但不要作为唯一修复方式：
   - 因为 forecast 只有 skuId，不一定有足够产品属性，强行创建 SKU 可能制造更多坏数据。

## 阶段 4：导入/复制/恢复路径防线

检查并修复这些路径是否可能写入 orphan forecast：

1. Forecast Excel import：
   - 当前通过 skuCode 查 SKU，找不到会 skip。请保留。
   - 提示要更清楚：跳过多少个找不到 SKU 的 forecast。
2. Forecast batch edit / growth / fill forward：
   - 必须只对现有 SKUs 写入。
3. Workspace copy:
   - 复制 skus 与 forecasts 时如果源数据已有 orphan，目标 workspace 会复制 orphan。
   - 请决定：复制前过滤 orphan，或复制后保留但报告。
   - 建议：复制时过滤 orphan forecasts，并在命令日志中记录数量。
4. Snapshot/restore 如涉及 forecasts：
   - 不得恢复出 orphan，或必须在 restore 前提示。

## 阶段 5：下游分析安全

确保 orphan forecast 不进入核心分析：

1. DataQuality 可以继续报告 orphan。
2. Analytics / BP / capacity / AI context 不应把 orphan forecast 计入营收、产能需求或 BP 达成率。
3. 如果当前 `runCalculation()` 已因没有 SKU 而自然跳过 orphan，也要加测试证明这一点。

## 阶段 6：测试要求

至少新增/更新：

1. `skuService` / `Products`：
   - 删除有 forecast 的 SKU 时，会同步删除关联 forecasts 或要求确认。
   - Viewer 不能删除。
2. `forecastService`：
   - `deleteForecastsBySku()` 或同等 helper 正确删除。
3. `dataQuality`：
   - orphan forecast 会产生 `forecast-orphan-sku-*`。
   - orphan forecast 不计入 BP/产能计算。
4. Forecast page：
   - orphan alert 显示清理/重绑定入口。
   - Viewer 禁用修复按钮。
5. Workspace copy / restore 如修改：
   - 不复制 orphan 或明确记录。

## 验证命令

在 `frontend` 目录执行：

```powershell
npm run test -- --run
npm run lint -- --quiet
npm run build
```

Guardrail：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
rg -n "sk-[A-Za-z0-9]|DEEPSEEK_API_KEY" .
```

## 最终回报格式

请用中文回报：

1. 是否确认为系统一致性问题。
2. 6 笔 orphan forecast 的根因判断。
3. 修改文件清单。
4. 产品删除流程如何避免未来 orphan。
5. 既有 orphan 如何清理或重绑定。
6. test/lint/build 结果。
7. 是否修改 `firestore.rules` / `calculationEngine.ts`。
8. Commit hash / branch / push 状态。
9. 是否可交 AGY 验收。

