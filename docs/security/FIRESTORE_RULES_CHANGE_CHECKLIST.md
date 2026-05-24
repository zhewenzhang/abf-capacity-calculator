# Firestore Rules Change Checklist

本文檔是所有 AI Agent（CC、AGY 等）在修改 Firestore Rules 時必須遵循的檢查清單。

---

## 核心警告

> **Firestore Rules 對同一路徑是任一匹配 allow 即允許，不是按順序覆蓋。**
>
> 請列出目標路徑會匹配的所有 match block，並證明沒有其他 match block 可以繞過你的 deny / update false / ownership 限制。

**請將上述警告複製到未來任何涉及 Firestore Rules 修改的任務 prompt 中。**

---

## 一、改 Rules 前必查

### 1.1 搜尋所有現有規則

執行以下命令：

```bash
# 列出所有 match 區塊
grep -n "match /" firestore.rules

# 搜尋所有遞迴規則
grep -n "{document=**}" firestore.rules

# 搜尋所有 allow 語句
grep -n "allow" firestore.rules
```

### 1.2 列出目標路徑

明確寫出你要修改或新增的路徑：

```
目標路徑：__________________________
```

### 1.3 列出所有會匹配的規則

對於目標路徑，列出**所有**會匹配的 match 區塊：

| 規則行號 | match 路徑 | 是否匹配目標路徑 |
|----------|-----------|------------------|
|          |            |                  |
|          |            |                  |

### 1.4 分析每個匹配規則的 allow 條件

| 規則行號 | allow 語句 | 允許的操作 | 允許的主體 |
|----------|-----------|-----------|-----------|
|          |            |           |           |
|          |            |           |           |

---

## 二、改 Rules 時必查

### 2.1 確認沒有 overlap 問題

對於每個你想添加的限制，確認沒有其他規則會繞過它：

| 我想限制的操作 | 會繞過的規則（如有） | 如何解決 |
|---------------|---------------------|----------|
| update -> deny |                     |          |
| delete -> owner only |               |          |
| create -> createdBy == auth.uid |    |          |

### 2.2 特殊檢查：Immutable

如果你要讓某個集合 immutable（禁止 update）：

- [ ] 確認沒有其他規則 `allow write`
- [ ] 確認沒有其他規則 `allow update`
- [ ] 確認遞迴規則的 `write` 不會匹配此路徑

### 2.3 特殊檢查：所有權限制

如果你要限制只有資源擁有者可以 delete：

- [ ] 確認沒有其他規則 `allow write`
- [ ] 確認沒有其他規則 `allow delete` 不檢查 createdBy
- [ ] 確認遞迴規則的 `write` 不會匹配此路徑

### 2.4 特殊檢查：角色限制

如果你要限制只有特定角色可以操作：

- [ ] 確認沒有其他規則會繞過角色檢查
- [ ] 確認遞迴規則的 `canWriteBusiness` 不會過於寬鬆

---

## 三、改 Rules 後必查

### 3.1 語法驗證

```bash
firebase deploy --only firestore --dry-run
```

確認輸出：`rules file firestore.rules compiled successfully`

### 3.2 功能測試

使用 Firebase Emulator 測試以下場景：

#### 基本權限測試

| 測試 | 預期結果 | 實際結果 | 通過 |
|------|----------|----------|------|
| 合法用戶 read | ALLOW |          | [ ]  |
| 合法用戶 create（條件符合） | ALLOW |          | [ ]  |
| 合法用戶 create（條件不符） | DENY |          | [ ]  |
| 合法用戶 update | DENY |          | [ ]  |
| 合法用戶 delete（有權限） | ALLOW |          | [ ]  |
| 合法用戶 delete（無權限） | DENY |          | [ ]  |
| 非法用戶 read | DENY |          | [ ]  |
| 非法用戶 write | DENY |          | [ ]  |

#### Overlap 測試

| 測試 | 預期結果 | 實際結果 | 通過 |
|------|----------|----------|------|
| 遞迴規則不繞過 immutable | DENY |          | [ ]  |
| 遞迴規則不繞過所有權檢查 | DENY |          | [ ]  |
| 遞迴規則不繞過角色限制 | DENY |          | [ ]  |

### 3.3 文檔更新

