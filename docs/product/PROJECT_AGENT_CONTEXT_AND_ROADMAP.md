# ABF Capacity Calculator — 项目上下文档案与路线图

**版本**: v1.0
**日期**: 2026-05-29
**当前产品版本**: v1.46.0
**分支状态**: main 已合并 v1.40-v1.46

---

## 一、当前产品定位

### 产品定义

ABF Capacity Calculator 已从单一的产能计算器进化为 **ABF 载板运营决策工作台 (Operations Decision Workbench)**。

> **核心定位**: 基于多人协同、版本控制、具有数据质量自诊断与异常智能的轻量级基板产能规划与运营决策分析工具。

### 产品进化历程

```
v1.0   Capacity Calculator (产能计算器)
  ↓
v1.7   Dashboard + Results (可视化分析)
  ↓
v1.18  Shared Workspace (多人协同)
  ↓
v1.20  Decision Analysis Depth (决策级分析)
  ↓
v1.35  Data Quality Visibility (数据质量前移)
  ↓
v1.37  Scenario Planning (场景模拟)
  ↓
v1.38  AI Copilot (AI 数据助手)
  ↓
v1.42  Daily Operations Workbench (运营工作台)
  ↓
v1.43  Abnormality Intelligence (异常智能)
  ↓
v1.44  Operational What-if Scenario (运营场景)
  ↓
v1.45  Management Report Pack (管理报告)
  ↓
v1.46  Post-Release Canary (发布后验证)
```

---

## 二、已发布功能清单

### 基础能力 (v1.0 - v1.8)

| 功能 | 版本 | 说明 |
|------|------|------|
| Product/SKU Management | v1.2.6 | SKU CRUD、芯片尺寸/层数/良率/单价 |
| Monthly Forecasts | v1.12.1 | 月度销售预测、批量生成、年增长 |
| Capacity Planning | 初始 | 工厂产能配置、Fill Forward、多视图 |
| Calculation Engine | 初始 | 确定性 TypeScript 计算引擎 |
| Dashboard | v1.7.0 | KPI 总览、营收趋势、BP 达成 |
| Results & Risk Brief | v1.7.0 | 计算结果、风险简报 |
| Version History | 初始 | 快照保存/还原/删除 |
| Currency Conversion | v1.8.0 | USD/TWD/CNY 多币种 |
| Bilingual UI | v1.8.0 | EN/zh-TW 双语 |

### 决策分析能力 (v1.13 - v1.24)

| 功能 | 版本 | 说明 |
|------|------|------|
| BP Target & Attainment | v1.13.0 | 营业目标管理、达成率分析 |
| Shared Workspace | v1.18.0 | 多人协同、Owner/Editor/Viewer |
| Decision Analysis Depth | v1.20.0 | WPI、BP Gap Attribution、Price Impact、Key Findings |
| AI Brief Export | v1.21.0 | 脱敏 JSON 导出给外部 AI |
| Forecast Versioning | v1.22.0 | 版本快照与变更影响评审 |
| Snapshot Change Review | v1.23.0 | 变更归因分析 |
| Forecast Version History | v1.24.0 | 版本类型标签、审批状态 |

### UI 与数据质量 (v1.26 - v1.36)

| 功能 | 版本 | 说明 |
|------|------|------|
| Spreadsheet Labs | v1.12/v1.26 | Excel-like 输入实验页面 |
| UI System Phase 1 | v1.30-v1.34 | 标准化组件、设计系统 |
| Data Quality Visibility | v1.35.0 | 输入页面 DQ 内联诊断 |
| Data Quality Remediation | v1.36.0 | DQ 一键修复流程 |

### 运营与 AI (v1.37 - v1.46)

| 功能 | 版本 | 说明 |
|------|------|------|
| Scenario Planning MVP | v1.37.0 | What-if 场景模拟 |
| AI Data Copilot | v1.38.0 | 10 个确定性 AI 工具 |
| AI Copilot Hardening | v1.39.0 | 评估、红队测试、安全加固 |
| AI Provider Adapter | v1.40.0 | 可插拔 Provider、BYOK |
| AI Copilot Reliability | v1.41.0 | 输出验证、100 红队用例 |
| Daily Operations Workbench | v1.42.0 | 运营工作台、流程引导 |
| Abnormality Intelligence | v1.43.0 | 20 种异常、业务感知评分 |
| Operational What-if | v1.44.0 | 产能延迟/预测调整/订单消失 |
| Management Report | v1.45.0 | 每日/每周管理报告 |
| Post-Release Canary | v1.46.0 | 发布后验证与清理 |

