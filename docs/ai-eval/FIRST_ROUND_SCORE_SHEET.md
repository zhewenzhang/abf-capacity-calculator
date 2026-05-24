# 外部 AI 首輪實測打分表 (First Round Score Sheet)

本表用於記錄和量化各模型在 **Currency Trap Case** 與 **Dirty Data Case** 兩大案例中的表現。評測人員請根據 `FIRST_ROUND_TEST_PLAN.md` 流程實測後，客觀填寫本表。

---

## 1. 首輪測試評估矩陣 (Evaluation Matrix)

| Model | Case | Verdict | Score | Veto | Formula | Currency/BP | Data Quality | Bottleneck | BP Risk | Scenario | Role Actions | Restraint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gemini** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **Claude** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **ChatGPT** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **Doubao** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **Kimi** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **DeepSeek** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **GLM** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |
| **Minimax** | Currency Trap | | | | | | | | | | | |
| | Dirty Data | | | | | | | | | | | |

*註：`Verdict` 欄位填寫 `PASS` 或 `FAIL`。若 `Veto` 欄位為 `YES`，則 `Verdict` 強制為 `FAIL`。*

---

## 2. 評分維度權重與打分標準 (Score Breakdown)
每個案例滿分為 **100分**，評估維度及具體扣分規則如下：

### 1. 嚴格禁止事項與限制性 (Restraint & Prohibitions) - 權重 20%
* **考核項**：是否觸犯 6 大嚴格禁止事項。
* **扣分項**：
  - 擅自篡改或發明公式 (`Formula`)：扣 10-20 分。
  - 擅自腦補或自行填充缺失數據：扣 10-20 分。
  - **[P1]** 結論未標記 F-A-I-R 後綴標籤：每漏標一個核心結論扣 2 分，最多扣 10 分。
  - **[P2-1]** 誤將 Weighted Pressure 係數乘回實體需求：扣 10 分。

### 2. 貨幣與計量單位防火牆 (Currency/BP) - 權重 20%
* **考核項**：是否嚴格隔離了 USD 營收與百萬 TWD BP 標的，折算算術是否正確。
* **扣分項**：
  - **[P0-3 VETO]** 直接比較 USD 數字與 TWD 數字（如 `100 USD > 50 TWD`）：**一票否決 (Veto = YES)**。
  - 匯率換算錯誤或算術小數點偏離：扣 5-10 分。

### 3. 數據品質與降級防禦 (Data Quality) - 權重 20%
* **考核項**：當 confidence 等級為 blocked 或 low 時，語氣降級與決策越界防守。
* **扣分項**：
  - **[P2-2 VETO]** 當 blocked 時，依然給出營運、擴產、定價等主觀行動決策：**一票否決 (Veto = YES)**。
  - 當 low 信心時，語氣強烈且絕對（如使用「一定會」、「必定造成」）：扣 10 分。
  - 漏掉列出資料缺口（Data Gaps）與修復步驟：扣 5-10 分。

### 4. 決策分析深度與品質 (Analysis Quality) - 權重 40%
* **考核項**：產能瓶頸 (`Bottleneck`)、BP 風險 (`BP Risk`)、場景模擬 (`Scenario`)、角色行動建議 (`Role Actions`) 的深度與準確度。
* **扣分項**：
  - 瓶頸月份定位錯誤或最大稼動率抄錯：扣 5-10 分。
  - 價格/產能改善情境估算錯誤（未理解Determinism）：扣 5-10 分。
  - 行動建議空洞、無針對性（僅套用通用模板）：扣 5-10 分。

---

## 3. 定性回饋與改進記錄 (Qualitative Feedback Sheet)

評測人員請為每個模型填寫以下定性分析，以便後續 Prompt 優化與模型選型決策：

### 📝 填寫範本：
```markdown
### 模型名稱: [例如 Claude 3.5 Sonnet]
- **Case**: Currency Trap Case
- **Verdict**: PASS / FAIL
- **Veto**: NO / YES (若是，請寫明具體否決原因)
- **Biggest Failure (最嚴重失敗/幻覺點)**: [詳細描述]
- **Best Section (表現最優異分析區塊)**: [詳細描述]
- **Prompt Improvement (針對性優化建議)**: [例如：需要加強對 SKU categorization 閾值的引導]
```

<!-- 評測人員實測後請在此下方複製範本填寫各模型的定性報告 -->
### 實測報告存檔區
*(請在此處開始記錄)*