- [ ] 更新 `docs/security/FIRESTORE_RULES_REVIEW_GUIDE.md`（如有新概念）
- [ ] 更新 `docs/security/FIRESTORE_RULES_TEST_PLAN.md`（如有新測試案例）
- [ ] 記錄變更原因和影響

### 3.4 提交前確認

- [ ] 所有測試通過
- [ ] 文檔已更新
- [ ] Commit message 清楚說明變更原因
- [ ] PR description 包含規則變更摘要

---

## 四、必須搜尋的 Patterns

每次修改規則時，搜尋以下 patterns 確認沒有意外：

### 4.1 遞迴規則

```bash
grep -n "{document=**}" firestore.rules
```

每個遞迴規則都應該檢查是否會匹配你的目標路徑。

### 4.2 write 權限

```bash
grep -n "allow write" firestore.rules
```

`write` 包含 `create` + `update` + `delete`，可能會繞過你的限制。

### 4.3 通用函數

```bash
grep -n "canWriteBusiness" firestore.rules
```

確認這些函數的權限範圍是否符合你的預期。

---

## 五、必須驗證的 Roles

對於 workspace 路徑，必須驗證以下角色：

| 角色 | 應該能做什麼 | 不應該能做什麼 |
|------|-------------|---------------|
| **Owner** | read, create, delete any | update (immutable) |
| **Editor** | read, create, delete own | update, delete others |
| **Viewer** | read | create, update, delete |
| **Non-member** | (無) | read, create, update, delete |

---

## 六、必須列出的 Matched Rule Paths

對於每個目標路徑，必須填寫以下表格：

### 範例：Personal Snapshot

目標路徑：`users/{uid}/projects/{projectId}/snapshots/{snapshotId}`

| Match Block | 行號 | 匹配此路徑？ | 允許的操作 |
|-------------|------|-------------|-----------|
| `match /users/{uid}/{document=**}` | 95 | **是** | read, write (if isSelf) |
| `match /users/{uid}/projects/{projectId}/snapshots/{snapshotId}` | 134 | **是** | read, create, delete (有條件), update: false |

**結論**：存在 overlap，遞迴規則會繞過 immutable 限制。

**解決方案**：從遞迴規則中排除 snapshots 集合。

---

## 七、必須回答的安全問題

在提交 Firestore Rules 變更前，必須回答以下問題：

### 7.1 基本問題

- [ ] 我是否理解 Firestore Rules 的「任一允許即通過」語義？
- [ ] 我是否列出了所有會匹配目標路徑的規則？
- [ ] 我是否確認沒有規則會繞過我的限制？

### 7.2 Immutable 問題

- [ ] 我的 `allow update: if false` 是否會被其他規則繞過？
- [ ] 是否存在 `allow write` 規則會匹配此路徑？

### 7.3 所有權問題

- [ ] Editor 是否真的無法刪除他人的資源？
- [ ] 是否存在 `allow write` 規則會繞過 createdBy 檢查？

### 7.4 角色問題

- [ ] Viewer 是否真的無法寫入？
- [ ] Non-member 是否真的無法訪問？

---

## 八、禁止的行為

### 禁止只寫「deploy success」就宣稱安全

`firebase deploy` 成功只代表語法正確，不代表規則按預期運作。

### 禁止假設「後面的規則會覆蓋前面的」

Firestore Rules 沒有這種語義。

### 禁止只在末尾添加規則

如果前面的遞迴規則已經允許了操作，後面的規則不會阻止它。

### 禁止忽略遞迴規則

`{document=**}` 會匹配所有後代路徑，必須特別注意。

---

## 九、可複製到未來 Prompt 的固定文字

```text
請注意：Firestore Rules 對同一路徑是任一匹配 allow 即允許，不是按順序覆蓋。請列出目標路徑會匹配的所有 match block，並證明沒有其他 match block 可以繞過你的 deny / update false / ownership 限制。
```

---

## 十、參考文檔

- [FIRESTORE_RULES_REVIEW_GUIDE.md](FIRESTORE_RULES_REVIEW_GUIDE.md)
- [FIRESTORE_RULES_TEST_PLAN.md](FIRESTORE_RULES_TEST_PLAN.md)
- [FIRESTORE_RULES_OVERLAP_INCIDENT.md](FIRESTORE_RULES_OVERLAP_INCIDENT.md)

---

## 版本記錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| 1.0 | 2026-05-24 | 初始版本，v1.22.2 治理補強 |
