# v1.37.0 Scenario Planning MVP 验收清单

本清单用于 v1.37.0 Scenario Planning MVP 上线前的最终验收标准。Scenario Planning 允许用户在内存中进行 what-if 分析，通过调整 forecast quantity、price、capacity 三个乘数来观察对 revenue、BP attainment、capacity utilization 等指标的影响。所有 scenario 状态纯内存，不落盘 Firestore。

---

## 一、系统安全红线校验 (Security Gates)

* [ ] **红线 1**：未新增 Firestore collection / schema — `firestore.rules` diff 零变化，控制台无新 collection，现有 document 结构未扩展
* [ ] **红线 2**：Scenario state 从未触及 `skuService.saveSku`、`forecastService.saveForecast`、`capacityService.saveCapacityPlan`、`bpTargetService.saveBpTarget`、`parameterService.saveParameters` 或任何 `batch.write()` / `transaction.set()`
* [ ] **红线 3**：Baseline 原始数据未被 mutation — 乘数调整使用 safe shallow clone（spread operator + targeted object clone），**禁止** 全量 structuredClone / JSON.parse deep clone。关闭 scenario 后 baseline 与创建前完全一致
* [ ] **红线 3a**：MVP 只有 ONE in-memory scenario — 未实作 scenario list / rename / delete / switch / branch
* [ ] **红线 4**：未修改 `calculationEngine.ts`（或仅新增纯函数）；`firestore.rules` 零变化
* [ ] **红线 5**：未引入新的 npm dependency（`package.json` dependencies / devDependencies 无新增条目）

---

## 二、Scenario CRUD 功能验收

### 创建
* [ ] Editor 角色在 Calculation Results / Dashboard 可见 "Scenario Planning" 按钮
* [ ] 点击后 Scenario panel 展开，自动从 baseline safe shallow clone 数据（spread operator，非 structuredClone）
* [ ] 1000 SKU workspace 创建 scenario < 2 秒

### Multiplier 调整
* [ ] `forecastQtyMultiplier` 滑桿范围 0.5 ~ 2.0，默认 1.0，步进 0.01
* [ ] `priceMultiplier` 滑桿范围 0.5 ~ 2.0，默认 1.0，步进 0.01
* [ ] `capacityMultiplier` 滑桿范围 0.5 ~ 2.0，默认 1.0，步进 0.01
* [ ] 滑桿与数字输入框双向同步；超出范围自动 clamp；非法字符即时拦截

### 即时计算
* [ ] Multiplier 变更后 comparison metrics 在 300ms 内刷新（debounce）
* [ ] 拖动滑桿 UI 不卡顿、不闪烁，无 layout shift

### Reset 与关闭
* [ ] "Reset to Baseline" 后三个 multiplier 回到 1.0，所有 delta 归零
* [ ] 关闭 scenario 后 panel 收起，回到纯 baseline 视图，重新打开时 multiplier 回到 1.0

---

## 三、Comparison Metrics 验收

* [ ] **Revenue delta** = scenario - baseline，正值绿色、负值红色、零灰色，USD 货币格式（千分位，两位小数）
* [ ] **BP attainment delta** 以百分点（pp）显示，如 "+3.2 pp"；BP target 为 0 时显示 "N/A"
* [ ] **Capacity utilization delta** 百分比格式，超 100% 时高亮标红
* [ ] **Shortage months** 按时间顺序列出 utilization > 100% 的月份，新增标红、消除标绿
* [ ] **Top changed drivers** 列出变化最大的 5 个 SKU，按 revenue impact 绝对值降序，显示 baseline / scenario / delta
* [ ] 数值格式：currency `$X,XXX.XX`、percent `XX.X%`、数量 `X,XXX`、大数 abbreviated（如 `$1.2M`）

---

## 四、Currency / BP Unit 验收

* [ ] Revenue 始终以 USD 显示；TWD 计价 SKU 正确使用 Parameters 汇率转换
* [ ] BP targets 以 million TWD 显示（如 "NT$50.0M"）
* [ ] BP attainment = scenario revenue (TWD) / BP target (TWD) * 100%；手动验算误差 < 0.01%
* [ ] 汇率缺失时（DQ issue）revenue 显示 "N/A"，不 crash

---

## 五、DQ Caveat 显示验收

* [ ] Baseline 有 DQ issues 时，Scenario panel 顶部显示黄色警告 banner："Baseline data has quality issues. Scenario results may be unreliable."
* [ ] Banner 可被 dismiss，每次创建新 scenario 时重新出现
* [ ] Banner 不阻擋 multiplier 调整、comparison 查看、reset、关闭操作

---

## 六、Viewer Read-Only 验收

* [ ] Viewer 看不到 "Scenario Planning" 按钮、multiplier 滑桿、"Reset to Baseline" 等操作按钮
* [ ] 如果已有 comparison snapshot，Viewer 可只读查看数值，无交互编辑元素
* [ ] `assertCanWrite(scope)` 拦截生效；绕过前端直接调 API 被 firestore.rules 拒绝（403）

---

## 七、Performance 验收

* [ ] 1000 SKU workspace 创建 scenario < 2 秒；multiplier 调整后计算 < 500ms；Top Drivers 排序 < 200ms
* [ ] Multiplier 拖动 UI 60fps，debounce 150-300ms
* [ ] 内存增量 < 50MB（典型 200 SKU）；关闭后释放无泄漏；反复创建/关闭 10 次不持续增长

---

## 八、Edge Cases

### Multiplier 边界值
* [ ] Multiplier = 1.0 时 scenario 与 baseline 完全一致
* [ ] Multiplier = 0 时不 crash，revenue/utilization 降为 0
* [ ] Multiplier = 0.5 / 2.0 时计算正确；三者同时极端值不 crash

### 空数据场景
* [ ] 空 workspace（无 SKU/forecast）创建 scenario 不 crash，显示空状态提示
* [ ] 只有 SKU 无 forecast 的 workspace 创建 scenario 不 crash

### 状态生命周期
* [ ] 页面刷新（F5）后 scenario 消失（预期行为），无报错
* [ ] 导航离开后 scenario 消失（预期行为）
* [ ] 浏览器后退/前进不导致状态混乱；多 tab 互不影响

### 计算边界
* [ ] BP target = 0 时 attainment 显示 "N/A"；exchange rate = 0 时跨币种计算不 crash
* [ ] Forecast 全 0 或 capacity 全 0 时不 crash

---

## 九、Build / Test / Lint 验收

* [ ] `npm run test` 全数通过，无 skip 或 xfail
* [ ] `npm run lint --quiet` 零错误
* [ ] `npm run build` 成功，warning 数量不增加
* [ ] 新增 scenario 单元测试覆盖率 > 80%，含边界值测试（0, 0.5, 1.0, 2.0）

---

## 验收结论

| 检查类别 | 总项数 | 通过数 | 失败数 | 结论 |
|---------|--------|--------|--------|------|
| 一、安全红线 | 5 | | | |
| 二、Scenario CRUD | 9 | | | |
| 三、Comparison Metrics | 6 | | | |
| 四、Currency / BP Unit | 4 | | | |
| 五、DQ Caveat | 3 | | | |
| 六、Viewer Read-Only | 3 | | | |
| 七、Performance | 3 | | | |
| 八、Edge Cases | 9 | | | |
| 九、Build / Test / Lint | 4 | | | |
| **合计** | **46** | | | |

**验收签字：**
- QA 负责人：________ 日期：________
- 产品负责人：________ 日期：________
- 技术负责人：________ 日期：________
