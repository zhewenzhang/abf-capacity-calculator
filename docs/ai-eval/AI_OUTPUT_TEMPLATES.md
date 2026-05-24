# AI Output Templates (三大角色 AI 分析報告回覆模板)

本文件定義了外部 AI 在解讀 `AnalysisContractPayload` 後，面對不同業務受眾時必須遵守的**標準輸出格式、必填數據欄位、禁止語氣以及高保真 ABF 載板業務範例**。

---

## 模板一：管理層簡報版 (Executive Edition)

### 1. 適用對象
CEO, VP, 業務總經理等需要快速掌握大局、拍板重大決策的高級管理人員。

### 2. 核心設計原則
- **極簡主義**：字數控制在 500 字以內，剔除所有底層運算細節。
- **行動導向**：直接指出最核心的威脅與必須由高管拍板的決策項（Decision Items）。

### 3. 必填數據欄位 (Required Fields)
- **整體數據信心評級** (`confidenceLevel`：High/Medium/Low/Blocked，對應系統底層 `confidenceScore` 數值區間)
- **年度 BP 達成率與 Gap** (`bpAttainment` %, `bpGap` M TWD)
- **年度最嚴重的產能短缺月份數與最大利用率** (`shortageMonthCount`, `maxCoreUtil` / `maxBuUtil`)
- **Top 1 核心風險驅動因子** (Customer/SKU)

### 4. 禁止語氣與雷區 (Forbidden Tones)
- **嚴禁**使用任何含糊的代詞，如“*可能有些月份會有問題*”。必須精確到數字。
- **嚴禁**給出越權決策命令，如“*我們已經停止了對 AMD 的供貨*”。必須寫成建議高管抉擇的形式。

### 5. 建議輸出格式與高保真範例

````markdown
# 【高管決策簡報】ABF 產能與營收年度分析

### 1. 一句話核心論斷 (One-Line Verdict)
> 2026年業務因 **【Core 面板產能局部短缺（6-9月）】** 將導致年度 BP 達成率受卡，預測存在 **【24.5M TWD】** 的財務缺口，數據信心為 **【High】**。

### 2. Top 3 核心風險 (Top 3 Risks)
1. **產能物理瓶頸 (Core Shortage)**：
   - 2026 年預計發生 **【4 個月】** Core 面板短缺（6月-9月），峰值利用率高達 **【125%】**；BU 端產能安全。
2. **營收缺口 (BP Target Miss)**：
   - 全年 BP 達成率為 **【91.8%】**。總預測折合台幣 275.5M，對比 300M TWD 目標，缺口為 **【-24.5M TWD】**。
3. **客戶壓力集中度 (Driver Exposure)**：
   - 客戶 **【NVIDIA】** 的 **【SKU-ABF-14L】** 載板佔據了短缺月產能壓力的 **【48%】**。

### 3. 待決策與批准項 (Decision Items for Executive)
- **【決策 A：產能外協/外包】**：是否批准在 6-9 月對 Core 面板進行外協代工（預估每 panel 增加 15% 成本，但能完全抹平 24.5M TWD 的營收缺口）？
- **【決策 B：戰略客戶 Forecast 調整】**：是否授權銷售團隊與 NVIDIA 協商，將部分 8 月份的 Forecast 延期至 10 月份（Q4 產能富餘）生產？
````

---

## 模板二：產品與產能規劃專家版 (Planner Edition)

### 1. 適用對象
產品規劃經理 (Product Planner)、產能運營經理 (Capacity Operator) 等需要深度剖析物理瓶頸與數據質量的專業人員。

### 2. 核心設計原則
- **數據完整性**：邏輯嚴密，必須清晰區分 Core 與 BU 面板的物理限制。
- **可追溯性**：所有結論必須標明數據源和計算依據，展現清晰的分析路徑。

