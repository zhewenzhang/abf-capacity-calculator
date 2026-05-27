# v1.37.0 Scenario Planning 冒烟测试脚本

本脚本用于 QA 人员在本地或预发环境中进行 v1.37.0 Scenario Planning MVP 的端到端冒烟测试。

---

## 一、测试环境与前置数据准备

### 1.1 基础数据要求

在开始测试前，确保工作区包含以下数据：

1. **Products**：至少 5 个 SKU
   - `SKU-001`：单价 $100，属性完整
   - `SKU-002`：单价 $200，属性完整
   - `SKU-003`：单价 $50，`layerCount` 缺失（触发 DQ warning）
   - `SKU-004`：单价 $150，属性完整
   - `SKU-005`：单价 $0（触发 DQ warning - 零单价）

2. **Forecasts**：至少 24 个月（2026-01 至 2027-12），SKU-001 ~ SKU-004 每月正数预测量，SKU-005 单价为 0

3. **Capacity Plans**：至少 12 个月（2026-01 至 2026-12），确保 2026-06 和 2026-09 产能略低于需求（触发 shortage）

4. **BP Targets**：2026 年 NT$500M，2027 年 NT$600M

5. **Parameters**：USD/TWD 汇率 = 0.031

### 1.2 角色准备
- **Editor 账户**：完整读写权限
- **Viewer 账户**：只读权限

### 1.3 DQ 状态确认
- `SKU-003` 的 `layerCount` 缺失（red error）
- `SKU-005` 的 `unitPrice` 为 0（yellow warning）
- `2026-06` 和 `2026-09` 存在产能缺口

---

## 二、核心场景冒烟测试步骤

### 场景 1：建立 Scenario

**操作步骤**：
1. 使用 Editor 账户登录。
2. 进入 Calculation Results 或 Dashboard 页面。
3. 点击 "Scenario Planning" 按钮。

**预期结果**：
- Scenario panel 展开，显示 baseline metrics（Revenue, BP Attainment, Capacity Utilization, Shortage Months）。
- 三个 multiplier 滑桿默认 1.0，comparison delta 为零或 "--"。

**检查点**：
- [ ] Scenario panel 成功展开
- [ ] Baseline metrics 正确显示
- [ ] 三个 multiplier 默认 1.0
- [ ] Delta 区域为空或零

---

### 场景 2：调整 Forecast Quantity Multiplier

**操作步骤**：
1. 将 "Forecast Qty Multiplier" 滑桿从 1.0 拖动到 1.15。
2. 等待 comparison metrics 刷新（~300ms debounce）。

**预期结果**：
- Revenue delta 约 +15%（绿色正值）。
- BP attainment delta 上升。
- Capacity utilization delta 上升。
- Shortage months 可能增加。

**手动验算**：baseline revenue $100,000 → scenario $115,000 → delta = +$15,000。

**检查点**：
- [ ] Revenue 增加约 15%
- [ ] BP attainment 增加
- [ ] Capacity utilization 增加
- [ ] 数值格式正确（USD）

---

### 场景 3：调整 Price Multiplier

**操作步骤**：
1. Reset scenario，或将 Qty Multiplier 重置为 1.0。
2. 将 "Price Multiplier" 拖到 0.9（降价 10%）。

**预期结果**：
- Revenue delta 约 -10%（红色负值）。
- BP attainment delta 下降。
- Capacity utilization delta 不变（价格不影响产能）。
- Shortage months 不变。

**检查点**：
- [ ] Revenue 减少约 10%
- [ ] BP attainment 下降
- [ ] Capacity utilization 不变
- [ ] Shortage months 不变

---

### 场景 4：调整 Capacity Multiplier

**操作步骤**：
1. Reset scenario。
2. 将 "Capacity Multiplier" 拖到 1.2（产能增 20%）。

**预期结果**：
- Revenue delta 不变（产能增加不创造需求）。
- Capacity utilization delta 下降（分母增大）。
- Shortage months 减少或消失。

**检查点**：
- [ ] Revenue 不变
- [ ] BP attainment 不变
- [ ] Capacity utilization 下降
- [ ] Shortage months 减少

---

### 场景 5：组合调整 Multiplier

