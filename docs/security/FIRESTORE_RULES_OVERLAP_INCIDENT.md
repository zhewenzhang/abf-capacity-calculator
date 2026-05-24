# Firestore Rules Overlap Incident (v1.22.1)

本文檔記錄 v1.22.1 中發現的 Firestore Rules Overlap 問題，作為 incident learning 供未來開發參考。

---

## 1. 事件摘要

| 項目 | 內容 |
|------|------|
| 發現時間 | v1.22.1 部署後 |
| 影響版本 | v1.22.1 |
| 影響範圍 | Snapshot 權限控制 |
| 問題類型 | Firestore Rules Overlap |
| 根本原因 | 遞迴規則覆蓋專用規則的限制 |
| 修復版本 | v1.22.2 |

---

## 2. v1.22.1 原本想修什麼

### 預期目標

v1.22.1 的目標是「harden snapshot permissions」，具體包括：

1. **Personal Snapshots**
   - 只有本人可 read/create/delete
   - 禁止 update（immutable）
   - Create 時驗證 createdBy == auth.uid

2. **Workspace Snapshots**
   - Members 可 read
   - Owner/Editor 可 create（createdBy == auth.uid）
   - Owner 可 delete 任意
   - Editor 只能 delete 自己的
   - Viewer 不可 create/delete
   - 禁止 update（immutable）

### 添加的規則

```firestore
// Personal snapshots
match /users/{uid}/projects/{projectId}/snapshots/{snapshotId} {
  allow read: if isSelf(uid);
  allow create: if isSelf(uid)
    && request.resource.data.createdBy == request.auth.uid;
  allow delete: if isSelf(uid);
  allow update: if false;  // Immutable
}

// Workspace snapshots
match /workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId} {
  allow read: if isMember(workspaceId);
  allow create: if isMember(workspaceId)
    && (memberRole(workspaceId) == 'owner' || memberRole(workspaceId) == 'editor')
    && request.resource.data.createdBy == request.auth.uid;
  allow delete: if isMember(workspaceId) && (
    memberRole(workspaceId) == 'owner'
    || (memberRole(workspaceId) == 'editor' && resource.data.createdBy == request.auth.uid)
  );
  allow update: if false;  // Immutable
}
```

---

## 3. 真正遺漏的是什麼

### 遺漏的問題：現有遞迴規則

規則檔案中已存在以下遞迴規則：

```firestore
// Personal data - 遞迴匹配所有 users/{uid}/** 路徑
match /users/{uid}/{document=**} {
  allow read, write: if isSelf(uid);
}

// Workspace business data - 遞迴匹配所有 projects 下的路徑
match /workspaces/{workspaceId}/projects/{projectId}/{document=**} {
  allow read: if isMember(workspaceId);
  allow write: if canWriteBusiness(workspaceId);
}
```

### 重疊問題

對於路徑 `users/alice/projects/p1/snapshots/s1`：

| 規則 | 匹配 | 條件 |
|------|------|------|
| `match /users/{uid}/{document=**}` | ✅ 匹配 | `isSelf(uid)` → 允許 write（包含 update） |
| `match /users/{uid}/projects/{projectId}/snapshots/{snapshotId}` | ✅ 匹配 | `allow update: if false` |

**Firestore 語義**：只要任一規則允許，操作就被允許。

**結果**：遞迴規則的 `allow write` 覆蓋了專用規則的 `allow update: if false`。

### 實際影響

| 操作 | 預期 | 實際 | 原因 |
|------|------|------|------|
| Personal snapshot update | DENY | ALLOW | 遞迴規則允許 write |
| Workspace snapshot update (editor) | DENY | ALLOW | 遞迴規則的 canWriteBusiness 允許 |
| Workspace snapshot delete (editor delete others) | DENY | ALLOW | 遞迴規則的 write 允許 |

---

## 4. 為什麼測試沒抓到

### 4.1 前端代碼層的權限檢查

`snapshotService.ts` 中已有權限檢查：

```typescript
// deleteSnapshot 中的檢查
if (scope.role === 'editor' && createdBy !== scope.userId) {
  throw new Error('Editors can only delete their own snapshots.');
}
```

這導致開發者誤以為權限控制正常運作，因為前端阻止了非法操作。

### 4.2 沒有 Firestore Rules 層級的測試

測試策略缺失：

1. **前端單元測試**：只測試了 service 層的邏輯，沒有測試 Firestore 規則
2. **沒有 Emulator 測試**：沒有使用 Firebase Emulator 測試規則
3. **沒有 Overlap 測試**：沒有專門測試遞迴規則是否會繞過專用規則

### 4.3 部署驗證不足

部署後只確認了：
- ✅ Rules compiled successfully
- ✅ Deploy complete