---

## 三、当前版本状态

### 版本健康度

| 维度 | 状态 | 说明 |
|------|------|------|
| 测试覆盖 | ✅ 强 | 1398+ 测试通过，57 个测试文件 |
| 构建状态 | ✅ 干净 | tsc + vite build 成功 |
| Lint | ✅ 干净 | 0 错误 |
| 安全态势 | ✅ 强 | 写服务隔离、BYOK session-only、无外部 AI 调用 |
| 架构 | ✅ 良好 | 分层 AI 架构、确定性工具为主 |
| UI 一致性 | ⚠️ 改善中 | UI Phase 1 完成，Phase 2 待规划 |
| 部署状态 | ✅ 已部署 | Firebase Hosting 已上线 |

### 已知技术债

| 项目 | 严重度 | 位置 | 说明 |
|------|--------|------|------|
| 4x 重复 sanitize 逻辑 | 中 | aiCopilot*.ts, *Export.ts | 需提取共享工具 |
| Safety logic 在 UI 层 | 低 | CopilotChat.tsx | 应移到 core |
| 中文输出验证缺失 | 中 | aiCopilotOutputValidation.ts | 只有英文验证模式 |
| 构建 chunk 500kB+ | 低 | Vite 构建 | 需代码分割 |
| Firebase emulator 测试缺失 | 中 | firestore.rules | 安全规则无自动回归 |
| Version lock 机制缺失 | 低 | snapshots | 无法锁定基线版本 |

---

## 四、核心页面

| 页面 | 路由 | 版本 | 功能 |
|------|------|------|------|
| Dashboard | /dashboard | v1.7.0 | KPI 总览、营收趋势、BP 达成 |
| Products | /products | v1.2.6 | SKU CRUD、DQ Badge |
| Products Lab | /products-sheet-lab | v1.12.0 | Excel-like SKU 输入 |
| Forecasts | /forecasts | v1.12.1 | 月度预测 CRUD、DQ Badge |
| Forecasts Lab | /forecasts-lab | v1.26.0 | Excel-like 预测输入 |
| Capacity | /capacity | 初始 | 工厂产能配置、Fill Forward |
| Capacity Lab | /capacity-lab | 初始 | Excel-like 产能输入 |
| Parameters | /parameters | 初始 | 汇率、良率、面板参数 |
| BP Targets | /bp-targets | v1.29.0 | 营业目标管理 |
| Results | /results | v1.7.0 | 计算结果、Risk Brief、BP 归因 |
| Scenario | /scenario | v1.37.0 | What-if 场景模拟 |
| AI Copilot | /copilot | v1.38.0 | AI 数据助手 |
| Operations | /operations | v1.42.0 | 每日运营工作台 |

---

## 五、核心数据流

