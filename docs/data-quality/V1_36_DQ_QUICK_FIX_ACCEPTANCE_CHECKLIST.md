# v1.36.0 Data Quality Quick Fix Acceptance Checklist (验收清单)

本清单用于在 CC（开发代理/人员）完成 v1.36.0 数据质量自愈流（Data Quality Remediation Workflow）开发后，作为上线前的最终严苛验收标准。测试必须覆盖所有核心场景，确保交互流畅、安全无漏。

---

## 一、 数据安全与系统架构红线校验 (System Gatekeeper Rules)

* [ ] **红线 1：绝对未引入任何新的自定义数据模型/集合**
  * 数据库底层无 `dq_logs`、`dq_remediation` 或 Sku/Forecast 下的新冗余字段。所有修改直接落盘在原始字段上。
* [ ] **红线 2：绝对没有“静默自动修复 (Silent Auto-save)”**
  * 所有的修复都必须伴随用户的显式点击确认，绝对不允许后台自动将缺失单价改为 1.0、缺失产能设为 0 等。
* [ ] **红线 3：完全复用现有的 Service 保存 API**
  * `Products` 的修复必须调用并复用 `skuService.saveSku`；
  * `Forecasts` 的价格与重绑定必须复用 `forecastService.saveForecast`；
  * `Capacity` 的补配必须复用 `capacityService.saveCapacityPlan`；
  * `Parameters` 汇率补齐必须复用 `parameterService.saveParameters`。
* [ ] **红线 4：不破坏 Underlying 物理计算与安全规则**
  * `calculationEngine.ts` 算法无任何修改；`firestore.rules` 安全规则保持原样。

---

## 二、 6 大核心 DQ 缺陷修复功能验收清单

### 1. Products 属性缺失快速自愈 (Quick Fix)
* [ ] 点击 Products 列表里存在 `sku-missing-attr`（红色 Error）的 SKU 这一行的错误 Badge。
* [ ] 系统在不跳转页面的前提下，在右侧顺利拉出 `SKU Quick Fix Drawer`。
* [ ] Drawer 中高亮标出该 SKU 缺失的属性（如 `layerCount` 缺失呈现红色高亮输入框），并默认将焦点（Focus）置于首个缺失字段。
* [ ] 输入有效数值（如层数输入 `6`），点击底部的“确认自愈”，按钮进入 Loading。
* [ ] 保存成功，Drawer 自动关闭，表格数据即时刷新。
* [ ] 该 SKU 行原本的红色 Error Badge **即时消失/变绿**，计算结果即时刷新（无需手动刷新网页）。

### 2. 需求预测孤儿行快速绑定 (Quick Fix / Navigation Fix)
* [ ] 访问 Forecasts 列表页，找到背景为淡红色的 `forecast-orphan-sku`（孤儿预测）行。
* [ ] 点击 SKU ID 单元格旁边的红色 Error 图标，顺利弹出 Quick Fix Popover 气泡。
* [ ] **测试方案 A (Quick Fix)**：
  * 在 Popover 中展示一个下拉 Select 框，里面加载了当前系统所有合法的 SKU 主数据。
  * 选择一个合法的 SKU，点击“重新绑定 (Rebind)”。
  * 页面即时更新，淡红色警示背景消除，原本报错行无缝融入正常预测列表。
* [ ] **测试方案 B (Navigation Fix)**：
  * 在 Popover 中点击“去 SKU 页新建该产品”链接。
  * 页面平滑路由跳转至 `/products`，并自动激活“新增 SKU”Drawer。
  * 新增 SKU Drawer 中的 `skuId` 输入框已默认填充该孤儿 SKU 编码，引导用户一键补全建档。

### 3. 需求预测 0 价格就地修补 (Quick Fix)
* [ ] 访问 Forecasts 页或 SpreadSheet 实验室页，定位至单价单元格为 0 且显示黄色 Warning 图标的格点。
* [ ] 双击该单元格，顺利进入就地编辑态（InputNumber）。
* [ ] 输入非 0 价格（如 `150.00`），按下 Enter 或失焦。
* [ ] 数据成功写入 Firestore，单元格的黄色 Warning 警告即时褪去，总收入预测随之重新计算并更新。

