# ABF Capacity Calculator — v1.48 Browser QA 执行 Checklist

**版本**: v1.0
**日期**: 2026-05-29
**用途**: 可执行的浏览器 QA 测试清单

---

## 测试环境

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome 最新稳定版 |
| 分辨率 | 1920×1080 (桌面), 375×812 (移动端) |
| 账号 | Owner, Editor, Viewer |
| 数据 | Demo Dataset (34 SKU, 5 客户) |

---

## 1. Dashboard (/dashboard)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| D-01 | 页面加载 | 访问 /dashboard | 页面正常加载，无 console error | | [ ] | |
| D-02 | KPI 卡片 | 查看 KPI 区域 | 显示 Total SKUs: 34 | | [ ] | |
| D-03 | 营收趋势图 | 查看 Revenue Trend | 图表正常渲染 | | [ ] | |
| D-04 | BP 达成表 | 查看 BP Attainment | 显示 2026 年 87.5% | | [ ] | |
| D-05 | 币种切换 | 切换 USD/TWD/CNY | 所有金额同步更新 | | [ ] | |
| D-06 | 语言切换 | 切换 EN/zh-TW | 所有文案切换 | | [ ] | |
| D-07 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 2. Operations (/operations)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| O-01 | 页面加载 | 访问 /operations | 页面正常加载 | | [ ] | |
| O-02 | 流程步骤 | 查看 7 个步骤 | 显示正确状态 | | [ ] | |
| O-03 | 异常诊断 | 查看异常列表 | 显示 4+ 个异常 | | [ ] | |
| O-04 | Look-Ahead | 查看前瞻面板 | 显示未来 6 个月 | | [ ] | |
| O-05 | 营收/BP | 查看摘要 | 显示正确数据 | | [ ] | |
| O-06 | 场景快捷 | 点击预设场景 | 跳转到 Scenario | | [ ] | |
| O-07 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 3. Products (/products)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| P-01 | 页面加载 | 访问 /products | 显示 34 个 SKU | | [ ] | |
| P-02 | DQ Badge | 查看 A-NO-PRICE | 红色 "Missing Unit Price" | | [ ] | |
| P-03 | DQ Badge | 查看 B-EUR-001 | 红色 "Unsupported Currency" | | [ ] | |
| P-04 | Quick Fix | 点击 A-NO-PRICE Badge | 打开 Quick Fix Drawer | | [ ] | |
| P-05 | Quick Fix 修复 | 输入单价 $3.20 | DQ 问题修复 | | [ ] | |
| P-06 | Viewer 只读 | 以 Viewer 登录 | 编辑按钮禁用 | | [ ] | |
| P-07 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 4. Forecasts (/forecasts)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| F-01 | 页面加载 | 访问 /forecasts | 页面正常加载 | | [ ] | |
| F-02 | DQ 警告 | 查看 C-ORPHAN | 显示 "Orphan SKU" 警告 | | [ ] | |
| F-03 | Guided Fix | 点击孤儿预测警告 | 打开 Guided Fix Modal | | [ ] | |
| F-04 | Viewer 只读 | 以 Viewer 登录 | 编辑功能禁用 | | [ ] | |
| F-05 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 5. Capacity (/capacity)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| C-01 | 页面加载 | 访问 /capacity | 页面正常加载 | | [ ] | |
| C-02 | 视图切换 | Month → Quarter → Year | 视图正确切换 | | [ ] | |
| C-03 | DQ 警告 | 查看 F2 2026-09 | 显示 "Missing capacity" | | [ ] | |
| C-04 | Viewer 只读 | 以 Viewer 登录 | 编辑功能禁用 | | [ ] | |
| C-05 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 6. BP Targets (/bp-targets)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| B-01 | 页面加载 | 访问 /bp-targets | 页面正常加载 | | [ ] | |
| B-02 | 年份警告 | 查看 2028 年 | 显示黄色警告 | | [ ] | |
| B-03 | Quick Fix | 点击 2028 警告 | 打开 Quick Fix Popover | | [ ] | |
| B-04 | Viewer 只读 | 以 Viewer 登录 | 编辑功能禁用 | | [ ] | |
| B-05 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 7. Results (/results)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| R-01 | 页面加载 | 访问 /results | 页面正常加载 | | [ ] | |
| R-02 | Sales Tab | 查看销售视图 | 显示客户/SKU 分析 | | [ ] | |
| R-03 | BP Analysis | 切换到 BP Tab | 显示 BP 达成矩阵 | | [ ] | |
| R-04 | Risk Brief | 切换到 Risk Tab | 显示风险简报 | | [ ] | |
| R-05 | Key Findings | 切换到 Findings Tab | 显示 Top 5 发现 | | [ ] | |
| R-06 | 币种切换 | 切换 USD/TWD/CNY | 金额同步更新 | | [ ] | |
| R-07 | 语言切换 | 切换 EN/zh-TW | 文案切换 | | [ ] | |
| R-08 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 8. Scenario (/scenario)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| S-01 | 页面加载 | 访问 /scenario | 页面正常加载 | | [ ] | |
| S-02 | 参数设置 | 设置 Customer B -20% | 参数正确显示 | | [ ] | |
| S-03 | 运行场景 | 点击 Run Scenario | 计算完成 | | [ ] | |
| S-04 | Revenue Impact | 查看营收影响 | 显示下降 5.2 亿 | | [ ] | |
| S-05 | Capacity Impact | 查看产能影响 | 显示利用率变化 | | [ ] | |
| S-06 | Viewer 只读 | 以 Viewer 登录 | 参数不可编辑 | | [ ] | |
| S-07 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 9. AI Copilot (/copilot)

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| A-01 | 页面加载 | 访问 /copilot | 页面正常加载 | | [ ] | |
| A-02 | 快速问题 | 点击 "数据质量" | 返回 DQ 分析 | | [ ] | |
| A-03 | 关键词路由 | 输入 "产能瓶颈" | 返回产能分析 | | [ ] | |
| A-04 | 自由输入 | 输入 "BP 为什么没达标" | 返回 BP 分析 | | [ ] | |
| A-05 | 工具显示 | 查看工具名称 | 显示使用的工具 | | [ ] | |
| A-06 | Viewer 限制 | 以 Viewer 登录 | 只读提示 | | [ ] | |
| A-07 | Console | 检查 Console | 无 error/warning | | [ ] | |

