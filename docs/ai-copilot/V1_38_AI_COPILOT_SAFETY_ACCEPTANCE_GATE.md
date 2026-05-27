# v1.38.0 AI Data Copilot 核心安全與驗收閘門 (Safety & Acceptance Gate)

> **版本**: v1.38.0
> **狀態**: Active / Strict Enforcement
> **核心宗旨**: 確保 AI Data Copilot 作為分析輔助工具，其行為 100% 具有「確定性」、「零數據庫污染性」與「嚴格可解釋性」，絕不做出越權、隨機猜測或篡改數據庫的行為。

---

## 一、 核心安全閘門指標 (Core Safety Gates)

所有 AI Copilot 的實作與提交，在 Merge 進入 `main` 分支前，必須通過以下 11 項核心安全與驗收閘門（Safety Gates）。任何一項不符合即直接判定為 **Fail** 并攔截發佈。

### 1. 🚨 零 API Key 硬編碼閘門 (No Hardcoded API Keys)
* **安全準則**：任何代碼庫（包括前端、測試或臨時腳本）中，**絕對禁止** 出現硬編碼的 OpenAI、Anthropic、Firebase 等第三方 AI 服務的 API Key、Tokens 或是帳戶密鑰。
* **技術防線**：
  * 所有密鑰必須通過用戶端手動輸入（不持久化）或 `.env` 局部環境變量加載。
  * 必須將 `.env*` 寫入 `.gitignore`，從源頭防止洩露。

### 2. 🚨 數據庫寫入絕對隔離閘門 (No Firestore Writes from AI)
* **安全準則**：AI 的任何生成內容（AI output）**絕對禁止** 直接或自動調用服務層寫入 Firestore 數據庫。
* **技術防線**：
  * AI Copilot 控制組件中禁止引入任何 `services/*` 中的數據寫入模組（例如 `saveSKUs`、`saveForecasts` 等）。
  * AI 生成的所有修復方案，必須以 `Draft (草稿)` 形式在前端 UI 渲染，必須由具備 Writable 權限的真人用戶（Owner/Editor）點擊二次確認後，手動觸發相應的寫入流程。

### 3. 🚨 零自動保存閘門 (No AI Auto-Save)
* **安全準則**：AI 絕對不允許存在任何「後台靜默保存」或「自動修復」機制。
* **技術防線**：
  * 所有修復必須有明確的 human-in-the-loop（真人介入）確認 Modal，且默認按鈕必須是「取消」，確認動作必須是顯式且具有提示性的。

### 4. 🚨 檢視者權限防禦閘門 (Viewer Role Hard-Gate)
* **安全準則**：Viewer 角色絕對無法觸發任何數據修復或套用 AI 的任何調整建議。
* **技術防線**：
  * 當用戶角色為 `Viewer` 時，AI Copilot 面板的任何修復按鈕、套用建議按鈕必須完全隱藏或強制變為 `disabled`。
  * 系統展示顯眼的 Read-Only 提示。

### 5. 🚨 公式完整性防禦閘門 (Formula Immutability)
* **安全準則**：AI 絕對不被允許修改或建議用戶修改 `calculationEngine.ts` 中的任何數理公式。
* **技術防線**：
  * 系統中的產能公式、稼動率計算、Attainment 計算等均為硬編碼確定性代碼，AI 不得擁有任何重寫其邏輯的接口。

### 6. 🚨 零數據隨機猜測閘門 (No Guessing on Missing Data)
* **安全準則**：當資料庫中存在 missing data（數據缺失，如產品單價缺失、產能未填寫）時，AI **絕對禁止** 隨機猜測或使用平均值等模糊算法填充缺失值。
* **技術防線**：
  * 遇到缺失值，AI 必須遵循 deterministic（確定性）零容忍原則，精確報告「數據缺失，無法計算」，並引導用戶前往對應頁面手動填寫。

### 7. 🚨 貨幣與計量標準化閘門 (Currency & Scale Isolation)
* **安全準則**：AI **絕對禁止** 將 USD 營收直接與 Million TWD（百萬台幣）BP 目標進行數值上的混淆或直接運算。
* **技術防線**：
  * AI 的上下文建構器（Context Builder）必須保證數據的 Scale 和 Currency 已經在本地進行了標準化格式轉換。
  * 在向用戶展示對比時，AI 必須嚴格標明貨幣符號（如 `USD`、`TWD`）以及數值單位（如 `M` 表示百萬）。

### 8. 🚨 歸因與因果性隔離閘門 (No Pseudo-Causality)
* **安全準則**：AI **絕對禁止** 將數值上的「比例歸因（Proportional Attribution）」解釋為確定性的「因果關係（Causality）」。
* **技術防線**：
  * 在分析營收差距或產能瓶頸時，AI 的文案應採用客觀的描述（例如：「該客戶在營收差距中佔比 X%」），而非主觀的斷言（例如：「是由於該客戶造成了 BP 未達成」），避免誤導用戶的商業決策。

### 9. 🚨 結論性質清晰標註閘門 (Conclusion Classification)
* **安全準則**：AI 生成的每一條結論，必須在文案中顯式、清晰地標註其科學性質。
* **分類規範**：
  * **Fact (事實)**：源於資料庫無爭議的確定性數字（如：2026-06 產能短缺 500 片）。
  * **Assumption (假設)**：基於情境乘數或未知市場的假設（如：假設下半年單價下降 5%）。
  * **Inference (推論)**：基於邏輯鏈條得出的推導結論（如：因產能不足，推論該大客戶訂單將無法 100% 交付）。
  * **Recommendation (建議)**：給予真人的改善性提案（如：建議增加 Core 產能或調價）。

### 10. 🚨 數據來源引用完整性閘門 (Data Source Traceability)
* **安全準則**：AI 提出的所有數字及分析結論，必須在上下文或下方附帶明確的 `Source Reference`（數據來源引用，如指向具體 SKU、Forecast 月份或 Parameters 配置）。
* **技術防線**：
  * 拒絕任何無法追溯來源的「幻覺數字」。

### 11. 🚨 低可信度數據語氣降級閘門 (Tone Downgrade on Low Confidence)
* **安全準則**：當系統數據的 Data Quality 可信度為 `low` 或 `blocked` 時，AI Copilot **必須** 在所有文案中進行語氣降級（Tone Downgrade）。
* **技術防線**：
  * 必須展示警告：「由於當前基線數據存在資料品質缺陷，以下分析僅供參考，結果可能存在顯著偏差。」
  * 禁用任何過度確信的詞彙（如「絕對」、「一定會」），改用「可能」、「大機率」等中性詞。
