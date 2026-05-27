# v1.37.0 Scenario Planning MVP 實作驗收報告模板

> **驗收日期**: 2026-XX-XX
> **驗收分支**: `agy/v1-37-scenario-planning-mvp`
> **驗收人**: Antigravity / Reviewer
> **最終結論**: [ ] Pass / [ ] Conditional Pass / [ ] Fail

---

## 一、 核心紅線指標檢驗 (Redlines Audit)

| # | 驗收維度 | 核心要求 (Must-Have) | 審查方法 / 指令 | 驗收結果 | 備註與代碼位置 |
|---|---|---|---|:---:|---|
| 1 | **Single-Scenario Only** | 僅支援單一內存 Sandbox，不得支援多個情境保存。 | 檢查 UI 介面，確認無「情境列表」、「新增情境」按鈕。 | [ ] Pass<br>[ ] Fail | |
| 2 | **無多情境管理** | 絕對無 scenario list / rename / delete / switch 機制。 | 靜態代碼審查，確認無 `renameScenario` 等 API 及 Modal 元件。 | [ ] Pass<br>[ ] Fail | |
| 3 | **In-Memory Only** | 所有情境數據完全儲存於 React Context 狀態樹，無持久化。 | 刷新頁面，確認情境乘數自動歸零，且對比面板重置。 | [ ] Pass<br>[ ] Fail | |
| 4 | **不寫回 Firestore** | 零數據庫污染，嚴禁寫回 Firestore。 | 運行情境計算，抓包 Network 請求或監控 Firestore 寫入次數，確認為 0。 | [ ] Pass<br>[ ] Fail | |
| 5 | **模組依賴隔離** | `scenarioEngine.ts` 或相關 core 檔案不得導入 service 層。 | 靜態掃描，確認檔案開頭無 `import ... from '../services/...'`。 | [ ] Pass<br>[ ] Fail | |
| 6 | **頁面零寫入調用** | `ScenarioPlanning.tsx` 頁面檔案中不得呼叫任何 `save*` API。 | 搜索 `ScenarioPlanning.tsx` 中的關鍵字，確保無 `saveSKUs` / `saveForecasts` 等調用。 | [ ] Pass<br>[ ] Fail | |
| 7 | **Baseline Immutable** | 原始基線數據在情境應用時不被 mutation。 | 單元測試或控制台 debug，確保 baseline 物件的屬性未被原地修改。 | [ ] Pass<br>[ ] Fail | |
| 8 | **Delta 計算方向** | Delta 計算方向必須固定為 `Scenario - Baseline`。 | 檢查 `computeScenarioDeltas` 算式，確保 `delta = scenario - base`。 | [ ] Pass<br>[ ] Fail | |
| 9 | **乘數作用域** | 乘數只作用於克隆出來的數據（cloned data）。 | 檢查 `applyMultipliers` 實現，確認其回傳全新數組與對象。 | [ ] Pass<br>[ ] Fail | |
| 10 | **貨幣與 BP 計算** | 乘數作用於匯率轉換前，百萬台幣 BP 計算正確。 | 調整價格與預測量，手動核算營收 Delta % 與 BP 達成率 pp 變化。 | [ ] Pass<br>[ ] Fail | |
| 11 | **DQ Caveat 警示** | 原始基線有 DQ 問題時展示 Banner，blocked 時攔截運行。 | 使用 `confidence: 'low'/'blocked'` 的基線數據，驗證 Banner 的警告與阻斷行為。 | [ ] Pass<br>[ ] Fail | |
| 12 | **Viewer 唯讀模式** | Viewer 角色無法建立/編輯情境，Builder 處於 Read-only。 | 切換測試帳號為 `Viewer` 角色，驗證乘數 Sliders 被隱藏或禁用。 | [ ] Pass<br>[ ] Fail | |
| 13 | **Export Pack 清洗** | 未來若有導出數據，必須是完全 sanitized（去敏感）的乾淨包。 | 檢查導出 payload，確保無帳戶密碼或無權限元數據洩露。 | [ ] Pass<br>[ ] Fail | |
| 14 | **Package-Lock 同步** | 項目 package.json 與 package-lock.json 版本一致。 | 核對兩檔案的 `version` 字段，均應為 `1.37.0`。 | [ ] Pass<br>[ ] Fail | |
| 15 | **工程指標通過** | 測試、Lint 與 Production Build 100% 通過。 | 依次運行下方「三、 自動化工程檢驗」指令，確認無 error。 | [ ] Pass<br>[ ] Fail | |

---

## 二、 交互與 UI/UX 驗收 (User Experience Smoke Test)

| 測試場景 | 操作步驟 | 預期結果 | 驗收狀態 |
|---|---|---|:---:|
| **1. 進入情境模式** | 點擊頁面頂部的「情境分析 (Scenario Analysis)」展開 Builder。 | - 系統即時顯示「情境分析在內存沙盒運行，不會修改正式數據」Banner。<br>- KPI 顯示 Baseline 當前的原始數字。 | [ ] Pass<br>[ ] Fail |
| **2. 乘數調整** | 拖曳「預測量」滑桿至 `+10%`，「單價」滑桿至 `-5%`。 | - 滑桿和輸入框數值實時同步。<br>- 未點擊「套用」前，下方的 Dashboard 指標保持不變。 | [ ] Pass<br>[ ] Fail |
| **3. 情境套用** | 點擊「套用並比較」按鈕。 | - 對比面板在 200ms 內加載完畢。<br>- Delta KPI 精確標註綠色（改善 ↑）或紅色（惡化 ↓）。<br>- 顯示 Top Changed Customers 表格和月度趨勢對比折線圖。 | [ ] Pass<br>[ ] Fail |
| **4. 重置基線** | 點擊「重置為基線」按鈕。 | - 所有乘數滑桿瞬間歸零 (1.0)。<br>- 對比面板和月度圖表隱藏，KPI 回復原始 Baseline 值。 | [ ] Pass<br>[ ] Fail |
| **5. 髒數據離開警告** | 調整乘數後，不點擊重置，直接在瀏覽器刷新或點擊側邊欄跳轉其他頁面。 | - 瀏覽器彈出「確定離開？未重置的情境將丟棄且無法恢復」的警告提示。 | [ ] Pass<br>[ ] Fail |

---

## 三、 自動化工程檢驗 (Engineering Commands)

請在前端 `frontend` 目錄下依次執行以下指令，並記錄結果：

### 3.1 單元測試 (Unit Tests)
```bash
npm run test
```
* **預期結果**：新增的 `scenarioEngine.test.ts` 及所有現有測試 100% 通過（Test Files 及 Tests 全部為 passed）。
* **實測輸出**：
  ```
  [請粘貼實測 passed 數據]
  ```

### 3.2 代碼檢查 (ESLint)
```bash
npm run lint -- --quiet
```
* **預期結果**：命令零輸出退出，無任何 ESLint 警告或錯誤。
* **實測輸出**：
  ```
  [請粘貼實測輸出]
  ```

### 3.3 生產環境編譯 (Production Build)
```bash
npm run build
```
* **預期結果**：編譯順利通過，所有 JS/CSS 靜態分包產物輸出無報錯。
* **實測輸出**：
  ```
  [請粘貼實測輸出]
  ```

---

## 四、 驗收簽字與偏差說明 (Deviation Report)

* **偏差說明 (如是否有項目未達標或進行了折衷設計)**：
  ```
  
  ```
* **結論意見**：
  ```
  
  ```
* **驗收人簽名**: `__________________`
