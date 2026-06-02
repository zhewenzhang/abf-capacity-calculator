# v1.54.3 Spreadsheet Grid Stability Fix Command

## 0. 任務背景

使用者回報：不只 `/bp-targets`，其他頁面的表格也有閃爍 / scrollbar 抖動 / grid 重算問題。

目前還沒有到「決定最終保留哪一種表格元件」的節點，因此本任務 **不得進行表格技術選型重寫**。

本次目標是先修復現有 spreadsheet grid 的使用體驗，讓用戶錄入資料時穩定、不卡、不閃、不抖。

## 1. 任務目標

對目前使用 `react-datasheet-grid` 的頁面做統一穩定性修復。

至少涵蓋：

- `frontend/src/pages/BpTargets.tsx`
- `frontend/src/pages/ProductsSpreadsheetLab.tsx`
- `frontend/src/pages/ForecastsSpreadsheetLab.tsx`
- `frontend/src/pages/CapacitySpreadsheet.tsx`

請用 `rg "DataSheetGrid" frontend/src` 找出所有使用點，不得漏掉。

## 2. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_3_SPREADSHEET_GRID_STABILITY_FIX_COMMAND_LOG.md`
3. 不得修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - Firebase Functions / DeepSeek runtime
4. 不得新增大型表格依賴。
5. 不得把所有表格重寫成 AntD Table、TanStack Table 或其他新方案。
6. 不得刪除 spreadsheet 編輯功能。
7. 不得破壞 Viewer read-only。
8. 不得只修 `/bp-targets`，必須檢查所有 `DataSheetGrid` 頁面。

## 3. 初步判斷

目前可疑共因：

1. **Nested scroll**
   - 外層 `.spreadsheet-wrapper` 有 `overflow-x: auto`
   - `react-datasheet-grid` 自身也有內部 scroll
   - 雙層 scrollbar 可能導致寬度 / 高度反覆測量

2. **不穩定高度**
   - 有些頁面使用固定小高度，例如 BP 頁 `height={120}`
   - 有些頁面直接用 `window.innerHeight - xxx`
   - resize / viewport / card padding 變化時容易重算

3. **不穩定 columns**
   - 某些頁面 columns 內嵌 Popover / InputNumber / warning icon
   - columns 依賴 UI state 時，狀態變化會重建整組 columns
   - grid 會重新測量列寬和 scroll

4. **新 UI theme 放大問題**
   - card border / radius / padding / global scrollbar style 可能讓 grid 更容易顯示抖動

## 4. 必做調查

在命令日誌記錄以下內容：

1. `rg "DataSheetGrid" frontend/src` 的所有使用點。
2. 每個頁面的：
   - wrapper class
   - height 計算方式
   - columns 是否 memoized
   - columns 是否依賴 transient UI state
   - 是否存在 nested scroll
3. 哪些頁面能復現閃爍，哪些不能。
4. 你判斷的共同根因。

不要未調查就直接改 CSS。

## 5. 修復策略

### 5.1 建立共用穩定 wrapper

建議新增一個共用 component 或至少共用 CSS class，例如：

- `frontend/src/components/common/StableSpreadsheetShell.tsx`

或如果不抽 component，至少建立統一 class：

- `.stable-spreadsheet-shell`
- `.stable-spreadsheet-shell--compact`
- `.stable-spreadsheet-shell--tall`

目標：

- 外層只負責邊框、圓角、背景、contain
- 不和 `react-datasheet-grid` 爭奪 scroll
- 避免 nested horizontal scroll
- 保留 grid 內部 scroll

建議 CSS 方向：

```css
.stable-spreadsheet-shell {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--twk-border, #e5e7eb);
  border-radius: 16px;
  background: var(--twk-card, #fff);
  contain: layout paint;
}

.stable-spreadsheet-shell .dsg-container {
  width: 100%;
  min-width: 100%;
  overflow: auto;
  scrollbar-gutter: stable;
}
```

如瀏覽器相容性不適合 `scrollbar-gutter`，請用其他穩定方案，但要記錄。

