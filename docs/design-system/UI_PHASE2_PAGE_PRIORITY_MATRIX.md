# ABF Capacity Calculator — UI Phase 2 页面优先级矩阵

**版本**: v1.0
**日期**: 2026-05-29
**用途**: UI Phase 2 各页面改造优先级和清单

---

## 一、页面优先级总览

| 优先级 | 页面 | 改造范围 | 预估工作量 | 依赖 |
|--------|------|---------|-----------|------|
| P0 | Results | 全面改造 | 8-10h | 无 |
| P0 | Operations | 全面改造 | 6-8h | 无 |
| P1 | Dashboard | 中等改造 | 4-5h | 无 |
| P1 | Scenario | 中等改造 | 3-4h | 无 |
| P1 | AI Copilot | 中等改造 | 3-4h | 无 |
| P2 | Products | 轻度改造 | 2-3h | 无 |
| P2 | Forecasts | 轻度改造 | 2-3h | 无 |
| P2 | Capacity | 轻度改造 | 2-3h | 无 |
| P2 | BP Targets | 轻度改造 | 1-2h | 无 |
| P2 | Parameters | 轻度改造 | 1-2h | 无 |
| P3 | Login | 最小改造 | 0.5h | 无 |
| P3 | Setup | 最小改造 | 0.5h | 无 |

---

## 二、各页面改造清单

### P0: Results 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| 提取内联样式 | 97 个 inline style → CSS 模块 | 4-5h |
| 颜色标准化 | 硬编码颜色 → theme tokens | 1h |
| Tab 一致性 | 统一 Tab 样式和间距 | 0.5h |
| EmptyState | 无数据时的空状态 | 0.5h |
| 响应式 KPI 卡片 | 修复 xs/sm/md 断点 | 1h |
| **小计** | | **8-10h** |

### P0: Operations 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| 提取内联样式 | 57 个 inline style → CSS 模块 | 3-4h |
| 颜色标准化 | 硬编码颜色 → theme tokens | 0.5h |
| 流程步骤样式 | 统一 stepper 样式 | 0.5h |
| 异常列表样式 | 统一异常卡片样式 | 0.5h |
| EmptyState | 无数据时的空状态 | 0.5h |
| **小计** | | **6-8h** |

### P1: Dashboard 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| KPI 卡片标准化 | 统一卡片样式和间距 | 1h |
| 图表样式统一 | 统一图表颜色和字体 | 1h |
| Alert 样式 | 统一警告样式 | 0.5h |
| 响应式布局 | 修复移动端布局 | 1h |
| **小计** | | **4-5h** |

### P1: Scenario 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 .abf-page | 页面容器 | 0.5h |
| 表单样式 | 统一表单布局 | 1h |
| 结果展示 | 统一结果卡片样式 | 1h |
| DQ 警告样式 | 统一警告样式 | 0.5h |
| **小计** | | **3-4h** |

### P1: AI Copilot 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 .abf-page | 页面容器 | 0.5h |
| 消息样式 | 统一消息气泡样式 | 1h |
| 快速问题按钮 | 统一按钮样式 | 0.5h |
| 工具结果显示 | 统一结果卡片样式 | 1h |
| **小计** | | **3-4h** |

### P2: Products 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| ActionBar 迁移 | 工具栏 → ActionBar | 0.5h |
| DQ Badge 样式 | 统一 Badge 样式 | 0.5h |
| Modal 表单 | 统一 Modal 布局 | 0.5h |
| **小计** | | **2-3h** |

### P2: Forecasts 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| ActionBar 迁移 | 工具栏 → ActionBar | 0.5h |
| DQ Badge 样式 | 统一 Badge 样式 | 0.5h |
| Tab 样式 | 统一 Tab 样式 | 0.5h |
| **小计** | | **2-3h** |

### P2: Capacity 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| ActionBar 迁移 | 工具栏 → ActionBar | 0.5h |
| 表格样式 | 统一表格样式 | 0.5h |
| 图表样式 | 统一图表样式 | 0.5h |
| **小计** | | **2-3h** |

### P2: BP Targets 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| 表格样式 | 统一表格样式 | 0.5h |
| 年份指示器 | 统一指示器样式 | 0.5h |
| **小计** | | **1-2h** |

### P2: Parameters 页面

| 改造项 | 说明 | 工作量 |
|--------|------|--------|
| 添加 PageHeader | 页面标题和描述 | 0.5h |
| Card 样式 | 统一 Card 样式 | 0.5h |
| 表单样式 | 统一表单布局 | 0.5h |
| **小计** | | **1-2h** |

---

## 三、依赖关系

```
无外部依赖，各页面可独立改造。

建议顺序：
1. Results (P0) — 最复杂，优先处理
2. Operations (P0) — 第二复杂
3. Dashboard (P1) — 高频访问
4. Scenario (P1) — 决策核心
5. AI Copilot (P1) — 差异化功能
6. Products/Forecasts/Capacity (P2) — 输入页面
7. BP Targets/Parameters (P2) — 辅助页面
8. Login/Setup (P3) — 最低优先级
```

---

## 四、验收标准

### 通用验收标准

- [ ] 所有页面使用 `.abf-page` 容器
- [ ] 所有页面使用 `PageHeader` 组件
- [ ] 所有内联样式提取到 CSS 模块
- [ ] 所有硬编码颜色替换为 theme tokens
- [ ] 所有空状态使用 `EmptyState` 组件
- [ ] 所有加载状态使用 `PageLoading` 组件
- [ ] 所有 view mode 使用 `Segmented` 控件
- [ ] 所有表格使用统一的 pageSize (20)
- [ ] 所有 Card 使用统一的 bordered 和 size

### 页面级验收标准

| 页面 | 验收项 |
|------|--------|
| Results | 内联样式 < 5 个，PageHeader 采用，KPI 响应式 |
| Operations | 内联样式 < 5 个，PageHeader 采用，流程步骤样式统一 |
| Dashboard | PageHeader 采用，KPI 卡片标准化，图表颜色统一 |
| Scenario | .abf-page 采用，表单样式统一，结果展示标准化 |
| AI Copilot | .abf-page 采用，消息样式统一，工具结果标准化 |
| Products | PageHeader 采用，ActionBar 迁移，DQ Badge 样式统一 |
| Forecasts | PageHeader 采用，ActionBar 迁移，DQ Badge 样式统一 |
| Capacity | PageHeader 采用，ActionBar 迁移，表格样式统一 |
| BP Targets | PageHeader 采用，表格样式统一，年份指示器标准化 |
| Parameters | PageHeader 采用，Card 样式统一，表单布局标准化 |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: UI Phase 2 Agent
