# v1.35.0 Data Quality Visibility — 只读发布验收报告 (Release Review)

## 一、 发布审查结论

- **发布验收判定**：**[Pass (通过) / Conditional Pass (有条件通过) / Fail (不通过)]**
- **是否需要 v1.35.1 Hotfix**：**[是 / 否]**
- **是否存在 P0/P1 问题**：**[X] 个**
- **是否建议收官 v1.35 并进入下一阶段**：**[是 / 否]**

---

## 二、 核心安全红线与隔离校验 (红线隔离)

本版本在将数据质量警示前移至各输入页面时，是否严守了安全边界：

- [ ] **红线 1：零持久化污染 (Zero DB Write)**
  - 校验：数据质量警示是否仅在前端渲染层进行临时 Virtual DOM 的展示？
  - 确认：**绝对没有**在向 Firestore 写入或 React State 内部传递数据时追加任何冗余的 DQ 标记字段。
- [ ] **红线 2：未重写或复制诊断逻辑**
  - 校验：所有输入页面的 DQ 检测是否统一直接拉取 `core/dataQuality.ts` 共享诊断引擎产出的 issues？
  - 确认：各页面组件内部 **绝对没有** 重复手写或散落 ad-hoc 的数据质量评估逻辑。
- [ ] **红线 3：Viewer 角色 true read-only 隔离**
  - 校验：协作 Viewer 权限下，是否能够在各个输入页面正常看到所有的彩色 Error/Warning 图标、Alert 横幅与 Tooltip？
  - 确认：Viewer 状态下，所有的输入修改控件与保存按钮是否依然保持置灰 (`disabled`)，无越权风险。

---

## 三、 性能与渲染防线校验 (性能红线)

- [ ] **防线 1：避免在 Cell Render 中高频计算 DQ**
  - 校验：当 Table 行数较多（如 Forecasts Lab 表格有 100+ SKU，跨越 15 年）时，是否将主 DQ 计算 `buildDataQualitySummary` **提取至 Table 渲染之前进行一次性统一计算**（如在页面加载、数据变更防抖或 Context 中统一触发），然后在 Table render 路径内仅进行轻量级的 ID O(1) 查找？
  - 确认：没有在单元格 (Cell) 或行 (Row) 的每一帧 render 函数中重复跑全表的 `buildDataQualitySummary`。

---

## 四、 页面级 DQ Visibility 警示覆盖性审查

针对 Products、Forecasts、Capacity、BP Targets、Parameters 五大页面的前移展示进行逐一校验：

### 1. Products.tsx (产品 SKU 页面)
- [ ] 属性不完整 SKU 是否成功渲染红色 `<ExclamationCircleOutlined />` 错误图标？
- [ ] Tooltip 是否支持多语言，且清晰指示了具体的缺失生产属性（如：`chipLengthMm`, `layerCount`）？
- [ ] 零单价 SKU 是否高亮黄色 Warning 图标并提示“单价为 0”？
- [ ] 不支持的币别是否显示黄色警示？

### 2. Forecasts.tsx / ForecastsSpreadsheetLab.tsx (需求预测页)
- [ ] 孤儿预测（引用的 `skuId` 不存在）是否高亮浅红底色并标注红色 Error 图标与 Tooltip 详细解释？
- [ ] 某 SKU 在某年份的数据不满足 12 个月（1-11个月之间）时，是否在年份选择器旁展示黄色警告图标，且 Tooltip 包含不完整年份月份的提醒？
- [ ] 零价格预测是否能正确呈现 Warning？

### 3. CapacityPlan.tsx / CapacitySpreadsheet.tsx (产能规划页)
- [ ] 发现存在预测需求月份而系统缺失产能配置时，页面顶部的 ActionBar 下方是否渲染了红色的 Alert 警示横幅，且准确罗列了缺失产能的月份？
- [ ] 高层数 SKU 需求 vs BU 产能为零时，对应月份的 `buPanelPerDay` 单元格是否展示红色警告边框与图标，Tooltip 包含详细的瓶颈提示？
- [ ] 产能在没有预测需求的月份配置时，是否显示蓝色 Info 提示？

### 4. BpTargets.tsx (营业目标页)
- [ ] 某年份配置了营业目标但没有录入任何预测时，该年份行首是否展示黄色 Warning 提示“营业目标与预测脱节”？
- [ ] 某年份有预测需求但营业目标为 0 或未设置时，是否在页面顶部展示了黄色 Alert 警示？

### 5. Parameters.tsx (参数设定页)
- [ ] 在 constant/yearly 汇率模式下，若 SKU 或 Forecast 中存在 TWD/CNY 计价的产品而未配置对应的 Twd/Cny 汇率（或汇率小于等于 0）时，是否在汇率设定卡片标题旁或对应输入框展示红色 Error 图标与 Tooltip 详情？

---

## 五、 版本同步与文档闭环审查

| 档案 | 变更前 | 变更后 | 状态 |
|---|---|---|---|
| `frontend/package.json` | `"1.34.0"` | `"1.35.0"` | [ ] 同步 |
| `frontend/package-lock.json` | `"1.34.0"` | `"1.35.0"` | [ ] 同步 |
| `frontend/src/App.tsx` | `v1.34.0` | `v1.35.0` | [ ] 同步 |
| `frontend/src/services/snapshotService.ts` | `v1.34.0` | `v1.35.0` | [ ] 同步 |
| `README.md` | v1.34.0 日志 | 补齐 v1.35.0 日志 | [ ] 同步 |

---

## 六、 自动化保障与构建校验

- **单元测试 (`npm run test`)**：**[Pass / Fail]** (测试套件 100% Passed，没有引入任何计算层与 UI 层的回归报错)。
- **风格检查 (`npm run lint -- --quiet`)**：**[Pass / Fail]** (零 ESLint Warnings，代码规范极佳)。
- **生产环境打包 (`npm run build`)**：**[Pass / Fail]** (Vite 编译及打包成功通过，无 TypeScript 声明或编译报错)。

---

## 七、 详细问题记录与反馈

### P0 (阻断级/崩溃) 问题：
- *无 / [记录具体问题]*

### P1 (体验严重受损/性能) 问题：
- *无 / [记录具体问题]*

### P2 (视觉不一致/文档滞后) 问题：
- *无 / [记录具体问题]*
