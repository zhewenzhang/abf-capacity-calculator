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
  * `Parameters` 汇率补齐必须复用 `parameterService.saveParameters`；
  * `BP Targets` 营业目标补齐必须复用 `bpTargetService.saveBpTarget`。
* [ ] **红线 4：不破坏 Underlying 物理计算与安全规则**
  * `calculationEngine.ts` 算法无任何修改；`firestore.rules` 安全规则保持原样。

---

## 二、 6 大核心 DQ 缺陷修复功能验收清单

### 1. Products 属性缺失快速自愈 (Quick Fix - Drawer 模式)
* [ ] 在 `Products.tsx` 页面，定位至存在 `sku-missing-attr` 警示（红色 Error）的 SKU。
* [ ] 点击行级红色 `DataQualityBadge` 错误图标，系统在不跳转页面的前提下，顺利拉出 `SKU Quick Fix Drawer`。
* [ ] 验证事件冒泡拦截：点击图标时不会触发该表格行的“行选择”或“打开常规编辑”事件。
* [ ] Drawer 中高亮标出该 SKU 缺失的属性（如 `layerCount` 缺失呈现红色高亮输入框），并默认将焦点（Focus）置于首个缺失字段。
* [ ] 输入有效数值（如层数输入 `6`，晶片长宽输入 `20`，单价输入 `150`），点击底部的“确认自愈”，按钮进入 Loading。
* [ ] 表单合法性校验：若输入负数或空值，点击保存时前端应即时拦截并标红报错。
* [ ] 保存成功，Drawer 自动关闭，表格数据即时刷新。
* [ ] 该 SKU 行原本的红色 Error Badge **即时消失/变绿**，计算结果即时刷新（无需手动刷新网页）。

### 2. 需求预测孤儿行引导式修复 (Guided Fix - Modal 模式)
* [ ] 访问 `Forecasts.tsx` 列表页，找到背景为淡红色的 `forecast-orphan-sku`（孤儿预测）行。
* [ ] 点击 SKU ID 单元格旁边的红色 Error 图标，顺利弹出 `Orphan Forecast Guided Fix Modal` 对话框。
* [ ] **验证路径 A (去 Products 页面新建该 SKU)**：
  * 点击“去 Products 页面新建该 SKU”链接，页面平滑路由跳转至 `/products`。
  * 自动激活“新增 SKU”Drawer，且 `skuId` 输入框中已默认填充该孤儿 SKU 编码，引导用户一键补全建档。
* [ ] **验证路径 B (去 Forecasts 编辑器修正此引用)**：
  * 点击“去 Forecasts 编辑器修正此引用的 SKU”链接，Modal 关闭。
  * 自动激活并聚焦当前预测行的 SKU 下拉编辑框，引导用户重新绑定为已存在的合法 SKU。
* [ ] **验证路径 C (删除此笔无主预测)**：
  * 点击“删除此笔无主预测”按钮，弹出二次确认，确认后就地物理删除该行预测数据，表格即时刷新，孤儿行彻底消失。

### 3. 需求预测 0 价格就地修补 (Quick Fix - 单元格/气泡模式)
* [ ] 访问 `Forecasts.tsx` 页或 SpreadSheet 实验室页，定位至单价单元格为 0 且显示黄色 Warning 图标的格点。
* [ ] 双击该单元格，顺利进入就地编辑态（InputNumber）或者弹出 Popover。
* [ ] 输入非 0 价格（如 `150.00`），按下 Enter 或失焦。
* [ ] 校验逻辑：输入负数或非法格式应予以阻止。
* [ ] 数据成功写入 Firestore，单元格的黄色 Warning 警告即时褪去，总收入预测随之重新计算并更新。

### 4. 产能缺失引导与一键高亮 (Navigation & Guided Fix)
* [ ] 在容量页或分析 Dashboard 顶部，发现“预测需求月份缺少产能规划（如：2026-03）”的红色大 Alert。
* [ ] **场景 A (产能记录完全缺失 - Navigation Fix)**：
  * 点击 Alert 旁的“去解决 (Fix)”按钮，页面跳转至 `/capacity` 并带有 `?focusMonth=2026-03` 参数。
  * 目标页面加载后，视口自动平滑滚动定位至 03 月的产能输入框，且输入框高亮闪烁，引导直接填写。
* [ ] **场景 B (高层数 SKU 需求 vs BU 产能为零 - Guided Fix)**：
  * 点击警告图标，顺利弹出 `BU Capacity Deficiency Guided Modal` 对话框。
  * Modal 对话框中提供清晰的两条路径：
    - “路径 A：去配置产能” ── 点击后，路由跳转至 `/capacity` 且携带 `?focusMonth=2026-03&focusField=buPanelPerDay` 参数，自动定位并闪烁该输入框。
    - “路径 B：调整需求预测” ── 点击后，跳转至 `Forecasts` 页面，并自动过滤出 2026-03 月份下所有高层数 SKU 预测需求，方便用户修改。

### 5. 营业目标缺失定位导航 (Quick Fix - 行内小表单模式)
* [ ] 在 `BpTargets.tsx` 页面顶部或 Forecasts 页面顶部看到黄色 Alert 提示：“2027 年预测需求存在但缺失营业目标”。
* [ ] 点击 Alert 旁的“快速自愈 (Quick Fix)”按钮。
* [ ] 在 Alert 旁直接展开一个极简的行内输入框 (Inline Form)，输入框自动聚焦。
* [ ] 填入大于 0 的数值（如 `50000000`），点击保存。
* [ ] 保存成功，黄色 Alert 即时消失，且营业达成率分析重算更新。

### 6. 参数设定缺失汇率快捷补齐 (Quick Fix - Popover 模式)
* [ ] 访问 `Parameters.tsx` 参数页，在使用 TWD 计价但未配置 TWD 汇率时，在“币别与汇率设定”Card 标题旁显示红色 Error Badge。
* [ ] 点击 Badge，顺利弹出 `Exchange Rate Quick Fix Popover` 气泡。
* [ ] 气泡中自动抓取并展示使用此币别但缺失汇率的 SKU 数量。
* [ ] 提供 TWD/USD 汇率输入框，输入 `0.031`，点击“即时补全”。
* [ ] 输入校验：如输入负数或非数字，予以即时阻断。
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
