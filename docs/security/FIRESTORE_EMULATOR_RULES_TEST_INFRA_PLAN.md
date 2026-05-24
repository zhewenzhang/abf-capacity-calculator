# Firestore Emulator Rules Test Infrastructure Plan

本文檔評估並設計 ABF Capacity Calculator 專案的官方 Firebase Emulator Rules Testing 基礎設施方案。

---

## 1. Executive Recommendation

### 結論：建議導入，但安排為 Phase 6.1 Security Infrastructure

| 項目 | 建議 |
|------|------|
| 是否導入 Emulator rules tests | ✅ **建議導入** |
| 導入時機 | **Phase 6.1**（緊接 Phase 6 v1.22.x 之後） |
| 優先級 | 中高 — 安全基礎設施，但非緊急阻塞 |
| 最大導入成本 | Windows Java 環境配置 + CI 整合 |
| 最大收益 | 杜絕 TS harness 與真實規則 drift，防止 v1.22.1 類似事件再發 |

### 理由

1. **v1.22.1 事件證明了需求**：TS harness 雖然發現了問題，但它只是「驗證開發者的心智模型」，不是驗證真實規則引擎行為
2. **Phase 6 已完成核心功能**：Snapshot 版本控制已穩定，是時候補強安全測試基礎設施
3. **成本可控**：本地開發者只需要一次性 Java 環境配置，CI 已有標準解決方案

---

## 2. 現有 TS Harness 評價

### 2.1 現有 `firestoreRules.test.ts` 的價值

| 優點 | 說明 |
|------|------|
| **零外部依賴** | 不需要 Java、Firebase Emulator，直接在 Vitest 中執行 |
| **快速執行** | 與其他單元測試一起執行，毫秒級完成 |
| **心智模型驗證** | 確保開發者對規則的理解與設計意圖一致 |
| **Overlap 模擬** | `evaluateWriteRequest()` 函數精確模擬 Firestore OR 語義 |
| **CI 友好** | 無需額外 CI 配置，隨 `npm run test` 執行 |

### 2.2 現有 TS Harness 的限制

| 限制 | 說明 | 風險等級 |
|------|------|----------|
| **與真實規則可能 drift** | TS 代碼是手動維護的「規則翻譯」，可能與 `firestore.rules` 不同步 | 🔴 高 |
| **無法測試規則語法錯誤** | 只測試 TS 邏輯，不驗證 Firestore 規則語法 | 🟡 中 |
| **無法測試 get()/exists()** | 需要模擬 Firestore 內部函數行為，複雜且易出錯 | 🔴 高 |
| **無法測試真實路徑匹配** | 只測試開發者認為會匹配的路徑，可能遺漏 | 🔴 高 |
| **維護成本高** | 每次修改規則需要同步修改 TS 代碼 | 🟡 中 |

### 2.3 TS Harness vs Emulator Tests 對比

| 特性 | TS Harness | Emulator Tests |
|------|------------|----------------|
| **測試對象** | 開發者的心智模型 | 真實 Firestore 規則引擎 |
| **執行速度** | 毫秒級 | 秒級（需啟動 Emulator） |
| **外部依賴** | 無 | Java + Firebase Emulator |
| **準確性** | 依賴手動同步 | 100% 真實 |
| **CI 整合難度** | 零 | 需要額外配置 |
| **適用場景** | 快速迭代、心智模型驗證 | 正式驗收、安全關鍵測試 |

### 2.4 何時 TS Harness 足夠

- 快速迭代開發階段
- 規則邏輯簡單、無複雜的 get()/exists() 調用
- 開發者對規則語義有高信心
- 非安全關鍵場景

### 2.5 何時必須 Emulator Test

- **安全關鍵規則**：如 snapshot immutable、editor 刪除限制
- **複雜的 get()/exists() 調用**：如 workspace 成員檢查
- **Overlap 驗證**：確認遞迴規則不會繞過專用規則
- **正式發布前驗收**：確保規則在真實環境中按預期運作

---

## 3. 官方 Emulator Rules Testing 架構

### 3.1 是否使用 `@firebase/rules-unit-testing`

**結論：✅ 建議使用**

這是 Firebase 官方提供的規則測試庫，專門設計用於測試 Firestore Security Rules。

### 3.2 需要新增的 Dependencies

```json
{
  "devDependencies": {
    "@firebase/rules-unit-testing": "^4.0.0"
  }
}
```

**注意**：
- 不需要額外安裝 `firebase-tools`（已全域安裝或使用 npx）
- Firebase Emulator 由 `firebase-tools` 提供

### 3.3 Java 依賴說明

Firebase Emulator Suite 的 Firestore Emulator 依賴 Java JRE 11+。

