# V1.55.1 UI Baseline Regression Repair — Command Log

## 线上回退证据

- 左侧深色 sidebar 回来了（应为顶部横向导航）
- 品牌显示 `ABF 计算`（应为 `ABF CSS`）
- 顶栏平铺 Workspace / owner / UID（应为 user menu 收纳）
- 版本显示 `v1.52.0`（应为 v1.55.1）

## 根因

**main 缺失 v1.53/v1.54 UI commit。**

main 分支从 v1.52 直接跳到 v1.55，中间的 v1.53 UI 系统和 v1.54 topbar 清理从未合并到 main。

关键缺失分支：
- `origin/xiaomi/v1-53-product-ui-system-marathon` — v1.53 基础 UI 系统
- `origin/xiaomi/v1-54-1-topbar-user-menu-cleanup` — v1.54.0 tweakcn 主题 + v1.54.1 topbar 清理
- `origin/xiaomi/v1-54-9-workbench-fake-useful-cleanup` — v1.54.9 工作台清理

## 修复方式

创建修复分支 `xiaomi/v1-55-1-ui-baseline-regression-repair`，按时间顺序合并缺失分支：

1. `git merge --no-ff origin/xiaomi/v1-54-1-topbar-user-menu-cleanup`
   - 冲突：ScenarioPlanning.tsx — 保留 v1.55 版本（ours）
2. `git merge --no-ff origin/xiaomi/v1-54-9-workbench-fake-useful-cleanup`
   - 冲突：AiCopilot.tsx — 手动合并（保留 v1.54.1 UI + v1.54.9 深链功能）
   - 冲突：DailyOperationsWorkbench.tsx — 保留 v1.54.9 版本（删除问题摘要）
3. 更新 APP_VERSION 为 v1.55.1

## Merge commit

- 修复分支 commit: `fe2b363`
- main merge commit: 待 push

## test / lint / build

| 检查 | 结果 |
|------|------|
| `npm run lint -- --quiet` | ✅ 0 errors |
| `npm run build` | ✅ 成功 |
| `npm run test -- --run` | ✅ 59/59 文件，1472/1472 测试通过 |

## dist 验证

| 检查 | 结果 |
|------|------|
| `ABF CSS` in dist | ✅ 找到 |
| `v1.55.1` in dist | ✅ 找到 |
| `v1.52.0` in dist | ✅ 未找到（已清除） |

## 红线检查

| 文件 | 状态 |
|------|------|
| firestore.rules | ✅ 未修改 |
| calculationEngine.ts | ✅ 未修改 |
| package.json | ⚠️ 有变更（源分支正常版本同步，未新增 dependency） |

## Deploy

- 命令: `firebase deploy --only hosting`
- URL: https://abf-capacity-calculator.web.app

## Post-deploy Canary

| 页面 | HTTP 状态 |
|------|----------|
| `/` | ✅ 200 |
| `/scenario` | ✅ 200 |
| `/operations` | ✅ 200 |
| `/results` | ✅ 200 |

## 线上 Bundle 验证

- `ABF CSS`: ✅ 找到（2 次）
- `v1.55.1`: ✅ 找到（1 次）
- `v1.52.0`: ✅ 未找到

## 是否需要 Hotfix

**否。** 修复完成，线上已确认。

## 是否合并 AGY review branch

**否。** 仅合并了 xiaomi 分支。