---

## 10. 权限测试

### Owner 角色

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| PERM-01 | Products | Owner 登录 → Products | 可读可写 | | [ ] | |
| PERM-02 | Forecasts | Owner 登录 → Forecasts | 可读可写 | | [ ] | |
| PERM-03 | Capacity | Owner 登录 → Capacity | 可读可写 | | [ ] | |
| PERM-04 | BP Targets | Owner 登录 → BP Targets | 可读可写 | | [ ] | |
| PERM-05 | Scenario | Owner 登录 → Scenario | 可读可写 | | [ ] | |

### Editor 角色

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| PERM-06 | Products | Editor 登录 → Products | 可读可写 | | [ ] | |
| PERM-07 | Forecasts | Editor 登录 → Forecasts | 可读可写 | | [ ] | |
| PERM-08 | Workspace | Editor 登录 → Workspace | 不可管理 | | [ ] | |

### Viewer 角色

| # | 测试项 | 操作步骤 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|---------|------|------|
| PERM-09 | Products | Viewer 登录 → Products | 只读 | | [ ] | |
| PERM-10 | Forecasts | Viewer 登录 → Forecasts | 只读 | | [ ] | |
| PERM-11 | Capacity | Viewer 登录 → Capacity | 只读 | | [ ] | |
| PERM-12 | BP Targets | Viewer 登录 → BP Targets | 只读 | | [ ] | |
| PERM-13 | Scenario | Viewer 登录 → Scenario | 参数不可编辑 | | [ ] | |
| PERM-14 | DQ Fix | Viewer 点击 DQ Badge | 只读提示 | | [ ] | |

---

## 11. 国际化测试

### EN → zh-TW 切换

| # | 页面 | 测试项 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|------|--------|---------|---------|------|------|
| I18N-01 | Dashboard | KPI 标签 | 全部翻译 | | [ ] | |
| I18N-02 | Products | 表单标签 | 全部翻译 | | [ ] | |
| I18N-03 | Forecasts | 表单标签 | 全部翻译 | | [ ] | |
| I18N-04 | Capacity | 视图切换 | 全部翻译 | | [ ] | |
| I18N-05 | BP Targets | 表单标签 | 全部翻译 | | [ ] | |
| I18N-06 | Results | Tab 名称 | 全部翻译 | | [ ] | |
| I18N-07 | Scenario | 参数标签 | 全部翻译 | | [ ] | |
| I18N-08 | AI Copilot | 快速问题 | 全部翻译 | | [ ] | |
| I18N-09 | Operations | 步骤名称 | 全部翻译 | | [ ] | |

### 翻译完整性

| # | 检查项 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|--------|---------|---------|------|------|
| I18N-10 | 硬编码文案 | 无未翻译 | | [ ] | |
| I18N-11 | {placeholder} | 无泄漏 | | [ ] | |
| I18N-12 | raw key | 无显示 | | [ ] | |
| I18N-13 | 乱码 | 无乱码 | | [ ] | |

---

## 12. 移动端测试 (375px)

| # | 页面 | 测试项 | 预期结果 | 实际结果 | 通过 | 备注 |
|---|------|--------|---------|---------|------|------|
| MOB-01 | Dashboard | KPI 卡片 | 单列显示 | | [ ] | |
| MOB-02 | Products | 表格 | 水平滚动 | | [ ] | |
| MOB-03 | Forecasts | 表格 | 水平滚动 | | [ ] | |
| MOB-04 | Capacity | 表格 | 水平滚动 | | [ ] | |
| MOB-05 | Results | Tab 切换 | 可切换 | | [ ] | |
| MOB-06 | Scenario | 表单 | 单列显示 | | [ ] | |
| MOB-07 | AI Copilot | 消息列表 | 正常显示 | | [ ] | |
| MOB-08 | Operations | 流程步骤 | 堆叠显示 | | [ ] | |

---

## 测试统计

| 类别 | 总数 | 通过 | 失败 | 通过率 |
|------|------|------|------|--------|
| Dashboard | 7 | | | |
| Operations | 7 | | | |
| Products | 7 | | | |
| Forecasts | 5 | | | |
| Capacity | 5 | | | |
| BP Targets | 5 | | | |
| Results | 8 | | | |
| Scenario | 7 | | | |
| AI Copilot | 7 | | | |
| 权限测试 | 14 | | | |
| 国际化 | 13 | | | |
| 移动端 | 8 | | | |
| **总计** | **93** | | | |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Browser QA Agent
