# 外部 AI 首輪測試腳本 (First External AI Test Script)

本腳本供測試團隊在 **CC v1.21.0 AI Brief Export** 主功能交付後，第一時間運行以驗收其導出的 Brief Pack 是否能被外部 AI 正確解讀。

---

## 1. 評測核心宗旨

```
🚨 【重要提醒】 🚨
本首輪測試的主要目標是檢驗外部 AI 對 ABF 物理產能與商業目標的「邏輯與算術精確度」。
絕非考核 AI 的“文字是否優美”、“條理是否順暢”或“潤色是否得體”。
```

評審小組必須對照 `AI_EVAL_SCORECARD_TEMPLATE.md`，硬核核對 AI 分析中的每一個物理計算、幣別轉換以及安全邊界。

---

## 2. 首輪精選測試案例

首輪測試**只測試** 6 大 cases 中難度最高、最考驗安全防守的兩個“極端案例”：

### 2.1 案例 A：多幣別混淆陷阱 (Currency Trap Case)
- **測試目的**：檢驗 AI 模型是否具備“幣別防火牆”，能否在 USD/TWD/CNY 定價、底層折算的 USD 營收以及 Million TWD 的 BP Target 之間保持清醒，攔截“數值直接加減”的嚴重算術漏洞。
- **輸入數據特徵**：SKU-A 報價為 6.0 USD，SKU-B 為 160.0 TWD，SKU-C 為 35.0 CNY；匯率為 1 USD=32.0 TWD，1 USD=7.0 CNY。BP Target 為 10 Million TWD。
- **期待 AI 產出的關鍵事實**：正確將所有營收折算為 210,000 USD，並精準將其乘以匯率 32.0 得到 6.72 Million TWD 去對比 BP 目標，得出達成率為 67.2% 及缺口為 -3.28 Million TWD 的正確算術結論。

### 2.2 案例 B：數據品質髒污案例 (Dirty Data Case)
- **測試目的**：檢驗 AI 面對 `confidenceLevel = "low"`（底層 `confidenceScore` 數字在 0-59）時的“自我克制與防守”。AI 必須在報告頂部顯著降級語氣，主動向人類拋出“下一步修復清單”，嚴禁盲目得出擴產等高確信度論斷。
- **輸入數據特徵**：SKU-X 的單價缺失（`unitPriceUsd = 0`），關鍵工廠 10-12 月的 `buCapacity` 漏配置（顯示為 0），系統發出低信心警報。
- **期待 AI 產出的關鍵事實**：在最頂部標明低信心免責聲明；精準指出單價為 0 導致營收被低估、BU產能未填寫導致利用率失真這兩個 DQ Error；拒絕給出任何直接採購或砍單的實體業務決策，給出引導人類修復數據的 Checklist。

---

## 3. 評測模型名單 (Target Models)

首輪盲測將對以下主流模型進行全覆蓋對比：
- **第一梯隊 (頂級推理)**：Gemini 2.0 Pro / Claude 3.5 Sonnet / GPT-4o
- **第二梯隊 (性價比與區域熱門)**：DeepSeek-R1 / Doubao (豆包) / Kimi / GLM-4 (智譜) / Minimax

---

## 4. 測試執行步驟 (Test Execution)

1. **一鍵複製**：在 Calculators 頁面導入 `Currency Trap Case` 或 `Dirty Data Case` 數據，點擊“複製完整禮包（Copy Combined Pack）”。
2. **同台貼入**：在同一個瀏覽器沙盒中，分別打開上述各待測模型的獨立網頁對話框，將拷貝的 Combined Pack 一字不差地貼入對話框。
3. **單輪盲測，嚴禁引導**：發送 Prompt 後，AI 開始生成。**測試人員嚴禁在對話中進行二次引導或追問。** 必須讓其一次性生成最終報告。
4. **保存備份**：拷貝各模型生成的原始 Markdown 文本，存檔備查。
5. **打分與否決核對**：評審小組分發 `AI_EVAL_SCORECARD_TEMPLATE.md`，獨立為每個模型的兩大 Case 進行 100 分制打分與一票否決核對。

---

## 5. 業務准入通過標準

一個 AI 模型如果要通過首輪驗收，並被批准准入後續的 Stage A 工作流，必須滿足以下硬性指標：

```
1. 兩個 Cases 的打分平均總分必須 > 85 分。
2. 一票否決項全部為 No（零觸碰紅線）。
3. Currency Trap Case 實得分必須 >= 13 分（滿分 15 分）。
4. Dirty Data Case 實得分必須 >= 13 分（滿分 15 分）。
```

---

## 6. 評測結果記錄模板

評測人員請將打分結果匯總記錄於下表：

```markdown
### 外部 AI 首輪盲測結果匯總表

| 評測模型 (Model) | 測試案例 (Case) | 評分實得分 (Score) | 一票否決紅線 (Veto Tripped) | 最大的算術/邏輯失敗點 (Biggest Failure) | 最驚艷或合格的段落 (Best Section) | Prompt 優化反饋 (Prompt Improvement) | 最終判定 (Verdict) |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| e.g. Gemini 2.0 Pro | Currency Trap | 93 / 100 | 无 | 无 | 完美展現了 6.72M TWD 對比 10M Target 的折算路徑 | 可在 prompt 中再次強調 TWD 百萬字樣 | **Pass** |
| e.g. Gemini 2.0 Pro | Dirty Data | 90 / 100 | 无 | 无 | 報告開頭以醒目警示框申明了 Low 信心等級，僅供參考 | 可增加 human checklist 的粗體標識 | **Pass** |
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |
```
