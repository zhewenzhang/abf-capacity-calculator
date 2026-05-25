# 分析結果與風險摘要 (Results & Risk Brief) 使用手冊

## 頁面用途

Results 頁面提供詳細的產能分析結果，包含月度明細、瓶頸識別、BP 達成率分析與決策級風險摘要，是 ABF Calculator 的核心分析輸出頁面。

## 使用者角色

所有角色均可檢視完整分析結果。此頁面為唯讀，無法修改任何資料。

## 頁面結構

Results 頁面分為多個分頁：

| 分頁 | 用途 |
|------|------|
| Sales | 營收分析視角 |
| Product Planning | 產品規劃視角 |
| Capacity | 產能分析視角 |
| Raw | 原始資料明細 |
| BP Analysis | BP 達成率分析 |
| Risk Brief | 決策級風險摘要 |

## 基本操作流程

### 1. 查看產能利用率

1. 進入「Capacity」分頁
2. 查看各月份 Core/BU 利用率
3. 紅色標示瓶頸月份（利用率 > 100%）

### 2. 查看 BP 達成率

1. 進入「BP Analysis」分頁
2. 切換檢視模式：Year / Quarter / Month
3. 查看 Target、Revenue、Attainment%、Gap

### 3. 查看風險摘要

1. 進入「Risk Brief」分頁
2. 查看以下區塊：
   - Executive Summary：決策摘要
   - Facts：關鍵事實
   - Top Risk Periods：高風險期間
   - Driver Analysis：驅動因子分析
   - BP Risk：BP 風險評估
   - Data Confidence：資料信心度

### 4. 匯出分析資料

1. 點擊「AI Brief Export」按鈕
2. 選擇匯出格式：
   - Copy AI Brief Pack（中文提示詞 + JSON）
   - Copy Prompt（僅提示詞）
   - Copy JSON（僅 JSON）
   - Download JSON（下載檔案）

## 分析指標說明

### 產能指標

| 指標 | 說明 |
|------|------|
| Core Utilization | Core 面板利用率（需求/產能） |
| BU Utilization | BU 面板利用率 |
| Bottleneck | 瓶頸判定（Core/BU/None） |
| Shortage | 產能缺口（需求 - 產能） |

### BP 指標

| 指標 | 說明 |
|------|------|
| Target | BP 目標（百萬 TWD） |
| Revenue | 預測營收 |
| Attainment | 達成率（Revenue / Target） |
| Gap | 缺口（Target - Revenue） |

### 風險指標

| 指標 | 說明 |
|------|------|
| Shortage Months | 產能不足月份數 |
| Max Utilization | 最高利用率 |
| BP Risk | BP 達成風險 |

## 常見問題

| 問題 | 可能原因 | 解決方式 |
|------|----------|----------|
| BP Analysis 顯示「No Target」 | 未設定 BP 目標 | 至 BP Targets 頁面設定 |
| Utilization 顯示「N/A」 | 產能為 0 | 至 Capacity 設定產能 |
| 圖表無資料 | SKU/預測/產能未設定 | 完成基礎資料輸入 |

## 與其他頁面的資料聯動

| 頁面 | 聯動關係 |
|------|----------|
| Products | SKU 資料用於計算 UPP、良率 |
| Forecasts | 預測數量用於計算需求與營收 |
| Capacity | 產能用於計算利用率與缺口 |
| BP Targets | BP 目標用於達成率計算 |

## 權限注意事項

- 所有角色皆可查看完整分析
- 匯出功能無特別限制
- 此頁面為唯讀，不涉及資料修改

## 不該做什麼

- ❌ 不要將 Risk Brief 當作 AI 建議（純確定性分析）
- ❌ 不要將 Proportional Attribution 誤解為因果關係
- ❌ 不要忽略 Data Quality 警告
- ❌ 不要在資料不完整時過度依賴分析結果

## AI Brief Export 注意事項

- 匯出資料經過去敏感化處理
- 不包含 Firestore 路徑或使用者資訊
- 使用者需自行將資料貼到外部 AI 工具
- AI 回覆僅供參考，不應直接做決策

## 相關頁面

- [Dashboard](#) — KPI 總覽
- [BP Targets](BP_TARGETS.md) — BP 目標設定
- [AI Brief Export 文件](../AI_BRIEF_EXPORT.md)
