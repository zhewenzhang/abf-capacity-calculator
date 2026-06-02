# v1.54.2 Workspace Invite Permission Fix Command

## 0. 問題背景

使用者在「參數設定 → 協作空間設定」中輸入同事 Google UID，選擇角色後點擊「加入成員」，畫面出現：

```text
Missing or insufficient permissions.
```

截圖顯示：

- 目前使用者是 workspace owner
- Workspace: `ABF20260523`
- 邀請方式為 Google UID
- 輸入 UID 後點擊加入成員
- Firestore 回傳權限不足

## 1. 初步根因判斷

目前 `frontend/src/services/workspaceService.ts` 的 `addWorkspaceMember()` 使用單一 batch 同時執行：

1. `workspaces/{workspaceId}` update：把新 UID 加入 `members`
2. `userWorkspaces/{inviteeUid}/workspaces/{workspaceId}` set：建立對方的 workspace index

但 `firestore.rules` 中，owner invite member 的 index 寫入規則要求：

```text
request.resource.data.role == workspaceMembers(workspaceId)[uid]
```

Firestore security rules 在同一個 batch 中執行 `get(workspaces/{workspaceId})` 時，看不到同 batch 內尚未 commit 的 workspace update，因此第二筆 `userWorkspaces` 寫入讀到的是舊的 members map，沒有新 invitee UID，導致 permission denied。

這與 rules 檔案頂部已有註解一致：需要先提交 workspace doc，再寫 dependent index entry。

## 2. 任務目標

修復協作空間邀請成員時的權限錯誤，讓 workspace owner 可以用 Google UID 成功加入 editor / viewer 成員。

本次不是 UI 重構，不是權限模型重寫，不是 email invite。

## 3. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_2_WORKSPACE_INVITE_PERMISSION_FIX_COMMAND_LOG.md`
3. 不得修改核心計算：
   - `frontend/src/core/calculationEngine.ts`
4. 原則上不得修改 `firestore.rules`。
   - 本問題預期應在 client write sequencing 修復。
   - 若你認為必須改 rules，必須先在命令日誌中寫出證據，停止並回報，不得直接放寬規則。
5. 不得引入 Cloud Function 來繞過本問題。
6. 不得新增 API key / secret。
7. 不得破壞 Viewer read-only、owner/editor/viewer 現有語義。

## 4. 必查文件

請先閱讀：

- `firestore.rules`
- `frontend/src/services/workspaceService.ts`
- `frontend/src/services/workspaceService.test.ts`
- `frontend/src/services/firestoreRules.test.ts`
- `frontend/src/components/workspace/WorkspaceSettingsPanel.tsx`
- `frontend/src/context/WorkspaceContext.tsx`

## 5. 必做修復

### 5.1 修復 `addWorkspaceMember()`

將目前的同 batch 寫入改為 sequential writes：

1. 讀取 workspace doc
2. 建立新的 `members` map
3. 先提交 `workspaces/{workspaceId}` update
4. 等待 update 成功
5. 再寫入 `userWorkspaces/{memberUid}/workspaces/{workspaceId}` index

建議使用：

- `updateDoc(wsRef, { members, updatedAt: serverTimestamp() })`
- `setDoc(userWorkspaceRef, payload, { merge: true })`

`setDoc(..., { merge: true })` 可支援：

- 新邀請：建立 index
- 修復半完成狀態：workspace.members 已有該 UID，但 index 缺失時可補建

### 5.2 修復 `updateWorkspaceMemberRole()`

目前它也使用 batch：

1. 更新 workspace members role
2. 更新 userWorkspaces index role

這同樣可能因 rules 讀到舊 workspace role 而拒絕。

請改為：

1. 先 update workspace members role
2. commit 後再 set/update userWorkspaces index role
3. 建議使用 `setDoc(..., { merge: true })` 來修復 index 缺失狀態

### 5.3 `removeWorkspaceMember()` 暫不擴大

`removeWorkspaceMember()` 如果現有測試與 rules 通過，可以不改。

若調查發現同 batch remove 也有 rules 邊界問題，必須先寫入命令日誌說明，再做最小修復。

## 6. 測試要求

### 6.1 Service unit tests

更新或新增 `frontend/src/services/workspaceService.test.ts`：

1. `addWorkspaceMember` 不再使用單一 batch 同時寫 workspace + index
2. `addWorkspaceMember` 先 update workspace，再 set invitee index
3. `addWorkspaceMember` 使用 `setDoc(..., { merge: true })` 支援 index repair
4. `updateWorkspaceMemberRole` 先 update workspace role，再 set/update invitee index
5. `owner` role 仍不可透過 add/update 授予

### 6.2 Firestore rules / emulator tests

更新或新增 `frontend/src/services/firestoreRules.test.ts`：

1. 證明「同 batch invite」會被 rules 拒絕，或至少用註解保留該規則限制。
2. 證明「sequential invite」會通過：
   - owner 先 update workspace.members[invitee] = editor/viewer
   - owner 再 set userWorkspaces invitee index
3. editor 仍不能邀請新成員。
4. viewer 仍不能邀請新成員。
5. invitee 不能自我升級 role。

### 6.3 UI / integration behavior

在 `WorkspaceSettingsPanel` 或相關測試中確認：

1. owner 加入合法 UID 時不再顯示 raw `Missing or insufficient permissions`
2. 成功後表單 reset
3. 成員表格能顯示新成員
4. 失敗時應顯示更友善訊息，例如：
   - 繁中：`加入成員失敗，請確認 UID 正確且您是協作空間擁有者。`
   - 英文：`Could not add member. Confirm the UID is correct and you are the workspace owner.`

## 7. 手動驗證步驟

若有登入態，請執行：

1. 用 owner 帳號登入
2. 進入 `參數設定 → 協作空間設定`
3. 輸入另一個已登入過本系統的 Google UID
4. 選擇 `editor`
5. 點擊加入成員
6. 預期：
   - 不再出現 `Missing or insufficient permissions`
   - 成員表格新增該 UID
   - 對方重新整理後可看到 workspace

若無第二帳號或登入態，請至少用 Firestore emulator / unit test 證明 sequential write 通過。

## 8. 驗證命令

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

如果專案有 Firestore rules test 的單獨命令，請執行該命令並記錄。

在 repo root 執行：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
git status --short
```

## 9. Git 要求

1. 建議分支：
   - `xiaomi/v1-54-2-workspace-invite-permission-fix`
2. Commit message：
   - `fix: repair workspace invite permission flow v1.54.2`
3. Push：
   - `origin/xiaomi/v1-54-2-workspace-invite-permission-fix`

## 10. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. 根因是否確認。
3. 是否修改 `firestore.rules`，如果沒有，請明確說明。
4. `addWorkspaceMember()` 如何修復。
5. `updateWorkspaceMemberRole()` 是否也修復。
6. 新增/修改哪些測試。
7. test / lint / build 結果。
8. Firestore rules / emulator 驗證結果。
9. 是否手動驗證成功加入成員。
10. Commit hash、branch、push 狀態。
11. 是否可交 AGY 驗收。

