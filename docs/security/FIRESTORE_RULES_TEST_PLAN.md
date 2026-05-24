# Firestore Security Rules Test Plan

本文檔定義了 ABF Capacity Calculator 的 Firestore Security Rules 測試矩陣，用於驗證 Snapshot 權限規則的正確性。

---

## 1. 測試環境

### Firebase Emulator

使用 Firebase Emulator Suite 進行本地測試：

```bash
firebase emulators:start --only firestore
```

### 測試工具

- Firebase Emulator UI: http://localhost:4000
- 或使用 `@firebase/rules-unit-testing` 套件

---

## 2. 測試案例命名規範

```
[路徑類型]_[操作]_[角色]_[預期結果]_[條件]
```

範例：
- `personal_read_self_allow`
- `workspace_delete_editor_deny_notOwn`
- `workspace_update_all_deny_immutable`

---

## 3. Personal Snapshot 測試矩陣

路徑：`users/{uid}/projects/{projectId}/snapshots/{snapshotId}`

### 3.1 Read 測試

| 測試 ID | Actor | Path | Resource State | Request | Expected | Purpose |
|---------|-------|------|----------------|---------|----------|---------|
| PS-R-01 | uid=alice | `users/alice/projects/p1/snapshots/s1` | 存在 | read | **ALLOW** | 本人可讀取自己的 snapshot |
| PS-R-02 | uid=bob | `users/alice/projects/p1/snapshots/s1` | 存在 | read | **DENY** | 他人不可讀取其他人的 snapshot |
| PS-R-03 | 未登入 | `users/alice/projects/p1/snapshots/s1` | 存在 | read | **DENY** | 未登入用戶不可讀取 |

### 3.2 Create 測試

| 測試 ID | Actor | Path | Resource State | Request Data | Expected | Purpose |
|---------|-------|------|----------------|--------------|----------|---------|
| PS-C-01 | uid=alice | `users/alice/projects/p1/snapshots/new` | 不存在 | `{ createdBy: "alice" }` | **ALLOW** | 本人可建立 snapshot，createdBy 正確 |
| PS-C-02 | uid=alice | `users/alice/projects/p1/snapshots/new` | 不存在 | `{ createdBy: "bob" }` | **DENY** | 不可偽造 createdBy 欄位 |
| PS-C-03 | uid=bob | `users/alice/projects/p1/snapshots/new` | 不存在 | `{ createdBy: "bob" }` | **DENY** | 他人不可在其他人的路徑建立 |
| PS-C-04 | 未登入 | `users/alice/projects/p1/snapshots/new` | 不存在 | `{ createdBy: "anonymous" }` | **DENY** | 未登入不可建立 |

### 3.3 Update 測試（Immutable 驗證）

| 測試 ID | Actor | Path | Resource State | Request Data | Expected | Purpose |
|---------|-------|------|----------------|--------------|----------|---------|
| PS-U-01 | uid=alice | `users/alice/projects/p1/snapshots/s1` | `createdBy: "alice"` | `{ name: "new name" }` | **DENY** | 本人不可 update（immutable） |
| PS-U-02 | uid=bob | `users/alice/projects/p1/snapshots/s1` | `createdBy: "alice"` | `{ name: "new name" }` | **DENY** | 他人不可 update |

> **關鍵**：這兩個測試必須驗證遞迴規則 `match /users/{uid}/{document=**}` 不會繞過 `allow update: if false`

### 3.4 Delete 測試

| 測試 ID | Actor | Path | Resource State | Expected | Purpose |
|---------|-------|------|----------------|----------|---------|
| PS-D-01 | uid=alice | `users/alice/projects/p1/snapshots/s1` | `createdBy: "alice"` | **ALLOW** | 本人可刪除自己的 snapshot |
| PS-D-02 | uid=bob | `users/alice/projects/p1/snapshots/s1` | `createdBy: "alice"` | **DENY** | 他人不可刪除其他人的 snapshot |
| PS-D-03 | 未登入 | `users/alice/projects/p1/snapshots/s1` | `createdBy: "alice"` | **DENY** | 未登入不可刪除 |

---

## 4. Workspace Snapshot 測試矩陣

路徑：`workspaces/{workspaceId}/projects/{projectId}/snapshots/{snapshotId}`

### 前置條件

測試需要預先建立：
- Workspace 文檔：`workspaces/ws1`
  - `members: { alice: "owner", bob: "editor", charlie: "viewer" }`
  - `ownerId: "alice"`

