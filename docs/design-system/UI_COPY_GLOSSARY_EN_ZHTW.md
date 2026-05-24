# UI Copy 專業詞彙對照表 (UI Copy Glossary - en vs zh-TW)

为了保证 ABF 产能计算器在多语系（i18n）切换下的专业度与地道感，杜绝生硬的机器直译或大陆化财务术语对台湾半导体高管用户的决策干扰，特制定本 UI Copy 詞彙對照表。

后续所有 i18n 语言包（`en.ts` / `zhTW.ts`）在翻译新增词条时，必须死守本词典定义的译法标准。

---

## 📘 16 个核心词汇地道繁体中文 (zh-TW) 对照表

### 1. Forecast
- **English**：`Forecast` / `Forecasts`
- **zh-TW 建議譯法**：**銷售預測**、**預測**
- **不建議譯法**：销预、預報、銷量估算
- **使用場景**：销售预测录入页页签、网格表头（如 `2026年銷售預測`）。

---

### 2. Capacity
- **English**：`Capacity`
- **zh-TW 建議譯法**：**產能**
- **不建議譯法**：生產能力、容量
- **使用場景**：设备产能额定值录入、下游产能利用率大图分析。

---

### 3. Utilization
- **English**：`Utilization` / `Utilization Rate`
- **zh-TW 建議譯法**：**利用率**、**產能利用率**
- **不建議譯法**：使用率、利用百分比
- **使用場景**：设备负载大表、Dashboard 瓶颈设备占比（如 `瓶頸設備利用率`）。

---

### 4. Shortage
- **English**：`Shortage`
- **zh-TW 建議譯法**：**缺口**、**產能不足**
- **不建議譯法**：短缺、虧空、不夠量
- **使用場景**：Results 产能 Gap 计算（如 `產能缺口 (萬片/月)`）。

---

### 5. BP Target
- **English**：`BP Target` / `Business Plan Target`
- **zh-TW 建議譯法**：**BP 營業目標**、**年度目標**
- **不建議譯法**：BP目標、商業計劃目標、預算額
- **使用場景**：BP 独立目标页面、Results 的 BP target 纵横比对列。

---

### 6. BP Attainment
- **English**：`BP Attainment` / `Target Attainment %`
- **zh-TW 建議譯法**：**BP 達成率**、**目標達成率**
- **不建議譯法**：BP到達率、目標完成百分比
- **使用場景**：Dashboard 大图汇总、Results 下营收达成比对表。

---

### 7. Snapshot
- **English**：`Snapshot`
- **zh-TW 建議譯法**：**快照**
- **不建議譯法**：截圖、備份、數據版次
- **使用場景**：快照历史管理列表、Change Review 对比模块（如 `建立快照`）。

---

### 8. Working Version
- **English**：`Working Version` / `Active Work`
- **zh-TW 建議譯法**：**最新工作版**、**工作版本**
- **不建議譯法**：正在編輯版、當前版、臨時版
- **使用場景**：网格上方版本切换、Change Review 对比源（如 `最新工作版 vs 歷史快照`）。

---

### 9. Baseline
- **English**：`Baseline`
- **zh-TW 建議譯法**：**基準版**、**基準線**
- **不建議譯法**：底線、基礎版本、原版
- **使用場景**：对比 recommended compare pair 算法中的 base 版本标识（如 `年度BP基準版`）。

---

### 10. Scenario
- **English**：`Scenario`
- **zh-TW 建議譯法**：**情境模擬**、**情境**
- **不建議譯法**：方案、場景、劇本
- **使用場景**：未来 Month 3 商业决策沙盒模块（如 `匯率波動情境模擬`）。

---

### 11. Proportional Attribution
- **English**：`Proportional Attribution`
- **zh-TW 建議譯法**：**比例分攤歸因**、**缺口分攤占比**
- **不建議譯法**：比例因果關係、原因分級、下滑歸咎
- **使用場景**：Results 的 Top Changes 分析表头，以防因果谬误（Attribution $\ne$ Causality）。

---

### 12. Data Quality
- **English**：`Data Quality`
- **zh-TW 建議譯法**：**資料品質**
- **不建議譯法**：數據質量
- **使用場景**：参数页面置信度评分看板、AI 导出时的前置校验提示。

---

### 13. Confidence
- **English**：`Confidence` / `Confidence Score`
- **zh-TW 建議譯法**：**信賴度**、**置信度**
- **不建議譯法**：信心指數、妥協率
- **使用場景**：分析报表顶部的可信度警示信息条。

---

### 14. Assumption
- **English**：`Assumption` / `Model Assumptions`
- **zh-TW 建議譯法**：**模型假設**、**假設條件**
- **不建議譯法**：假定、想當然
- **使用場景**：Results 和 Capacity 利用率计算公式前置说明（如 `年度均攤假設`）。

---

### 15. Risk Brief
- **English**：`Risk Brief`
- **zh-TW 建議譯法**：**風險簡報**
- **不建議譯法**：風險簡要、風險小結
- **使用場景**：Results 下 AI Export 导出的高管决策简报（如 `生成 AI 風險簡報`）。

---

### 16. Save / Discard / Dirty
- **English**：`Save` / `Discard` / `Unsaved Changes`
- **zh-TW 建議譯法**：**儲存** / **捨棄** / **尚未儲存的變更**
- **不建議譯法**：保存 / 丟棄 / 髒狀態、有修改
- **使用場景**：SpreadsheetLab 网格底部浮动脏状态条（DirtyStateBar）上的三个标准按钮文案。
