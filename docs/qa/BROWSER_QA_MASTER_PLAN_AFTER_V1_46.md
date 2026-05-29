# ABF Capacity Calculator — Browser QA 总计划 (v1.46+)

**版本**: v1.0
**日期**: 2026-05-29
**用途**: 完整真实浏览器 QA 测试计划

---

## 一、测试环境要求

### 浏览器

| 浏览器 | 版本 | 优先级 |
|--------|------|--------|
| Chrome | 最新稳定版 | P0 |
| Edge | 最新稳定版 | P1 |
| Firefox | 最新稳定版 | P2 |
| Safari | 最新版 | P3 |

### 分辨率

| 分辨率 | 用途 | 优先级 |
|--------|------|--------|
| 1920×1080 | 桌面标准 | P0 |
| 1440×900 | 笔记本 | P1 |
| 375×812 | iPhone 13 | P2 |
| 768×1024 | iPad | P3 |

### 测试账号

| 角色 | 用途 |
|------|------|
| Owner | 完整权限测试 |
| Editor | 编辑权限测试 |
| Viewer | 只读权限测试 |

### 测试数据

- 使用 Demo Dataset (35 SKU、5 客户、24 月)
- 配置 BP Targets (2026-2028)
- 配置多币种汇率 (USD/TWD/CNY)
- 植入 DQ 问题 (10 种)

---

## 二、页面级测试用例

### 1. Dashboard (/dashboard)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| D-01 | 页面加载 | 访问 /dashboard | 页面正常加载，无 console error |
| D-02 | KPI 卡片 | 查看 KPI 区域 | 显示 Total SKUs、Forecast PCS、Revenue、Max Utilization、Shortage Months |
| D-03 | 营收趋势图 | 查看 Revenue Trend 图表 | 图表正常渲染，数据点正确 |
| D-04 | BP 达成表 | 查看 BP Attainment 表格 | 显示年度 BP 目标、预测营收、达成率、缺口 |
| D-05 | 币种切换 | 切换 USD/TWD/CNY | 所有金额同步更新 |
| D-06 | 语言切换 | 切换 EN/zh-TW | 所有文案切换 |
| D-07 | Demo 数据加载 | 点击 Load Demo Data | 数据加载成功，页面刷新 |

### 2. Operations (/operations)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| O-01 | 页面加载 | 访问 /operations | 页面正常加载 |
| O-02 | 流程步骤 | 查看 7 个步骤状态 | 每个步骤显示正确状态 (ready/warning/blocked) |
| O-03 | 异常诊断 | 查看异常列表 | 显示异常列表，按严重度排序 |
| O-04 | Look-Ahead | 查看前瞻面板 | 显示未来 6 个月利用率和短缺 |
| O-05 | 营收/BP | 查看营收/BP 摘要 | 显示当前营收、目标、达成率 |
| O-06 | 场景快捷方式 | 点击预设场景 | 跳转到 Scenario 页面并加载预设 |
| O-07 | Copilot 快捷方式 | 点击 Copilot 按钮 | 跳转到 AI Copilot 页面 |

### 3. Products (/products)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| P-01 | 页面加载 | 访问 /products | 页面正常加载，显示 SKU 列表 |
| P-02 | 新增 SKU | 点击 Add SKU → 填写表单 → 保存 | SKU 创建成功，列表刷新 |
| P-03 | 编辑 SKU | 点击编辑 → 修改 → 保存 | SKU 更新成功 |
| P-04 | 删除 SKU | 点击删除 → 确认 | SKU 删除成功 |
| P-05 | DQ Badge | 查看 A-NO-PRICE | 显示红色 "Missing Unit Price" Badge |
| P-06 | DQ Badge | 查看 B-EUR-001 | 显示红色 "Unsupported Currency" Badge |
| P-07 | Quick Fix | 点击 DQ Badge | 打开 Quick Fix Drawer |
| P-08 | Quick Fix 修复 | 输入单价 → 保存 | DQ 问题修复，Badge 消失 |
| P-09 | Viewer 只读 | 以 Viewer 登录 | 所有编辑按钮禁用 |
| P-10 | 导出 | 点击 Download Template | 下载 CSV 模板 |

