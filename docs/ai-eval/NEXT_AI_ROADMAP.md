# NEXT AI Roadmap (前瞻性 AI 發展三階段規劃路線圖)

本路線圖為 **ABF Capacity Calculator** 的 AI 功能演進制定了清晰的、漸進式的三階段發展路徑。

我們秉持 **KISS 簡潔原則** 與 **安全至上** 理念，堅守“AI 輔助，人類決策”的定位，絕不在前提不成熟時進行越界集成。

---

## 發展階段總覽

```
+-----------------------------------+
|  Stage A: External AI Assisted   |  <-- CC 正在研發的 v1.21.0 基礎
|  - 離線拷貝 Prompt Pack            |
|  - 零 API 成本、零代碼侵入          |
+-----------------------------------+
                  | (業務驗證通過 & 隱私協議合規)
                  v
+-----------------------------------+
|  Stage B: Internal AI Drafting    |
|  - 內建安全 API 交互               |
|  - Key/Log/Privacy/Rate Limit 治理|
+-----------------------------------+
                  | (API 穩定性達標 & 專家滿意度 >90%)
                  v
+-----------------------------------+
|  Stage C: Decision Copilot        |
|  - 多版本 Forecast 交叉敏感性比對   |
|  - 跨角色協同 Action List 生成     |
+-----------------------------------+
```

---

## Stage A：External AI Assisted Analysis (外部 AI 輔助分析)

### 1. 使用方式
用戶在 Calculator 前端Results頁面一键點擊“導出 Prompt 禮包（Prompt Pack）”，系統將導出包含結構化 `AnalysisContractPayload` 的純文本與引導 Prompt。用戶手動將其複製並粘貼到外部大模型（如 Gemini, Claude, ChatGPT 等）的獨立對話網頁中進行離線分析。

### 2. 產品價值
- **零 API 成本**：不消耗公司任何 API 賬單預算。
- **零代碼侵入**：系統無需集成外部 SDK，不產生任何線上網絡安全威脅。
- **隱私自主**：用戶可自行選擇使用企业版/隱私保護版的大模型，確保核心數據的隱私邊界。

### 3. 技術前提
- 完成 v1.21.0 前端的 Prompt Pack 導出功能。
- 確保導出的 Payload 格式高度結構化、極度緊湊，避免超出大模型的 context limit 或引發格式混亂。

### 4. 潛在風險
- **操作繁瑣**：用戶需要手動拷貝、粘貼，交互路徑長，體驗不連貫。
- **Prompt 版本分裂**：用戶拷貝出去後可能自行隨意修改 system prompt，導致分析質量失控，Rubric 難以統一評分。
- **數據洩露隱患**：若用戶將數據複製到未關閉訓練開關的免費大模型中，可能造成公司機密產能數據被用於二次訓練。

### 5. 本階段絕對不該做的事
- **嚴禁**在主代碼中進行任何 http/https API 即時連線集成。
- **嚴禁**向用戶承諾 AI 分析結果可以直接回寫到 Firebase 數據庫。

### 6. 進入下一階段的卡點 (Exit Criteria)
- 業務團隊通過 Stage A 累積了至少 50 份 AI 分析報告，並通過 `AI_ANALYSIS_RUBRIC.md` 核對，證明其具備高度的決策級參考價值。
- 公司法務與 IT 部門出具了關於“使用外部 LLM API 分析公司預測數據”的合規許可協議。

---

## Stage B：Internal AI Drafting (系統內建 AI 草稿起草)

### 1. 使用方式
用戶在系統內一鍵點擊“生成 AI 決策草稿”按鈕。系統後端（如 Firebase Cloud Functions 或 Cloud Run）通過安全通道調用公司統一採購的企業級 LLM API，在前端直接渲染格式化好的分析報告草稿，並支持導出為 PDF。