| 平台 | 安裝方式 |
|------|----------|
| Windows | 安裝 JDK 11+ 或使用 scoop/chocolatey |
| macOS | `brew install openjdk@11` |
| Linux | `sudo apt install openjdk-11-jre` |
| CI (GitHub Actions) | 內建 Java 環境，無需額外配置 |

### 3.4 架構示意圖

```
┌─────────────────────────────────────────────────────────────┐
│                    開發者本地環境                            │
│  ┌─────────────┐     ┌─────────────────────────────────┐   │
│  │ Vitest      │────▶│ firestoreRules.emulator.test.ts │   │
│  │ (測試框架)  │     │ (@firebase/rules-unit-testing)  │   │
│  └─────────────┘     └─────────────┬───────────────────┘   │
│                                    │                        │
│                                    ▼                        │
│                      ┌─────────────────────────┐           │
│                      │   Firebase Emulator     │           │
│                      │   (Firestore 模擬器)    │           │
│                      │   - 載入 firestore.rules │           │
│                      │   - 真實規則引擎評估    │           │
│                      └─────────────────────────┘           │
│                                    ▲                        │
│                                    │                        │
│                      ┌─────────────────────────┐           │
│                      │   Java JRE 11+          │           │
│                      │   (Emulator 運行依賴)   │           │
│                      └─────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Windows / Java / Firebase Emulator 前置要求

### 4.1 Windows 開發者前置要求

#### 步驟一：安裝 Java JRE 11+

```powershell
# 方法 A：使用 scoop（推薦）
scoop install openjdk11

# 方法 B：使用 chocolatey
choco install openjdk11

# 方法 C：手動安裝
# 下載並安裝 https://adoptium.net/
```

驗證安裝：
```powershell
java -version
# 應顯示類似：openjdk version "11.0.x"
```

#### 步驟二：安裝 Firebase CLI（若未安裝）

```powershell
npm install -g firebase-tools
```

驗證安裝：
```powershell
firebase --version
```

#### 步驟三：啟動 Emulator 測試

```powershell
# 一次性啟動（測試完成後自動關閉）
npm run test:rules

# 或手動啟動後執行測試
firebase emulators:start --only firestore
# 另開終端機執行
npm run test:rules:local
```

### 4.2 CI 環境前置要求

GitHub Actions 已內建 Java 環境，只需配置 workflow：

```yaml
# .github/workflows/firestore-rules-test.yml
name: Firestore Rules Test

on:
  pull_request:
    paths:
      - 'firestore.rules'
      - 'frontend/src/services/firestoreRules.emulator.test.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Run Firestore Rules Tests
        working-directory: frontend
        run: npm run test:rules
```

### 4.3 環境檢查腳本

建議新增環境檢查腳本：

```json
{
  "scripts": {
    "check:emulator": "firebase emulators:exec --only firestore \"echo Emulator ready\""
  }
}
```

---

## 5. 需要新增的 npm Scripts

### 5.1 建議的 npm Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:rules": "firebase emulators:exec --only firestore --project demo-test \"vitest run src/services/firestoreRules.emulator.test.ts\"",
    "test:rules:watch": "firebase emulators:exec --only firestore --project demo-test \"vitest watch src/services/firestoreRules.emulator.test.ts\"",
    "test:all": "npm run test && npm run test:rules",
    "emulator:start": "firebase emulators:start --only firestore"
  }
}
```

### 5.2 Scripts 說明

| Script | 用途 | 執行時間 |
|--------|------|----------|
| `test` | 執行所有常規單元測試（不含 emulator） | ~10s |
| `test:rules` | 執行 Firestore Rules Emulator 測試 | ~30s |
| `test:rules:watch` | 監聽模式，開發規則時使用 | 持續 |
| `test:all` | 執行所有測試（常規 + emulator） | ~40s |
| `emulator:start` | 單獨啟動 Emulator（手動測試用） | 持續 |

### 5.3 firebase.json 配置

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

## 6. 建議的 Test File 結構

### 6.1 檔案位置

```
frontend/src/services/
├── firestoreRules.test.ts           # 現有 TS harness（保留）
├── firestoreRules.emulator.test.ts  # 新增 Emulator 測試
└── firestoreRules.test.utils.ts     # 共用測試工具（可選）
```

### 6.2 firestoreRules.emulator.test.ts 結構

