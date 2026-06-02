# v1.54.1 Topbar User Menu Cleanup — 命令日誌

## 1. 是否已讀取並更新命令日誌
✅ 已讀取 `V1_54_1_TOPBAR_USER_MENU_CLEANUP_COMMAND.md` 並持續更新本日誌。

## 2. 修改了哪些檔案

| 檔案 | 修改內容 |
|------|---------|
| `frontend/src/App.tsx` | 重寫 TopNav：品牌改 ABF CSS、導航分流（7 主項 + 更多 dropdown）、user menu dropdown、語言/幣別緊湊化 |
| `frontend/src/i18n/zhTW.ts` | 新增 `common.more: '更多'` |
| `frontend/src/i18n/en.ts` | 新增 `common.more: 'More'` |

## 3. Brand 是否已改為 ABF CSS
✅ 左上角品牌文字已改為 `ABF CSS`。

## 4. v1.54.0 是否仍保留在頂部導航欄
✅ 版本標籤 `v1.54.0` 仍顯示在品牌右側，以小 pill 呈現。

## 5. 哪些資訊已移入 user menu

以下資訊從頂欄主視覺區移入右側 user menu dropdown：

| 資訊 | 處理方式 |
|------|---------|
| Workspace / Data selector | 移入 user menu（使用 WorkspaceSwitcher 組件） |
| Role（owner/editor/viewer） | 移入 user menu，帶顏色 badge |
| UID | 移入 user menu，顯示前 8 字元 + 複製按鈕 |
| Email | 移入 user menu 頂部顯示 |
| Logout | 移入 user menu 底部，紅色危險操作 |

**User menu 觸發器**：Avatar 圖示 + email 帳號名稱（@ 前部分），點擊展開 dropdown。

## 6. 語言與幣別是否保留在頂欄
✅ 語言與幣別保留在頂部右側，但改為更緊湊的格式：
- 語言：`EN` / `繁`（壓縮文字）
- 幣別：`$` / `NT` / `¥`（使用符號）

不再擠壓主導航空間。

## 7. 主導航整理

### 高頻入口（常駐顯示，共 7 項）
- 營運工作台
- 儀表板
- 產品
- 預測
- 產能規劃
- 計算結果
- AI 助手

### 低頻入口（收納至「更多」dropdown，共 6 項）
- 參數設定
- BP 目標
- 情境規劃
- 產品試算表
- 預測試算表
- 產能試算表

若「更多」中有當前頁面，按鈕會顯示 active 樣式。

## 8. 截圖路徑
**❌ 無法截圖 — 缺少已認證的瀏覽器登入態**

應產出：
- `docs/qa/screenshots/v1-54-1/topbar-desktop.png`
- `docs/qa/screenshots/v1-54-1/topbar-user-menu-open.png`
- `docs/qa/screenshots/v1-54-1/topbar-mobile-375.png`

原因：無已認證的瀏覽器會話，無法訪問業務頁面截圖。

## 9. test / lint / build 結果

| 檢查 | 結果 |
|------|------|
| `npm run test` | ✅ 59 files, 1472 tests passed |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.28s |

## 10. 紅線檔案是否未修改

| 檔案 | 狀態 |
|------|------|
| `firestore.rules` | ✅ 未修改 |
| `frontend/src/core/calculationEngine.ts` | ✅ 未修改 |

## 11. Commit hash、branch、push 狀態

- **Branch**: `xiaomi/v1-54-1-topbar-user-menu-cleanup`
- **Commit**: 待提交（代碼已完成，正在執行最終步驟）
- **Push**: 待推送

## 12. 是否可交 AGY 驗收

**代碼層面可交驗收**，但截圖被阻斷：
- ✅ 品牌改為 ABF CSS
- ✅ v1.54.0 保留
- ✅ workspace/role/UID/email/logout 收入 user menu
- ✅ 語言幣別保留但緊湊化
- ✅ 導航分流（7 主項 + 更多 dropdown）
- ✅ test/lint/build 全通過
- ❌ 缺少截圖（需已認證瀏覽器登入態）

**需要提供已認證瀏覽器登入態後補充截圖，方可完全驗收。**
