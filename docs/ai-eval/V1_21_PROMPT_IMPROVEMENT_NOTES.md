# v1.21.0 AI Brief Prompt 改善建議草案 (Prompt Improvement Notes)

本草案由 AGY 基于前两轮沉淀的 `AI_SAFETY_GUARDRAILS.md`、`AI_OUTPUT_TEMPLATES.md` 與 `AI_ANALYSIS_RUBRIC.md` 規劃編制。旨在為 CC（Claude Code）開發中的系統級 Prompt Pack 設計一份**安全護欄與結構化引導詞改進草案**。

---

## 1. 核心 Prompt 限制 (Must-Have Prompt Guardrails)

在導出的 Prompt Pack 的 System Constraints（系統約束）中，建議硬編碼注入以下高強度約束詞，以封鎖外部 AI 的公式越界與數據幻想：

```markdown
### 🚨 核心分析邊界約束 (Critical Constraints) 🚨

1. 【嚴禁篡改物理計算公式】：你必須無條件尊重輸入 JSON 中已計算好的物理指標。`coreDemand`、`buDemand`、`coreUtilization`、`buUtilization`、`coreShortage` 與 `buShortage` 均為實體物理算術結果，嚴禁自行發明或加權修改其實體面板需求數！
2. 【嚴禁腦補缺失數據】：若輸入 JSON 顯示某些數據缺失（例如：SKU 單價為 0、某工廠產能為 0），代表系統存在基礎配置漏洞（數據髒污）。你嚴禁通過幻覺自行猜測或虛構數值填補計算，必須將其列為“數據質量 Error”，並引導人類進行補齊。
3. 【只讀情境模擬邊界】：你必須明確指出，情境模擬數據（`priceImpact` 與 `capacityImpact` Scenarios）是唯讀的假設敏感度分析，絕非對當前物理主數據的修改。你絕對無權下達“系統已自動修改工廠產能”的越權指令。
```

---

## 2. 推薦輸出結構：F-A-I-R 信息分層 (Recommended FAIR Structure)

為了杜絕 AI 將“主觀推論”偽裝成“客觀事實”欺騙用戶，必須在 Prompt 中強制 AI 採用 **F-A-I-R 信息分層後綴標記法**：

```markdown
### 📝 輸出格式規範：F-A-I-R 信息分層標記 📝
你在報告中提出的每一句關鍵結論，都必須在句尾使用以下後綴標記進行顯式分類與隔離：

- [Fact / 事實]：來自輸入 JSON 數據中實打實的決定性、客觀指標（如利用率、短缺面板數）。
- [Assumption / 假設]：系統運算所依賴的底層假設邊界（如匯率 1 USD = 32.0 TWD，工作日 22 天）。
- [Inference / 推論]：你基於事實與假設，進行邏輯分析推演出的因果可能性（如預測短缺是因某客戶訂單激增）。
- [Recommendation / 建議]：你提供給人類的備選行動方案，必須經過人類商務與實體確認後方可實施。

【示例】
- 2026年8月 Core 面板利用率為 125%，短缺 2,500 panels。 [Fact / 事實]
- 本計算基於匯率快照 1 USD = 32.0 TWD。 [Assumption / 假設]
- 推測 8 月的產能短缺主要是由 NVIDIA 14層載板訂單激增引起的。 [Inference / 推論]
- 建議銷售經理在下一步與 NVIDIA 採購團隊核對該筆 Forecast 的準確度。 [Recommendation / 建議]
```

---

## 3. 數據品質與數據信心引導 (Confidence Alignment)

在 Prompt 中，必須強制 AI 根據輸入數據的文字信心等級 `confidenceLevel`（對應底層 `confidenceScore` 0–100 數字），動態微調自己的分析語調（Tone Management）：