### 3. 必填數據欄位 (Required Fields)
- **數據質量警告清單** (Data Quality Error/Warning) 与信心聲明
- **瓶頸日曆與短缺統計** (bottleneck, monthlySummaries, shortageMonthCount, monthly utilization)
- **加權產能壓力驅動排序** (coreWeight / buWeight, weightedPressureIndex drivers)
- **BP比例歸因矩陣** (bpAttribution Proportional Attribution drivers & disclaimer)
- **Price/Capacity 情境模擬對比** (priceImpact, capacityImpact scenarios, bestScenarioId)

### 4. 禁止語氣與雷區 (Forbidden Tones)
- **嚴禁**混淆加權排序係數與物理公式。
- **嚴禁**漏掉 BP Proportional Attribution 的免責聲明。

### 5. 建議輸出格式與高保真範例

````markdown
# 【規劃專家版】2026年 ABF 產能與商業計劃深度解讀報告

## 一、數據質量與信心診斷 (Data Quality & Confidence)
- **當前信心等級**：`confidenceLevel = "medium"`（對應系統底層 `confidenceScore = 75`）
- **數據髒點警告**：
  1. **【Warning】** SKU-ABF-PC-8L 缺失定義 Yield Rate，系統自動啟用 85% 默認值。
  2. **【Info】** 匯率啟用系統固定配置：1 USD = 32.0 TWD。
- **評審結論**：數據基本完整，計算結果具備高度規劃參考價值。

## 二、實體產能瓶頸深度分析 (Capacity Bottleneck Analysis)
- **首要瓶頸資源**：`Core Panel (Core)`
- **短缺統計**：累計短缺月份為 **【3個月】**（2026年 7月、8月、9月），累計實體缺口為 **【8,500 panels】**。
- **利用率趨勢**：Core 利用率在 8 月份達到峰值 **【122%】**，而 BU 端全年利用率峰值僅為 78%（無短缺）。
- **加權壓力驅動分析 (Weighted Pressure Index - Core 1.3 / BU 1.0)**：
  - 排序前三的 Core 壓力驅動源為：
    1. **【NVIDIA | SKU-ABF-14L】**：加權壓力佔比 **【45%】**，影響期 7-9 月。
    2. **【AMD | SKU-ABF-12L】**：加權壓力佔比 **【20%】**，影響期 8-9 月。
    3. **【Intel | SKU-ABF-8L】**：加權壓力佔比 **【15%】**，影響期 8 月。
  *(注：加權壓力指數僅作為資源排序用途，實體短缺缺口依然為 8,500 panels)*。

## 三、BP 達成與營收比例歸因 (BP Attainment & Proportional Attribution)
- **BP 績效指標**：預測折合台幣 310.4M TWD，年度 BP 目標 330.0M TWD。達成率 **【94.1%】**，Gap 為 **【-19.6M TWD】**。
- **BP 缺口比例歸因**：
  - 基於營收比例分攤的 Gap Top Drivers：
    1. **【AMD】**：分攤 Gap 金額 **【-11.76M TWD】** (分攤佔比 60%)。
    2. **【Intel】**：分攤 Gap 金額 **【-5.88M TWD】** (分攤佔比 30%)。
  > **【免責聲明】** 本處 Gap 歸因屬於**比例歸因 (Proportional Attribution)**，即根據客戶營收比例分攤總財務缺口，**不代表 AMD 或 Intel 存在商務砍單等直接因果責任**。

## 四、價格與產能改善情境模擬 (Scenario Sensitivities)
- **1. 價格敏感性模擬 (priceImpact)**：
  - 若所有 SKU 單價整體上調 **【+5%】**，年度 BP 達成率將從 94.1% 提升至 **【98.8%】**，BP Gap 縮小至 **【-4.0M TWD】**。最敏感年份為 **【2026年】**。
- **2. 產能改善情境模擬 (capacityImpact)**：
  - 運行方案 `capacity_both_+10pct`（Core與BU雙雙提升10%）：可將短缺月份數從 3 個月降至 **【1個月】**（僅剩8月份存在 500 panels 短缺），該方案被系統標記為 `bestScenarioId`。