```
┌─────────────────────────────────────────────────────────────┐
│                    数据输入层 (Input Pages)                    │
│  Products  Forecasts  Capacity  Parameters  BP Targets       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              calculationEngine.ts (核心计算引擎)               │
│  panelDemand → utilization → shortage → revenue              │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ analytics│  │dataQuality│  │scenario  │
    │   .ts    │  │   .ts    │  │Engine.ts │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │              │              │
         ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Dashboard │  │  Risk    │  │ Scenario │
    │ Results  │  │  Brief   │  │ Compare  │
    └──────────┘  └──────────┘  └──────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AI & Operations 层 (v1.38-v1.45)                │
│  aiCopilotTools.ts (10 个确定性工具)                          │
│  workbench.ts (运营工作台)                                    │
│  abnormalityIntelligence.ts (异常智能)                        │
│  operationalScenario.ts (运营场景)                            │
│  managementReport.ts (管理报告)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、关键文件索引

### 核心计算引擎

| 文件 | 功能 |
|------|------|
| `frontend/src/core/calculationEngine.ts` | 主计算引擎 (runCalculation) |
| `frontend/src/core/yieldMatrix.ts` | 良率矩阵查询 |
| `frontend/src/core/panelLayout.ts` | 面板布局计算 |
| `frontend/src/core/defaults.ts` | 默认参数 |
| `frontend/src/core/validation.ts` | 输入验证 |

### 分析与报告

| 文件 | 功能 |
|------|------|
| `frontend/src/core/analytics.ts` | 分析模型构建 |
| `frontend/src/core/riskBrief.ts` | 风险简报 |
| `frontend/src/core/riskAttribution.ts` | 风险驱动归因 |
| `frontend/src/core/bpAttribution.ts` | BP 缺口归因 |
| `frontend/src/core/impactAnalysis.ts` | 价格/产能影响分析 |
| `frontend/src/core/keyFindings.ts` | Top 5 优先发现 |
| `frontend/src/core/analysisContract.ts` | 统一分析载荷 |

### 数据质量与场景

| 文件 | 功能 |
|------|------|
| `frontend/src/core/dataQuality.ts` | DQ 引擎 (15+ issue types) |
| `frontend/src/core/dataQualityVisibility.ts` | DQ 可视化 |
| `frontend/src/core/dataQualityRemediation.ts` | DQ 修复流程 |
| `frontend/src/core/scenarioEngine.ts` | 场景引擎 |
| `frontend/src/core/scenarioExport.ts` | 场景导出 |

### AI 与运营

| 文件 | 功能 |
|------|------|
| `frontend/src/core/aiCopilotTools.ts` | 10 个确定性 AI 工具 |
| `frontend/src/core/aiCopilotContext.ts` | AI 上下文构建 |
| `frontend/src/core/aiCopilotExport.ts` | AI 导出 |
| `frontend/src/core/workbench.ts` | 运营工作台视图模型 |
| `frontend/src/core/abnormalityIntelligence.ts` | 异常智能评分 |
| `frontend/src/core/operationalScenario.ts` | 运营场景模拟 |
| `frontend/src/core/managementReport.ts` | 管理报告生成 |

### 服务层

| 文件 | 功能 |
|------|------|
| `frontend/src/services/skuService.ts` | SKU CRUD |
| `frontend/src/services/forecastService.ts` | Forecast CRUD |
| `frontend/src/services/capacityService.ts` | Capacity CRUD |
| `frontend/src/services/parameterService.ts` | Parameters CRUD |
| `frontend/src/services/versionService.ts` | 版本快照 |
| `frontend/src/services/workspaceService.ts` | 工作区管理 |

---

## 七、AI Copilot 工具清单

| Tool # | 名称 | 版本 | 功能 | 关键词 (EN) | 关键词 (zh-TW) |
|--------|------|------|------|------------|----------------|
| 1 | inspectDataQuality | v1.38 | 数据质量检查 | data quality, DQ | 資料品質 |
| 2 | explainCapacityRisk | v1.38 | 产能风险解释 | capacity, bottleneck | 產能, 瓶頸 |
| 3 | explainBpGap | v1.38 | BP 缺口分析 | BP, target, gap | 差距, 達成 |
| 4 | suggestDataFixes | v1.38 | 数据修复建议 | fix, repair, data | 修復 |
| 5 | explainScenarioImpact | v1.38 | 场景影响分析 | scenario, what-if | 情境 |
| 6 | buildLookAheadFocus | v1.38 | 前瞻聚焦 | look-ahead, future | 前瞻, 未來 |
| 7 | explainWorkbenchOverview | v1.42 | 工作台概览 | workbench, overview | 工作台, 總覽 |
| 8 | explainAbnormalityDetail | v1.43 | 异常详情 | abnormality, issue | 異常 |
| 9 | explainScenarioV2Impact | v1.44 | 运营场景影响 | scenario v2, operational | 營運情境 |
| 10 | generateReportNarrative | v1.45 | 报告叙述 | report, daily, weekly | 管理報告 |

---

## 八、异常分类体系

### 5 个域、20 种异常子类型

**Data Domain (6)**:
1. `data:missing-sku-attributes` — SKU 缺失核心属性
2. `data:unsupported-currency` — 不支持的币种
3. `data:zero-unit-price` — 零单价
4. `data:missing-exchange-rate` — 缺失汇率
5. `data:orphan-forecast` — 孤儿预测
6. `data:partial-year-forecast` — 不完整年度预测

**Capacity Domain (5)**:
1. `capacity:missing-months` — 缺失产能月份
2. `capacity:zero-capacity-with-demand` — 有需求无产能
3. `capacity:high-utilization` — 高利用率 (>90%)
4. `capacity:shortage` — 产能短缺
5. `capacity:bottleneck-concentration` — 瓶颈集中

**Sales Domain (4)**:
1. `sales:forecast-volume-spike` — 预测暴涨 (>30% MoM)
2. `sales:forecast-volume-drop` — 预测暴跌 (<-30% MoM)
3. `sales:customer-concentration` — 客户集中度 (>50%)
4. `sales:revenue-trend-declining` — 营收趋势下降

**BP Domain (3)**:
1. `bp:target-missed` — BP 未达标 (<80%)
2. `bp:target-at-risk` — BP 有风险 (80-100%)
3. `bp:missing-target-with-forecast` — 有预测无目标

**Scenario Domain (2)**:
1. `scenario:sensitivity-high` — 高敏感度 (>10% delta)
2. `scenario:shortage-amplification` — 短缺放大

---

## 九、开发红线

来自 `docs/product/DEVELOPMENT_PRINCIPLES.md`:

1. **Firebase 不替换** — 不迁移到 Supabase/Appwrite/自架 API
2. **Ant Design 为主 UI** — 不引入 Material UI/Chakra UI
3. **BP Target 单位固定 Million TWD** — 不支持其他单位
4. **多币别计算路径不可乱改** — 原始价格→正規化 USD→计算营收→显示币别换算
5. **Snapshot Immutable** — 快照内容不可修改
6. **Display Formatter 不可污染数据层** — 格式化结果不写回数据库
7. **Proportional Attribution 不是 Causality** — 所有归因是比例分攤
8. **不早接 AI API** — 核心逻辑不依赖 AI API
9. **Workspace Role 权限** — Owner/Editor/Viewer 双重检查
10. **Viewer True Read-only** — Viewer 不能编辑/贴上/触发 state 变更

---

## 十、未来 v1.47-v1.52 路线

| 版本 | 目标 | 范围 |
|------|------|------|
| v1.47 | Demo Readiness | Browser QA、Demo Dataset、Demo Stories |
| v1.48 | UI Phase 2 | PageHeader 全面采用、颜色标准化、EmptyState |
| v1.49 | Demo Dataset / Import | CSV/Excel 导入向导、Demo 数据加载 |
| v1.50 | Scenario v2 Polish | 场景持久化、多场景对比、场景分享 |
| v1.51 | AI Copilot Polish | 证据链增强、报告导出增强 |
| v1.52 | API Integration | ERP/CRM 数据源连接器探索 |

---

## 十一、给后续 Agent 的 Onboarding Prompt

如果你是新加入的 Agent，请先阅读以下文件：

1. **本文件** (`PROJECT_AGENT_CONTEXT_AND_ROADMAP.md`) — 项目全貌
2. `docs/product/DEVELOPMENT_PRINCIPLES.md` — 开发红线
3. `README.md` — 技术栈、数据模型、计算公式
4. `docs/operations/V1_42_TO_V1_45_PRODUCT_PLAN.md` — 最近的产品计划
5. `docs/audit/FEATURE_AVAILABILITY_MATRIX_2026_05_28.md` — 功能可用性矩阵

### 关键约束

- **不修改 `frontend/src`** — 只允许修改 `docs/` 目录
- **不修改 `firestore.rules`** — 安全规则不碰
- **不修改 `package.json`** — 不新增依赖
- **不 merge main** — 不合并分支
- **不 deploy** — 不部署
- **所有 shell 指令兼容 Windows PowerShell**

### 产品核心价值主张

> 帮助 ABF 载板产能规划者在准确数据基础上，做出理性的产能扩张与商业报价决策。

### 技术栈

- Frontend: React 19 + TypeScript + Vite
- UI: Ant Design 6
- Charts: @ant-design/charts
- Backend: Firebase (Auth + Firestore + Hosting)
- Testing: Vitest (1398+ tests)
- Spreadsheet: react-datasheet-grid (Lab pages)

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Project Manager Agent
