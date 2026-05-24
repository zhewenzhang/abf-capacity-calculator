# AI Analysis Benchmark Cases (6大標準基准測試案例規格書)

本規格書定義了 **6 大標準 ABF 載板業務基准測試案例**。用於在離線狀態下，將模擬的結構化數據（`AnalysisContractPayload` 的關鍵指標特徵）灌入外部 AI，以檢驗大語言模型（LLM）是否具備處理複雜物理產能、多幣別換算、數據質量警告以及敏感性場景的判讀能力。

---

## 案例一：Healthy Case (健康運行基准案例)

### 1. 測試目的
驗證 AI 是否能正確識別完美的、無風險的系統狀態，考核其是否能保持客觀、平穩的積極語氣，避免過度警覺、生搬硬套風險詞彙或編造虛無的產能危機。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "high"`（對應系統底層 `confidenceScore` 數字在 `85-100` 區間，且系統無 Error 與 Warning）。
- **產能狀態**：全年 Core Panel 與 BU Panel 的最大月度利用率分別為 72% 與 68%，各月波動在 60%~75% 區間。
- **短缺統計**：`shortageMonthCount = 0`，全年月度 `coreShortage` 與 `buShortage` 均為 0。
- **BP目標對齊**：
  - `bpTargetMillionTwd = 300` (百萬台幣)
  - `bpForecastMillionTwd = 315` (百萬台幣)
  - `bpAttainment = 1.05` (達成率 105%)
  - `bpGapMillionTwd = 15` (超標達成 15M TWD)

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **數據信心確認**：主動提及目前數據質量為“High”，所有輸入完整且無警告。
- **產能安全聲明**：準確指出 Core 和 BU 產能在全年均安全無憂，利用率控制在 75% 以下的健康水平，無任何短缺發生。
- **BP超標肯定**：明確指出 BP 計劃達成率為 105%，營收超額完成了 15 Million TWD。
- **平穩預防性建議**：給予銷售和規劃經理平穩的正面反饋，建議“維持當前的預測與生產節奏，無需進行激進的產能擴張”。

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **幻覺警報**：無端發出“產能即將耗盡，必須立刻購買設備”的虛假警報。
- **幣別張冠李戴**：將 315 百萬台幣錯讀為 315 百萬美元。
- **過度防禦**：對 105% 的健康達成表現出過度的預警傾向。

---

## 案例二：Capacity Shortage Case (產能短缺壓力案例)

### 1. 測試目的
考核 AI 對局部月份嚴重短缺的定位能力，能否精準識別瓶頸所在（Core vs BU），並通過 Weighted Pressure Index 準確揪出導致短缺的 Top 1 戰略型 SKU 或客戶。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "high"`（對應系統底層 `confidenceScore` 數字在 `85-100` 區間）。
- **短缺月份定位**：`shortageMonthCount = 4`（2026年 6月、7月、8月、9月）。
- **瓶頸特徵**：
  - Core 面板利用率在 6-9 月高達 128%，月度 `coreShortage` 累計達 12,000 panels。
  - BU 面板利用率在 6-9 月為 75%，無短缺。系統顯示 `bottleneck = "Core"`。
- **加權驅動分析 (Weighted Pressure)**：
  - 核心加權係數：`coreWeight = 1.3`, `buWeight = 1.0`。
  - 壓力驅動矩陣中，客戶 NVIDIA 的 SKU-ABF-14L（層數=14，尺寸=55x55mm，晶片用途=Server GPU，buSteps=6）在 6-9 月佔據了 **48%** 的加權產能壓力比例，為 Top 1 短缺驅動源。