**操作步骤**：
1. Reset scenario。
2. Qty = 1.1, Price = 0.95, Capacity = 1.1。

**预期结果**：
- Revenue delta = baseline * (1.1 * 0.95 - 1) = +4.5%。
- BP attainment delta 为正。
- Capacity utilization delta 接近零（需求增 10%，产能也增 10%）。

**检查点**：
- [ ] Revenue delta 约 +4.5%
- [ ] BP attainment delta 为正
- [ ] Capacity utilization delta 接近零
- [ ] 计算误差 < 0.01%

---

### 场景 6：Reset Scenario

**操作步骤**：
1. 将三个 multiplier 各设为非 1.0 的值。
2. 点击 "Reset to Baseline"。

**预期结果**：
- 所有 multiplier 回到 1.0，所有 delta 回到零，baseline 值不变。

**检查点**：
- [ ] Multiplier 回到 1.0
- [ ] Delta 回到零
- [ ] Baseline 不变
- [ ] UI 无闪烁

---

### 场景 7：关闭 Scenario

**操作步骤**：
1. 创建 scenario，调整 multiplier。
2. 点击关闭按钮（X 或 "Close Scenario"）。

**预期结果**：
- Panel 收起，回到纯 baseline 视图，无残留 UI。

**检查点**：
- [ ] Panel 关闭
- [ ] 无 scenario 残留 UI
- [ ] Baseline 数据不变

---

### 场景 8：DQ Caveat 显示

**前置条件**：workspace 存在 DQ warnings（SKU-003 缺失 layerCount，SKU-005 零单价）。

**操作步骤**：
1. 创建新 scenario。
2. 观察 Scenario panel 顶部。

**预期结果**：
- 黄色警告 banner："Baseline data has quality issues. Scenario results may be unreliable."
- Banner 不阻擋任何操作，可被 dismiss。

**检查点**：
- [ ] 黄色警告 banner 正确显示
- [ ] 不阻擋操作
- [ ] Banner 可 dismiss

---

### 场景 9：Viewer 阻擋

**操作步骤**：
1. 用 Editor 创建 scenario 并调整 multiplier。
2. 登出，登入 Viewer 账户。
3. 进入 Calculation Results / Dashboard。

**预期结果**：
- Viewer 看不到 "Scenario Planning" 按钮和 multiplier 控件。
- 如有 comparison snapshot，Viewer 可只读查看。

**进阶验证**：DevTools > Network 中手动构造 API 请求，验证被 firestore.rules 拒绝（403）。

**检查点**：
- [ ] 看不到 Scenario Planning 按钮
- [ ] 看不到 multiplier 控件
- [ ] 可看到只读 comparison（如有 snapshot）
- [ ] 底层 API 写入被拦截

---

### 场景 10：数据隔离验证

**操作步骤**：
1. 创建 scenario，将 Qty Multiplier 设为 2.0。
2. 导航到 `/products`、`/forecasts`、`/capacity` 页面，检查数据。
3. 返回 Calculation Results。

**预期结果**：
- Products / Forecasts / Capacity 数据均为原始 baseline 值，未被 multiplier 修改。
- 返回后 scenario state 仍在（multiplier 仍为 2.0）。

**检查点**：
- [ ] Products 数据未修改
- [ ] Forecasts 数据未修改
- [ ] Capacity 数据未修改
- [ ] 返回后 scenario state 仍在

---

### 场景 11：页面刷新后 Scenario 消失

**操作步骤**：
1. 创建 scenario，调整 multiplier。
2. 按 F5 刷新页面。

**预期结果**：
- Scenario 消失，回到纯 baseline 视图，无报错。

**检查点**：
- [ ] Scenario 消失
- [ ] 无报错
- [ ] Baseline 正常显示

---

### 场景 12：Multiplier 输入边界值

**操作步骤**：
1. 创建 scenario，在输入框依次输入 `0`、`0.5`、`2.0`、`2.5`、`-1`、`abc`。

**预期结果**：
- `0`：不 crash，revenue 降为 0。
- `0.5` / `2.0`：计算正确。
- `2.5`：自动 clamp 到 2.0。
- `-1`：clamp 到 0.5 或恢复上一个合法值。
- `abc`：恢复上一个合法值，不触发计算。