### 4. Forecasts (/forecasts)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| F-01 | 页面加载 | 访问 /forecasts | 页面正常加载 |
| F-02 | 新增预测 | 选择 SKU → 输入月份 → 保存 | 预测创建成功 |
| F-03 | 批量生成 | 选择年份 → 增长率 → 生成 | 预测批量生成 |
| F-04 | DQ 警告 | 查看 C-ORPHAN | 显示 "Orphan SKU" 警告 |
| F-05 | Guided Fix | 点击孤儿预测警告 | 打开 Guided Fix Modal |
| F-06 | 删除预测 | 选择 → 删除 | 预测删除成功 |
| F-07 | Viewer 只读 | 以 Viewer 登录 | 所有编辑功能禁用 |

### 5. Capacity (/capacity)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| C-01 | 页面加载 | 访问 /capacity | 页面正常加载 |
| C-02 | 视图切换 | Month → Quarter → Year | 视图正确切换 |
| C-03 | Fill Forward | 点击 →→ 按钮 | 当月值复制到后续月份 |
| C-04 | 工厂管理 | 添加/删除工厂 | 工厂操作成功 |
| C-05 | DQ 警告 | 查看 F2 2026-09 | 显示 "Missing capacity" 警告 |
| C-06 | 批量操作 | 选择年份/季度 → 设置值 | 批量更新成功 |
| C-07 | Viewer 只读 | 以 Viewer 登录 | 所有编辑功能禁用 |

### 6. BP Targets (/bp-targets)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| B-01 | 页面加载 | 访问 /bp-targets | 页面正常加载 |
| B-02 | 输入目标 | 输入 2026 年目标 → 保存 | 目标保存成功 |
| B-03 | 年份警告 | 查看 2028 年 | 显示黄色警告指示器 |
| B-04 | Quick Fix | 点击年份警告 | 打开 Quick Fix Popover |
| B-05 | Quick Fix 修复 | 输入目标 → 保存 | 警告消失 |
| B-06 | Viewer 只读 | 以 Viewer 登录 | 所有编辑功能禁用 |

### 7. Results (/results)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| R-01 | 页面加载 | 访问 /results | 页面正常加载 |
| R-02 | Sales Tab | 查看销售视图 | 显示客户/SKU 维度的营收分析 |
| R-03 | Planning Tab | 查看规划视图 | 显示产品规划相关数据 |
| R-04 | Capacity Tab | 查看产能视图 | 显示产能利用率和短缺 |
| R-05 | Raw Tab | 查看原始数据 | 显示 SKU 月度明细 |
| R-06 | Risk Brief Tab | 查看风险简报 | 显示 Executive Summary、Top Risk Periods、Driver Analysis |
| R-07 | BP Analysis Tab | 查看 BP 分析 | 显示年度/季度/月度 BP 达成矩阵 |
| R-08 | Key Findings Tab | 查看关键发现 | 显示 Top 5 优先级发现 |
| R-09 | Price Impact Tab | 查看价格影响 | 显示 ±5%/±10% 场景分析 |
| R-10 | Capacity Impact Tab | 查看产能影响 | 显示 Core/BU +10% 场景分析 |
| R-11 | Change Review | 选择两个快照 → 对比 | 显示变更影响分析 |
| R-12 | AI Brief Export | 点击 Copy AI Brief | 复制脱敏 JSON 到剪贴板 |
| R-13 | 币种切换 | 切换 USD/TWD/CNY | 所有金额同步更新 |
| R-14 | 语言切换 | 切换 EN/zh-TW | 所有文案切换 |

### 8. Scenario (/scenario)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| S-01 | 页面加载 | 访问 /scenario | 页面正常加载 |
| S-02 | 参数设置 | 设置 Forecast Volume +10% | 参数正确显示 |
| S-03 | 运行场景 | 点击 Run Scenario | 场景计算完成，显示对比结果 |
| S-04 | Revenue Impact | 查看营收影响 | 显示基线 vs 场景的营收对比 |
| S-05 | Capacity Impact | 查看产能影响 | 显示利用率变化 |
| S-06 | DQ 警告 | 查看 DQ Caveats | 显示数据质量问题警告 |
| S-07 | 场景导出 | 点击 Export | 下载场景 JSON |
| S-08 | Viewer 只读 | 以 Viewer 登录 | 参数不可编辑 |

