# v1.36.0 Data Quality Remediation Entry Points MVP 发布评审与只读验收报告模板
(V1_36_DQ_REMEDIATION_RELEASE_REVIEW_TEMPLATE.md)

本评审文档用于在 v1.36.0 "Data Quality Remediation Entry Points MVP" 阶段开发完成后，由测试团队、架构师与产品经理共同进行上线前的只读版本物理校验与最终发布签署。评审必须严格对照以下 11 大验收重点进行，确保 MVP 范围严密受控、系统绝对安全。

---

## 一、 版本发布与测试环境基本信息 (Release Metadata)

| 评审项目 | 填写内容 / 验证状态 |
| :--- | :--- |
| **评审时间 (Review Time)** | 2026-05-27 / [请填写实际时间] |
| **分支名称 (Git Branch)** | `agy/v1-36-dq-remediation-spec` / [请填写实际开发分支] |
| **最后提交哈希 (Commit Hash)**| [请填写 40 位 Commit Hash] |
| **评审人员 (Reviewers)** | 架构师：___________ | 测试经理：___________ | 产品经理：___________ |
| **部署环境 (Environment)** | [ ] 本地模拟器 (Emulator)  [ ] 预发环境 (Staging) |

---

## 二、 系统级安全红线与架构审查 (System Security Gate)

> [!IMPORTANT]
> 以下 4 项系统级红线如果有一项为 “未通过(FAILED)”，必须立即中止发布流程，驳回代码进行重构。

| # | 安全与架构校验点 | 校验方法与证据 | 评审状态 (PASS/FAIL) |
| :--- | :--- | :--- | :---: |
| **1** | **未新增 Firestore 集合与冗余字段** | 检查 Firestore Schema，严禁存在 `dq_logs`、`quick_fixes` 等新集合，原始 SKU、Forecast 等 Schema 严禁新增任何冗余的状态字段。 | **[  ] PASS**<br>**[  ] FAIL** |
| **2** | **未改动底层核心计算公式与 AI 导出** | 检查 `frontend/src/core/calculationEngine.ts` 及 AI 简报导出模块，验证核心计算逻辑与导出的文本模版 100% 保持原样，无任何逻辑污染。 | **[  ] PASS**<br>**[  ] FAIL** |
| **3** | **绝对禁止“静默自动修复” (No Silent Auto-save)**| 遍历所有自愈场景交互，确认在任何情况下系统均未在后台自动改写用户数据，所有物理修改必须伴随有权限用户的显式确认与点击保存。 | **[  ] PASS**<br>**[  ] FAIL** |
| **4** | **100% 复用现有的 Service 保存 API** | 检查代码中所有的自愈写操作，确认其直接且唯一调用了已有的 `skuService.saveSku`、`forecastService.saveForecast` 等 API，未开发任何新的后端保存逻辑。 | **[  ] PASS**<br>**[  ] FAIL** |

---

## 三、 11 大核心验收重点逐项校验 (11 Core Acceptance Checklists)

### 1. MVP 范围严密受控审查 (MVP Scope Control)
* [ ] **验证点**：系统定位为 “Entry Points MVP” (入口MVP)，核心在于打通发现缺陷到修复入口的闭环路径，提供极简的就地自愈表单。
* [ ] **判定标准**：未引入任何过度的、跨表复杂的自动串联修复或复杂的自愈日志后台管理页面。系统无过度工程设计。

### 2. Products Quick Fix 安全补值验证 (Products Security)
* [ ] **验证点**：Products 页面的 Quick Fix Drawer 只允许修齐特定关键字段。
* [ ] **判定标准**：
  - [ ] 可编辑字段严格局限于：`unitPrice`, `currency`, `chipLengthMm`, `chipWidthMm`, `layerCount`, `application`。
  - [ ] 前端输入框具备严格防备校验，单价、晶片尺寸、层数输入 `<= 0` 或空值时，系统必须即时阻断物理提交并标红报错。

### 3. BP Targets 营业目标“缺失”与“为0”概念隔离验证 (BP Targets Context Separation)
* [ ] **验证点**：营业目标的自愈入口不混淆 “缺失(Missing)” 和 “数值为 0” 两种截然不同的业务状态。
* [ ] **判定标准**：
  - [ ] 当某年份营业目标在数据库中未配置或为 `null` 时，系统触发 “缺失(missing-bp-target)” 警报与快速补值入口。
  - [ ] 当某年份营业目标被用户显式录入且设定为 `0` 时，系统应当视其为合法的业务决策（目标为零），**绝对不触发** “缺失” 警报，亦不弹出补值提示。