沒有驗證：
- ❌ 規則是否按預期運作
- ❌ 是否存在 overlap 問題

---

## 5. Firestore Rules 語義教訓

### 教訓一：順序無效

**錯誤認知**：以為後面的規則會覆蓋前面的。

**事實**：Firestore Rules 沒有「後覆前」的語義。所有匹配的規則並行評估，任一允許即通過。

### 教訓二：write 是萬能鑰匙

**錯誤認知**：以為 `allow update: if false` 可以禁止 update。

**事實**：`write` = `create` + `update` + `delete`。如果另一個規則 `allow write`，則 update、delete 都被允許。

### 教訓三：{document=**} 是黑洞

**錯誤認知**：以為可以在遞迴規則後添加例外。

**事實**：`{document=**}` 會匹配所有後代路徑。要排除特定集合，必須在遞迴規則本身添加條件。

---

## 6. 後續防止再發生的流程

### 6.1 新增規則時必須做的事

1. **列出所有匹配規則**：對目標路徑，列出所有會匹配的 match 區塊
2. **分析每個規則的影響**：檢查每個規則允許什麼操作
3. **確認沒有繞過**：確認沒有規則會繞過預期的限制

### 6.2 必須建立的測試

1. **Overlap 測試**：專門測試遞迴規則是否會繞過專用規則
2. **Immutable 測試**：確認 update 被完全禁止
3. **所有權測試**：確認 Editor 不能刪除他人的資源

### 6.3 文檔化要求

每次修改規則時，必須更新：
- 規則審查文檔（FIRESTORE_RULES_REVIEW_GUIDE.md）
- 測試計劃（FIRESTORE_RULES_TEST_PLAN.md）
- 變更記錄（本文件的後續版本）

---

## 7. 對 CC 任務 Prompt 的改進

### 原始 Prompt 的問題

原始 prompt 只要求「添加專用規則」，沒有明確要求：
- 檢查現有遞迴規則
- 分析 overlap 問題
- 驗證規則是否真正生效

### 改進建議

在未來的 CC 任務 prompt 中，應該加入：

```text
## Firestore Rules 修改要求

當你需要修改或新增 Firestore Rules 時：

⚠️ **重要**：Firestore Rules 對同一路徑是任一匹配 allow 即允許，不是按順序覆蓋。

請執行以下步驟：

1. **列出目標路徑會匹配的所有 match block**
   - 搜尋所有 `{document=**}` 遞迴規則
   - 確認是否有其他規則會匹配目標路徑

2. **分析每個匹配規則的影響**
   - 對每個匹配規則，寫出它允許的操作
   - 檢查是否有規則會繞過你想要的限制

3. **證明沒有繞過**
   - 明確說明為什麼你的限制不會被其他規則繞過
   - 如果需要修改現有規則，請說明

4. **測試驗證**
   - 使用 Firebase Emulator 測試關鍵場景
   - 特別測試「應該被拒絕」的操作
```

---

## 8. 對 AGY Review Prompt 的改進

### Review 時應該檢查的項目

```text
## Firestore Rules Review Checklist

當 Review Firestore Rules 修改時，請確認：

### 1. Overlap 檢查
- [ ] 是否列出了目標路徑會匹配的所有 match block？
- [ ] 是否確認沒有遞迴規則會繞過新增的限制？
- [ ] 是否確認 `allow update: if false` 不會被 `allow write` 繞過？

### 2. 語義檢查
- [ ] 是否理解 Firestore Rules 的「任一允許即通過」語義？
- [ ] 是否確認 `write` 不會意外允許 update/delete？
- [ ] 是否確認專用規則不是「寫心安的」而是真正生效？

### 3. 測試檢查
- [ ] 是否有對應的 Firestore Rules 測試？
- [ ] 是否測試了「應該被拒絕」的操作？
- [ ] 是否使用 Firebase Emulator 測試？

### 4. 部署檢查
- [ ] 部署後是否驗證規則實際運作？
- [ ] 是否測試了 overlap 場景？
```

---

## 9. 本次事件的正面收穫

1. **發現了流程缺口**：暴露了缺乏 Firestore Rules 層級測試的問題
2. **加深了理解**：團隊對 Firestore Rules 語義有了更深入的理解
3. **建立了規範**：本事件催生了完整的治理文檔和測試計劃
4. **改進了流程**：未來的規則修改將有明確的檢查清單

---

## 10. 參考資料

- [Firestore Security Rules 結構](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Rules Conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Testing Security Rules](https://firebase.google.com/docs/rules/unit-tests)

---

## 版本記錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| 1.0 | 2026-05-24 | 初始版本，記錄 v1.22.1 事件 |