### 2. 產品價值
- **極致交互體驗**：用戶無需跳轉，一鍵獲取報告。
- **Prompt 版本統一管理**：Prompt 全面收歸系統後端統一控制與動態更新（Prompt Versioning），保證輸出的標準化。
- **企業級隱私保護**：統一使用 Enterprise 協議的 API（承諾數據絕不被用於二次訓練）。

### 3. 技術前提
- **API Key 安全管理**：API 金鑰必須託管在 Secret Manager 中，嚴禁泄露在前端代碼中。
- **日誌審計 (API Usage Logging)**：後端必須記錄每一次 AI 請求的用戶 ID、時間、消耗 token 數和生成結果，防止惡意批量導出公司產能數據。
- **流量限制 (Rate Limiting)**：防刷治理，限制單個用戶每天的最大生成次數（例如：每人每天最多生成 10 次），防止 API 賬單暴漲。
- **Prompt 版本化 (Prompt Versioning)**：後端支持動態下發與退回 Prompt 版本，便於持續優化 Prompt 效果。

### 4. 潛在風險
- **API 賬單失控**：如果沒有嚴格的 Rate Limit，大批量併發將產生昂貴的 API 費用。
- **單點崩潰風險**：如果外部 LLM API 節點超時或抖動，前端可能面臨長時間加載崩潰。
- **提示詞注入 (Prompt Injection)**：惡意用戶試圖通過輸入髒數據引導 AI 吐出後端的 system prompt 或其他敏感配置。

### 5. 本階段絕對不該做的事
- **嚴禁**免去“人工確認卡點（Human-in-the-loop）”。AI 生成的草稿必須經過 Planner 勾選確認，**絕不能**自動向客戶發送或自動修改物理主數據。
- **嚴禁**在前端代碼中直接寫死 API key 或直接調用第三方接口。

### 6. 進入下一階段的卡點 (Exit Criteria)
- 系統後端 Rate Limiting 與 Secret 治理機制完美通過壓力測試，未發生任何密鑰外泄或賬單溢出。
- API 交互穩定性達到 99.9%，且規劃專家對內建 AI 草稿的滿意度（Rubric評估 $\ge 85$分率）達到 90% 以上。

---

## Stage C：Decision Copilot (智能決策協同副駕駛)

### 1. 使用方式
AI 演進為“跨部門協同的決策副駕駛”。當用戶導入多個版本的 Forecast（如 Optimistic vs Pessimistic）或多個廠區的 Capacity Plan 時，AI 能在後端進行多版本交叉敏感性比對，自動識別潛在的跨角色、跨時間、跨廠區的資源衝突，並生成唯讀的“跨角色協同行動建議卡（Cross-Role Action Cards）”。

### 2. 產品價值
- **跨版本深度推演**：實現真正具備深度預見性的 Forecast 敏感性推演。
- **部門間無縫協同**：AI 自動將產能瓶頸轉化為給 Sales 的談判清單、給 Planner 的良率任務、給 Capacity 的加班排程和給 Executive 的 Capex 備選方案，打通角色間的信息孤島。

### 3. 技術前提
- 系統數據庫全面支持“多版本 Forecast / Capacity 歷史快照管理”。
- LLM API 支持超大 Context Window（如 100K+ tokens）以容納多個版本的巨大 Payload，且具備極高的邏輯推理能力（如 Gemini Pro / Claude Opus 級別）。

### 4. 潛在風險
- **計算極度緩慢**：大 Payload 導致 API 響應時間拉長至 30 秒以上，前端需要卓越的非同步異步加載體驗。
- **決策偏執與發散**：隨着比對維度呈指數級上升，AI 容易在龐大數據中產生邏輯迷失，給出自相矛盾的跨角色建議。

### 5. 本階段絕對不該做的事
- **絕對嚴禁將自動決策權轉交給 AI**！AI 生成的跨角色 Action Cards 必須是**唯讀**的，各個角色（Sales, Planner等）必須進入自己的工作台手動點擊“確認並實施（Acknowledge & Apply）”後，系統才能去更新相應的 Firestore 實體參數。AI 絕不能直接執行後台的參數篡改。
