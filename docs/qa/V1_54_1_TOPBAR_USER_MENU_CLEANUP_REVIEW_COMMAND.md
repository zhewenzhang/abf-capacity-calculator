# v1.54.1 Topbar User Menu Cleanup Review Command

## 0. 驗收任務

請以 AGY / read-only reviewer 身份，對以下分支進行只讀驗收：

- Target branch: `origin/xiaomi/v1-54-1-topbar-user-menu-cleanup`
- Expected commit: `9e108ce`
- Feature: v1.54.1 Topbar User Menu Cleanup

本次驗收重點不是全站 UI 大改，而是精準確認頂部導航欄資訊架構是否修正：

1. 品牌是否改為 `ABF CSS`
2. `v1.54.0` 是否仍保留在頂部導航欄
3. workspace / owner / UID / email / logout 是否從頂欄移入 user menu
4. 主導航是否不再被右側管理資訊擠壓
5. 語言與幣別是否仍可用且更緊湊
6. 功能入口是否沒有消失

## 1. 只讀限制

1. 不得修改任何產品代碼。
2. 不得 merge main。
3. 不得 deploy。
4. 不得修改 `firestore.rules`。
5. 不得修改 `frontend/src/core/calculationEngine.ts`。
6. 不得寫入、打印或提交任何 API key / secret。
7. 僅允許新增一份驗收報告：
   - `docs/qa/V1_54_1_TOPBAR_USER_MENU_CLEANUP_REVIEW.md`
8. 驗收報告需 commit 並 push 到獨立 AGY 分支：
   - `agy/v1-54-1-topbar-user-menu-cleanup-review`
9. Commit message：
   - `docs: add v1.54.1 topbar user menu cleanup review`

## 2. 必查文件

請至少檢查以下文件：

- `docs/release/V1_54_1_TOPBAR_USER_MENU_CLEANUP_COMMAND.md`
- `docs/release/V1_54_1_TOPBAR_USER_MENU_CLEANUP_COMMAND_LOG.md`
- `frontend/src/App.tsx`
- `frontend/src/i18n/zhTW.ts`
- `frontend/src/i18n/en.ts`
- 相關樣式檔案，例如：
  - `frontend/src/styles/designbyte.css`
  - `frontend/src/styles/tweakcnTheme.css`
  - `frontend/src/theme/antdTheme.ts`

實際檔名以分支內容為準。

## 3. 核心驗收清單

### 3.1 Brand / Version

請確認：

- 頂部品牌文字是 `ABF CSS`
- `v1.54.0` 仍保留在頂部導航欄
- version pill 視覺權重低，不擠壓主導航

### 3.2 User Menu 收納

請確認以下資訊不再直接攤在頂欄主視覺區：

- workspace / data selector，例如 `ABF20260523`
- role，例如 `owner`
- `UID`
- full email
- standalone logout button

請確認它們已在 user menu / account dropdown 中可見或可操作：

- workspace / data selector
- role badge
- UID 顯示或 copy action
- email
- logout action

### 3.3 語言與幣別

請確認：

- 語言切換仍可用
- 幣別切換仍可用
- 其呈現更緊湊，不再擠壓主導航
- 沒有破壞原有 i18n / currency state

### 3.4 主導航

請確認：

- 常駐導航至少包含：
  - 營運工作台
  - 儀表板
  - 產品
  - 預測
  - 產能
  - 結果
  - AI 助手
- 低頻入口已合理放入 `更多 / More`
- `更多 / More` 的 i18n key 正常
- 沒有路由入口消失
- 沒有文字被截斷到不可理解

### 3.5 Mobile / Responsive

如可執行瀏覽器測試，請驗證：

- desktop topbar 不擁擠
- user menu open 狀態內容完整
- 375px mobile 不水平溢出

若沒有登入態或瀏覽器工具不可用，必須在報告中明確標為：

- Browser QA: Limited / Not fully executed

不可在沒有截圖證據的情況下宣稱「完整 Browser QA PASS」。

## 4. 自動化驗證命令

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

在 repo root 執行：

```powershell
git diff origin/main...HEAD -- firestore.rules
git diff origin/main...HEAD -- frontend/src/core/calculationEngine.ts
git diff origin/main...HEAD -- frontend/src/App.tsx
git diff origin/main...HEAD -- frontend/src/i18n/zhTW.ts
git diff origin/main...HEAD -- frontend/src/i18n/en.ts
git status --short
```

如需檢查是否仍有不該裸露在頂欄的文字，可使用：

```powershell
rg "ABF CSS|v1\.54\.0|owner|UID|More|更多|logout|登出|ABF20260523" frontend/src/App.tsx frontend/src/i18n
```

請注意：命中本身不是錯，要判斷是否位於 user menu/dropdown，而不是頂欄常駐區。

## 5. 驗收結論格式

請在報告中給出：

1. 最終結論：
   - Pass / Conditional Pass / Fail
2. 是否可 merge main
3. 是否可 deploy
4. 是否需要 v1.54.2
5. P0 / P1 / P2 問題清單
6. Brand / Version 驗收結果
7. User menu 收納驗收結果
8. 主導航與 `更多 / More` 驗收結果
9. 語言與幣別驗收結果
10. Browser QA 是否真實執行
11. test / lint / build 結果
12. 紅線檔案檢查結果
13. Git branch / commit / push 狀態

## 6. 判定標準

### Pass

符合全部核心需求，且 test/lint/build 通過。若 Browser QA 因環境受限未截圖，但源碼結構清楚、構建通過，可列為 Pass with Browser QA limitation 或 Conditional Pass。

### Conditional Pass

功能已完成，但存在非阻塞問題，例如：

- 沒有 authenticated screenshot
- mobile 只做源碼審計
- `更多 / More` 文案或 spacing 有小瑕疵

### Fail

任一情況應判 Fail：

- `ABF CSS` 沒有出現
- `v1.54.0` 被移除
- workspace / owner / UID 仍裸露在頂欄
- user menu 無法使用
- 主導航入口消失
- test/lint/build 失敗
- 修改了紅線檔案

