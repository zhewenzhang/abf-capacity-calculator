# v1.64.1 Scenario Result UI and Capacity Gap Fix Command

## 任务目标

修复 `/scenario` 页面模拟结果中的两个明显问题：

1. 顶部质量警告 Alert 与页面标题/描述区域发生视觉挤压或重叠。
2. 模拟结果 KPI「产能缺口」显示为 `OK Panel PNL`，这是错误文案/字段拼接，应改为清楚的数值与状态。

---

## 必须中文回报

最终回报必须包含：

1. 是否完成
2. 开始时间 / 结束时间 / 总耗时
3. token 消耗量（不可见写“当前环境不可见”）
4. 根因说明
5. 修改文件清单
6. 修复后的显示规则
7. test / lint / build / verify 结果
8. 是否修改红线文件
9. commit hash
10. push branch
11. 是否建议 AGY 验收

未完成只能输出「进度回报」。

---

## Phase 0: 创建日志

创建并持续更新：

`docs/release/V1_64_1_SCENARIO_RESULT_UI_AND_CAPACITY_GAP_FIX_LOG.md`

---

## Phase 1: 基线要求

必须从最新 `main` 创建分支：

```bash
git checkout main
git pull origin main
git checkout -b xiaomi/v1-64-1-scenario-result-ui-capacity-gap-fix
```

先执行：

```bash
cd frontend
npm run verify:release-baseline
```

如果 baseline verify 不通过，停止并中文回报，不要继续。

---

## Phase 2: 根因调查

重点检查：

- `frontend/src/pages/ScenarioPlanning.tsx`
- `frontend/src/core/scenarioTemplateAnalysis.ts`
- `frontend/src/core/scenarioTemplates.ts`
- 相关 KPI formatter / capacity gap formatter
- `frontend/src/i18n/zhTW.ts`
- `frontend/src/i18n/en.ts`

必须查清：

1. `OK Panel PNL` 是从哪里来的？
   - 是 status + unit 拼接？
   - 是 i18n key 漏翻译？
   - 是 capacity gap 数值为 0 时 fallback 错误？
   - 是 panel 单位和 PNL 缩写混用？

2. 「产能缺口」的正确字段应该是什么？
   - capacity gap total?
   - max monthly gap?
   - gap percent?
   - capacity slack?

3. 顶部 Alert 为什么压住标题/描述？
   - PageShell spacing 问题？
   - Alert 放置位置错误？
   - Tabs / Alert margin 不足？
   - position / sticky / z-index 问题？

必须把根因写入 log。

---

## Phase 3: KPI 显示规则

「产能缺口」KPI 必须改成明确规则。

### 如果有实际缺口

显示：

- 主值：`12,300 panels`
- 副文案：`最大月度缺口` 或 `延迟期间累计缺口`

### 如果没有缺口，但产能余裕下降

显示：

- 主值：`0 panels`
- 副文案：`未触发短缺，产能余裕下降`

### 如果是状态

状态只能作为 Badge 显示：

- `OK`
- `压力等级：低 / 中 / 高`

不得把状态和单位拼成 `OK Panel PNL`。

### 单位规则

- panel 数量显示 `panels`
- 金额显示 `M NTD`
- 不得使用 `PNL`
- 不得出现 `M USD` / `M TWD` / `NT$` / `$` / `¥`

---

## Phase 4: 顶部 Alert 布局修复

修复要求：

1. 页面标题、描述、质量警告、Tabs 之间必须有稳定间距。
2. Alert 不得覆盖或挤压标题描述。
3. Alert 宽度与内容容器一致。
4. Alert 关闭按钮不得跑到页面边缘。
5. 在 desktop 与 375px mobile 下不重叠。

建议结构：

```tsx
<PageShell>
  <PageHeader />
  <QualityAlert />
  <Tabs />
  <Content />
</PageShell>
```

不要使用绝对定位处理这个 Alert。

---

## Phase 5: i18n

补齐或修复所有新增/错误文案：

- `frontend/src/i18n/zhTW.ts`
- `frontend/src/i18n/en.ts`

不得出现 raw key 或英文混杂，例如：

- `Panel PNL`
- `capacity gap ok`
- 未翻译字段名

---

## Phase 6: 测试要求

至少新增或更新测试：

1. capacity gap 为 0 时，不显示 `OK Panel PNL`
2. capacity gap 为 0 时，显示 `0 panels`
3. 有缺口时，显示千分号 panel 数量
4. status `OK` 只作为 Badge，不拼到单位中
5. 页面不出现 `Panel PNL`
6. 页面不出现旧金额单位
7. verify baseline 通过

---

## Phase 7: 验证

必须执行：

```bash
cd frontend
npm run lint -- --quiet
npm run build
npm test -- --run
npm run verify:release-baseline
```

如果 functions 存在：

```bash
cd functions
npm run build
```

全部必须 PASS。

---

## Phase 8: Git

Commit message：

`fix: repair scenario result alert layout and capacity gap display`

Push branch：

`origin/xiaomi/v1-64-1-scenario-result-ui-capacity-gap-fix`

不要 merge main。
不要 deploy。
等待 AGY 验收。

---

## 红线

不得修改：

- `firestore.rules`
- `frontend/src/core/calculationEngine.ts`
- DeepSeek Secret / API key
- Firebase Auth 逻辑

不得降低 verify guard。
不得恢复旧 UI。
不得从旧分支开发。
