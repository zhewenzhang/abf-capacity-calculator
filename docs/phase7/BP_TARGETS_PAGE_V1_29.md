# BP Targets 營業目標獨立頁面架構說明書 (v1.29.0)

本文件詳盡記錄了 v1.29.0 中實作的 **BP Targets（營業目標）獨立管理頁面** 的技術架構、資料流程、安全機制及系統相容性規約。

---

## 一、 頁面路由與選單導航

*   **頁面路由**：`/bp-targets` (懶載入載入 `lazy(() => import('./pages/BpTargets'))`)
*   **選單鍵**：`bp-targets`
*   **選單圖示**：`<DollarOutlined />` (與營業額、銷售目標語意高度貼合)
*   **導航顯示**：
    *   **英文 (en)**：`BP Targets`
    *   **繁體中文 (zh-TW)**：`營業目標 BP`
*   **作用域支援**：完全支援 **Personal Scope** (個人範疇) 及 **Workspace Scope** (工作區範疇) 的動態切換與自動隔離載入。

---

## 二、 資料儲存結構與單位

### 1. 儲存路徑
BP 營業目標繼續儲存於既有的專案參數結構中，**完全沒有修改 Firestore 數據結構 (Schema)**：
```typescript
ProjectParameters.bpTargets = {
  mode: 'yearly',
  yearlyRevenueTargetsMillionTwd: Record<string, number> // 範例: {"2026": 1200, "2027": 1500}
}
```

### 2. 度量單位與數值語意
*   **硬性單位**：**百萬新台幣 (Million TWD)**。
*   **`0` 與空值的語意分水嶺**：
    *   **數值 `0`**：表示該年份的營業目標**明確設定為 0**。
    *   **空值 (null / undefined / '')**：表示該年份**未設定任何營業目標**。
*   **年份移除機制**：
    *   在 `BpTargets.tsx` 頁面編輯時，若將某一年的儲存格清空，在點擊 **Save** 進行資料還原時，**該年份鍵值對會被安全地從 Record 字典中移除**，絕不保存為 `NaN`，也絕不保存空字符串。這完美保護了數據庫的乾淨和下游公式運算的強健性。

---

## 三、 react-datasheet-grid 橫向表格設計

為了符合 Excel 用戶在年度營業目標配置時橫向拉取與粘貼的習慣，本頁面設計了專屬的單行寬幅網格：

```
+-------------------------+--------+--------+--------+ ... +--------+
| Metric / 項目            |  2026  |  2027  |  2028  |     |  2040  |
+-------------------------+--------+--------+--------+ ... +--------+
| BP Target (Million TWD) |  1200  |  1500  |   —    |     |  3000  |
+-------------------------+--------+--------+--------+ ... +--------+
```

### 1. 欄位定義 (Columns)
*   **首欄 (`metric`)**：唯讀顯示項目名稱（如 `BP Target (Million TWD)` / `BP 目標（百萬 TWD）`），`disabled: true`。
*   **年份欄 (`2026` - `2040`)**：橫向自左向右排列共 15 列，格式為 `floatColumn` 浮點數輸入。

### 2. 資料雙向轉換 (Helpers)
所有的資料清洗、轉換與校驗完全被抽離在 `frontend/src/core/bpTargetsHelpers.ts` 純函數中：
*   `recordToRows`：載入時將字典轉化為橫向表格所需的單行陣列，未設定年份自動填充為 `null` 展示為空格。
*   `rowsToRecord`：保存時將表格還原為 `Record<string, number>` 結構，並執行校驗：
    *   嚴禁輸入負數。
    *   嚴禁輸入非有效數字。
    *   過濾掉所有的空格年份，執行移除。

---

## 四、 Parameters 頁面解耦與防覆寫安全機制

在舊版本中，`Parameters.tsx` 页面直接持有了 `bpTargets` React State，這會在多個瀏覽器視窗併發操作或在 Parameters 頁面僅修改 Panel 參數保存時，意外將舊版或空白的 `bpTargets` 覆寫回資料庫。

為了徹底解決這一隱患，我們在 v1.29.0 中做出了以下重構：

1.  **徹底移除直接編輯**：
    *   在 `Parameters.tsx` 中剔除了 `bpTargets` 相關的所有 state 與 input。
    *   新增引導卡片提示（帶有跳轉 `/bp-targets` 的 Primary 按鈕），引導用戶進入專業的橫向表格頁面管理。
2.  **併發安全回填 (Read-Fill Design)**：
    *   在 `Parameters.tsx` 頁面執行 `handleSave` 保存良率、Panel 尺寸或匯率等常規參數時，拼裝的數據對象中 **不再** 攜帶任何本地 BP state，而是直接拉取最新的 Firestore 参数，並將其 `params.bpTargets` 只讀地回填回保存荷載中：
      ```typescript
      bpTargets: params.bpTargets, // 只讀回填，防覆寫
      ```
    *   該防禦性設計確保了常規參數設定與營業目標設定這兩個核心模塊在資料更新上的**完全解耦與互不干擾**。

---

## 五、 權限管理與 Viewer True Read-only 限制

我們針對 `Workspace Viewer`（唯讀觀察員）實作了高規格的展示與資料雙層防護限制：

1.  **頂層按鈕置灰 (UI Lock)**：
    *   若當前角色無編輯權限，頂部的 **Save** 與 **Discard** 按鈕將被強制 `disabled={true}`。
    *   頂部將赫然展示醒目的唯讀模式警示 Alert。
2.  **表格儲存格唯讀 (Grid Cell Lock)**：
    *   年份列的 `disabled` 屬性被動態關聯為 `!writable` (當為 Viewer 時 `disabled: true`)。所有年份單元格均變為淡灰色置灰背景，雙擊無法進入編輯模式，且**無法粘貼**覆寫本地 state。
3.  **核心事件攔截器 (onChange Guard)**：
    *   即使有極端狀況或開發層繞過，在 `handleRowsChange` 入口處，我們添加了強健的權限校驗，阻斷任何本地 state 的更動：
      ```typescript
      const handleRowsChange = (newRows: BpSheetRow[]) => {
        if (!writable) return; // 雙重保險拦截
        setRows(newRows);
      };
      ```

---

## 六、 下游分析相容性聲明

*   **完全相容**：由於資料結構的儲存路徑和 Million TWD 的度量衡保持 100% 絕對一致，下游的 Dashboard BP KPI、Results 分析報告中的 BP 分攤算法（`buildBpAnalysis`）以及數據質量檢查（Data Quality）在不需要做任何代碼調整的情況下，**即能完美、無縫地讀取到最新的營業目標數據**。
