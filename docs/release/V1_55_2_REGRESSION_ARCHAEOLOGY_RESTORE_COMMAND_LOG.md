# V1.55.2 Regression Archaeology + Restore — Command Log

## 线上回退证据

1. **BP 目标页面回退**：只有「BP 目标（百万 TWD）」一行，没有 USD/CNY/YoY 派生行，没有年份控制
2. **Pipeline Readiness 回退**：使用旧 SectionCard/Row/Col/Card 布局，不是 twk-readiness-grid/twk-readiness-card

## 当前 main commit

`7c16481 docs: record v1.55.1 ui baseline regression repair log`

## Root Cause

### BP 页面回退原因

**v1.54.5 分支未合并到 main。**

- `origin/xiaomi/v1-54-5-bp-target-derived-rows-year-control` (commit `84004b5`) 实现了：
  - TWD 输入行
  - USD 自动换算行（只读）
  - CNY 自动换算行（只读）
  - YoY 成长行（只读）
  - 年份控制（插入前一年/后一年）
- 该分支从未合并到 main
- v1.55.1 修复时只合并了 v1.54.1（topbar）和 v1.54.9（workbench），漏掉了 v1.54.5

### Pipeline Readiness 回退原因

**v1.54.7 分支未合并到 main。**

- `origin/xiaomi/v1-54-7-forecast-orphan-system-repair` (commit `7537a21`) 包含了：
  - Pipeline Readiness 使用 `twk-readiness-grid` / `twk-readiness-card` CSS 类
  - 设计更轻、更紧凑的卡片样式
- 该分支从未合并到 main
- v1.55.1 修复时合并的 v1.54.1 包含旧版 DailyOperationsWorkbench（SectionCard/Row/Col/Card 布局）

### 为什么 v1.55.1 没有完全修复

v1.55.1 只合并了两个分支：
1. `origin/xiaomi/v1-54-1-topbar-user-menu-cleanup` — 包含 v1.53 UI 系统 + v1.54.0 tweakcn 主题 + v1.54.1 topbar 清理
2. `origin/xiaomi/v1-54-9-workbench-fake-useful-cleanup` — v1.54.9 工作台清理

但遗漏了以下分支：
- v1.54.2 workspace invite permission fix
- v1.54.3 spreadsheet grid stability fix
- v1.54.4 data quality notice UX audit
- **v1.54.5 BP target derived rows year control**
- v1.54.6 forecast month system bug repair
- v1.54.7 forecast orphan system repair（包含 Pipeline Readiness 样式）

### 防止再次发生的措施

新增 `docs/release/RELEASE_BASELINE_GUARDRAILS.md` 发布前检查清单。

## 修复策略

合并 `origin/xiaomi/v1-54-7-forecast-orphan-system-repair` 到 main，该分支包含 v1.54.2 到 v1.54.7 的所有修复。

## 修复过程

1. 创建修复分支 `xiaomi/v1-55-2-regression-archaeology-restore`
2. 合并 `origin/xiaomi/v1-54-7-forecast-orphan-system-repair`（包含 v1.54.2-v1.54.7）
   - 冲突：ScenarioPlanning.tsx — 保留 v1.55 版本（ours）
   - 冲突：i18n/en.ts, i18n/zhTW.ts — 合并两组 keys
3. 手动恢复 Pipeline Readiness 样式：
   - 从 v1.54.7 恢复 DailyOperationsWorkbench.tsx
   - 应用 v1.54.9 变更：删除 Abnormality Summary、添加 Copilot 深链
   - 删除未使用变量（severityColor, DOMAIN_ICONS, domainLabelKey, abnormalitiesByDomain, domainKeys）
4. 更新 APP_VERSION 为 v1.55.2
5. 新增 `docs/release/RELEASE_BASELINE_GUARDRAILS.md` 防回归检查清单

## test / lint / build

| 检查 | 结果 |
|------|------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ 成功 |
| `npm run test -- --run` | ✅ 61/61 文件，1520/1520 测试通过 |

## 红线检查

| 文件 | 状态 |
|------|------|
| firestore.rules | ✅ 未修改 |
| calculationEngine.ts | ✅ 未修改 |

## Deploy

- 命令: `firebase deploy --only hosting`
- URL: https://abf-capacity-calculator.web.app

## Post-deploy Canary

| 页面 | HTTP 状态 |
|------|----------|
| `/` | ✅ 200 |
| `/operations` | ✅ 200 |
| `/bp-targets` | ✅ 200 |
| `/scenario` | ✅ 200 |

## 线上 Bundle 验证

- `ABF CSS`: ✅ 找到（2 次）
- `v1.55.2`: ✅ 找到（1 次）
- `v1.52.0`: ✅ 未找到

## Commit / Push

- 修复分支 commit: `a81e3c5`
- main merge commit: `f2e254e`
- Push: ✅ 已推送到 origin/main 和 origin/xiaomi/v1-55-2-regression-archaeology-restore

## 是否需要 AGY 复验

**建议复验。** 涉及多个分支合并和手动修复，建议验证：
1. BP 目标页面：TWD/USD/CNY/YoY 四行可见
2. Pipeline Readiness：twk-readiness-grid 样式
3. Scenario 页面：年度倍率矩阵、KPI 卡片、趋势图表
4. Copilot 深链：点击按钮后 URL 带 ?tool= 参数
