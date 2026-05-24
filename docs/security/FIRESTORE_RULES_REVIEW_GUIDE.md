# Firestore Security Rules Review Guide

本文檔是 ABF Capacity Calculator 專案的 Firestore Rules 安全審查指南，旨在防止規則重疊（overlap）導致的權限繞過問題。

---

## 1. Firestore Rules 核心語義

### ⚠️ 關鍵原則：任一匹配即允許

**Firestore Rules 不是按順序覆蓋的！**

當一個路徑匹配多個 `match` 區塊時，**只要任一區塊的條件滿足 `allow`，該操作就會被允許**。這與大多數程式語言的「後面覆蓋前面」邏輯完全不同。

### 錯誤理解 ❌

```firestore
// 通用規則
match /users/{uid}/{document=**} {
  allow write: if isSelf(uid);  // 允許所有寫入
}

// 專用規則（以為會覆蓋上面的 write）
match /users/{uid}/projects/{projectId}/snapshots/{snapshotId} {
  allow update: if false;  // 企圖禁止 update
}
```

開發者可能誤以為專用規則會「覆蓋」通用規則，實際上 **兩個規則都生效**。

### 正確理解 ✅

對於路徑 `users/abc123/projects/proj1/snapshots/snap1`：

1. 匹配 `match /users/{uid}/{document=**}` → `allow write: if isSelf(uid)`
2. 同時匹配 `match /users/{uid}/projects/{projectId}/snapshots/{snapshotId}` → `allow update: if false`

**結果**：由於第一個規則允許 `write`（包含 update），所以 **update 仍然被允許**。

---

## 2. `{document=**}` 遞迴規則的風險

### 遞迴匹配的危險

`{document=**}` 會匹配該路徑下的**所有文檔和子集合**，包括：

- 直接子文檔
- 嵌套子集合中的文檔
- 任意深度的所有後代

### 本專案的危險模式

```firestore
// 危險：匹配所有 personal 路徑，包括 snapshots
match /users/{uid}/{document=**} {
  allow read, write: if isSelf(uid);
}

// 危險：匹配所有 workspace business data，包括 snapshots
match /workspaces/{workspaceId}/projects/{projectId}/{document=**} {
  allow read: if isMember(workspaceId);
  allow write: if canWriteBusiness(workspaceId);
}
```

這些規則會「吞沒」後續的專用規則，導致：

| 路徑 | 匹配的規則 | 預期行為 | 實際行為 |
|------|-----------|----------|----------|
| `users/{uid}/projects/{pid}/snapshots/{sid}` | 通用 + 專用 | 禁止 update | **允許 update** |
| `workspaces/{wid}/projects/{pid}/snapshots/{sid}` | 通用 + 專用 | Editor 只能刪除自己的 | **Editor 可刪除任何人的** |

---

## 3. 如何判斷路徑會匹配哪些規則

### 步驟一：列出所有 match 區塊

對於目標路徑，檢查規則檔案中的**所有** `match` 區塊。

### 步驟二：判斷每個 match 是否匹配

| match 模式 | 匹配條件 |
|-----------|---------|
| `/users/{uid}/{document=**}` | 匹配所有 `users/` 下的路徑 |
| `/users/{uid}/projects/{projectId}/snapshots/{snapshotId}` | 只匹配 snapshots 集合 |
| `/workspaces/{workspaceId}/projects/{projectId}/{document=**}` | 匹配所有 projects 下的路徑 |

### 步驟三：對每個匹配的規則，評估其 allow 條件

**關鍵**：`write` 是 `create` + `update` + `delete` 的簡寫。

如果一個規則 `allow write`，它會覆蓋所有三種操作的單獨限制。

### 步驟四：確認沒有「繞過」

如果任何一個匹配規則允許了你不想要允許的操作，則存在漏洞。

---

## 4. 專用安全集合的審查方式

### Snapshots 的特殊需求

Snapshots 必須滿足：

1. **Immutable**：禁止 update
2. **所有權限制**：Editor 只能刪除自己的
3. **Create 驗證**：createdBy 必須等於 auth.uid

### 如何保護專用集合

**方法一：排除專用集合（推薦）**

將通用的遞迴規則修改為不匹配 snapshots：

```firestore
// 方案 A：使用更精確的路徑
match /users/{uid}/projects/{projectId}/{collectionName} {
  allow read, write: if isSelf(uid) 
    && collectionName != 'snapshots';  // 排除 snapshots
}

// 方案 B：明確列出允許的集合
match /users/{uid}/projects/{projectId}/skus/{skuId} {
  allow read, write: if isSelf(uid);
}
match /users/{uid}/projects/{projectId}/forecasts/{forecastId} {
  allow read, write: if isSelf(uid);
}
// 不使用 {document=**}
```

**方法二：移除遞迴規則**

將 `{document=**}` 改為明確的集合路徑。

---

## 5. Personal Path 與 Workspace Path 的差異

### Personal Path

```
users/{uid}/projects/{projectId}/snapshots/{snapshotId}
```

**特點**：
- 只有 `uid` 本人可以訪問
- 不涉及角色區分（沒有 owner/editor/viewer）

