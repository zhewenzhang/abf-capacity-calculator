# AI Brief Export / Prompt Pack

**Version:** v1.21.0  
**Date:** 2026-05-24

---

## 1. 功能目的

AI Brief Export 讓使用者可以從 ABF Capacity Calculator 的分析結果中，安全地取得「受控的分析資料包」與「中文 AI 分析 Prompt」，貼到 Gemini、Claude、ChatGPT 等外部 AI 工具中，產出更深度的產能與 BP 決策分析。

本功能**不接 AI API**、**不做 AI Chat**、**不會自動將資料傳送給任何 AI 服務**。所有資料處理都在瀏覽器本地完成，使用者需要**手動複製並貼上**到外部 AI 工具。

---

## 2. 使用方式

### 2.1 取得 AI Brief Pack

1. 進入 **Results** 頁面
2. 點選 **Risk Brief** 頁籤
3. 在「AI 分析工具」區塊，選擇：
   - **複製 AI 分析包** - 複製 Prompt + Sanitized JSON 的完整包
   - **複製 Prompt** - 只複製中文 Prompt
   - **複製 JSON** - 只複製 Sanitized Analysis Contract JSON
   - **下載 JSON** - 下載 Sanitized Analysis Contract 為檔案

### 2.2 使用外部 AI 工具

1. 開啟你偏好的 AI 工具（Gemini、Claude、ChatGPT 等）
2. 貼上已複製的內容
3. AI 會根據 Prompt 中的指示進行分析

---

## 3. 資料不會自動送給 AI 的聲明

**重要提醒：**

- ❌ 本功能**不會**自動將任何資料傳送到 AI API
- ❌ 本功能**不會**在背景連線到任何 AI 服務
- ❌ 本功能**不會**儲存或記錄你貼到外部 AI 的內容
- ✅ 所有資料處理都在你的瀏覽器本地完成
- ✅ 你**主動決定**要貼到哪個 AI 工具
- ✅ 你**完全控制**分享出去的內容

---

## 4. Analysis Contract 內容範圍

Sanitized Analysis Contract 包含以下決策分析所需的資料：

### 4.1 核心分析資料

| 區塊 | 內容 |
|------|------|
| `summary` | 總營收、總預測數量、最高利用率、缺口月份數 |
| `yearlyHealth` | 年度產能健康度、各年度供需狀況 |
| `riskAttribution` | 風險期間歸因分析（各維度的驅動因子） |
| `bpAttribution` | BP 差距歸因分析（比例歸因） |
| `priceImpact` | 價格變動情境分析（±5%、±10%） |
| `capacityImpact` | 產能改善情境分析（Core/BU +10%） |
| `keyFindings` | 關鍵發現（前 5 項決定性發現） |
| `skuSummary` | SKU 摘要（代號、客戶、裝置、應用等） |

### 4.2 資料品質與假設

| 區塊 | 內容 |
|------|------|
| `quality` | 資料信心等級、分數、主要問題 |
| `assumptions` | 分析假設（工作天數、步數計算、匯率等） |
| `metricDefinitions` | 指標定義與公式 |

### 4.3 AI Guardrails

| 區塊 | 內容 |
|------|------|
| `aiGuardrails.doNotModify` | 禁止修改公式、禁止補充資料 |
| `aiGuardrails.currencyHandling` | 貨幣單位處理規則 |
| `aiGuardrails.attributionWarning` | 比例歸因 vs 因果關係警告 |
| `aiGuardrails.dataQualityWarning` | 資料品質對分析的影響 |

---

## 5. Sanitization 原則

Sanitized Analysis Contract 會移除以下敏感資料：

### 5.1 移除的資料

- Firebase authentication tokens
- User email addresses
- User UIDs (Google/Firebase IDs)
- Workspace member information
- Internal database IDs (保留 SKU code 等業務識別碼)
- Workspace permissions and roles

### 5.2 保留的資料

- SKU codes、客戶名稱、裝置名稱（業務識別資訊，非個資）
- 所有計算結果與分析資料
- 產能規劃與預測數據
- BP 目標與達成分析

### 5.3 安全措施

即使目前的 Analysis Contract 本身不包含敏感資料，sanitization 函數仍會：

1. 遞迴掃描所有欄位
2. 移除任何符合敏感 key 模式的欄位（uid, email, token, auth 等）
3. 確保未來新增的欄位不會意外洩露敏感資訊

---

## 6. AI 不可做的事

中文 Prompt 明確指示 AI **不可以**：

### 6.1 修改公式
- 不可更改 `metricDefinitions` 中的任何公式
- 不可自行推論或發明新的計算方式

### 6.2 自行補充資料
- 不可假設缺失的資料
- 不可用平均值或其他估計值填補空缺
- 只能基於提供的 Analysis Contract 進行分析

