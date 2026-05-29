# ABF Capacity Calculator — v1.47-v1.52 路线图

**版本**: v1.0
**日期**: 2026-05-29
**用途**: 下一阶段开发路线规划

---

## 概述

v1.42-v1.46 完成了从"产能计算器"到"运营决策工作台"的进化。v1.47-v1.52 的重点从"功能开发"转向"产品化、商业化、用户验证"。

### 战略目标

1. **Demo Readiness** — 产品可以演示给真实用户
2. **UI Polish** — 界面达到可商用水平
3. **用户验证** — 验证商业假设
4. **数据导入** — 支持真实数据导入
5. **场景增强** — 场景模拟更强大
6. **AI 增强** — AI Copilot 更智能

---

## v1.47: Demo Readiness + Browser QA

### 目标

产品可以演示给真实用户，所有页面通过浏览器 QA。

### 范围

| 项目 | 说明 |
|------|------|
| Demo Dataset | 设计并实现 35 SKU、5 客户、24 月的演示数据集 |
| Demo Stories | 设计 3 个 5-8 分钟的演示故事 |
| Browser QA | 完成所有页面的浏览器测试 |
| Bug Fix | 修复 QA 发现的 P0/P1 Bug |
| 文档补齐 | 创建 PROJECT_AGENT_CONTEXT_AND_ROADMAP.md |

### 不做什么

- 不开发新功能
- 不修改计算引擎
- 不修改 Firestore 规则

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| QA 发现大量 Bug | 延迟发布 | 优先修复 P0/P1 |
| Demo 数据不够真实 | 演示效果差 | 基于真实业务比例设计 |

### 验收标准

- [ ] 3 个 Demo Story 可以流畅演示
- [ ] 所有页面无 console error
- [ ] 所有页面在 1920×1080 正常显示
- [ ] 所有页面在 375px 可用
- [ ] EN/zh-TW 双语完整
- [ ] Owner/Editor/Viewer 权限正确
- [ ] Demo 数据集可加载

### 给 CC 的 Prompt 草案

```
v1.47 任务：Demo Readiness + Browser QA

1. 加载 Demo Dataset 到 Firestore
2. 执行 Browser QA 总计划 (docs/qa/BROWSER_QA_MASTER_PLAN_AFTER_V1_46.md)
3. 修复发现的 P0/P1 Bug
4. 验证 3 个 Demo Story 可以流畅演示
5. 确认 EN/zh-TW 双语完整
6. 确认 Owner/Editor/Viewer 权限正确
```

---

## v1.48: UI Phase 2

### 目标

界面达到可商用水平，消除 UI 债务。

### 范围

| 项目 | 说明 |
|------|------|
| PageHeader 全面采用 | 12/13 页面采用 PageHeader |
| 内联样式提取 | Results (97 处)、Operations (57 处) |
| 颜色标准化 | 硬编码颜色 → theme tokens |
| EmptyState 全面采用 | 所有空状态使用 EmptyState 组件 |
| View mode 统一 | 所有页面使用 Segmented 控件 |
| 加载状态统一 | 所有页面使用 PageLoading |
| Card 样式统一 | bordered/size 一致 |
| PageSize 统一 | 所有表格使用 20 |

### 不做什么

- 不做 Mobile 完全适配
- 不做暗色模式
- 不做自定义图表主题

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 视觉回归 | 样式错乱 | 逐步改造，每步验证 |
| 工作量超预期 | 延迟发布 | 优先处理 P0 页面 |

### 验收标准

- [ ] 所有页面使用 .abf-page 容器
- [ ] 所有页面使用 PageHeader 组件
- [ ] Results 内联样式 < 5 个
- [ ] Operations 内联样式 < 5 个
- [ ] 所有硬编码颜色替换为 theme tokens
- [ ] 所有空状态使用 EmptyState 组件
- [ ] 所有 view mode 使用 Segmented 控件

### 给 CC 的 Prompt 草案

```
v1.48 任务：UI Phase 2

参考 docs/design-system/UI_PHASE2_PRODUCTIZATION_SPEC.md
和 docs/design-system/UI_PHASE2_PAGE_PRIORITY_MATRIX.md

按优先级改造各页面：
1. P0: Results (8-10h)
2. P0: Operations (6-8h)
3. P1: Dashboard (4-5h)
4. P1: Scenario (3-4h)
5. P1: AI Copilot (3-4h)
6. P2: Products/Forecasts/Capacity (2-3h each)
7. P2: BP Targets/Parameters (1-2h each)
```

---

## v1.49: Demo Dataset / Import Wizard

### 目标

支持真实数据导入，让用户可以用自己的数据试用。

### 范围

| 项目 | 说明 |
|------|------|
| CSV Import Wizard | 支持 CSV/Excel 导入 SKU、Forecast、Capacity |
| 数据验证 | 导入时自动验证数据质量 |
| 导入预览 | 导入前预览数据和 DQ 问题 |
| 错误处理 | 清晰的错误提示和修复建议 |
| 模板下载 | 提供标准模板下载 |

### 不做什么

- 不支持 ERP 直连
- 不支持实时同步
- 不支持增量导入（全量导入）

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 数据格式多样 | 兼容性问题 | 提供标准模板 |
| 大数据量导入 | 性能问题 | 分批导入 |

### 验收标准

- [ ] 支持 CSV 导入 SKU
- [ ] 支持 CSV 导入 Forecast
- [ ] 支持 CSV 导入 Capacity
- [ ] 导入时自动验证 DQ
- [ ] 导入前可预览数据
- [ ] 提供标准模板下载
- [ ] 错误提示清晰