## 五、下一步人類確認與驗證清單 (Human-in-the-loop Checklist)
- [ ] **確認良率假設**：請 Planner 覆核 SKU-ABF-PC-8L 的真實良率，確認 85% 默認值是否過於保守。
- [ ] **外協產能詢價**：請 Capacity Operations 向外協廠商諮詢 7-9 月購買 8,500 panels Core 面板的報價。
- [ ] **敏感性商務評估**：請 Sales 評估將 AMD 12L 產品單價上調 5% 的商務可行性與客戶流失風險。
````

---

## 模板三：銷售協同版 (Sales Edition)

### 1. 適用對象
大客戶經理 (Key Account Manager)、銷售主管 (Sales Executive) 等聚焦於客戶 Forecast 與客戶營收達成的商務人員。

### 2. 核心設計原則
- **商務聚焦**：摒棄複雜的物理產能公式，將產能瓶頸轉化為“客戶 Forecast 交期風險”和“對 BP 達成的威脅”。
- **精準彈藥**：為銷售人員提供回頭與客戶核對（Forecast Scrubbing）的精確清單。

### 3. 必填數據欄位 (Required Fields)
- **客戶級年度營收預估與佔比** (`revenueByCustomer` M USD, Share %)
- **短缺月份下的客戶產能短缺曝險** (Customer Shortage Exposure in shortage months)
- **客戶 Forecast 修正與確認清單** (Forecast Verification Checklist)

### 4. 禁止語氣與雷區 (Forbidden Tones)
- **嚴禁**向銷售灌輸工廠底層工藝代號。
- **嚴禁**使用指責性語氣，將業績未達標直接歸罪於銷售人員不力。

### 5. 建議輸出格式與高保真範例

````markdown
# 【銷售協同工作台】2026年客戶 Forecast 與 BP 達成分析報告

## 一、客戶年度營收貢獻與佔比 (Customer Revenue Contribution)
2026年總營收預估為 **【9.7M USD】**，折合台幣 310.4M TWD。
- **【客戶 AMD】**：預估營收 **【5.82M USD】**，營收貢獻佔比 **【60%】**。
- **【客戶 Intel】**：預估營收 **【2.91M USD】**，營收貢獻佔比 **【30%】**。
- **【其他客戶】**：預估營收 **【0.97M USD】**，營收貢獻佔比 **【10%】**。

## 二、產能短缺月下的客戶營收曝險 (Shortage Exposure)
由於 **【7月、8月、9月】** 工廠 Core 面板發生產能短缺，以下客戶的部分 Forecast 將面臨**無法按期交貨的交期風險**，這直接威脅到銷售人員的佣金與 BP 達成：
- **【客戶 AMD】**：
  - 短缺月（7-9月）實體曝險需求：**【5,100 panels】**。
  - 核心威脅 SKU：**【SKU-ABF-12L】**。
- **【客戶 Intel】**：
  - 短缺月（8月）實體曝險需求：**【1,200 panels】**。
  - 核心威脅 SKU：**【SKU-ABF-8L】**。

## 三、銷售 Forecast 覆核與確認清單 (Forecast Scrubbing & Action Items)
為了填補 **【-19.6M TWD】** 的 BP 財務缺口，並規避 Q3 交期風險，請銷售經理立刻回頭與客戶核對並執行以下行動：
- [ ] **【AMD Forecast 削峰填谷】**：與 AMD 採購經理溝通，能否將 8 月份的部分 SKU-ABF-12L 需求（約 2,000 panels 額度）提前至 5 月或延後至 10 月生產？（Q2 和 Q4 產能充足，可 100% 保證交期）。
- [ ] **【Intel 價格調整談判】**：鑑於 SKU-ABF-8L 在 8 月份擠佔了極度緊張的 Core 產能，且該 SKU 單價偏低，請銷售評估能否與 Intel 協商將單價上調 5%？（若談妥，可直接為公司增加 1.5M TWD 營收，且改善該 SKU 的產能排程優先級）。
- [ ] **【閒置產能追加銷售】**：針對 Q1 和 Q4 剩餘的 40% 富餘產能，能否向 AMD 爭取追加 strategicGrowth 類高毛利 SKU 的訂單？
````
