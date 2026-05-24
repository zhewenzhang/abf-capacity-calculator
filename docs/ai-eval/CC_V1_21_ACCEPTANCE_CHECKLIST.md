# CC v1.21.0 AI Brief Export / Prompt Pack 驗收清單

本驗收清單供產品經理、系統架構師或 QA 測試人員在 CC（Claude Code）完成 v1.21.0 主功能開發後使用。旨在逐項複核其是否滿足物理隔離、數據脫敏、安全紅線與國際化（i18n）對齊的要求，判定是否可准予上線。

---

## 1. 物理隔離檢查 (Scope Checks)

```
🚨 【硬性門檻】 🚨
本節 5 項必須全部為【Yes】（符合規範）。任何一項為【No】則直接拒絕合併（Reject）。
```

- **[ ] Yes / [ ] No** —— **AI API 隔離**：系統是否絕對未集成或調用任何外部大模型 API？
- **[ ] Yes / [ ] No** —— **後端隔離**：是否絕對未新增任何後端 Node.js、Cloud Functions 或 Cloud Run 服務？
- **[ ] Yes / [ ] No** —— **資料庫隔離**：是否絕對未對 Firestore 數據庫 Schema、Firestore rules 或 indexes 進行修改？
- **[ ] Yes / [ ] No** —— **公式遵守**：是否絕對未修改 `coreDemand` / `buDemand` / `utilization` / `bpForecastMillionTwd` 等核心物理計算公式？
- **[ ] Yes / [ ] No** —— **Refine 封鎖**：是否絕對未恢復已封存的 AI Refine 等舊有發散功能？

---

## 2. 導出功能複核 (Feature Checks)

- **[ ] Yes / [ ] No** —— **Copy Prompt**：在 Results 頁面點擊“複製 Prompt”，能成功將經過引導詞封裝的 System Prompt 拷貝至剪貼板。
- **[ ] Yes / [ ] No** —— **Copy JSON**：點擊“複製 JSON”，能成功將脫敏後的 `SanitizedPayload` JSON 格式文本拷貝至剪貼板。
- **[ ] Yes / [ ] No** —— **Copy Combined Pack**：點擊“複製完整禮包”，能將 Prompt + JSON 拼接好的複合文本一次性拷貝。
- **[ ] Yes / [ ] No** —— **Download JSON**：點擊“下載 JSON”，瀏覽器能成功彈出下載窗，導出名為 `abf-capacity-brief-{date}.json` 的 UTF-8 文件。
- **[ ] Yes / [ ] No** —— **Clipboard Feedback**：複製成功時，UI 彈出綠色 Success Toast 氣泡；複製失敗時彈出 Error Toast 警告。
- **[ ] Yes / [ ] No** —— **Empty State 防禦**：當系統無 active SKU 或無 forecast 數據時，導出按鈕為 `disabled`（置灰），或 UI 彈出“請先導入預測數據”的友善 Alert，防止拷貝空對象。

---

## 3. 隱私與安全脫敏複核 (Sanitization Checks)

```
🚨 【安全紅線】 🚨
必須確保導出的 JSON 和 Prompt 文本中，絕對不流出任何用戶和協作隱私。
本節必須全部通過（Yes）。
```

- **[ ] Pass / [ ] Fail** —— **UID 消除**：導出的文本中絕對不包含用戶的 Firebase Auth `uid`。
- **[ ] Pass / [ ] Fail** —— **Email 消除**：絕對不包含當前登錄用戶的 `email` 地址。
- **[ ] Pass / [ ] Fail** —— **Workspace 隱私**：若在共享 Workspace 下，導出文本中絕對不包含協作成員的 email、uid、頭像或權限角色。
- **[ ] Pass / [ ] Fail** —— **Token 消除**：絕對不包含任何 API Token、API key、Firestore 密鑰或臨時登錄證書。
- **[ ] Pass / [ ] Fail** —— **業務數據保留**：脫敏在消除隱私的同時，是否完整保留了分析所必需的 `monthlySummaries`、`matrices`、`confidenceLevel` (文字)、`confidenceScore` (0-100數字)、`priceImpact` / `capacityImpact` 情境數據以及 `assumptions`？

---

## 4. Prompt 安全護欄複核 (Prompt Guardrails Checks)

檢查 CC 實作的 `aiBriefExport.ts` 中導出的引導 Prompt 模板，是否硬編碼注入了以下防禦性限製（對照 `AI_SAFETY_GUARDRAILS.md`）：

