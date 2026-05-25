# ABF Capacity Calculator 開發原則

本文檔定義 ABF Capacity Calculator 專案的開發紅線與設計原則，所有開發者（包含 CC 與 AGY）必須遵守。

---

## 一、技術棧紅線

### 1. Firebase 不替換

**原則**：Firebase 作為後端即服務，不替換為其他 BaaS 或自架後端。

**理由**：
- Firebase Auth 提供穩定的 Google OAuth
- Firestore 提供彈性的 NoSQL 資料庫
- Firebase Hosting 提供簡單的部署流程
- 降低維運成本

**禁止**：
- ❌ 遷移到 Supabase / Appwrite / 自架 API
- ❌ 自行實作認證系統

### 2. Ant Design 為主 UI 系統

**原則**：所有 UI 元件以 Ant Design 為主，不自建元件庫。

**理由**：
- 企業級 UI 設計系統
- 完整的元件生態
- 主題客製化支援

**禁止**：
- ❌ 引入 Material UI / Chakra UI 等競爭框架
- ❌ 大量自建重複元件

### 3. react-datasheet-grid 用於 Excel-like Lab

**原則**：Spreadsheet Lab 系列使用 react-datasheet-grid，不用於正式頁面。

**理由**：
- 高頻輸入場景適合 spreadsheet 模式
- 與 Ant Design Table 有明確區隔
- 實驗功能風險隔離

**限制**：
- Products Lab / Forecasts Lab / Capacity Lab 為實驗功能
- 正式頁面維持 Ant Design Form / Table

---

## 二、資料語義紅線

### 4. BP Target 單位固定 Million TWD

**原則**：BP 營業目標單位固定為「百萬新台幣」，不支援其他單位。

**理由**：
- 與歷史資料一致
- 簡化轉換邏輯
- 避免混淆

**禁止**：
- ❌ 新增 USD / CNY BP 目標單位
- ❌ 讓使用者自訂單位

### 5. 多幣別計算路徑不可亂改

**原則**：幣別轉換在計算引擎統一處理，不散落各處。

**計算路徑**：
```
原始價格（USD/TWD/CNY）
    → 正規化為 USD
    → 計算營收
    → 依 displayCurrency 換算顯示
```

**禁止**：
- ❌ 在 UI 層直接修改價格
- ❌ 跳過正規化步驟
- ❌ 混淆「顯示幣別」與「儲存幣別」

### 6. Snapshot Immutable

**原則**：Snapshot 一旦建立，內容不可修改。

**理由**：
- 版本比對需要穩定基準
- 審核流程需要不可變性
- 資料完整性保護

**禁止**：
- ❌ 新增 update snapshot API
- ❌ 修改已存在 snapshot 的任何欄位

### 7. Display Formatter 不可污染資料層

**原則**：格式化函數僅用於顯示，不得將格式化結果寫回資料庫。

**理由**：
- 保持資料原始性
- 避免千分位符號污染數字
- 避免幣別符號混入

**禁止**：
- ❌ 將 `1,234.56` 字串寫入 Firestore
- ❌ 將 `NT$ 1,234` 寫入數值欄位

---

## 三、分析原則

### 8. Proportional Attribution 不是 Causality

**原則**：所有歸因分析皆為「比例分攤」，不是「因果關係」。

**說明**：
- BP Gap Attribution：顯示誰承擔了缺口比例，不代表誰造成了缺口
- Risk Attribution：顯示風險集中度，不代表因果鏈

**要求**：
- UI 與文件明確標註「proportional, not causal」
- AI Brief Export 加入 guardrail

### 9. 不早接 AI API

**原則**：產品核心邏輯不依賴 AI API，先做 deterministic export。

**理由**：
- 決策可靠性
- 成本可控
- 可解釋性

**現狀**：
- AI Brief Export 提供資料匯出
- 使用者自行貼到外部 AI
- 不在產品內整合 AI

**禁止**：
- ❌ 直接呼叫 OpenAI / Claude / Gemini API
- ❌ 讓 AI 修改計算結果

---

## 四、權限原則

### 10. Workspace Role 權限原則

**原則**：權限檢查在 service 層與 UI 層雙重實作。

| 角色 | 讀取 | 寫入 | 管理成員 |
|------|------|------|----------|
| Owner | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ |
| Viewer | ✅ | ❌ | ❌ |

**UI 層實作**：
- `disabled={!writable}` 控制按鈕
- `disabled: !writable` 控制表格欄位
- `if (!writable) return;` onChange guard

**Service 層實作**：
- `assertCanWrite(scope)` 拋出權限錯誤
- Firestore Rules 驗證角色

### 11. Viewer True Read-only

**原則**：Viewer 不能編輯、不能貼上、不能觸發任何 state 變更。

**實作要求**：
- 所有可編輯欄位 `disabled: !writable`
- 所有 onChange handler 加入 guard
- 顯示唯讀警告 Alert

---

## 五、開發流程原則

### 12. CC / AGY 分工模式

| 角色 | 職責 |
|------|------|
| CC (Claude Code) | 功能實作、測試、文件、部署 |
| AGY | 需求定義、設計決策、驗收 |

**CC 限制**：
- 不主動修改需求
- 不修改 Firebase Rules（除非明確指示）
- 不升版（除非任務要求）

**AGY 職責**：
- 定義功能規格
- 審核 PR
- 決定發布時程

### 13. 版本升級規則

**原則**：版本號在以下檔案同步更新：
- `frontend/package.json`
- `frontend/src/App.tsx` (APP_VERSION)
- `frontend/src/services/snapshotService.ts` (APP_VERSION)
- `README.md` (版本歷史)

**格式**：`vMAJOR.MINOR.PATCH`

---

## 六、安全原則

### 14. Firestore Rules 不輕易放寬

**原則**：Firestore Rules 採最小權限原則。

**現狀**：
- Personal path: `users/{uid}/...` 僅本人可讀寫
- Workspace path: 依角色權限
- Snapshots: immutable，Editor 僅可刪除自己建立的

**禁止**：
- ❌ 新增 `allow write: if true;` 規則
- ❌ 繞過角色檢查

### 15. 不混淆 Missing / 0 / Null

**原則**：資料語意明確，不將三種狀態混淆。

| 狀態 | 語意 | Firestore |
|------|------|-----------|
| Missing | 未設定 | 欄位不存在 |
| Null | 明確空值 | `null` |
| 0 | 數值為零 | `0` |

**BP 目標範例**：
- 空白 → 年份 key 不存在於 Record
- 0 → 年份 key 存在，值為 0

---

## 七、文件原則

### 16. 功能必須有文件

**原則**：所有正式功能必須有對應文件。

**文件層級**：
- README.md：功能列表與版本歷史
- docs/user-guide/：使用手冊
- docs/phaseN/：技術設計文件

### 17. 不寫虛構功能

**原則**：文件僅描述已實作的功能，不寫未來規劃作為已存在功能。

---

## 八、違反原則的處理

若開發過程中發現需要違反上述原則：

1. **停止實作**
2. **記錄違反原因**
3. **與 AGY 討論**
4. **取得書面同意**
5. **更新本文檔**

---

**文件版本**：2026-05-25
**適用版本**：v1.29.0
**維護者**：CC / AGY