### Workspace Path

```
workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId}
```

**特點**：
- 需要檢查 workspace 成員身份
- 需要區分 owner/editor/viewer 角色
- 需要檢查資源的所有權（createdBy）

---

## 6. Owner / Editor / Viewer 權限審查矩陣

| 操作 | Owner | Editor | Viewer | 審查重點 |
|------|-------|--------|--------|----------|
| **Read** | ✅ | ✅ | ✅ | 必須是 workspace member |
| **Create** | ✅ | ✅ | ❌ | `createdBy == auth.uid` |
| **Update** | ❌ | ❌ | ❌ | **任何人都不允許** |
| **Delete Own** | ✅ | ✅ | ❌ | `createdBy == auth.uid` |
| **Delete Others** | ✅ | ❌ | ❌ | 只有 Owner 可以 |

### 關鍵檢查點

1. **Update 必須完全禁止**：不能有任何規則允許 update
2. **Editor 刪除限制**：必須檢查 `resource.data.createdBy == auth.uid`
3. **Viewer 隔離**：不能有任何規則允許 viewer 寫入

---

## 7. 新增 Firestore Collection 時的 Review Checklist

### 必須回答的問題

1. **路徑是什麼？** 明確寫出完整路徑模式。

2. **會匹配哪些現有規則？** 列出所有匹配的 `match` 區塊。

3. **是否有遞迴規則覆蓋此路徑？** 檢查所有 `{document=**}` 模式。

4. **需要的權限模式是什麼？**
   - 誰可以 read？
   - 誰可以 create？
   - 誰可以 update？
   - 誰可以 delete？

5. **是否有權限衝突？**
   - 遞迴規則是否允許了不該允許的操作？
   - 專用規則是否會被繞過？

6. **是否需要修改現有規則？**
   - 是否需要從遞迴規則中排除此集合？
   - 是否需要添加明確的排除條件？

### 必須執行的驗證

- [ ] 列出所有匹配的 `match` 區塊
- [ ] 對每個匹配區塊，寫出其 allow 條件
- [ ] 確認沒有規則會繞過預期的限制
- [ ] 確認 `allow update: if false` 不會被其他規則覆蓋
- [ ] 確認 delete 的所有權檢查不會被繞過

---

## 8. 常見錯誤模式

### 錯誤一：以為順序有影響

```firestore
// 錯誤認知：以為後面的規則會覆蓋前面的
match /collection/{doc} {
  allow write: if true;  // 允許所有
}

match /collection/{doc} {
  allow update: if false;  // 以為會禁止 update
}
```

**事實**：兩個規則都生效，update 仍然被允許。

### 錯誤二：以為更精確的路徑優先

```firestore
// 錯誤認知：以為精確路徑優先於遞迴路徑
match /users/{uid}/{document=**} {
  allow write: if isSelf(uid);
}

match /users/{uid}/sensitive/{docId} {
  allow write: if false;  // 以為會禁止
}
```

**事實**：兩個規則並行，第一個規則允許寫入。

### 錯誤三：忘記 write 包含 create/update/delete

```firestore
match /collection/{doc} {
  allow write: if isOwner();  // 允許所有寫入
}

match /collection/{doc} {
  allow update: if false;  // 企圖禁止 update
}
```

**事實**：`allow write` 已經允許了 update，`allow update: if false` 被忽略。

---

## 9. 安全修改規則的流程

### Step 1：識別目標路徑

明確寫出要修改或新增的路徑。

### Step 2：搜尋所有匹配

```bash
# 搜尋所有 match 區塊
grep -n "match /" firestore.rules

# 搜尋所有 {document=**} 遞迴規則
grep -n "{document=**}" firestore.rules
```

### Step 3：列出所有匹配的規則

對於目標路徑，列出**所有**會匹配的 `match` 區塊。

### Step 4：分析每個規則的影響

對每個匹配規則，回答：

- 這個規則允許什麼操作？
- 這個規則對誰生效？
- 這個規則是否會繞過我想要的限制？

### Step 5：修改規則

選擇以下方案之一：

1. **從遞迴規則中排除**：添加條件排除目標集合
2. **移除遞迴規則**：改為明確列出每個集合
3. **縮小遞迴範圍**：使用更精確的匹配模式

### Step 6：驗證

使用 Firebase Emulator 或 Firebase Console 模擬器測試關鍵場景。

---

## 10. 給未來開發者的提醒

> **⚠️ 重要警告**
>
> Firestore Rules 不是程式語言，沒有「後面覆蓋前面」的語義。
>
> 當你添加一個新的 `match` 區塊時，請確認：
> 1. 目標路徑會匹配哪些現有規則？
> 2. 現有規則是否會繞過你想要添加的限制？
> 3. 你是否需要修改現有的遞迴規則？
>
> **不要只在規則檔案末尾添加新規則就以為安全了。**

---

## 參考資料

- [Firebase Security Rules 官方文檔](https://firebase.google.com/docs/rules)
- [Firestore Security Rules 結構](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Rules Conditions 官方文檔](https://firebase.google.com/docs/firestore/security/rules-conditions)