### 给 CC 的 Prompt 草案

```
v1.49 任务：Demo Dataset / Import Wizard

1. 实现 CSV Import Wizard 页面
2. 支持 SKU/Forecast/Capacity 导入
3. 导入时自动验证数据质量
4. 导入前预览数据和 DQ 问题
5. 提供标准模板下载
6. 错误提示清晰
```

---

## v1.50: Scenario v2 Polish

### 目标

场景模拟更强大，支持更多场景类型和持久化。

### 范围

| 项目 | 说明 |
|------|------|
| 场景持久化 | 保存/加载/分享场景 |
| 多场景对比 | 同时对比多个场景 |
| 场景模板 | 预设场景模板 |
| 场景历史 | 查看场景运行历史 |
| 场景导出增强 | 支持 PDF/Excel 导出 |

### 不做什么

- 不支持实时协作场景
- 不支持 AI 自动生成场景

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 存储成本 | 场景数据量大 | 限制保存数量 |
| 复杂度增加 | 用户学习成本 | 提供模板和引导 |

### 验收标准

- [ ] 场景可保存到 Firestore
- [ ] 场景可加载和编辑
- [ ] 可同时对比 2-3 个场景
- [ ] 提供 5+ 预设场景模板
- [ ] 场景可导出为 PDF/Excel
- [ ] 场景历史可查看

### 给 CC 的 Prompt 草案

```
v1.50 任务：Scenario v2 Polish

1. 实现场景持久化（保存/加载/分享）
2. 实现多场景对比（2-3 个场景）
3. 创建 5+ 预设场景模板
4. 实现场景历史查看
5. 增强场景导出（PDF/Excel）
```

---

## v1.51: AI Copilot Evidence/Report Polish

### 目标

AI Copilot 的分析结果更有说服力，报告更专业。

### 范围

| 项目 | 说明 |
|------|------|
| 证据链增强 | 结构化证据引用 |
| 报告模板 | 专业报告模板 |
| 报告定制 | 支持报告内容定制 |
| 报告定时 | 支持定时生成和发送 |
| Copilot 上下文 | 根据当前页面自动调整建议 |

### 不做什么

- 不接入外部 AI API
- 不做 AI 自动生成决策

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 报告模板不满足需求 | 用户定制成本高 | 提供灵活配置 |
| 证据链太复杂 | 用户理解困难 | 简化展示 |

### 验收标准

- [ ] 分析结果包含结构化证据引用
- [ ] 提供 3+ 专业报告模板
- [ ] 报告内容可定制
- [ ] 支持定时生成报告
- [ ] Copilot 根据页面自动调整建议

### 给 CC 的 Prompt 草案

```
v1.51 任务：AI Copilot Evidence/Report Polish

1. 增强证据链（结构化 EvidenceCitation）
2. 创建 3+ 专业报告模板
3. 实现报告内容定制
4. 实现报告定时生成
5. Copilot 上下文感知
```

---

## v1.52: API Integration Exploration

### 目标

探索与 ERP/CRM 系统的集成可能性。

### 范围

| 项目 | 说明 |
|------|------|
| API 设计 | 设计 RESTful API 接口 |
| 数据同步 | 设计数据同步方案 |
| 安全设计 | API 认证和授权 |
| 文档 | API 文档和示例 |
| POC | 实现一个 POC 集成 |

### 不做什么

- 不实现全量 ERP 集成
- 不实现实时同步
- 不支持多 ERP 同时集成

### 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| ERP 接口多样 | 兼容性问题 | 先做标准接口 |
| 安全风险 | 数据泄露 | 严格认证授权 |

### 验收标准

- [ ] API 接口设计文档
- [ ] API 认证和授权方案
- [ ] 数据同步方案文档
- [ ] API 文档和示例
- [ ] 1 个 POC 集成

### 给 CC 的 Prompt 草案

```
v1.52 任务：API Integration Exploration

1. 设计 RESTful API 接口
2. 设计数据同步方案
3. 设计 API 认证和授权
4. 编写 API 文档和示例
5. 实现 1 个 POC 集成
```

---

## 版本依赖关系

```
v1.47 (Demo Readiness)
    ↓
v1.48 (UI Phase 2)
    ↓
v1.49 (Import Wizard)
    ↓
v1.50 (Scenario v2)
    ↓
v1.51 (AI Copilot Polish)
    ↓
v1.52 (API Integration)
```

---

## 资源需求

| 版本 | 开发工作量 | 测试工作量 | 文档工作量 |
|------|-----------|-----------|-----------|
| v1.47 | 20h | 10h | 5h |
| v1.48 | 30h | 10h | 5h |
| v1.49 | 25h | 10h | 5h |
| v1.50 | 20h | 10h | 5h |
| v1.51 | 20h | 10h | 5h |
| v1.52 | 15h | 5h | 10h |
| **总计** | **130h** | **55h** | **35h** |

---

## 成功指标

| 指标 | 目标 | 时间 |
|------|------|------|
| Demo 成功演示 | 3 个故事流畅演示 | v1.47 |
| UI 一致性评分 | 90%+ | v1.48 |
| 数据导入成功率 | 95%+ | v1.49 |
| 场景运行时间 | < 2 秒 | v1.50 |
| 报告生成时间 | < 5 秒 | v1.51 |
| API 响应时间 | < 500ms | v1.52 |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Roadmap Agent