**检查点**：
- [ ] 输入 0 不 crash
- [ ] 0.5 和 2.0 计算正确
- [ ] 超出范围自动 clamp
- [ ] 非法值被拦截

---

### 场景 13：Top Changed Drivers 验证

**操作步骤**：
1. 创建 scenario，将 Qty Multiplier 设为 1.5。
2. 观察 Top Changed Drivers 列表。

**预期结果**：
- 显示 5 个（或全部，SKU < 5 时）变化最大的 SKU。
- 按 revenue impact 绝对值降序排列。
- 每个 driver 显示 SKU 名称、baseline、scenario、delta。

**手动验证**：找第一个 driver，计算 delta = (scenario qty * scenario price) - (baseline qty * baseline price)，与显示对比误差 < $0.01。

**检查点**：
- [ ] 列表显示 5 个 driver
- [ ] 按 impact 降序排列
- [ ] Delta 值正确
- [ ] 数值格式正确

---

## 三、冒烟测试通过判定准则

### 3.1 功能完整性
1. 所有 13 个场景的检查点全部通过。
2. 无任何场景导致页面 crash 或白屏。
3. 所有 comparison metrics 的计算结果与手动验算一致（误差 < 0.01%）。

### 3.2 数据安全性
1. 测试结束后 Firestore 控制台中未出现新 collection 或 document。
2. Products / Forecasts / Capacity / BP Targets / Parameters 原始数据未被修改。
3. Viewer 角色无法通过任何途径触发 scenario 写入。

### 3.3 性能基线
1. 1000 SKU workspace 创建 scenario < 2 秒。
2. Multiplier 拖动时 UI 不卡顿。
3. 内存增量 < 50MB（典型 workspace）。

### 3.4 通过标准
- **全部通过**：所有检查点通过，可进入正式验收。
- **部分通过**：1-3 个非关键检查点失败，记录 issue 后可有条件通过。
- **不通过**：安全红线失败、计算错误、或 > 3 个检查点失败，退回修复。

---

## 四、测试结果记录

| 场景 | 检查点 | 结果 | 备注 |
|------|--------|------|------|
| 1. 建立 Scenario | panel 展开、baseline metrics、multiplier 默认 1.0 | | |
| 2. Qty Multiplier | revenue +15%、BP up、utilization up | | |
| 3. Price Multiplier | revenue -10%、BP down、utilization 不变 | | |
| 4. Capacity Multiplier | revenue 不变、utilization down、shortage 减少 | | |
| 5. 组合调整 | revenue +4.5%、误差 < 0.01% | | |
| 6. Reset | multiplier 1.0、delta 归零 | | |
| 7. 关闭 | panel 关闭、无残留 UI | | |
| 8. DQ Caveat | 黄色 banner、不阻擋操作 | | |
| 9. Viewer 阻擋 | 无按钮、无控件、只读 comparison | | |
| 10. 数据隔離 | 原始数据未改、state 仍在 | | |
| 11. 页面刷新 | scenario 消失、无报错 | | |
| 12. 边界值 | 0 不 crash、clamp、非法值拦截 | | |
| 13. Top Drivers | 5 个 driver、降序、delta 正确 | | |

**测试执行人：** ____________ **日期：** ____________

**测试结论：** [ ] 全部通过  [ ] 有条件通过  [ ] 不通过

**遗留问题：**

---

## 五、常见问题排查

| 问题 | 排查方向 |
|------|---------|
| Scenario panel 无法展开 | 确认 Editor 角色；检查浏览器控制台 JS 错误；确认 workspace 有数据 |
| Comparison metrics 全部 "N/A" | 检查 baseline 数据完整性（forecast、capacity、BP targets、汇率）；检查 DQ issues |
| Multiplier 拖动时 UI 卡顿 | 检查 debounce 设置（建议 150-300ms）；检查 workspace SKU 数量 |
| Viewer 能看到 Scenario 按钮 | 检查用户角色配置；检查前端 `assertCanWrite(scope)` 逻辑 |
| 刷新后 scenario 仍在 | 检查是否有意外的 localStorage / sessionStorage 持久化或 URL 参数保存 |