### 9. AI Copilot (/copilot)

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| A-01 | 页面加载 | 访问 /copilot | 页面正常加载 |
| A-02 | 快速问题 | 点击 "数据质量" 按钮 | 返回数据质量分析结果 |
| A-03 | 关键词路由 | 输入 "产能瓶颈" | 返回产能风险分析 |
| A-04 | 自由输入 | 输入 "BP 为什么没达标？" | 返回 BP 缺口分析 |
| A-05 | 工具显示 | 查看工具名称 | 显示使用的工具名称和置信度 |
| A-06 | 证据引用 | 查看 Source References | 显示数据来源 |
| A-07 | 导出 Prompt | 点击 Copy Prompt | 复制提示词到剪贴板 |
| A-08 | 导出 JSON | 点击 Copy JSON | 复制脱敏 JSON |
| A-09 | Viewer 限制 | 以 Viewer 登录 | 显示只读提示 |
| A-10 | 10 个工具测试 | 逐一测试 10 个工具 | 每个工具返回正确结果 |

### 10. Data Quality Quick Fix

| # | 测试项 | 操作 | 预期结果 |
|---|--------|------|---------|
| Q-01 | Products DQ | 点击 A-NO-PRICE Badge | Quick Fix Drawer 打开 |
| Q-02 | Products DQ | 点击 B-EUR-001 Badge | Quick Fix Drawer 打开 |
| Q-03 | Forecasts DQ | 点击 Orphan 警告 | Guided Fix Modal 打开 |
| Q-04 | BP Targets DQ | 点击 2028 警告 | Quick Fix Popover 打开 |
| Q-05 | Parameters DQ | 点击汇率警告 | Quick Fix Popover 打开 |
| Q-06 | Viewer 限制 | 以 Viewer 点击 DQ Badge | 只读提示，不打开修复界面 |

---

## 三、跨页面流程测试

### 流程 1: 数据录入 → 分析 → 报告

| 步骤 | 页面 | 操作 | 预期 |
|------|------|------|------|
| 1 | Products | 创建 3 个 SKU | 成功 |
| 2 | Forecasts | 输入 12 个月预测 | 成功 |
| 3 | Capacity | 配置 2 个工厂 | 成功 |
| 4 | BP Targets | 输入年度目标 | 成功 |
| 5 | Results | 查看分析结果 | 数据正确 |
| 6 | AI Copilot | 询问分析结论 | 返回正确分析 |

### 流程 2: 场景模拟 → 决策

| 步骤 | 页面 | 操作 | 预期 |
|------|------|------|------|
| 1 | Operations | 查看异常诊断 | 发现问题 |
| 2 | Scenario | 配置砍单场景 | 参数正确 |
| 3 | Scenario | 运行场景 | 计算完成 |
| 4 | Scenario | 查看对比结果 | 数据正确 |
| 5 | AI Copilot | 询问缓解建议 | 返回建议 |

### 流程 3: DQ 检测 → 修复

| 步骤 | 页面 | 操作 | 预期 |
|------|------|------|------|
| 1 | Products | 发现 DQ Badge | Badge 显示 |
| 2 | Products | 点击 Badge → 修复 | 修复成功 |
| 3 | Forecasts | 发现 DQ 警告 | 警告显示 |
| 4 | Forecasts | 点击警告 → 修复 | 修复成功 |
| 5 | Results | 验证 DQ 状态 | 问题减少 |

---

## 四、权限测试

### Owner 角色

| 测试项 | 预期 |
|--------|------|
| 所有页面读写 | ✅ 可读可写 |
| 成员管理 | ✅ 可管理 |
| 快照管理 | ✅ 可创建/删除 |
| 工作区设置 | ✅ 可修改 |

### Editor 角色

| 测试项 | 预期 |
|--------|------|
| 所有页面读写 | ✅ 可读可写 |
| 成员管理 | ❌ 不可管理 |
| 快照管理 | ✅ 可创建/删除自己的 |
| 工作区设置 | ❌ 不可修改 |

### Viewer 角色