### 4. 产能缺失引导与一键高亮 (Guided Fix)
* [ ] 在产能页或分析 Dashboard 顶部，发现“预测需求月份缺少产能规划（如：2026-03）”的红色大 Alert。
* [ ] 点击 Alert 旁边的“去解决 (Remediation)”按钮，顺利弹出 `Guided Fix Modal` 对话框。
* [ ] Modal 对话框中提供清晰的两条路径：
  * “选项一：去配置产能” ── 点击后，路由跳转至 `/capacity`。
  * **跳转高亮定位验证**：跳转到容量页面后，页面默认加载 2026 年，视口自动滚动并定位至 03 月的 `corePanel` 产能输入框，且输入框高亮闪烁，引导直接填写。
  * 用户填入产能并保存，顶部 Alert 自动消除。

### 5. 营业目标缺失定位导航 (Navigation Fix)
* [ ] 在 BpTargets 页面看到黄色 Alert 提示：“2027 年预测需求存在但缺失营业目标”。
* [ ] 点击 Alert 旁的“去设定 (Fix Target)”按钮。
* [ ] 页面不刷新，视口自动滚动并平滑锚定至 `BpTargets` 表格中的 2027 年营业目标单元格，输入框显示高亮聚焦。
* [ ] 填入数值，保存，顶部 Alert 消失。

### 6. 参数设定缺失汇率快捷补齐 (Quick Fix)
* [ ] 访问 Parameters 参数页，在使用 TWD 计价但未配置 TWD 汇率时，在“币别与汇率设定”Card 标题旁显示红色 Error Badge。
* [ ] 点击 Badge，顺利弹出 `Exchange Rate Quick Fix Popover` 气泡。
* [ ] 气泡中自动抓取“使用此币别但缺失汇率的 SKU 数量”。
* [ ] 提供 TWD/USD 汇率输入框，输入 `0.031`，点击“即时补全”。
* [ ] 汇率写入成功，Parameters 卡片的红色 Badge 变绿，且系统内 TWD 计价的商品营收即时获得正确汇率折算，报错状态抹除。

---

## 三、 多人协同 Viewer 权限硬拦截验收

* [ ] **完全知情呈现**：
  * 使用只读 Viewer 账户登录，访问以上五个页面，确保上述所有的红色、黄色警告图标、Alert 警示横幅以及 Tooltip 浮窗 **100% 完整显示，且信息与 Editor 一致**。
* [ ] **绝对只读拦截 (Viewer Gate)**：
  * Viewer 在页面上点击任何 DQ Badge 或 Alert 图标，**绝对不会拉出任何 Quick Fix Drawer 或 Popover，亦不会弹出 Guided Modal**。
  * 如果采用气泡展示，气泡内的所有输入项和保存按钮必须处于 disabled 状态，只看不给改。
  * 尝试恶意向后台发送 `saveSku` 等 API 更新请求时，受底层 `firestore.rules` 限制被强行驳回并抛出 403 权限错误。

---

## 四、 页面交互与自愈流畅度验收 (UX Flow)

* [ ] **物理无刷新自愈 (No-Refresh UI)**：
  * 任何一项 Quick Fix 点击“保存自愈”并在后台 Loading 结束成功落盘后，页面上的对应 DQ 红色/黄色错误标记在 **0.5 秒内自愈隐去**，不需要用户执行 Ctrl+F5 强制刷新页面才看到效果。
* [ ] **异常与无效输入拦截 (Validation)**：
  * 在 Quick Fix Drawer 中，如果用户清空了某个关键值或输入了负数，点击保存时，前端表单应即时触发 Validate 拦截，显示“请输入大于 0 的有效数值”，阻止向后台提交无效的自愈请求。