### 4.1 Read 測試

| 測試 ID | Actor | Workspace Role | Path | Expected | Purpose |
|---------|-------|----------------|------|----------|---------|
| WS-R-01 | uid=alice | owner | `workspaces/ws1/projects/p1/snapshots/s1` | **ALLOW** | Owner 可讀取 |
| WS-R-02 | uid=bob | editor | `workspaces/ws1/projects/p1/snapshots/s1` | **ALLOW** | Editor 可讀取 |
| WS-R-03 | uid=charlie | viewer | `workspaces/ws1/projects/p1/snapshots/s1` | **ALLOW** | Viewer 可讀取 |
| WS-R-04 | uid=david | non-member | `workspaces/ws1/projects/p1/snapshots/s1` | **DENY** | 非成員不可讀取 |
| WS-R-05 | 未登入 | - | `workspaces/ws1/projects/p1/snapshots/s1` | **DENY** | 未登入不可讀取 |

### 4.2 Create 測試

| 測試 ID | Actor | Workspace Role | Request Data | Expected | Purpose |
|---------|-------|----------------|--------------|----------|---------|
| WS-C-01 | uid=alice | owner | `{ createdBy: "alice" }` | **ALLOW** | Owner 可建立 snapshot |
| WS-C-02 | uid=bob | editor | `{ createdBy: "bob" }` | **ALLOW** | Editor 可建立 snapshot |
| WS-C-03 | uid=bob | editor | `{ createdBy: "alice" }` | **DENY** | Editor 不可偽造 createdBy |
| WS-C-04 | uid=charlie | viewer | `{ createdBy: "charlie" }` | **DENY** | Viewer 不可建立 |
| WS-C-05 | uid=david | non-member | `{ createdBy: "david" }` | **DENY** | 非成員不可建立 |
| WS-C-06 | 未登入 | - | `{ createdBy: "anon" }` | **DENY** | 未登入不可建立 |

### 4.3 Update 測試（Immutable 驗證）

| 測試 ID | Actor | Workspace Role | Resource createdBy | Request | Expected | Purpose |
|---------|-------|----------------|-------------------|---------|----------|---------|
| WS-U-01 | uid=alice | owner | "alice" | `{ name: "new" }` | **DENY** | Owner 不可 update（immutable） |
| WS-U-02 | uid=bob | editor | "bob" | `{ name: "new" }` | **DENY** | Editor 不可 update 自己的 |
| WS-U-03 | uid=bob | editor | "alice" | `{ name: "new" }` | **DENY** | Editor 不可 update 他人的 |
| WS-U-04 | uid=charlie | viewer | "alice" | `{ name: "new" }` | **DENY** | Viewer 不可 update |

> **關鍵**：這些測試必須驗證遞迴規則 `match /workspaces/{workspaceId}/projects/{projectId}/{document=**}` 不會繞過 `allow update: if false`

### 4.4 Delete 測試

| 測試 ID | Actor | Workspace Role | Resource createdBy | Expected | Purpose |
|---------|-------|----------------|-------------------|----------|---------|
| WS-D-01 | uid=alice | owner | "alice" | **ALLOW** | Owner 可刪除自己的 snapshot |
| WS-D-02 | uid=alice | owner | "bob" | **ALLOW** | Owner 可刪除任何人的 snapshot |
| WS-D-03 | uid=bob | editor | "bob" | **ALLOW** | Editor 可刪除自己的 snapshot |
| WS-D-04 | uid=bob | editor | "alice" | **DENY** | Editor 不可刪除他人的 snapshot |
| WS-D-05 | uid=charlie | viewer | "charlie" | **DENY** | Viewer 不可刪除 |
| WS-D-06 | uid=david | non-member | "alice" | **DENY** | 非成員不可刪除 |

---

## 5. Overlap Regression 測試

這些測試專門驗證遞迴規則不會繞過專用規則。

### 5.1 Personal Snapshot Overlap

**問題**：`match /users/{uid}/{document=**}` 是否會允許 snapshot update？

| 測試 ID | Actor | Path | Operation | Expected | Purpose |
|---------|-------|------|-----------|----------|---------|
| PO-PS-01 | uid=alice | `users/alice/projects/p1/snapshots/s1` | update | **DENY** | 遞迴規則不可繞過 immutable |