| 测试项 | 预期 |
|--------|------|
| 所有页面只读 | ✅ 只读 |
| 编辑按钮 | ❌ 全部禁用 |
| 表格编辑 | ❌ 不可编辑 |
| DQ 修复 | ❌ 不可修复 |
| 场景参数 | ❌ 不可编辑 |
| AI Copilot | ⚠️ 只读提示 |

---

## 五、国际化测试

### EN → zh-TW 切换

| 页面 | 测试项 | 预期 |
|------|--------|------|
| Dashboard | 所有 KPI 标签 | 全部翻译 |
| Products | 表单标签、按钮 | 全部翻译 |
| Forecasts | 表单标签、按钮 | 全部翻译 |
| Capacity | 视图切换、按钮 | 全部翻译 |
| BP Targets | 表单标签、按钮 | 全部翻译 |
| Results | Tab 名称、表格列 | 全部翻译 |
| Scenario | 参数标签、按钮 | 全部翻译 |
| AI Copilot | 快速问题、工具名称 | 全部翻译 |
| Operations | 步骤名称、异常描述 | 全部翻译 |

### 翻译完整性检查

- [ ] 无未翻译的硬编码文案
- [ ] 无 {placeholder} 泄漏
- [ ] 无 raw key 显示
- [ ] 无乱码

---

## 六、响应式测试 (375px)

### 移动端测试项

| 页面 | 测试项 | 预期 |
|------|--------|------|
| Dashboard | KPI 卡片堆叠 | 单列显示 |
| Products | 表格水平滚动 | 可滚动 |
| Forecasts | 表格水平滚动 | 可滚动 |
| Capacity | 表格水平滚动 | 可滚动 |
| Results | Tab 切换 | 可切换 |
| Scenario | 表单堆叠 | 单列显示 |
| AI Copilot | 消息列表 | 正常显示 |
| Operations | 流程步骤 | 堆叠显示 |

---

## 七、性能检查点

| 指标 | 目标 | 测量方式 |
|------|------|---------|
| 首屏加载 | < 3 秒 | Lighthouse |
| 页面切换 | < 1 秒 | 手动计时 |
| 计算引擎 | < 500ms | Console time |
| 场景运行 | < 2 秒 | Console time |
| 图表渲染 | < 1 秒 | 手动计时 |

---

## 八、Console Errors 检查

### 检查清单

- [ ] Dashboard: 无 console error/warning
- [ ] Products: 无 console error/warning
- [ ] Forecasts: 无 console error/warning
- [ ] Capacity: 无 console error/warning
- [ ] BP Targets: 无 console error/warning
- [ ] Results: 无 console error/warning
- [ ] Scenario: 无 console error/warning
- [ ] AI Copilot: 无 console error/warning
- [ ] Operations: 无 console error/warning
- [ ] Parameters: 无 console error/warning

---

## 九、Firebase Deployed URL Smoke Test

### 冒烟测试清单

| # | 测试项 | 操作 | 预期 |
|---|--------|------|------|
| S-01 | 访问首页 | 打开部署 URL | 重定向到登录页 |
| S-02 | Google 登录 | 点击 Google 登录 | 登录成功 |
| S-03 | Dashboard | 访问 /dashboard | 页面正常加载 |
| S-04 | Products | 访问 /products | 页面正常加载 |
| S-05 | Results | 访问 /results | 页面正常加载 |
| S-06 | Operations | 访问 /operations | 页面正常加载 |
| S-07 | Scenario | 访问 /scenario | 页面正常加载 |
| S-08 | AI Copilot | 访问 /copilot | 页面正常加载 |
| S-09 | 静态资源 | 检查 JS/CSS/图片 | 全部加载成功 |
| S-10 | 404 页面 | 访问不存在的路由 | 显示 404 页面 |

---

## 十、Bug 报告模板

```
## Bug Report

**标题**: [页面] 简短描述
**严重度**: P0/P1/P2/P3
**浏览器**: Chrome 120
**分辨率**: 1920×1080
**账号角色**: Owner/Editor/Viewer

### 复现步骤
1. 访问 [页面]
2. 点击 [按钮]
3. 输入 [数据]
4. 查看 [结果]

### 预期结果
描述预期行为

### 实际结果
描述实际行为

### 截图
[附件]

### Console 日志
```
[粘贴 console 输出]
```

### 备注
其他相关信息
```

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Browser QA Agent
