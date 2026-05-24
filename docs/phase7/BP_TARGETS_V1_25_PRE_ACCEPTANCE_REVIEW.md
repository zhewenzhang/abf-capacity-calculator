# BP Targets v1.25.0 预验收审查 (BP Targets v1.25 Pre-Acceptance Review)

- **审查基准分支**：`origin/main` 
- **当前最新提交**：`cec8315 fix: polish snapshot workflow i18n v1.24.1`
- **审查日期**：2026-05-24
- **审查结论**：**【尚未包含 v1.25.0 物理实现】**

---

## 📢 现状声明

经过对主干分支 `origin/main` 最新提交及源码树的深度检索，开发团队 (CC) 尚未向主干合并关于 **v1.25.0 BP Targets 独立页面与表格标准化** 的业务代码。

为了在 CC 提请合并时能够以最高效率、极客级的质量水准予以验收，特制定本 **预验收审查大纲 (Pre-Acceptance Checklist)**。CC 团队在提请 PR (Pull Request) 前，必须对照本大纲进行严格的白盒自查。

---

## 🔍 待 CC 完成后的 10 项严密验收点

### 1. 独立路由与导航对齐 (Routing & Navigation)
- [ ] 页面路由地址应固定为 `/parameters/bp-targets` 或 `/bp-targets`。
- [ ] 左侧导航栏应拥有独立的“BP 营业目标”菜单，且面包屑导航在中英文语言包下能够完全 1:1 对称翻译，不留任何硬编码。

### 2. 数据库位置物理不漂移 (Firestore Path Parity)
- [ ] 编辑并保存的数据，其在 Firestore 中的实际保存路径必须 100% 维持在 `ProjectParameters.bpTargets.yearlyRevenueTargetsMillionTwd`，严禁私自修改 schema 或创建新的 Collection，保障数据向下兼容。

### 3. react-datasheet-grid 架构适配 (Spreadsheet Engine)
- [ ] 表格数据录入的物理渲染引擎必须采用 `react-datasheet-grid`。
- [ ] 表格表头为年份（横向从左至右递增排列，如 `2024`, `2025`, `2026` ... ），行数据为目标值，符合财务人员使用 Excel 的习惯。

### 4. Excel 剪贴板块级无损粘贴 (Clipboard Integration)
- [ ] 从物理 Excel、Google Sheets 中横向复制一排 Tab 键分隔的年份营业值（如 `1200\t1500\t1800`），选中表格首个单元格粘贴时，必须能正确将其分割并自动映射到相邻的年份列单元格中，绝对不能以单个字符串拥挤在单个单元格内。

### 5. 负数输入拦截与非数字过滤 (Input Boundary & Validation)
- [ ] 单元格输入字母或符号时，应在失焦时予以过滤重置，或在输入时直接静默拦截非数字字符。
- [ ] 单元格输入负数（如 `-500`）时，失焦必须立即判定非法，单元格边框标红报错，且 [保存 (Save)] 按钮强行置灰禁用，杜绝非法数据写入。

### 6. 空值 (null) 语义优雅容错 (Null Value Attainment)
- [ ] 若用户清空某年份目标，在保存提交时，对应年份的数据在 Firestore Map 结构中应存为 `null` (或者彻底 delete 对应的年份 Key)，绝对禁止存为 `""`（字符串）或自动归零存为 `0`。

### 7. 脏状态与防呆拦截生命周期 (Dirty State Lifecycle)
- [ ] 只要表格数据被编辑过，且与最后一次数据库值不一致，界面必须立即展现“有未保存修改”的 Dirty State 视觉提示，且 [保存 (Save)] 与 [放弃 (Discard)] 按钮变为可用状态。
- [ ] 若用户在此脏状态下尝试切换路由，必须触发 React Router 路由守卫拦截弹窗，提示：“您有未保存的更改，确定要离开吗？”，防止用户误操作导致数据丢失。

### 8. 放弃更改 (Discard) 瞬时无损回滚 (無損復原)
- [ ] 点击 [放弃 (Discard)] 按钮后，表格数据必须在 `0ms` 延迟内重置回数据库最后一次保存的状态，Dirty State 提示瞬间消失，按钮变回置灰禁用态。

### 9. Viewer 角色只读硬拦截 (Viewer Role Read-Only Enforcement)
- [ ] 当用户以 Workspace Viewer (只读观察员) 权限进入该页面时，[保存] 和 [放弃] 按钮应被物理隐藏。
- [ ] 必须在 react-datasheet-grid 顶层或各列属性中绑定 `readOnly: true` (或 `disabled: true`)，使用户双击时无法聚焦、无法调出编辑光标、无法进行任何粘贴操作，确保 DOM 级别的硬只读防卫。

### 10. 下游关联报表（Dashboard / Results）无缝刷新 (Downstream Synchronization)
- [ ] BP Targets 保存成功后，直接通过导航切换至 Results 页面下的 `BP Analysis` 报表，确认其达标率计算（Attainment %）能够瞬时引用最新的目标设定值，无任何缓存延迟或需要按 F5 刷新才生效的问题。

---

## 🚨 最大产品风险与修补建议

1. **Parameters 页面数据并发撞车 (Data Overwrite)**
   - *风险分析*：用户可能在一个浏览器页签编辑旧版 Parameters 表单，在另一个页签使用新独立页面修改 BP。在 Parameters 保存其他偏好时，旧表单提交的旧 BP 目标会无情覆盖最新保存的目标。
   - *修补建议*：CC 必须**彻底剔除** Parameters 页面中对 BP Targets 的任何编辑入口与 Form 项，取而代之的是一张精美的信息引导卡片（跳转按钮），从物理上根绝并发冲突。
2. **Attainment 计算的“除以零”崩溃 (Division by Zero)**
   - *风险分析*：若用户在新页面中将某年份目标故意设为 `0` 并且成功保存，下游 `BP Analysis` 报表在计算 `Actual Revenue / BP Target` 时，若未作类型守卫，会导致计算得出 `Infinity` 或直接导致页面白屏崩溃。
   - *修补建议*：在 downstream 的所有计算逻辑中，必须在 Attainment 分母端增加 `if (target === 0)` 及对 `target === null` 的健全判断守卫。