```typescript
/**
 * Firestore Rules Emulator Tests
 * ===============================
 * 
 * 使用 @firebase/rules-unit-testing 測試真實 Firestore 規則引擎。
 * 
 * 執行方式：
 *   npm run test:rules
 * 
 * 前置要求：
 *   - Java JRE 11+
 *   - Firebase CLI (firebase-tools)
 */
import {
  initializeTestApp,
  initializeAdminApp,
  loadFirestoreRules,
  assertFails,
  assertSucceeds,
  clearFirestoreData
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-test';

// 測試用戶
const alice = { uid: 'alice' };
const bob = { uid: 'bob' };
const charlie = { uid: 'charlie' };

// 測試設置
beforeAll(async () => {
  await loadFirestoreRules({ projectId: PROJECT_ID, rules: '...' });
});

afterAll(async () => {
  await clearFirestoreData({ projectId: PROJECT_ID });
});

describe('Personal Snapshots', () => {
  // PS-R-01: self read allow
  it('allows user to read own snapshot', async () => {
    const db = initializeTestApp({ projectId: PROJECT_ID, auth: alice }).firestore();
    await assertSucceeds(
      db.collection('users').doc('alice')
        .collection('projects').doc('p1')
        .collection('snapshots').doc('s1').get()
    );
  });
  
  // 更多測試...
});

describe('Workspace Snapshots', () => {
  // WS-* 測試...
});

describe('Overlap Regression', () => {
  // PO-* 測試...
});
```

---

## 7. Snapshot Permission Test Matrix 如何落地

### 7.1 測試案例映射

將 `FIRESTORE_RULES_TEST_PLAN.md` 中的測試矩陣直接映射為測試代碼：

#### Personal Snapshot 測試

| 測試 ID | TypeScript 測試函數 |
|---------|---------------------|
| PS-R-01 | `it('PS-R-01: self read allow', ...)` |
| PS-R-02 | `it('PS-R-02: other user read deny', ...)` |
| PS-R-03 | `it('PS-R-03: unauthenticated read deny', ...)` |
| PS-C-01 ~ PS-C-04 | Create 測試組 |
| PS-U-01 ~ PS-U-02 | Update（Immutable）測試組 |
| PS-D-01 ~ PS-D-03 | Delete 測試組 |

#### Workspace Snapshot 測試

| 測試 ID | TypeScript 測試函數 |
|---------|---------------------|
| WS-R-01 ~ WS-R-05 | Read 測試組 |
| WS-C-01 ~ WS-C-06 | Create 測試組 |
| WS-U-01 ~ WS-U-04 | Update（Immutable）測試組 |
| WS-D-01 ~ WS-D-06 | Delete 測試組 |

#### Overlap Regression 測試

| 測試 ID | TypeScript 測試函數 |
|---------|---------------------|
| PO-PS-01 | Personal snapshot overlap 測試 |
| PO-WS-01 ~ PO-WS-03 | Workspace snapshot overlap 測試 |

### 7.2 測試組織結構

```typescript
describe('Firestore Rules', () => {
  describe('Personal Snapshots', () => {
    describe('Read (PS-R-*)', () => { /* ... */ });
    describe('Create (PS-C-*)', () => { /* ... */ });
    describe('Update (PS-U-*)', () => { /* ... */ });
    describe('Delete (PS-D-*)', () => { /* ... */ });
  });
  
  describe('Workspace Snapshots', () => {
    describe('Read (WS-R-*)', () => { /* ... */ });
    describe('Create (WS-C-*)', () => { /* ... */ });
    describe('Update (WS-U-*)', () => { /* ... */ });
    describe('Delete (WS-D-*)', () => { /* ... */ });
  });
  
  describe('Overlap Regression (PO-*)', () => {
    describe('Personal Snapshot Overlap', () => { /* ... */ });
    describe('Workspace Snapshot Overlap', () => { /* ... */ });
  });
});
```

### 7.3 測試數據準備

```typescript
// 建立測試 workspace
async function setupTestWorkspace(db: Firestore) {
  await db.collection('workspaces').doc('ws1').set({
    ownerId: 'alice',
    members: {
      alice: 'owner',
      bob: 'editor',
      charlie: 'viewer'
    }
  });
}

// 建立測試 snapshot
async function setupTestSnapshot(db: Firestore, path: string, createdBy: string) {
  await db.doc(path).set({
    id: 'snap-1',
    createdBy,
    name: 'Test Snapshot',
    createdAt: new Date().toISOString()
  });
}
```

---

## 8. CI 與本地執行策略

### 8.1 本地開發策略

| 場景 | 建議做法 |
|------|----------|
| 日常開發 | 只執行 `npm run test`（不含 emulator） |
| 修改規則時 | 執行 `npm run test:rules` |
| 正式發布前 | 執行 `npm run test:all` |
| 規則開發中 | 使用 `npm run test:rules:watch` 或 `emulator:start` + Firebase UI |

