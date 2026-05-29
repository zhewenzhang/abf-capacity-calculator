# ABF Capacity Calculator — UI Phase 2 产品化规格

**版本**: v1.0
**日期**: 2026-05-29
**用途**: UI Phase 2 改造规划

---

## 一、当前 UI 最大问题分析

### 问题优先级

| 优先级 | 问题 | 影响范围 | 修复难度 |
|--------|------|---------|---------|
| P0 | 内联样式泛滥 (154 处) | 维护性 | 中 |
| P0 | PageHeader 未全面采用 (12/13 页面) | 一致性 | 低 |
| P1 | 颜色硬编码 | 主题化 | 低 |
| P1 | View mode 控件不统一 | 一致性 | 低 |
| P1 | EmptyState 未全面采用 | 用户体验 | 低 |
| P2 | 加载状态不统一 | 用户体验 | 低 |
| P2 | Currency 显示不一致 | 一致性 | 低 |
| P2 | Card bordered/size 不一致 | 一致性 | 低 |
| P3 | Mobile 适配不足 | 响应式 | 高 |

### 核心问题详解

#### 1. 内联样式泛滥

- **CalculationResults.tsx**: 97 个 inline style
- **DailyOperationsWorkbench.tsx**: 57 个 inline style
- **影响**: 难以维护、无法主题化、代码可读性差
- **建议**: 提取到 CSS 模块或 styled-components

#### 2. PageHeader 未采用

- **当前状态**: 只有 ScenarioPlanning 使用 PageHeader
- **影响**: 每个页面标题/描述渲染方式不同
- **建议**: 全面采用 PageHeader 组件

#### 3. 颜色硬编码

- **问题代码**: `#cf1322`, `#3f8600`, `#52c41a`
- **影响**: 无法主题化、暗色模式困难
- **建议**: 使用 `theme.useToken()` 获取颜色

---

## 二、信息架构改造建议

### 导航结构

```
首页 (Dashboard)
├── 数据输入
│   ├── Products (SKU 管理)
│   ├── Forecasts (预测管理)
│   ├── Capacity (产能配置)
│   ├── BP Targets (营业目标)
│   └── Parameters (参数设置)
├── 分析决策
│   ├── Results (计算结果)
│   ├── Scenario (场景模拟)
│   └── AI Copilot (AI 助手)
├── 运营管理
│   ├── Operations (运营工作台)
│   └── Reports (管理报告)
└── 实验功能
    ├── Products Lab
    ├── Forecasts Lab
    └── Capacity Lab
```

### 页面结构规范

每个页面应遵循以下结构：

```
<div className="abf-page">
  <PageHeader
    title={t('page.title')}
    description={t('page.description')}
    actions={<ActionBar>...</ActionBar>}
  />
  <div className="abf-section">
    {/* 主要内容 */}
  </div>
</div>
```

---

## 三、操作按钮一致性规范

### 按钮类型

| 类型 | 用途 | 样式 |
|------|------|------|
| Primary | 主要操作 (保存、运行) | `type="primary"` |
| Default | 次要操作 (取消、返回) | `type="default"` |
| Link | 导航操作 (查看详情) | `type="link"` |
| Danger | 危险操作 (删除) | `type="primary" danger` |

### 按钮位置

- **页面级操作**: PageHeader 的 actions 区域
- **表格行操作**: Table 的 actions 列
- **表单操作**: 表单底部，左对齐

### 按钮文案规范

| 操作 | 中文 | 英文 |
|------|------|------|
| 保存 | 保存 | Save |
| 取消 | 取消 | Cancel |
| 删除 | 删除 | Delete |
| 运行 | 运行分析 | Run Analysis |
| 导出 | 导出 | Export |
| 导入 | 导入 | Import |
| 创建 | 新建 | Create |
| 编辑 | 编辑 | Edit |

---

## 四、Empty State 设计规范

### 使用场景

| 场景 | 组件 | 说明 |
|------|------|------|
| 无数据 | `<EmptyState>` | 首次使用或数据为空 |
| 加载中 | `<PageLoading>` | 页面初始加载 |
| 表格空 | Table `locale.emptyText` | 表格无数据 |
| 搜索无结果 | `Empty` | 搜索/筛选无匹配 |

### EmptyState 组件规范

```tsx
<EmptyState
  icon={<InboxOutlined />}
  title={t('empty.title')}
  description={t('empty.description')}
  action={<Button type="primary">{t('empty.action')}</Button>}
/>
```

---

## 五、Mobile / Narrow Viewport 策略

### 断点设计

| 断点 | 宽度 | 布局 |
|------|------|------|
| xs | < 576px | 单列、堆叠 |
| sm | 576-767px | 单列、紧凑 |
| md | 768-991px | 双列 |
| lg | 992-1199px | 标准布局 |
| xl | ≥ 1200px | 宽屏布局 |

### 适配策略

1. **表格**: 水平滚动，固定左侧列
2. **表单**: 响应式布局 (Row/Col)
3. **图表**: 自适应宽度，隐藏次要标签
4. **导航**: 移动端折叠侧边栏
5. **操作**: 移动端使用 Dropdown 替代 Button Group

---

## 六、Risk / Warning 视觉层级

### 严重度颜色

| 级别 | 颜色 | 用途 |
|------|------|------|
| Critical | Red (`colorError`) | 严重问题、必须处理 |
| Warning | Orange (`colorWarning`) | 警告、需要关注 |
| Info | Blue (`colorInfo`) | 信息、建议操作 |
| Success | Green (`colorSuccess`) | 正常、已完成 |

### 视觉元素

| 元素 | Critical | Warning | Info | Success |
|------|----------|---------|------|---------|
| Badge | 🔴 红色 | 🟠 橙色 | 🔵 蓝色 | 🟢 绿色 |
| Alert | `type="error"` | `type="warning"` | `type="info"` | `type="success"` |
| Tag | `color="red"` | `color="orange"` | `color="blue"` | `color="green"` |
| Text | `color: red` | `color: orange` | `color: blue` | `color: green` |

---

## 七、Copilot 嵌入方式

### 当前状态

- AI Copilot 是独立页面 `/copilot`
- 通过侧边栏导航访问
- 支持关键词路由和快速问题按钮

### 嵌入建议

1. **全局浮窗**: 右下角浮窗，随时呼出
2. **页面内嵌**: 在 Results、Operations 等页面内嵌 Copilot 面板
3. **上下文感知**: 根据当前页面自动调整 Copilot 建议

### 推荐方案

**Phase 1**: 保持独立页面，增加"在当前页面打开"按钮
**Phase 2**: 实现全局浮窗，支持上下文感知

---

## 八、Management Report 呈现方式

### 当前状态

- 支持 Markdown 和 JSON 导出
- 支持每日和每周报告
- 脱敏处理

### 呈现建议

1. **在线预览**: 在页面内预览报告内容
2. **一键导出**: 支持 PDF/Excel 导出
3. **定时生成**: 支持自动生成和发送
4. **模板定制**: 支持报告模板定制

---

## 九、不要现在修的 UI 债务

| 项目 | 原因 | 延迟到 |
|------|------|--------|
| Mobile 完全适配 | 工作量大，优先级低 | v1.50+ |
| 暗色模式 | 需要全面主题化 | v1.52+ |
| 自定义图表主题 | 当前图表够用 | v1.52+ |
| 动画和过渡效果 | 非核心需求 | v1.53+ |
| 国际化扩展 (日语/韩语) | 当前双语够用 | v1.55+ |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: UI Phase 2 Agent