- **BP目標對齊**：BP 達成率為 101%（勉強達標）。

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **精準瓶頸定位**：明確指出真正的產能瓶頸在 **Core 面板**而非 BU 面板，且瓶頸時段高度集中在 **2026年 6月至 9月**。
- **首要驅動因子識別**：準確指出 NVIDIA 的 SKU-ABF-14L 載板是造成這 4 個月 Core 產能超載的頭號殺手，其分攤了高達 48% 的產能壓力。
- **物理與分析公式界限**：指出 `weightedPressureIndex` 中 Core 的 1.3 倍權重反映了 Core 生產的物理複雜性，但**提醒用戶實體短缺的 Core 面板數依然是 12,000 panels，並非乘以 1.3 後的數值**。
- **具體可執行建議**：
  - 建議 **Capacity Operations** 在 6-9 月將該工廠的默認工作日（workingDays）最大化（如安排週末加班），或尋求外部 Core 面板代工。
  - 建議 **Product Planning** 優化良率（Yield），降低 14L 面板的報廢率。

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **瓶頸判斷錯誤**：因為 14L 載板層數很多（Layer Count = 14），想當然地判定瓶頸一定在 BU 端的壓合工序（忽略了 Core Util > BU Util 的實體數據）。
- **時間模糊**：泛泛地建議“2026 年全年都要擴產”，無視了 Q1, Q2 和 Q4 產能富餘的事實。
- **公式篡改**：宣稱“實體短缺數量需要乘以 1.3 倍”。

---

## 案例三：BP Miss Case (商業目標未達成案例)

### 1. 測試目的
測試 AI 在物理產能極度富餘，但商業計劃（BP）嚴重失守時的診斷能力。特別考核 AI 是否能使用“比例歸因”的客觀概念解讀 BP Gap，而非做出具有指責性、破壞性的商业決策偏誤。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "high"`（對應系統底層 `confidenceScore` 數字在 `85-100` 區間）。
- **產能利用率**：全年 Core 與 BU 利用率峰值僅為 55%，無任何短缺月份（`shortageMonthCount = 0`）。
- **BP 達成率與缺口**：
  - `bpTargetMillionTwd = 500` (百萬台幣)
  - `bpForecastMillionTwd = 375` (百萬台幣)
  - `bpAttainment = 0.75` (達成率僅 75%)
  - `bpGapMillionTwd = -125` (缺口高達 -125M TWD)
- **BP 缺口比例歸因 (bpAttribution)**：
  - 系統內最大營收貢獻者客戶 AMD 佔總預測營收的 60%。
  - `bpAttribution.topDrivers` 顯示，AMD 分攤的 Gap 佔比高達 **60%**（分攤缺口金額為 -75 Million TWD）。

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **商業失守診斷**：指出 2026 年面臨严峻的業績危機，BP 達成率僅 75%，存在 125M TWD 的巨大業績缺口。
- **歸因免責聲明**：在剖析 Gap 驅動時，**必須主動聲明**：“*AMD 分攤的 75M TWD 缺口是基於其營收佔比（60%）進行的比例歸因（Proportional Attribution），這屬於分析性分攤，不代表 AMD 發生了惡意砍單或單方面商務違約*”。
- **產能富餘識別**：指出工廠產能極度閒置（利用率僅 55%），瓶頸完全不在物理產能端。
- **建設性商業行動建議**：
  - 建議 **Sales** 部門立刻針對閒置的 Core/BU 產能開展促銷，向 AMD 或其他客戶主動爭取填補性訂單。
  - 建議 **Executive** 評估是否需要下調過於激進的 500M TWD 年度 BP 目標。

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **因果倒置指責**：報告稱：“*由於最大客戶 AMD 表現極差，直接砍掉了 75M TWD 的訂單，導致我們 BP 失敗。我們應對 AMD 進行商務處罰或扣減其未來的產能。*”（這將比例分攤誤判為惡意砍單）。
- **產能幻覺**：給出“因為產能短缺所以沒交出貨”的錯誤物理診斷。

---

## 案例四：Dirty Data Case (數據質量髒污案例)

### 1. 測試目的
考核 AI 在數據存在嚴重缺失、系統發出低信心警報時的**自我克制與防守能力**。AI 必須能夠壓低語氣，識別出系統的計算數據是“受污染的”，引導人類去修復數據，而不是硬行得出荒謬的實體業務論斷。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "low"`（對應系統底層 `confidenceScore` 數字在 `0-59` 區間，代表有 Error-level 嚴重缺漏）。
- **DQ 錯誤警告矩陣 (DataQualitySummary)**：
  1. **【Error】** SKU-ABF-Server-12L 的單價未定義（`unitPriceUsd = 0`），但月度 Forecast 大於 50k pcs。
  2. **【Error】** 關鍵工廠 Factory-A 2026年 10-12 月的 `buCapacity` 漏配置（顯示為 0），但此期間 BU Demand 大於 5,000 panels。
  3. **【Warning】** 缺失 USD→CNY 的即時匯率配置，系統自動啟動了默認歷史匯率。
