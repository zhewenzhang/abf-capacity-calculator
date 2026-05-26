# CC V1.35.0 Data Quality Visibility 实施 Prompt (Actionable Instructions)

你是 ABF Capacity Calculator 的高级前端架构师。请遵循本 Prompt 中的详细步骤与约束，在不修改任何底层计算、服务层或安全规则的前提下，完美实现 `v1.35.0` 数据质量前移 (Data Quality Visibility Shift-Left) 的 UI 升级。

---

## 核心技术原则 (Strict Guidelines)

1. **零逻辑重复 (Dry Principle)**：
   不要在 React 组件页面手写任何复杂的 DQ 检测规则。必须统一引入并调用 `frontend/src/core/dataQuality.ts` 中的主诊断引擎：
   ```typescript
   import { buildDataQualitySummary } from '../core/dataQuality';
   ```
2. **零数据污染 (Zero Write Mutation)**：
   数据质量的警示完全在 React 渲染层通过 Virtual DOM 追加图标和类名呈现，**绝对不要**在保存数据到 Firestore 或更新内部编辑 State 时追加任何 DQ 状态属性。
3. **多人协作 read-only 隔离防护**：
   在美化和展示 DQ 图标的同时，对于 `writable === false` (Viewer 角色) 的拦截逻辑必须维持 100% 置灰，做到“能看不能改”。

---

## 具体实现步骤 (Implementation Checklist)

### 步骤 1：全量数据汇聚与共享上下文
在 Products、Forecasts、Capacity、BP Targets、Parameters 五大页面中，渲染时都需要拉取 `buildDataQualitySummary` 所需的 `DataQualityInput` 完整要素：
```typescript
const dqSummary = buildDataQualitySummary({
  skus,             // 当前页面或 Context 中的 skus 数组
  forecasts,        // 当前页面或 Context 中的 forecasts 预测数组
  capacityPlans,    // 当前页面或 Context 中的 capacityPlans 产能规划数组
  params,           // 当前页面或 Context 中的全局 parameters 实体
});
```
*提示：如个别页面数据未全量拉取，可在页面初始化时，以轻量只读的 `get` 接口做后台静默拉取汇聚。*

---

### 步骤 2：Products.tsx (产品 SKU 页面) 集成
1. 过滤出 products 域的 issues：
   ```typescript
   const prodIssues = dqSummary.issues.filter(i => i.domain === 'products');
   ```
2. 在 SKU Table 的 `columns` 定义中，对 `skuCode` 或 `unitPrice` 的 `render` 函数进行增强：
   - 若 `prodIssues` 中存在包含 `sku-missing-attr-${record.id}` 的 issue：
     - 在 SkuCode 旁边追加红色的 `<ExclamationCircleOutlined className="abf-text-danger" />` 图标。
     - 用 AntD `<Tooltip title={t(issue.detailMessage.key, issue.detailMessage.params)}>` 进行包裹，实现鼠标悬浮显示具体的缺失字段（多语言）。
   - 若存在 `sku-zero-price-${record.id}`：
     - 在单价单元格上高亮展示黄色警告图标，且背景设为浅黄。

---

### 步骤 3：Forecasts.tsx 与 ForecastsSpreadsheetLab.tsx (需求预测页) 集成
1. 过滤出 forecast 域的 issues：
   ```typescript
   const fcIssues = dqSummary.issues.filter(i => i.domain === 'forecast');
   ```
2. 在 Forecasts 渲染列表时：
   - 检查 `forecast-orphan-sku-${fc.id}`：若对应预测的 SKU 在系统中不存在，则该行应用 `.dq-error-row` 类（浅红底色），且在 SKU Code 旁放置红色错误图标与 Tooltip。
   - 检查 `forecast-partial-year-${skuId}-${year}`：若存在该警告，则在年份选择器（或者 SKU 编辑卡片头部）高亮显示黄色警告图标，提示“年度预测数据不完整”。

---

### 步骤 4：CapacityPlan.tsx (产能规划页) 集成
1. 过滤出 capacity 域的 issues。
2. **整页级缺失 Alert**：
   - 检查 `forecast-missing-capacity` 类型的 issue。若存在，在顶部的 ActionBar 下方，渲染一个醒目的红色 `<Alert message={...} type="error" className="abf-alert-page" showIcon />` 警告条，清晰罗列出缺失配置的月份。
3. **行级 BU 产能瓶颈警示**：
   - 检查 `bu-demand-zero-capacity`：若当前月份存在此 issue，则在产能 Table 对应行的 `buPanelPerDay` 单元格中追加红色的警告边框与 Error 图标，悬浮提示“BU 产能严重缺失瓶颈”。

---

### 步骤 5：BpTargets.tsx (营业目标页) 集成
1. 过滤出 bp 域的 issues。
2. **跨表脱节 Warning**：
   - 检查 `bp-target-zero-forecast-${year}`：若存在此 issue，在營業目標表格对应年份的行首或单元格中渲染黄色警告图标，Tooltip 提示“营业目标与预测脱节”。
3. **缺失 BP Target 的整页 Alert**：
   - 检查 `forecast-missing-bp-target-${year}`：若存在，在页面顶部追加黄色的 Alert 提示条。

---

### 步骤 6：Parameters.tsx (参数设定页) 集成
1. 过滤出 currency 与 parameters 域的 issues。
2. 检查 `missing-constant-twd-rate`、`missing-yearly-twd-rate` 等汇率配置缺陷：
   - 若存在此 issue，在“币别与汇率设定”Card 标题旁直接渲染红色的 Error 警告图标，Tooltip 指明：“由于系统中存在 TWD 计价的产品，必须配置合法的 TWD 汇率”。

---

## 步骤 7：单元测试与构建验证

在交付 v1.35.0 之前，请务必执行以下指令，确保 100% 通过：
```bash
npm run test                  # 保证所有单元测试（包含 formatters 与 dataQuality）全绿通过
npm run lint -- --quiet       # 保证零风格警告（Zero Warnings）
npm run build                 # 保证生产环境 Vite 成功编译打包
```