### 6.3 混淆貨幣單位
- **營收**以 **USD** 計算（已從來源幣別標準化）
- **BP 目標**以「**百萬 TWD**」計算
- **絕對不可**直接比較 USD 營收與百萬 TWD BP 目標
- USD 換算 TWD 需使用參數中的匯率

### 6.4 忽略資料限制
- 必須尊重 `assumptions` 中的分析假設
- 若 `quality.confidence` 為 "low"，必須明確警告分析可能不可靠
- 必須考量資料品質問題對結論的影響

### 6.5 混淆比例歸因與因果關係
- **BP Gap Attribution** 和 **Risk Attribution** 是「**比例歸因**」，不是「**嚴格因果**」
- 「佔差距 30%」表示該驅動因子在差距期間貢獻 30% 營收
- 這**不表示**該因子「造成」30% 的差距
- 不可將比例歸因解讀為責任分配

---

## 7. 建議貼給外部 AI 的使用流程

### 7.1 準備階段

1. 確保資料品質良好（Quality Confidence 為 "high" 或 "medium"）
2. 確認所有分析假設都正確
3. 理解 BP Gap Attribution 是比例歸因而非因果

### 7.2 執行階段

1. 在 Results / Risk Brief 頁面點擊「複製 AI 分析包」
2. 開啟外部 AI 工具（建議使用支援長上下文的模型如 Claude 3.5 Sonnet、GPT-4）
3. 貼上完整分析包
4. 等待 AI 生成分析結果

### 7.3 驗證階段

1. **驗證 AI 是否遵守 guardrails**
   - 檢查 AI 是否有修改公式或補充資料
   - 確認貨幣單位處理正確
   - 確認比例歸因未被誤解為因果

2. **驗證資料引用正確**
   - 確認 AI 引用的數字與 Analysis Contract 一致
   - 確認 AI 沒有引用不存在於資料中的資訊

3. **人工判斷**
   - AI 分析僅供參考，最終決策仍需人工確認
   - 對於關鍵決策，建議交叉比對多個 AI 工具的分析結果

---

## 8. 風險與限制

### 8.1 AI 分析的限制

- **外部 AI 的準確性**：AI 可能產生幻覺（hallucination）或錯誤解讀資料
- **上下文限制**：非常長的分析包可能超過 AI 的上下文長度限制
- **更新延遲**：AI 分析基於匯出時的資料快照，不反映即時變更

### 8.2 比例歸因的限制

- BP Gap Attribution 是基於**營收比例**的歸因，不是基於**反事實分析**
- 高佔比的驅動因子不一定能透過單獨調整來消除差距
- 歸因結果應作為「優先關注」的指引，而非「責任分配」

### 8.3 資料品質的影響

- 若 Data Quality Confidence 為 "low"，AI 分析可能基於不完整或錯誤的資料
- 資料品質問題會影響所有 downstream 分析結果

---

## 9. 未來內建 AI API 的安全設計

如果未來要內建 AI API 功能（直接從應用程式呼叫 AI），需要以下安全設計：

### 9.1 資料隔離

- 在獨立的 sanitized data layer 中準備 AI 請求
- 確保未經 sanitization 的資料不會流入 AI 請求

### 9.2 Prompt 注入防護

- 使用系統 Prompt 強制執行 guardrails
- 在 Prompt 中明確指示 AI 只能基於提供的資料分析
- 使用 structured output / function calling 限制 AI 的回應格式

### 9.3 回應驗證

- 驗證 AI 回應中沒有修改公式或補充資料
- 使用 deterministic validation 檢查 AI 的數字引用是否正確
- 實施「人類在環」（human-in-the-loop）確認機制

### 9.4 審計與記錄

- 記錄所有 AI API 呼叫的輸入與輸出
- 記錄使用者對 AI 建議的採納與否
- 定期審查 AI 回應的準確性

### 9.5 錯誤處理

- 當 AI 回應違反 guardrails 時，顯示明確警告
- 不允許將違反 guardrails 的 AI 輸出寫回資料庫
- 提供「重試」與「人工分析」的選項

---

## 10. 檔案結構

```
frontend/src/core/
├── aiBriefExport.ts       # 核心功能：sanitization、prompt、pack
├── aiBriefExport.test.ts  # 測試
└── analysisContract.ts    # Analysis Contract 定義

frontend/src/pages/
└── CalculationResults.tsx # Results UI（加入 Export 按鈕）

frontend/src/i18n/
├── en.ts                  # 英文翻譯
└── zhTW.ts                # 繁中翻譯

docs/
└── AI_BRIEF_EXPORT.md     # 本文件
```

---

## 11. 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.21.0 | 2026-05-24 | 初始版本：AI Brief Export / Prompt Pack |

---

## 12. 相關文件

- [ANALYSIS_CONTRACT.md](../ANALYSIS_CONTRACT.md) - Analysis Contract 規格
- [README.md](../README.md) - 專案說明
