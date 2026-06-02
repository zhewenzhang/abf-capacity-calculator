# Release Baseline Guardrails

发布前必须确认以下检查项，防止 UI 回退。

## 1. Branch Contains 检查

合并前必须确认 main 包含以下关键分支：

```bash
# UI baseline
git branch --contains origin/xiaomi/v1-53-product-ui-system-marathon || echo "MISSING"
git branch --contains origin/xiaomi/v1-54-1-topbar-user-menu-cleanup || echo "MISSING"

# 页面级修复
git branch --contains origin/xiaomi/v1-54-5-bp-target-derived-rows-year-control || echo "MISSING"
git branch --contains origin/xiaomi/v1-54-7-forecast-orphan-system-repair || echo "MISSING"
git branch --contains origin/xiaomi/v1-54-9-workbench-fake-useful-cleanup || echo "MISSING"
```

## 2. 品牌和版本检查

```bash
grep "ABF CSS" frontend/src/App.tsx || echo "MISSING: ABF CSS brand"
grep "APP_VERSION" frontend/src/App.tsx
```

## 3. 关键页面功能检查

### BP Targets 页面
- 必须有 TWD/USD/CNY/YoY 四行
- 必须有年份控制（插入前一年/后一年）
- 检查: `grep "buildBpSheetRows" frontend/src/core/bpTargetsHelpers.ts`

### Pipeline Readiness
- 必须使用 `twk-readiness-grid` / `twk-readiness-card` 样式
- 不能使用旧 SectionCard/Row/Col/Card 布局
- 检查: `grep "twk-readiness-grid" frontend/src/pages/DailyOperationsWorkbench.tsx`

### Scenario 页面
- 必须有年度倍率矩阵
- 必须有 KPI 卡片和趋势图表
- 检查: `grep "annual" frontend/src/pages/ScenarioPlanning.tsx`

## 4. 线上 Bundle 检查

部署后必须检查：

```bash
# 下载线上主 JS bundle
curl -s https://abf-capacity-calculator.web.app/assets/index-*.js | grep -o "ABF CSS\|v1.55\|v1.52.0"
```

- 必须包含 `ABF CSS`
- 不能包含 `v1.52.0`

## 5. 不允许的行为

- 不允许从旧 feature branch 直接 deploy
- 不允许跳过 branch contains 检查
- 不允许只合并 topbar/design system 而遗漏页面级修复