**驗證方法**：
1. 暫時註解掉專用的 snapshot 規則
2. 執行 update，應該 **ALLOW**（因為遞迴規則）
3. 恢復專用規則
4. 執行 update，應該 **DENY**

如果步驟 4 仍然是 ALLOW，則存在 overlap 問題。

### 5.2 Workspace Snapshot Overlap

**問題**：`match /workspaces/{workspaceId}/projects/{projectId}/{document=**}` 是否會繞過 snapshot 限制？

| 測試 ID | Actor | Role | Path | Operation | Resource createdBy | Expected | Purpose |
|---------|-------|------|------|-----------|-------------------|----------|---------|
| PO-WS-01 | uid=bob | editor | `workspaces/ws1/projects/p1/snapshots/s1` | update | "bob" | **DENY** | 遞迴規則不可繞過 immutable |
| PO-WS-02 | uid=bob | editor | `workspaces/ws1/projects/p1/snapshots/s1` | delete | "alice" | **DENY** | 遞迴規則不可繞過 Editor 刪除限制 |
| PO-WS-03 | uid=charlie | viewer | `workspaces/ws1/projects/p1/snapshots/s1` | create | - | **DENY** | 遞迴規則不可繞過 Viewer 建立限制 |

**驗證方法**：
1. 對於 PO-WS-02，如果 editor 可以刪除他人的 snapshot，說明遞迴規則的 `allow write: if canWriteBusiness()` 繞過了專用規則

---

## 6. 測試執行步驟

### 使用 Firebase Emulator UI

1. 啟動 emulator：`firebase emulators:start --only firestore`
2. 開啟 UI：http://localhost:4000
3. 切換到 Firestore 標籤
4. 使用「Simulator」功能測試每個案例

### 模擬參數

```
Get/Listen:
- Collection ID: snapshots
- Document ID: s1
- Auth Token: { uid: "alice" }

Create:
- Collection ID: snapshots
- Document ID: new
- Auth Token: { uid: "alice" }
- Document Data: { createdBy: "alice" }

Update:
- Collection ID: snapshots
- Document ID: s1
- Auth Token: { uid: "alice" }
- Document Data: { name: "new name" }

Delete:
- Collection ID: snapshots
- Document ID: s1
- Auth Token: { uid: "alice" }
```

---

## 7. 測試報告格式

```markdown
## Firestore Rules 測試報告

日期：YYYY-MM-DD
版本：v1.22.x
執行人：[Name/AI Agent]

### Personal Snapshot

| 測試 ID | 結果 | 備註 |
|---------|------|------|
| PS-R-01 | ✅ PASS | |
| PS-R-02 | ✅ PASS | |
| ... | ... | |

### Workspace Snapshot

| 測試 ID | 結果 | 備註 |
|---------|------|------|
| WS-R-01 | ✅ PASS | |
| WS-R-02 | ✅ PASS | |
| ... | ... | ... |

### Overlap Regression

| 測試 ID | 結果 | 備註 |
|---------|------|------|
| PO-PS-01 | ✅ PASS | |
| PO-WS-01 | ❌ FAIL | 遞迴規則繞過了 immutable |

### 問題總結

[描述發現的問題]

### 建議

[修復建議]
```

---

## 8. 自動化測試腳本範例

```javascript
// 使用 @firebase/rules-unit-testing
const { initializeTestApp, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('Personal Snapshots', () => {
  it('PS-U-01: self update deny (immutable)', async () => {
    const alice = initializeTestApp({ projectId: 'test', auth: { uid: 'alice' } });
    const db = alice.firestore();
    
    // 先建立一個 snapshot
    await db.collection('users').doc('alice')
      .collection('projects').doc('p1')
      .collection('snapshots').doc('s1')
      .set({ createdBy: 'alice', name: 'original' });
    
    // 嘗試 update
    await assertFails(
      db.collection('users').doc('alice')
        .collection('projects').doc('p1')
        .collection('snapshots').doc('s1')
        .update({ name: 'modified' })
    );
  });
});
```

---

## 9. 持續整合

建議將此測試矩陣整合至 CI/CD 流程：

```yaml
# .github/workflows/firestore-rules-test.yml
name: Firestore Rules Test

on:
  pull_request:
    paths:
      - 'firestore.rules'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g firebase-tools
      - run: npm ci
      - run: npm run test:firestore-rules
```

---

## 參考

- [Firebase Rules Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Firestore Security Rules 單元測試](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
