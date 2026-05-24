# Forecasts Spreadsheet Lab (v1.26.0) 功能验收清单

本清单用于定义并约束 **v1.26.0 Forecasts Spreadsheet Lab (销售预测实验大表)** 模块的功能交付标准，确保表格在多维数据录入场景下的稳定与交互高标准。

---

## 📌 核心功能验收规范

### 1. 独立路由与显眼“实验沙盒”标识 (Lab Routing & Badge)
- [ ] 页面路由地址必须统一注册为：`/forecasts-lab`。
- [ ] **视觉标识**：页面左上角或标题旁，必须带有非常显眼且精美的“**Experimental Lab (实验性沙盒)**”或 “**Beta**” 的 Badge 标签（Ant Design 风格的橙色或紫色渐变气泡），提示用户此为高性能测试页面。

### 2. 双轨灰度并行红线 (Dual-Track Coexistence)
- [ ] 该实验页**绝对不能直接替代或删除现有的正式 Forecasts 页面**，两者必须保持双轨灰度并行，正式入口依然维持旧有交互逻辑。
- [ ] 用户在实验页进行的数据修改，其数据库底层应当与正式 Forecasts 数据源保持一致，确保数据无缝穿透。

### 3. 全局年份选择器联动 (Year Selector Synchronization)
- [ ] 页面顶部应配备独立的 Year Selector（年份下拉框，如 `2024`, `2025`, `2026` ...）。
- [ ] 切换年份时，表格中的 SKU 预测数据必须在 `200ms` 内重置渲染为该所选年份的 12 个月预测值，无历史年份脏数据缓存残留。

### 4. 二维大表布局与 12 个月横向录入 (Matrix Layout)
- [ ] 表格左侧前两列展示 SKU 信息（如 `SKU Code`、`SKU Name`），右侧 12 列对应 `1月 (Jan)` 到 `12月 (Dec)`。
- [ ] 12 个月的预测输入值以横向一字排开，高度贴合财务人员进行年度 Forecast 铺设的视觉习惯。

### 5. 多维剪贴板（跨行/跨列/块级）批量粘贴 (Multidimensional Paste)
- [ ] **单列/单行粘贴**：支持复制一排 Excel 月度数据（如 `10\t20\t30...`）横向粘贴，自动拆分。
- [ ] **多维矩阵粘贴**：支持从物理 Excel 中框选一个 `M 行 * N 列` 的大块预测数据（如 10 个 SKU，每个 SKU 包含 12 个月，共计 120 个单元格），在实验页表格首个对应单元格执行 `Ctrl + V` 时，必须能完美还原这一矩形块的数据，并逐个正确映射到各个 SKU 的相应月份单元格中。

### 6. 【硬性红线】强制 Dirty State，严禁任何失焦 Auto-Save
- [ ] > [!IMPORTANT]
  > **绝对禁止引入失焦后自动保存 (Auto-save on blur) 的行为！** 
  > 销售预测属于超高频录入，如果每修改一个格子失焦都触发一次 Firestore 发包写入，会导致短时间内触发成千上万次 Firestore 物理写入，造成严重计费爆炸与并发写入放大风险。
- [ ] 必须强行引入 Dirty State 状态机：一旦有任何格子被编辑，页面顶部或底部浮现 [保存修改 (Save)] 和 [放弃修改 (Discard)] 按钮，仅在用户显式点击 [保存] 后进行一键批量合并打包（Firestore Batch Save）写入。

### 7. Workspace Viewer 角色 DOM 级只读隔离 (Viewer Role Hard Isolation)
- [ ] 当用户为 Viewer（只读）角色时，[保存] 和 [放弃] 按钮彻底隐藏。
- [ ] `react-datasheet-grid` 必须通过在组件层设置 `disabled` 或为各月份输入列绑定 `readOnly: true` 彻底锁死单元格焦点。不允许用户双击调出编辑框或通过键盘修改任何值。

### 8. 空 SKU 状态的优雅引导 (Empty State Guide)
- [ ] 当当前年份该工作空间下没有录入任何 SKU 时，表格中不应光秃秃地裸露空表头，应显示精致的 Ant Design Empty 空白引导页，文案提示：“当前年份暂无 SKU 销售预测，请先去 [Products] 页面添加 SKU，或一键导入默认 SKU”。

### 9. 下游联动刷新与 i18n 双语 1:1 对齐 (Downstream Sync & i18n Parity)
- [ ] 实验页保存成功后，Results 分析模块下的 Capacity / Revenue 报表能够瞬时、自动获取到最新的 Forecast 月度值进行产能与营收 Gap 运算，数据 100% 同步。
- [ ] 所有实验页文案（包括 “沙盒标识”、“未保存修改提示”、“批量保存”、“放弃更改”、“SKU名称” 等）必须在 `en.ts` 和 `zhTW.ts` 中完全对齐，杜绝任何英文硬编码。