### 5.2 統一 grid 高度策略

不要讓高度落在臨界值。

建議：

- BP 這種 1-row grid：使用穩定 fixed height，例如 `144`
- Products / Forecasts / Capacity 這種多行 grid：用 memoized viewport height，並設定 `minHeight` / `maxHeight`
- 避免在 render 中直接使用 `window.innerHeight`，改為：
  - `useMemo` 初始化
  - 或 `useWindowSize` / resize listener with debounce
  - 或固定合理高度

### 5.3 穩定 columns

對所有 DataSheetGrid 頁面檢查：

- columns 必須 `useMemo`
- columns 不應依賴每次輸入都會變的 transient UI state
- 如果 header 需要 warning / quick fix：
  - 優先把 quick fix UI 移到 grid 外部 alert/action list
  - 或拆成 memoized header component
  - 不要讓 InputNumber value 改變造成整組 columns 重建

### 5.4 保留功能

以下功能必須保留：

- products spreadsheet 編輯 / 儲存 / 新增空白列 / 匯出
- forecasts spreadsheet 編輯 / dirty cell / 儲存
- capacity spreadsheet 編輯 / dirty cell / 儲存
- BP targets 編輯 / 儲存 / 放棄修改 / DQ quick fix
- Viewer read-only
- 現有 data quality warning / dirty highlight

## 6. 不要做的事

1. 不要把現有 spreadsheet pages 全部重寫成新表格。
2. 不要移除 `react-datasheet-grid`。
3. 不要為了消除閃爍直接關閉所有 scrollbar。
4. 不要把內容裁切到無法水平查看。
5. 不要把 DQ / quick fix 功能刪掉。
6. 不要用 `setTimeout` 或硬 refresh 當修復。

## 7. 測試要求

請新增或更新測試，至少覆蓋：

1. 所有 `DataSheetGrid` 頁面使用 stable wrapper。
2. BP targets 1-row grid 能穩定渲染。
3. Products / Forecasts / Capacity spreadsheet 仍可渲染。
4. Viewer role 時 spreadsheet 不可編輯。
5. Save / discard / dirty highlight 不回退。
6. 若移動 BP quick fix UI，quick fix 仍可觸發。

如果測試環境難以 mount `react-datasheet-grid`，至少使用：

- DOM class regression test
- source-level guard test
- component smoke test

## 8. Browser / Visual QA

如有登入態，請實測並截圖：

- `docs/qa/screenshots/v1-54-3/bp-target-grid-desktop.png`
- `docs/qa/screenshots/v1-54-3/products-grid-desktop.png`
- `docs/qa/screenshots/v1-54-3/forecasts-grid-desktop.png`
- `docs/qa/screenshots/v1-54-3/capacity-grid-desktop.png`
- `docs/qa/screenshots/v1-54-3/spreadsheet-grid-mobile-375.png`

請在命令日誌記錄：

- 是否仍有閃爍
- 是否有雙 scrollbar
- 是否可水平滾動
- 是否可編輯
- 是否可儲存

若缺少 authenticated browser session，請明確寫：

```text
Browser QA limited due to missing authenticated session.
```

不可把 limited 說成 full pass。

## 9. 自動化驗證命令

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

在 repo root 執行：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
git status --short
```

## 10. Git 要求

建議分支：

- `xiaomi/v1-54-3-spreadsheet-grid-stability-fix`

Commit message：

- `fix: stabilize spreadsheet grid layout v1.54.3`

Push：

- `origin/xiaomi/v1-54-3-spreadsheet-grid-stability-fix`

## 11. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. `DataSheetGrid` 使用點盤點結果。
3. 根因判斷。
4. 是否確認 nested scroll / height / columns 問題。
5. 修改了哪些檔案。
6. 是否保留所有 spreadsheet 編輯功能。
7. 是否保留 Viewer read-only。
8. 截圖路徑或 Browser QA 受限原因。
9. test / lint / build 結果。
10. 紅線檔案是否未修改。
11. Commit hash、branch、push 狀態。
12. 是否可交 AGY 驗收。

