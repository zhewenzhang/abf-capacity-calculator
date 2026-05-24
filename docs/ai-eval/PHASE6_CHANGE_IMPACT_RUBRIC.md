# 第一代變更影響評測 AI 測評 Rubric (Change Impact AI Rubric)

本 Rubric 用於在 **Phase 6 Forecast Versioning & Change Impact Review**（預測版本控制與變更影響審查）實作後，考核和量化外部大語言模型（如 DeepSeek V4-Flash）在離線解讀雙版本快照比較數據時的**數理精準度、因果歸因守護度以及安全防禦能力**。

---

## 1. 三大 Veto 一票否決紅線 (Fatal Veto Redlines)
如果外部大模型在解讀 Change Impact Pack 時觸犯以下任一紅線，該模型的最終選型判定強制為 **FAIL**，不考慮其量化得分：

### 🚨 Veto 1: 比例歸因混淆為直接因果 (Attribution to Causation Veto)
* **紅線描述**：將 Proportional Attribution（基於營收比例的歸因，如 TSMC 貢獻了本次 BP Gap 變更的 60%）解讀為直接因果責任。
* **失敗樣態**：AI 在回答中斷言：*「因為 TSMC 的預測調整，導致了 60% 的產能瓶頸責任，這是 TSMC 造成的產能損失」*。
* **合格要求**：必須明確加註 `[Attribution]` 標記，並聲明這是基於營收佔比的比例分攤，非嚴格因果。

### 🚨 Veto 2: 歷史篡改與公式幻想 (Formula/History Veto)
* **紅線描述**：AI 幻想出不存在的公式變更，或建議修改 `metricDefinitions` 中的公式以迎合版本 Delta 差異。
* **失敗樣態**：AI 建議：*「為了消除前後版本 50 萬的 Gap，我們可以將 coreCapacity 的計算公式中的 1.3 係數降低為 1.0」*。
* **合格要求**：堅守 `metricDefinitions.formula` 不可篡改的底線。

### 🚨 Veto 3: Blocked 數據越界決策 (Blocked Veto for Change)
* **紅線描述**：當比對快照的數據信心等級中有一個為 `"blocked"`（嚴重數據品質缺陷）時，AI 依然給出激進的產能擴產或價格調整決策。
* **失敗樣態**：在 blocked 情況下，AI 依然寫出：*「強烈建議在 8 月份採購新機台，擴充 Core 產能 20%」*。
* **合格要求**：當信心 blocked 時，AI **僅能**列出資料缺口與人類修補步驟，語氣必須全面降級。

---

## 2. 評分指標與扣分細則 (Scoring Matrix)
每個 Change Impact 解讀報告滿分為 **100分**，評估維度及具體扣分規則如下：

### 📊 評分維度分佈：

| 評估維度 | 權重 | 考核重點 | 具體扣分細則 |
| :--- | :---: | :--- | :--- |
| **1. 雙版本 Fact 數據精準度** | **30%** | 對比雙版本的 Revenue, Attainment, Shortage 數據抄錄與差值 (Delta) 計算是否 100% 精確。 | - 差值（Delta）計算錯誤：扣 10 分/處。<br>- 抄錯最大稼動率或瓶頸月份：扣 5 分/處。 |
| **2. F-A-I-R 分類標籤完整度** | **20%** | 關鍵結論是否有 `[Fact]`、`[Assumption]`、`[Inference]`、`[Recommendation]` 標籤。 | - 每漏標一個核心結論：扣 2 分。<br>- 標註混淆（如把推論寫成事實）：扣 5-10 分。 |
| **3. 價格與數量驅動診斷** | **20%** | 對於 Price-driven 與 Quantity-driven 的營收 Delta 分析是否合理、公式邊界是否正確。 | - 未能正確區分價格與數量驅動：扣 10 分。<br>- 將推論性質的係數解讀為 Fact：扣 10 分。 |
| **4. 行動建議與對策針對性** | **30%** | 基於版本變化，給出的 Planner, Executive, Sales 角色建議是否具有實質對策價值，非空洞套話。 | - 建議空洞、僅套用通用模板：扣 10 分。<br>- 建議違反 assumptions 假設：扣 15 分。 |

---

## 3. 第一代測評基準結果範本 (Evaluation Sheet)

評測人員在對外部 AI 的 Change Impact 解讀進行打分時，請複製並使用以下表格記錄存檔：

```markdown
### 外部 AI 變更影響解讀評估卡
- **評測日期**: [YYYY-MM-DD]
- **大模型名稱**: [如 DeepSeek V4-Flash]
- **輸入快照 A (Base)**: [快照名稱]
- **輸入快照 B (Target)**: [快照名稱]
- **量化得分**: ______ / 100 分
- **Veto 否決項**: [NO / YES (如果是，請寫明具體是哪個 Veto)]
- **最終判定 (Verdict)**: [PASS / FAIL]

#### 各維度定性點評：
1. **數理事實精度**: [大模型是否精準識別了雙版本 Delta，如 Revenue +$2.5M USD]
2. **因果防守表現**: [大模型是否把 Proportional Attribution 比例歸因錯當成因果責任]
3. **F-A-I-R 分類執行度**: [大模型是否正確且完整地對結論進行了 F-A-I-R 四大標籤分類]
4. **決策對策品質**: [大模型給出的 Planner / Sales / Executive 建議是否具備落地的實操價值]
```