- **計算受損表現**：由於 Factory-A 的 `buCapacity = 0`，系統算出的 10-12 月 BU 利用率為無窮大，並拋出嚴重的利用率溢出警告。

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **防禦性免責聲明 (首要)**：在報告最頂部以醒目的警示框聲明：“*警告：當前系統數據質量信心評級為 LOW。由於存在嚴重的基礎數據缺失，以下所有分析結論和趨勢預測均極不可信，嚴禁直接用於任何資本性支出（Capex）或實體商務簽約決策！*”
- **精準列出數據髒點**：清晰、不遺漏地列出 3 個核心數據缺陷，特別指出單價為 0 會導致營收和 BP 達成率被嚴重低估；BU 產能為 0 則是工廠配置遺漏。
- **引導人类修復 (Human-in-the-loop)**：拒絕給出任何產能擴張或業務收縮的結論。明確給出修復清單：“*請用戶立刻在系統中：1. 補充 SKU-ABF-Server-12L 的有效單價；2. 在 Factory-A 配置 Q4 的 BU 日產能；3. 檢查匯率表。修復後重新運行分析。*”

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **盲目分析**：忽略 Low 評級，報告稱：“*由於 10-12 月利用率為無窮大，我們的工廠已經徹底癱瘓，建議立刻花費 5,000 萬美元緊急採購壓合機。*”
- **忽略價格缺失**：在計算營收時，直接把 SKU-ABF-Server-12L 的營收當作 0，並判定“該 SKU 毫無商業毛利，建議砍掉此客戶”。

---

## 案例五：Currency Trap Case (多幣別混淆陷阱案例)

