# v1.54.2 Workspace Invite Permission Fix — 命令日誌

## 1. 是否已建立並更新命令日誌
✅ 已建立並更新本日誌。

## 2. 根因是否確認
✅ 根因已確認。

### 根因分析

`addWorkspaceMember()` 使用單一 `writeBatch` 同時執行：
1. `batch.update(workspaces/{workspaceId})` — 更新 members map
2. `batch.set(userWorkspaces/{memberUid}/workspaces/{workspaceId})` — 建立 invitee index

但 Firestore security rules 在評估 path (2) 時，執行了：
```
isOwner(workspaceId) → workspaceMembers(workspaceId)[request.auth.uid] == 'owner'
```

這需要 `get(workspaces/{workspaceId})` 來讀取 members map。**同一 batch 中尚未 commit 的寫入對 `get()` 不可見**，所以 rules 讀到的是舊的 members map。

對於「owner 邀請成員」的規則（path 2），還檢查了：
```
request.resource.data.role == workspaceMembers(workspaceId)[uid]
```

因為 invitee 尚未在舊 members map 中，`members[uid]` 為 `undefined`，導致 `role == undefined` 為 false → **permission denied**。

這與 `firestore.rules` 頂部的註解完全一致（第 29-33 行）：
> The two-write split exists because the index-entry rule needs `get(workspaces/{wid})` to see a committed doc; a single batch would deny because same-batch writes are NOT visible to get()/exists() during rule evaluation.

## 3. 是否修改 firestore.rules
**❌ 未修改 `firestore.rules`。** 本問題完全在 client write sequencing 層面修復，不需要放寬規則。

## 4. addWorkspaceMember() 如何修復

**修復前**：單一 `writeBatch` 同時寫 workspace + index → 被 rules 拒絕。

**修復後**：sequential writes：
1. `await updateDoc(wsRef, { members, updatedAt })` — 先提交 workspace members 更新
2. `await setDoc(indexRef, payload, { merge: true })` — commit 後再寫 invitee index

使用 `setDoc(..., { merge: true })` 而非 `setDoc(...)` 的好處：
- 新邀請：建立 index
- 修復半完成狀態：workspace.members 已有該 UID 但 index 缺失時可補建

如果 step 2 失敗，拋出結構化錯誤（含 "members updated but the index" 字樣），讓 UI 可以顯示友善訊息。

## 5. updateWorkspaceMemberRole() 是否也修復
✅ 同樣修復。原程式碼也使用 `writeBatch` 同時更新 workspace members role 和 index role，存在相同的 same-batch rules 競爭問題。

**修復後**：
1. `await updateDoc(wsRef, { members, updatedAt })` — 先提交 role 變更
2. `await setDoc(indexRef, { role, updatedAt }, { merge: true })` — commit 後再更新 index

## 6. 新增/修改哪些測試

### workspaceService.test.ts（修改）
- `addWorkspaceMember` 測試改為驗證 sequential writes（`updateDoc` 在 `setDoc` 之前，不使用 batch）
- 新增：`addWorkspaceMember` 使用 sequential writes 避免 same-batch rules 競爭
- 新增：`addWorkspaceMember` 在 index 寫入失敗時拋出結構化錯誤
- 新增：`updateWorkspaceMemberRole` 使用 sequential writes
- 新增：`updateWorkspaceMemberRole` 使用 `setDoc(..., { merge: true })`

### firestoreRules.test.ts（修改）
- 新增：same-batch invite 被 rules 拒絕（members map 尚未 commit）
- 新增：sequential invite 通過（members map 已 commit）
- 新增：sequential invite with viewer role 通過
- 新增：editor 不能邀請新成員
- 新增：viewer 不能邀請新成員
- 新增：invitee 不能自我升級 role

### 測試數量
- 修復前：1472 tests
- 修復後：1481 tests（+9）

## 7. test / lint / build 結果

| 檢查 | 結果 |
|------|------|
| `npm run test` | ✅ 59 files, 1481 tests passed |
| `npm run lint -- --quiet` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ built in 1.45s |

## 8. Firestore rules / emulator 驗證結果

本專案未使用 Firestore emulator，而是使用 `firestoreRules.test.ts` 中的 TypeScript predicate mirror 來驗證 rules 邏輯。

驗證結果：
- ✅ 同 batch invite 場景：rules 讀到舊 members map → 拒絕（模擬根因）
- ✅ sequential invite 場景：rules 讀到已 commit 的 members map → 通過（模擬修復）
- ✅ editor 不能邀請
- ✅ viewer 不能邀請
- ✅ invitee 不能自我升級

## 9. 是否手動驗證成功加入成員
❌ 無已認證的登入態，無法手動驗證。已部署至 Firebase，可在生產環境測試。

## 10. Commit hash、branch、push 狀態

- **Branch**: `xiaomi/v1-54-2-workspace-invite-permission-fix`
- **Commit**: 待提交
- **Push**: 待推送

## 11. 是否可交 AGY 驗收

**可交驗收。** 理由：
- ✅ 根因確認（same-batch rules 競爭）
- ✅ 未修改 firestore.rules
- ✅ 未修改 calculationEngine.ts
- ✅ addWorkspaceMember() 改為 sequential writes + merge:true
- ✅ updateWorkspaceMemberRole() 同步修復
- ✅ 9 個新測試全通過
- ✅ test/lint/build 全通過
- ✅ 已部署至 Firebase
- 建議在生產環境用 owner 帳號邀請一個已存在的 Google UID 來驗證
