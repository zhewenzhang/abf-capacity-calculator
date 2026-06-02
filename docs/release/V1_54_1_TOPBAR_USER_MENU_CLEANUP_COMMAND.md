# v1.54.1 Topbar User Menu Cleanup Command

## 0. 任務定位

本任務是 v1.54 UI 精修，不是全站重寫。

目標是修正目前頂部導航欄資訊過載、空間浪費、功能項被擠壓的問題，讓導航更接近 tweakcn cards/dashboard 風格：乾淨、留白、有層級、少噪音。

## 1. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_1_TOPBAR_USER_MENU_CLEANUP_COMMAND_LOG.md`
3. 不得修改以下紅線檔案：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
4. 不得寫入、打印、提交任何 API key 或 secret。
5. 不得改動 DeepSeek / Firebase Functions runtime 邏輯。
6. 不得新增大型 UI 依賴。優先使用現有 Ant Design、lucide icons、既有 CSS token。
7. 不得只改 CSS 變數就宣稱完成；必須實際改導航欄結構。

## 2. 當前問題

目前頂部導航欄同時顯示：

- `ABF 計算`
- `v1.54.0`
- 多個主功能入口
- workspace / data selector，例如 `ABF20260523`
- role，例如 `owner`
- `UID`
- 語言
- 幣別
- email
- logout

結果是：

- 中間導航項目被擠壓，部分內容顯示不完整。
- `owner`、`UID`、資料選擇等管理資訊佔用了主要導航空間。
- email 與登出按鈕過早暴露，造成右側噪音。
- 頂欄缺少清晰的產品層級。

## 3. 必做需求

### 3.1 Brand / Version

1. 將左上角產品標題改為：
   - `ABF CSS`
2. `v1.54.0` 現階段仍保留在網頁導航欄。
3. 版本 pill 建議放在 `ABF CSS` 右側，保持小尺寸、低視覺權重。

### 3.2 User Menu

將以下資訊從頂部導航欄主視覺區移入右側 user menu / account dropdown：

1. workspace / data selector，例如 `ABF20260523`
2. role，例如 `owner`
3. `UID`
4. email
5. logout

User menu 觸發器建議呈現為：

- avatar / user icon
- 使用者 email 的簡短形式，或只顯示帳號圖示
- caret icon

User menu 打開後至少包含：

- 使用者 email
- Workspace / Data selector
- Role badge
- UID 顯示或 copy action
- Logout action

### 3.3 語言與幣別

本次不要強制移入 user menu。

語言與幣別可以暫時保留在頂部右側，因為它們是高頻切換項。但需要確保它們不再擠壓主導航。

如果空間仍不足，可將語言與幣別做成更緊湊的 segmented controls，但不要改變原有功能。

### 3.4 主導航

主導航應優先保留真正的產品入口。

如果頂部空間仍不足，請用以下方式整理：

1. 保留高頻入口：
   - 營運工作台
   - 儀表板
   - 產品
   - 預測
   - 產能規劃
   - 計算結果
   - AI 助手
2. 低頻入口可以放入 `更多` dropdown，但不得讓功能消失。
3. 不要讓導航文字被截斷到不可理解。

## 4. 視覺要求

風格應靠近使用者指定的 tweakcn theme：

- 白色或近白背景
- 細邊框
- 大圓角 pill / card
- black foreground
- mint green 作為 active / accent
- navigation 不要再像老式深色 sidebar 或過度藍色企業系統

請優先復用目前已存在的 tweakcn / design token 檔案，例如：

- `frontend/src/styles/designbyte.css`
- `frontend/src/styles/tweakcnTheme.css`
- `frontend/src/theme/antdTheme.ts`

實際檔名以專案現況為準。

## 5. 建議實作位置

請先檢查：

- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/styles/*.css`
- `frontend/src/theme/*.ts`
- 任何目前負責 topbar / app shell / nav 的 component

若目前導航直接寫在 `App.tsx`，可以在不大規模重構的前提下抽出：

- `frontend/src/components/layout/AppTopbar.tsx`
- `frontend/src/components/layout/UserMenu.tsx`

若專案已有 layout component，請沿用既有位置。

## 6. 驗收標準

### 6.1 功能驗收

1. 頂部品牌顯示為 `ABF CSS`。
2. `v1.54.0` 仍顯示在頂部導航欄。
3. 頂欄不再直接顯示：
   - `owner`
   - `UID`
   - workspace selector `ABF20260523`
   - full email
   - standalone logout button
4. 以上資訊可在 user menu 中看到或操作。
5. 原本頁面路由與功能入口仍可使用。
6. Viewer / editor / owner 權限邏輯不得被破壞。

### 6.2 視覺驗收

必須產出截圖，放在：

- `docs/qa/screenshots/v1-54-1/topbar-desktop.png`
- `docs/qa/screenshots/v1-54-1/topbar-user-menu-open.png`
- `docs/qa/screenshots/v1-54-1/topbar-mobile-375.png`

截圖必須能證明：

- 桌面頂欄不擁擠。
- user menu 打開後內容完整。
- 375px mobile 不水平溢出。

如果無法取得登入態或瀏覽器工具不可用，必須在命令日誌中明確寫出原因；不能用「未執行」直接宣稱通過。

### 6.3 自動化驗收

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

並在 repo root 執行紅線檢查：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
git status --short
```

## 7. Git 要求

1. 建議從目前 v1.54 UI 分支建立工作分支：
   - `xiaomi/v1-54-1-topbar-user-menu-cleanup`
2. Commit message：
   - `fix: clean topbar user menu v1.54.1`
3. Push 到：
   - `origin/xiaomi/v1-54-1-topbar-user-menu-cleanup`

## 8. 最終回報格式

請用中文回報：

1. 是否已讀取並更新命令日誌。
2. 修改了哪些檔案。
3. Brand 是否已改為 `ABF CSS`。
4. `v1.54.0` 是否仍保留在頂部導航欄。
5. 哪些資訊已移入 user menu。
6. 語言與幣別是否保留在頂欄，若有調整請說明。
7. Desktop / user menu open / mobile 截圖路徑。
8. test / lint / build 結果。
9. 紅線檔案是否未修改。
10. Commit hash、branch、push 狀態。
11. 是否可交 AGY 驗收。
