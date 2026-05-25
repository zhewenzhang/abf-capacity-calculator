# 產品管理 (Products) 使用手冊

## 頁面用途

產品管理頁面用於建立、編輯、刪除 SKU（產品項目），為後續預測輸入與產能分析提供基礎資料。

## 使用者角色

| 角色 | 可執行操作 |
|------|-----------|
| Owner | 新增、編輯、刪除、匯入、匯出 |
| Editor | 新增、編輯、刪除、匯入、匯出 |
| Viewer | 僅能檢視，無法修改 |

## 基本操作流程

### 1. 新增 SKU

1. 點擊「+ New SKU」按鈕
2. 填寫必填欄位：
   - **SKU Code**：產品編號（唯一識別）
   - **Customer**：客戶名稱
   - **Device Name**：裝置名稱
   - **Chip Length/Width (mm)**：晶片尺寸
   - **Layer Count**：層數
   - **Size Category**：尺寸類別（Small/Medium/Large/XLarge）
   - **Unit Price**：單價
   - **Unit Price Currency**：幣別（USD/TWD/CNY）
3. 選填欄位：OSAT、Application、Product Grade、Core Type、Core Thickness、ABF Type
4. 點擊「Save」儲存

### 2. 編輯 SKU

1. 在列表中找到目標 SKU
2. 點擊該列或「Edit」按鈕
3. 修改欄位後點擊「Save」

### 3. 刪除 SKU

1. 選取一或多個 SKU
2. 點擊「Delete」按鈕
3. 確認刪除

### 4. 匯入 SKU

1. 點擊「Download Template」下載範本
2. 在 Excel 中填寫 SKU 資料
3. 點擊「Import from Excel」上傳檔案
4. 系統會驗證資料並顯示錯誤提示

### 5. 匯出 SKU

1. 點擊「Export to Excel」匯出所有 SKU 資料

## 常見錯誤

| 錯誤訊息 | 原因 | 解決方式 |
|----------|------|----------|
| SKU Code is required | 未填寫 SKU Code | 補上唯一的 SKU Code |
| Invalid currency | 幣別代碼錯誤 | 使用 USD/TWD/CNY |
| Chip dimensions required | 未填寫晶片尺寸 | 填寫長寬數值 |

## 與其他頁面的資料聯動

| 頁面 | 聯動關係 |
|------|----------|
| Forecasts | 預測輸入需選擇已存在的 SKU |
| Dashboard | SKU 數量顯示於 KPI 卡片 |
| Results | SKU 資料用於計算 UPP、良率、營收貢獻 |

## 權限注意事項

- Viewer 無法新增、編輯、刪除任何 SKU
- 所有欄位輸入皆會經過驗證
- 刪除 SKU 不會自動刪除相關預測資料

## 不該做什麼

- ❌ 不要建立重複的 SKU Code
- ❌ 不要輸入負數的晶片尺寸或單價
- ❌ 不要在未確認情況下批次刪除 SKU
- ❌ 不要使用非標準幣別代碼

## 相關頁面

- [Products Spreadsheet Lab](#) — Excel-like 批量輸入實驗功能
- [Forecasts](FORECASTS.md) — 基於 SKU 的預測輸入