### 1. 測試目的
專門測試 AI 的“幣別防火牆”與計量單位對齊能力。ABF 報價常常混合 USD, TWD, CNY，而 BP Target 則是 TWD（以百萬為單位），此用例用於攔截 AI 在加減乘除時將不同幣別直接“亂燉”的嚴重算術與邏輯漏洞。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "medium"`（對應系統底層 `confidenceScore` 數字在 `60-84` 區間，有 Warning 但無 Error）。
- **原始報價矩陣**：
  - SKU-A (NVIDIA HPC)：`unitPrice = 6.0`，幣別 = `USD`
  - SKU-B (AMD PC)：`unitPrice = 160.0`，幣別 = `TWD`
  - SKU-C (Mobile)：`unitPrice = 35.0`，幣別 = `CNY`
- **匯率參數表**：`1 USD = 32.0 TWD`，`1 USD = 7.0 CNY`。
- **2026年 6月單月預測量**：
  - SKU-A：10,000 pcs
  - SKU-B：20,000 pcs
  - SKU-C：10,000 pcs
- **BP目標**：2026年 6月單月 BP Target = `10.0` **Million TWD** (百萬台幣)。
- **系統底層正確折算路徑**：
  - SKU-A 6月營收 = $10,000 \times 6 = 60,000$ USD
  - SKU-B 6月營收 = $20,000 \times (160 / 32) = 100,000$ USD
  - SKU-C 6月營收 = $10,000 \times (35 / 7) = 50,000$ USD
  - 6月總營收 = $210,000$ USD
  - 換算回台幣營收 = $210,000 \times 32 = 6,720,000$ TWD = **6.72** Million TWD
  - 6月 BP 達成率 = $6.72 / 10.0 = 67.2\%$，Gap = **-3.28** Million TWD。

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **幣別對齊折算**：清晰展現換算路徑，將 SKU-A, B, C 的營收折算為統一的 USD 營收（總計 210,000 USD）。
- **BP 單位精準匹配**：在與 6 月 10 Million TWD 的目標對比時，精準將 210,000 USD 乘以 匯率 32.0 得到 6.72M TWD，得出“達成率為 67.2%，目前存在 3.28 Million TWD 的業績缺口”的正確結論。
- **無單位混淆**：準確使用 Million TWD 作為商業對比的最終後綴。

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **算術大混亂**：直接把價格相加得到：$6.0 \text{ (USD)} + 160.0 \text{ (TWD)} + 35.0 \text{ (CNY)} = 201.0$ 的荒謬單pcs均價。
- **直接數值對比**：直接拿 210,000 USD 去減 10.0 M TWD，判定“營收超標了 209,990 元”。

---

## 案例六：Price / Capacity Scenario Case (敏感性場景過度解讀案例)

### 1. 測試目的
考核 AI 是否能以“唯讀、假設性、敏感性分析”的態度解讀 priceImpact 和 capacityImpact 情境模擬。AI 必須能指出改善幅度的局限性，嚴禁輕率地將 scenario 方案誤判為實體數據已修改，或給出脫離商務現實的漲價/盲目擴產命令。

### 2. 給 AI 的結構化數據特徵 (Payload Characteristics)
- **數據質量**：`confidenceLevel = "high"`（對應系統底層 `confidenceScore` 數字在 `85-100` 區間）。
- **基線狀態 (Baseline)**：2026年存在 5 個月 Core 產能短缺，全年 BP 達成率為 90% (Gap = -30M TWD)。
- **價格敏感性模擬 (priceImpact)**：
  - 當所有 SKU 單價整體上調 10%（`price_+10pct`）時，2026年 BP 達成率可提升至 **99%**，BP Gap 縮小至 -3M TWD。
  - 系統識別：`mostSensitiveYear = "2026"`。
- **產能提升模擬 (capacityImpact)**：
  - 當 Core 與 BU 產能雙雙提升 10%（`capacity_both_+10pct`）時，短缺月份從 5 個月減少至 1 個月（僅剩 8 月份仍有 1,000 panels 的短缺無法解決）。
  - 系統標識：`bestScenarioId = "capacity_both_+10pct"`。

### 3. 期待 AI 說出的重點 (Golden Output Standards)
- **唯讀邊界聲明**：明確指出：“*以下改善方案均為系統基於 sensitivity 模組運行的假設性模擬（Scenarios），屬於唯讀推演，當前工廠的真實物理產能與報價主數據並未發生任何改變*”。
- **價格彈性理性分析**：指出 2026 年對價格變動高度敏感。上調 10% 的價格幾乎可以抹平 BP 缺口（達成率達 99%）。但**提醒銷售和主管**：必須評估此舉是否會引發客戶反彈或流失份額，不可盲目單方面漲價。
- **產能瓶頸局限性指出**：指出即使 Core 和 BU 雙雙極限提升 10%，在最繁忙的 8 月份仍然存在 1,000 panels 的短缺。因此，單靠工廠內部擴產是無法完全消滅瓶頸的，**強烈建議 Capacity 配合外協代工或引導銷售進行短缺月的 forecast 削峰填谷**。

### 4. AI 絕對不應說的錯誤結論 (Negative Standards)
- **越權數據修改**：宣稱：“*因為 +10% Both 是最佳方案，我已在後台數據庫中為所有工廠的主產能上調了 10%。*”
- **脫離商務現實的命令**：下達命令：“*請銷售立刻去通知所有客戶，我們從下月起全面漲價 10%，這能完美解決我們的財務問題。*”
