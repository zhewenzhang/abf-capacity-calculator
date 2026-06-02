# v1.54.3 BP Target Grid Flicker Fix Command

## 0. 問題背景

使用者回報「營業目標 BP」頁面的橫向表格一直在閃。

截圖位置：

- 頁面：`/bp-targets`
- 區塊：BP 目標橫向年份輸入表格
- 表格內容：`BP 目標（百萬 TWD）`
- 現象：紅框內 grid / scrollbar / cell 區域持續閃爍或抖動

目前程式碼位置：

- `frontend/src/pages/BpTargets.tsx`
- 使用 `react-datasheet-grid`
- 外層使用 `.spreadsheet-wrapper`
- grid props 包含：
  - `height={120}`
  - `rowHeight={36}`
  - `columns={columns}`
  - `lockRows={true}`

## 1. 初步技術判斷

這不是 BP 資料本身錯誤，比較像 UI layout / grid measurement 問題。

可疑原因包括：

1. Nested scroll：外層 `.spreadsheet-wrapper` 使用 `overflow-x: auto`，而 `react-datasheet-grid` 本身也有內部 scroll 容器，可能造成橫向 scrollbar 反覆重算。
2. Grid 高度太小：BP 頁只有 1 行資料，`height={120}` 搭配 header、row、scrollbar、card padding 後，容易在「需要/不需要 scrollbar」之間抖動。
3. Columns 不穩定：`columns` 的 `useMemo` 依賴 `quickFixYear / quickFixValue / quickFixSaving`，且 column title 內直接掛 Popover/InputNumber，狀態變化會導致整組 columns 重建，grid 重新測量。
4. 新 theme 的 border / radius / overflow 樣式可能放大了 grid 測量抖動。

請先驗證根因，不要只改顏色或 padding。

## 2. 任務目標

修復 `/bp-targets` 的 BP 目標表格閃爍問題，讓它在 desktop 與 375px mobile 下穩定顯示。

本次是小範圍 UI 穩定性修復，不是全站 UI 重構。

## 3. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_3_BP_TARGET_GRID_FLICKER_FIX_COMMAND_LOG.md`
3. 不得修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - Firebase Functions / DeepSeek runtime
4. 不得新增大型依賴。
5. 不得移除 BP 目標編輯能力。
6. 不得破壞 Viewer read-only。
7. 不得用「我看起來可以」作為驗收，必須提供可重現的驗證方式。

## 4. 必查文件

請先閱讀：

- `frontend/src/pages/BpTargets.tsx`
- `frontend/src/index.css`
- `frontend/src/styles/tweakcnTheme.css`
- `frontend/src/styles/designbyte.css`
- `frontend/src/core/bpTargetsHelpers.ts`
- `frontend/src/pages/BpTargets.test.tsx`（如果不存在，請新增相關測試）

也請參考其他 spreadsheet 頁面：

- `frontend/src/pages/ProductsSpreadsheetLab.tsx`
- `frontend/src/pages/ForecastsSpreadsheetLab.tsx`
- `frontend/src/pages/CapacitySpreadsheet.tsx`

## 5. 必做調查

請在命令日誌記錄：

1. `/bp-targets` 是否存在 nested horizontal scroll。
2. `.spreadsheet-wrapper` 與 `.dsg-container` 的實際 overflow 設定。
3. `columns` 是否會因 quick fix popover state 反覆重建。
4. `DataSheetGrid` 是否因 `height={120}` 在一行資料下重算 scrollbar。

如果可以用 browser 工具，請打開頁面觀察並截圖。

## 6. 建議修復方向

請根據調查採用最小有效修復。優先順序如下：

### 6.1 建立 BP 專用穩定 wrapper

不要讓 BP 頁共用會造成 nested scroll 的通用 `.spreadsheet-wrapper` 行為。

建議新增類名：

```tsx
<Card className="abf-section bp-target-grid-card">
  <div className="bp-target-grid-shell">
    <DataSheetGrid ... />
  </div>
</Card>
```

CSS 方向：

```css
.bp-target-grid-shell {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--twk-border, #e5e7eb);
  border-radius: 16px;
  background: var(--twk-card, #fff);
}

.bp-target-grid-shell .dsg-container {
  width: 100%;
  min-width: 100%;
  overflow: auto;
  contain: layout paint;
}
```

目標：只保留 `react-datasheet-grid` 自己的 scroll，不要外層再套一層水平 scroll。

### 6.2 固定 grid 高度與寬度計算

對 BP 目標頁這種 1-row grid，請避免臨界高度。

建議：

- `rowHeight={40}`
- `height={132}` 或 `height={144}`，以實測不閃為準
- 外層 card 不要讓內容高度跟 scrollbar 出現/消失互相影響

### 6.3 穩定 columns

避免 `quickFixValue` / `quickFixSaving` 這類 popover 內部 state 造成整個 columns 重建。

可採方案：

1. 把 quick fix popover 從 column header 移出，改成 DQ alert / quick fix list / cell action。
2. 或把 column title 拆成 memoized component，讓 columns 只依賴：
   - language
   - writable
   - yearDqIssueMap
3. 不要讓 InputNumber 的 value 變化導致全部 columns 重建。

### 6.4 保留功能

以下功能必須保留：

- 編輯 BP 年度目標
- 儲存
- 放棄修改
- dirty cell highlight
- Viewer read-only
- data quality alert
- missing BP target quick fix 或替代入口

## 7. 測試要求

請新增或更新測試，至少覆蓋：

1. `BpTargets` 可以渲染 1-row grid。
2. `DataSheetGrid` wrapper 使用 BP 專用 class，例如 `bp-target-grid-shell`。
3. Viewer role 時 grid 不可編輯。
4. Save / discard 行為不回退。
5. 如果移動 quick fix 入口，測試 quick fix 仍可觸發。

如果現有測試環境難以直接測 `react-datasheet-grid`，請至少做：

- DOM class regression test
- wrapper class / grid props regression test
- source-level guard test

## 8. Browser / Visual QA

若有登入態，請截圖：

- `docs/qa/screenshots/v1-54-3/bp-target-grid-desktop.png`
- `docs/qa/screenshots/v1-54-3/bp-target-grid-mobile-375.png`

並在命令日誌中記錄：

- 是否仍有閃爍
- 是否有 nested scrollbar
- 是否能橫向滾動年份
- 是否能編輯與儲存

若沒有登入態，請明確寫：

- Browser QA limited due to missing authenticated session

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

- `xiaomi/v1-54-3-bp-target-grid-flicker-fix`

Commit message：

- `fix: stabilize bp target grid layout v1.54.3`

Push：

- `origin/xiaomi/v1-54-3-bp-target-grid-flicker-fix`

## 11. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. 根因判斷。
3. 是否確認 nested scroll / height / columns 其中哪一項造成閃爍。
4. 修改了哪些檔案。
5. 是否保留 BP 編輯、儲存、放棄、Viewer read-only。
6. 截圖路徑或 Browser QA 受限原因。
7. test / lint / build 結果。
8. 紅線檔案是否未修改。
9. Commit hash、branch、push 狀態。
10. 是否可交 AGY 驗收。

