# 工作區協作 (Workspace Collaboration) 使用手冊

## 頁面用途

工作區協作功能允許多個 Google 帳號共用同一份 ABF 資料集，實現團隊協作。資料儲存於共用工作區，而非個人空間。

## 使用者角色

| 角色 | 權限 | 說明 |
|------|------|------|
| Owner | 完整權限 | 可管理成員、編輯資料、刪除工作區 |
| Editor | 編輯權限 | 可新增/編輯/刪除資料，無法管理成員 |
| Viewer | 唯讀權限 | 僅能檢視資料，無法修改 |

## 基本操作流程

### 1. 建立工作區

1. 在 Header 點擊 Workspace Switcher
2. 選擇「+ Create Workspace」
3. 輸入工作區名稱
4. 系統自動從個人資料複製一份到工作區
5. 成為該工作區的 Owner

### 2. 邀請成員

1. 進入 Parameters 頁面
2. 找到「Workspace Settings」區塊
3. 點擊「Add Member」
4. 輸入對方的 Firebase UID（不是 Email）
5. 選擇角色（Editor/Viewer）
6. 點擊確認

**取得 UID 的方式**：
- 對方登入後，在 Header 可看到自己的 UID
- 點擊 UID 可複製

### 3. 切換工作區

1. 在 Header 點擊 Workspace Switcher
2. 選擇「Personal」（個人空間）或已加入的工作區
3. 所有頁面資料自動切換

### 4. 移除成員

1. 進入 Parameters 頁面
2. 在 Workspace Settings 區塊找到成員列表
3. 點擊該成員的「Remove」按鈕
4. 確認移除

### 5. 變更成員角色

1. 在成員列表中找到目標成員
2. 點擊角色下拉選單
3. 選擇新角色
4. 變更即時生效

## 資料儲存路徑

| 空間類型 | Firestore 路徑 |
|----------|---------------|
| Personal | `users/{userId}/projects/{projectId}/...` |
| Workspace | `workspaces/{workspaceId}/projects/{projectId}/...` |

## 常見錯誤

| 錯誤訊息 | 原因 | 解決方式 |
|----------|------|----------|
| UID not found | UID 格式錯誤 | 確認 UID 不含 @ 符號 |
| Permission denied | 無權限執行操作 | 確認角色權限 |
| Already a member | 成員已存在 | 無需重複加入 |

## 權限矩陣

| 操作 | Owner | Editor | Viewer |
|------|-------|--------|--------|
| 查看資料 | ✅ | ✅ | ✅ |
| 新增/編輯/刪除資料 | ✅ | ✅ | ❌ |
| 新增成員 | ✅ | ❌ | ❌ |
| 移除成員 | ✅ | ❌ | ❌ |
| 變更角色 | ✅ | ❌ | ❌ |
| 刪除工作區 | ✅ | ❌ | ❌ |

## 與其他頁面的資料聯動

所有頁面的資料讀寫都依據當前選擇的工作區：

| 頁面 | 聯動方式 |
|------|----------|
| Products | 讀寫當前工作區的 SKU |
| Forecasts | 讀寫當前工作區的預測 |
| Capacity | 讀寫當前工作區的產能 |
| BP Targets | 讀寫當前工作區的 BP 目標 |
| Dashboard | 顯示當前工作區的分析 |
| Results | 顯示當前工作區的結果 |

## 安全注意事項

- 邀請使用 UID，不是 Email（無法用 Email 邀請）
- Owner 無法將自己降級或移除自己
- Viewer 無法自我提升權限
- 刪除工作區會永久刪除所有資料

## 不該做什麼

- ❌ 不要將 UID 分享給不信任的人
- ❌ 不要在多人同時編輯時假設資料一致性
- ❌ 不要將工作區當作備份（應使用 Snapshot）
- ❌ 不要給予不信任的人 Owner 權限

## 個人資料 vs 工作區資料

| 項目 | Personal | Workspace |
|------|----------|-----------|
| 可見性 | 僅自己 | 所有成員 |
| 建立 Snapshot | ✅ | ✅ |
| Demo Data | ✅ | ❌（Viewer 無法載入） |
| 權限管理 | N/A | Owner 專屬 |

## 相關頁面

- [Parameters](#) — Workspace Settings 設定
- [WORKSPACE_COLLABORATION.md](../WORKSPACE_COLLABORATION.md) — 技術文件
- [WORKSPACE_SMOKE_TEST.md](../WORKSPACE_SMOKE_TEST.md) — 測試檢查清單