### 4. Parameters 汇率快速修复正数校验 (Parameters Exchange Rate Security)
* [ ] **验证点**：在汇率设定卡片旁的 Popover 自愈补齐中，输入的汇率数值必须合法。
* [ ] **判定标准**：
  - [ ] 输入的汇率值必须严格满足 `rate > 0`。
  - [ ] 输入负数、零、或非法非数字字符时，前端气泡的 “确定补全” 按钮必须处于 disabled 状态，或点击时即时拦截报错，阻止向后台发送垃圾汇率数据。

### 5. Forecasts 孤儿预测非自动处理审查 (Forecasts Guided Limit)
* [ ] **验证点**：孤儿预测行（`forecast-orphan-sku`）不得在后台自动进行任何实体改动。
* [ ] **判定标准**：
  - [ ] 系统**严禁**在后台自动删除孤儿预测，亦**严禁**自动为其凭空创建 SKU 主数据。
  - [ ] 必须且仅能通过 **Guided Fix Modal**（引导对话框）的方式为用户提供清晰的主动决策路径（包括去新建 SKU 的导航、聚焦当前行编辑框进行重绑、或者用户手动触发确认删除）。

### 6. Capacity 缺失非自动建立产能审查 (Capacity Navigation Limit)
* [ ] **验证点**：产能缺失警报（`forecast-missing-capacity`）严禁在后台静默建立任何产能记录。
* [ ] **判定标准**：
  - [ ] 当月度需求预测存在但缺少产能配置时，自愈入口**严禁**在后台静默创建一个产能等于零或等于需求的 Capacity 记录。
  - [ ] 必须仅做 **Navigation Fix**：提供一键超链接，路由携带 Query 参数（如 `?focusMonth=2026-03`）跳转到 `/capacity` 页面，由用户手动输入并物理保存产能。

### 7. 只读 Viewer 权限隔离阻断校验 (Viewer Absolute Gate)
* [ ] **验证点**：只读 Viewer 账户的安全防线必须达到物理阻断级别。
* [ ] **判定标准**：
  - [ ] 使用 Viewer 角色账户登录时，页面上所有的 DQ Badges 和 Alert 图标**绝对不响应点击事件**，不拉出 Drawer，不弹出 Popover/Modal。
  - [ ] 或者（若弹出只读详情），气泡内的所有 Input、Button 必须被强施加 `disabled` 属性，提供 100% 只读信息面板，没有任何物理提交路径。

### 8. Firestore 物理 Schema 保持原样 (No Firestore Schema Changes)
* [ ] **验证点**：检查 `firestore.rules` 文件的 Git 差异。
* [ ] **判定标准**：`firestore.rules` 文件未做任何修改，原有的安全性拦截策略未被降级或旁路，物理防线 100% 稳固。

### 9. 核心公式与分析模块无修改校验 (No Formula & Analytical Intrusion)
* [ ] **验证点**：检查核心计算公式以及 AI 简报导出的 Git 变更记录。
* [ ] **判定标准**：`calculationEngine.ts` 等底层文件未引入任何补值相关的 hardcode 代码（例如：`if (price === 0) price = 1` 等脏逻辑），确保底层物理数据分析计算的高度严谨。

### 10. package-lock 依赖同步校验 (Package Dependency Sync)
* [ ] **验证点**：验证前端项目是否有未授权的 npm 包引入及锁文件同步状态。
* [ ] **判定标准**：
  - [ ] 检查 `package.json` 中的 `dependencies`，确认未引入任何额外的、与业务自愈逻辑无关的第三方包。
  - [ ] 运行 `npm ci` 或安装依赖，验证 `package-lock.json` 与 `package.json` 保持 100% 同步，未发生冲突。

### 11. 构建与自动化测试通过校验 (Build & Test Success)
* [ ] **验证点**：验证系统在本地进行 Lint、编译及测试的运行状况。
* [ ] **判定标准**：
  - [ ] 在前端目录下运行 `npm run lint` 验证通过，无任何语法或规范错误。
  - [ ] 运行 `npm run build` 成功通过，未抛出任何 TypeScript 类型编译报错。
  - [ ] 运行 `npm run test`（若有配置单元测试）全部测试用例成功通过。

---

## 四、 最终发布评审结论 (Final Release Verdict)

经评审小组全体成员共同验证，针对 v1.36.0 "Data Quality Remediation Entry Points MVP" 版本的发布结论签署如下：

* **[  ] 准予发布 (APPROVED)**：版本完全满足以上 11 大验收重点，各项指标及系统安全红线全部 PASS。
* **[  ] 延期发布 (REJECTED)**：存在以下严重缺陷，必须重构后重新评审：
  * *阻碍性缺陷描述*：_______________________________________________________________
  * *需要返工的清单点 (Items to re-check)*：[ ] 红线1  [ ] 红线2  [ ] 重点_____

**评审代表签字确认**：
* 架构师：______________________ (日期: YYYY-MM-DD)
* 测试经理：____________________ (日期: YYYY-MM-DD)
* 产品经理：____________________ (日期: YYYY-MM-DD)