- **[ ] Yes / [ ] No** —— **公式紅線**：是否包含“嚴禁篡改物理公式”的強警告？
- **[ ] Yes / [ ] No** —— **腦補紅線**：是否包含“在數據缺失時嚴禁腦補，必須拋出修復清單”的限製？
- **[ ] Yes / [ ] No** —— **幣別紅線**：是否包含“必須通過匯率折算，嚴禁跨幣別直接對比 BP Target”的明確說明？
- **[ ] Yes / [ ] No** —— **因果免責**：在分析 BP Miss 時，是否強製 AI 聲明 `bpAttribution` 只是“營收比例分攤歸因（Proportional Attribution），不代表直接因果責任”？
- **[ ] Yes / [ ] No** —— **F-A-I-R分層**：是否要求 AI 嚴格使用 `[Fact]`、`[Assumption]`、`[Inference]`、`[Recommendation]` 對每一段結論進行後綴標註？
- **[ ] Yes / [ ] No** —— **語氣降級**：是否要求 AI 在數據信心為 Low（`confidenceScore` 數字在 0-59）時，強行降低分析語氣，使用“僅供參考”、“基於不完整數據的假設推論”等免責詞？

---

## 5. 國際化多語言複核 (i18n Checks)

- **[ ] Yes / [ ] No** —— **Key Parity 對齊**：前端 `en.ts` 與 `zhTW.ts` 中，所有與導出按鈕、Toast 提示、Modal 文案相關的翻譯 key 是否 100% 對稱？（`i18nKeys.test.ts` 必須跑過）。
- **[ ] Yes / [ ] No** —— **無 Hardcoded 混雜**：UI 按鈕、Toast 和預覽標題，是否全部通過 `t('key')` 獲取，無硬編碼中/英文混雜？
- **[ ] Yes / [ ] No** —— **Prompt 語言自適應**：導出的 Prompt Pack，其引導文案在繁中環境下是否爲流暢的中文引導，在英文環境下是否爲流暢的英文引導？
- **[ ] Yes / [ ] No** —— **專業詞彙糾偏**：導出的繁中引導詞中，是否正確使用“增層載板/增層工序（Build-up）”、“主板/核板（Core）”等 ABF 載板行業標準繁中詞彙，無不倫不類的機翻單詞（如將 Build-up 翻譯成“建立”或“积聚”）。

---

## 6. 測試健全性檢查 (Testing Checks)

- **[ ] Yes / [ ] No** —— **單元測試存在**：專案中是否建立了 `frontend/src/core/aiBriefExport.test.ts` 單元測試文件？
- **[ ] Yes / [ ] No** —— **脫敏測試覆蓋**：測試中是否包含了對 `uid`、`email` 等敏感關鍵字正則匹配消除的 Assert 斷言？
- **[ ] Yes / [ ] No** —— **JSON 解析斷言**：測試是否驗證了 `JSON.parse(sanitizedPayload)` 導出的 JSON 語法完全合法，無 undefined 或 NaN 殘留？
- **[ ] Yes / [ ] No** —— **測試全數通過**：在主專案下運行 `npm test`，所有相關單元測試均 100% 通過，無 Error。

---

## 7. UI 與窄屏手動復核 (UI Layout Checks)

- **[ ] Yes / [ ] No** —— **Dashboard 完好**：Results tab 切換正常，導出按鈕並未破壞 Calculations Results 原有的 Yearly Health Matrix 或其他 Chart 的渲染。
- **[ ] Yes / [ ] No** —— **窄屏自適應**：在寬度為 375px（iPhone 級別）的窄屏模擬下，AI Export 按鈕、提示框及文本預覽框佈局正常，無橫向溢出，無重疊遮擋。
- **[ ] Yes / [ ] No** —— **Toast 反饋流暢**：點擊複製後，Success Toast 出現與自動消失流暢（約 2-3 秒），無 DOM 殘留，Z-Index 正常（不被彈窗或 Modal 遮擋）。

---

## 8. Go / No-Go 最終驗收決議

評審小組在完成上述所有覆核後，在此給出最終判定（請在對應項前打叉 `[x]`）：

* **[ ] Go (准予合併上線)**：
  - “物理隔離”與“安全脫敏”**100% 通過**；功能與 Guardrails **無缺失**；測試全部跑通。
* **[ ] Conditional Go (修改後上線)**：
  - 物理與安全無風險，但存在局部 i18n 翻譯未對齊或窄屏按鈕溢出，允許 CC 在 1-2 天內修復微調後直接上線，無需重複完整評審。
* **[ ] No-Go (拒絕合併，退回重寫)**：
  - 發現數據脫敏不全（泄露了 uid/email 等敏感數據），或篡改了核心物理公式，或未注入 Guardrails 安全限制。必須立刻拒絕合併，退回重構。