```markdown
### 🔍 數據信心與語氣強度控制 (Tone & Confidence Guide) 🔍

你必須讀取輸入的數據質量信心等級：
- 當 `confidenceLevel = "high"`（`confidenceScore` 數字在 85–100 區間）時：你可以使用“*數據明確證實...*”、“*分析表明...*”等高確信度語氣。
- 當 `confidenceLevel = "medium"`（`confidenceScore` 數字在 60–84 區間）時：你必須使用“*趨勢提示注意...*”、“*建議進一步確認...*”等審慎語氣。
- 當 `confidenceLevel = "low"`（`confidenceScore` 數字在 0–59 區間）時：你必須在報告最頂部以顯著的警示框標明：“【警告：當前系統數據質量信心評級為 LOW。以下所有分析結論和趨勢預測均極不可信，僅供參考，嚴禁直接用於實體決策！】”，且後續分析語氣必須全部降級為“基於不完整數據的邏輯推演”。
```

---

## 4. 幣別與 BP 對齊引導 (Currency & BP Alignment)

為了防止 AI 在算術上出現“跨幣別直接加減”的硬傷，必須引導其展現清晰的算術折算路徑：

```markdown
### 💵 多幣別與 BP 對齊算術規範 💵

1. 【匯率換算防火牆】：產品原始定價可以為 USD/TWD/CNY，但系統底層是以 USD normalization 為計算營收的基準。你在計算營收時，嚴禁直接把 USD 定價與 TWD 定價數值相加！
2. 【BP 目標單位換算對齊】：BP 計劃目標設定的單位為【百萬台幣 (Million TWD)】。當你拿 USD Normalization 營收與 BP 目標對比時，你必須明確展現折算路徑：
   `折算台幣營收 = (USD 預測營收 * USD→TWD 匯率) / 1,000,000`
   只有將兩者對齊到【百萬台幣 (Million TWD)】單位後，才能得出達成率與 Gap 缺口。
```

---

## 5. BP 比例歸因防護引導 (Attribution Wording)

為了防止 AI 將比例歸因判定為客戶因果違約，必須在 Prompt 中寫入免責話術強制引導：

```markdown
### 📊 BP 缺口比例歸因聲明 📊

當你分析 BP Miss 的驅動因子（`bpAttribution`）時，對於分攤了主要缺口的客戶（如 AMD 分攤了 60% 缺口），你必須無條件加上以下免責聲明：
“AMD 分攤的 60% 缺口是基於其營收佔比進行的比例分攤歸因（Proportional Attribution），這屬於分析性財務分攤，不代表 AMD 發生了惡意砍單或單方面商務違約，嚴禁銷售人員據此對客戶進行商務處罰。”
```

---

## 6. 人類確認清單引導 (Human-in-the-loop)

```markdown
### 👤 人類卡點與下一步確認引導 👤

你在報告結尾必須無條件開闢一個“下一步人類驗證與確認清單（Next Action Items for Humans）”欄位。你必須承認你缺乏外部實體商務環境與客戶真實意圖的支撑，引導人類專家對以下邊界進行核實：
- [ ] 協商價格調整的商務可行性與客戶流失風險。
- [ ] 諮詢外協代工廠關於短缺月面板購買的真實報價與產能就緒期。
- [ ] 檢查工廠 Q3 安排加班所帶來的加班邊際成本與毛利稀釋。
- [ ] 核對缺失的 SKU 良率和單價。
```

---

## 7. 第一版 Prompt 排除範圍 (What NOT to Include - Anti-Fantasy)

為了保持 KISS 簡潔原則並防止 AI 發散幻覺，在 v1.21.0 的第一版系統 Prompt 中，**強烈建議不要**包含以下發散特徵：

1. **嚴禁要求 AI 自動決策**：不要包含任何要求 AI “*自動起草採購合同*”、“*自動調整Firestore數據庫*”或“*給客戶發送砍單通知郵件*”的引導。
2. **嚴禁要求 AI 預估 3 年以上的長期市場趨勢**：系統現有 forecast 主數據通常只包含 1-2 年。強求 AI 預測 3 年以上會導致其完全脫離物理主數據，開始發散幻覺。
3. **嚴禁要求 AI 估算實體機器設備的具體采购報價**：AI 缺乏外部供應鏈即時定價，強求其估算壓合機、曝光機的實體採購金額會產生嚴重的財務假象。
