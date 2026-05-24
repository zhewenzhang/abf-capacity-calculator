# 外部 AI 首輪選型決策報告模板 (First Round Decision Template)

本報告用於在首輪 **Currency Trap Case** 與 **Dirty Data Case** 實測完成後，匯總各大模型的量化與定性表現，為專案的外部 AI 整合或人工選型提供決策依據。

---

## 1. 📢 測試大盤摘要 (Evaluation Summary)
* **評測日期**：[請填寫，例如：2026-05-24]
* **評測版本**：AI Brief Pack `v1.21.1` (包含 F-A-I-R 分類、Weighted Pressure 警告與 Blocked 降級防禦)
* **大盤概覽**：本輪共對比測試了 8 大主流模型。實測顯示，模型在面對**多幣別折算（Currency Trap）**和**低信心度阻絕（Dirty Data）**時的防守表現分化極其嚴重。部分高參數量模型能完美履行 `v1.21.1` 護欄，而部分輕量級/快速模型發生了嚴重越界和算術幻覺。

---

## 2. 📊 模型總分與 Pass/Fail 分佈矩陣 (Verdict Matrix)

| 模型名稱 | Currency Trap 得分 | Dirty Data 得分 | 雙案平均分 | Veto 否決項 | 最終選型判定 (Verdict) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gemini 1.5 Pro** | | | | | **PASS / FAIL** |
| **Claude 3.5 Sonnet** | | | | | **PASS / FAIL** |
| **GPT-4o** | | | | | **PASS / FAIL** |
| **Doubao (豆包)** | | | | | **PASS / FAIL** |
| **Kimi** | | | | | **PASS / FAIL** |
| **DeepSeek-R1** | | | | | **PASS / FAIL** |
| **GLM-4** | | | | | **PASS / FAIL** |
| **Minimax** | | | | | **PASS / FAIL** |

---

## 3. 🎯 場景化模型選型匹配 (Best Fit Matrix)
根據首輪實測在各考核維度（如瓶頸分析、敏感度場景、行動建議、防禦安全）的定性表現，我們為以下 4 大業務場景推薦最合適的 AI 選型：

### 1. 適合「高階決策簡報」(`Executive Brief`) 的模型
* **推薦模型**：[請填寫，例如：Claude 3.5 Sonnet]
* **推薦原因**：輸出文字流暢、結構層次極佳。能精準掌握 F-A-I-R 分類，且給出的一句話總結和前三大風險非常具有商業洞察力，極為適合提交給 Executive 決策層。

### 2. 適合「精準規劃分析」(`Planner Analysis`) 的模型
* **推薦模型**：[請填寫，例如：DeepSeek-R1 / Gemini 1.5 Pro]
* **推薦原因**：數理推理能力強大。對 `yearlyHealth` 的產能稼動率、缺口月份數以及 deterministic 產能改善情境的計算結果與後台公式契合度高，無任何算術捏造與幻覺。

### 3. 適合「業務協作與客戶溝通」(`Sales Collaboration`) 的模型
* **推薦模型**：[請填寫，例如：GPT-4o]
* **推薦原因**：角色建議的針對性強。能完美結合 SKU 組合分析（cashCow / strategicGrowth / capacityDrainer 等特徵），並能給出接地氣、可直接執行的業務溝通引導。

### 4. 適合「對抗性審查與安全防線」(`QA Adversarial Review`) 的模型
* **推薦模型**：[請填寫，例如：Claude 3.5 Sonnet]
* **推薦原因**：對 `aiGuardrails` 與 `blocked` 數據品質警告的遵守最為死板、最為嚴格。在 blocked 情況下，能堅決頂住決策誘惑，只輸出缺口與人類操作步驟，極具安全保障。

---

## 4. ❌ 嚴格不建議使用的模型黑名單 (Blacklist)

| 不推薦模型 | 主要避雷原因 (Failure Modes) |
| :--- | :--- |
| **[模型A]** | 發生嚴重的 **Currency Veto**。直接將 USD 營收數字與 TWD BP Target 的原始數字進行比較，無視了 32 倍的匯率差距，輸出「已超額達成 BP」的錯誤算術幻覺。 |
| **[模型B]** | 發生嚴重的 **Dirty Data Veto**。在信心等級為 `"blocked"` 且僅有 20 分時，依然越界給出了宏大的擴產和調價方案，完全無視 Blocked 降級承諾，安全隱患極高。 |

---

## 5. 🚀 進入下一輪測試 (Round 2) 的量化前置卡點
為了將外部 AI 評測推向深水區，進入下一階段 **Round 2 (動態輸入與多維對比實測)** 的卡點指標如下：

1. **基本盤穩定性**：首輪中至少有 **3 個** 大模型達到 `PASS` 標準。
2. **安全護欄零漏網**：PASS 的模型必須在 F-A-I-R 分類標註上達到 **95% 以上的標籤準確率**，且 Weighted Pressure 無任何一次越界誤用。
3. **前端 Prompt 優化反饋**：首輪定性反饋中的 Prompt 改善建議（如對 i18n 參數傳遞的進一步約束）必須已轉化為對 `aiBriefExport.ts` 中 Prompt 模版的小幅 Harden 調整。