### 8.2 CI 執行策略

| 觸發條件 | 執行的測試 |
|----------|-----------|
| 任何 PR | `npm run test`（常規測試） |
| PR 修改 `firestore.rules` | `npm run test:all`（含 emulator） |
| PR 修改 `firestoreRules*.test.ts` | `npm run test:all` |
| main branch push | `npm run test:all` |

### 8.3 CI 效能優化

```yaml
# 快取 firebase-tools
- name: Cache firebase-tools
  uses: actions/cache@v4
  with:
    path: ~/.cache/firebase
    key: ${{ runner.os }}-firebase-${{ hashFiles('**/package-lock.json') }}
```

---

## 9. 分階段導入 Plan

### Phase 1：基礎設施準備（1-2 天）

- [ ] 安裝 `@firebase/rules-unit-testing`
- [ ] 更新 `package.json` npm scripts
- [ ] 更新 `firebase.json` emulator 配置
- [ ] 建立 `firestoreRules.emulator.test.ts` 骨架
- [ ] 驗證本地執行環境

### Phase 2：核心測試實現（2-3 天）

- [ ] 實現 Personal Snapshot 測試（PS-*）
- [ ] 實現 Workspace Snapshot 測試（WS-*）
- [ ] 實現 Overlap Regression 測試（PO-*）
- [ ] 驗證所有測試通過

### Phase 3：CI 整合（1 天）

- [ ] 建立 GitHub Actions workflow
- [ ] 配置觸發條件
- [ ] 驗證 CI 執行成功

### Phase 4：文檔與驗收（1 天）

- [ ] 更新 `README.md` 說明測試執行方式
- [ ] 更新 `CONTRIBUTING.md`（如有）說明 Windows 環境配置
- [ ] 完成 Phase 6.1 驗收

---

## 10. 不導入的風險

### 10.1 技術風險

| 風險 | 機率 | 影響 | 說明 |
|------|------|------|------|
| TS harness 與真實規則 drift | 高 | 高 | 開發者忘記同步更新 TS 代碼 |
| 規則語法錯誤未被抓到 | 中 | 高 | 只在 deploy 時才發現 |
| 複雜 get()/exists() 邏輯錯誤 | 中 | 高 | TS 模擬可能不準確 |
| 再次發生 overlap 問題 | 中 | 高 | TS harness 只是模擬，非真實驗證 |

### 10.2 業務風險

| 風險 | 機率 | 影響 | 說明 |
|------|------|------|------|
| 安全漏洞被惡意利用 | 低 | 極高 | 如 editor 刪除他人快照 |
| 資料完整性受損 | 低 | 高 | 快照被篡改 |
| 用戶信任受損 | 低 | 極高 | 安全事件影響聲譽 |

### 10.3 風險緩解

即使不導入 Emulator 測試，也應：

1. **嚴格執行 Code Review**：使用 `FIRESTORE_RULES_CHANGE_CHECKLIST.md`
2. **手動測試關鍵場景**：使用 Firebase Console Emulator
3. **定期 TS harness 更新**：確保與規則同步
4. **部署後驗證**：在 staging 環境測試

---

## 11. 給 AGY Review 的 Checklist

### 11.1 導入前確認

- [ ] 是否確認 Java 環境可在所有開發者機器上運行？
- [ ] 是否確認 CI 環境支援 Emulator 測試？
- [ ] 是否評估過對現有測試流程的影響？

### 11.2 導入時確認

- [ ] 是否所有測試案例都已從測試矩陣映射？
- [ ] 測試是否覆蓋了所有安全關鍵場景？
- [ ] TS harness 是否保留（作為快速迭代工具）？

### 11.3 導入後確認

- [ ] CI 是否正確執行 Emulator 測試？
- [ ] 開發者文檔是否已更新？
- [ ] 是否有專人負責維護測試基礎設施？

---

## 12. 參考資料

### 官方文檔

- [Firebase Security Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Test Firestore Security Rules](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

### 本專案相關文檔

- [FIRESTORE_RULES_REVIEW_GUIDE.md](FIRESTORE_RULES_REVIEW_GUIDE.md)
- [FIRESTORE_RULES_TEST_PLAN.md](FIRESTORE_RULES_TEST_PLAN.md)
- [FIRESTORE_RULES_OVERLAP_INCIDENT.md](FIRESTORE_RULES_OVERLAP_INCIDENT.md)
- [FIRESTORE_SNAPSHOT_RULES_HARDENING.md](../phase6/FIRESTORE_SNAPSHOT_RULES_HARDENING.md)

---

## 版本記錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| 1.0 | 2026-05-24 | 初始版本，Phase 6.1 規劃 |
