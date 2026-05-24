# 代碼品質、型別安全與工程治理規範審查書 (CODE_QUALITY_AND_STANDARDS_REVIEW.md)

本文件對專案的代碼品質、型別安全（Type Safety）、單元測試策略、多人協作 Git 工作流進行總體評估，並起草修訂版**工程治理規範**，卡死 errors/lint 警告，保障項目的長期健康。

---

## 1. 核心代碼品質與 Firebase 隔離評審 (Code Quality & Security)

### 1.1 core 決定性計算邏輯評估 (`core/`)
- **評估結論**：**優秀**。 `calculationEngine.ts` 及其附屬的 `riskAttribution`、`bpAttribution` 實現了純函數（Pure Functions）設計。輸入 SKUs/Forecasts 數組後，輸出大盤分析數據 100% 決定性一致。
- **優點**：與 React state、Firestore SDK 100% 零耦合。這使得它可以在任何無 UI 環境下（包括後續的 Vitest 測試和 Change Impact 快照重算中）被極速且穩定地呼叫。

### 1.2 services / Firebase 數據隔離評估 (`services/`)
- **評估結論**：**良好**。 `firestore.ts` 統一封裝了對資料庫的 CRUD 請求，並為 Workspace 項目隔離了 personal 與 workspaces 作用域路徑。
- **安全風險**：目前在寫入快照和變更 Workspace 成員時，前端直接拼裝路徑，存在微幅被繞過的安全隱患。
- **Mitigation**：正在處理的 `v1.22.1` 權限加固必須在 Firestore Rules 中強制寫入身份校驗（如 `request.auth.uid != null`），阻絕越界漏洞。

### 1.3 頁面與組件複雜度評估 (`pages/` & `components/`)
- **評估結論**：**待優化**。 `CalculationResults.tsx` 模組體積偏大（超過 600行），包含了大量的圖表配置、i18n 渲染細節和 URL 離線下載邏輯。
- **優化建議**：建議 CC 後續將「Risk Attribution 卡片」、「Price Impact 沙盤」和「離線下載面板」重構為 `components/` 下的獨立子組件，減少 Page 的責任負擔。

---

## 2. 測試與 i18n Strategy 評審 (Testing & i18n)

### 2.1 測試策略 (Test Strategy)
- **現狀**：系統擁有 320+ 個 Vitest 單元測試，覆蓋了物理公式、多幣別折算、attinement 達成率和 `aiBriefExport.ts` 脫敏 BOM 下載的核心邏輯。
- **缺口**：單元測試缺乏對 **Firestore Rules 本地模擬器（Firebase Emulator Suite）** 的對抗性測試（如模擬 Viewer 帳戶進行寫入攔截的真實斷言）。
- **優化建議**：引入 `@firebase/rules-unit-testing`，將 Firestore 權限安全規則納入 CI/CD 的自動化測試中。

### 2.2 i18n Strategy
- **現狀**：通過 `i18nOutputs.test.ts` 鏡像校驗 EN 与 zh-TW 的 parity 鏡像對齊。
- **評估**：機制非常強健。任何新加入的開發人員一旦漏掉某一語言的翻譯 key，測試將直接拋出 Error 並中斷 CI/CD，保障了多語言的零死角。

---

## 3. 🎯 多人協作與項目工程治理流程規範 (Engineering Governance Rules)

為了保證後續多人協作與長期開發不會造成代碼退化，我們為 CC 與 AGY 制定並修訂了以下 **工程治理流程規範**：

```text
+-----------------------+      +-----------------------+      +-----------------------+
|   1. 獨立 Worktree    |      |  2. 嚴格白名單修改    |      |  3. 質量三部曲門檻    |
|   - 物理隔離, 禁止污染 | --->  |  - 只改 docs 和 review| --->  |  - test, lint, build  |
|   - 獨立 agy 分支推動 |      |  - 嚴禁改動正式 src   |      |  - 100% 綠過方可發布  |
+-----------------------+      +-----------------------+      +-----------------------+
```

### 1. 獨立 Worktree 與分支開發規範：
- 旁路評測與架構審查（AGY）必須在獨立的 Worktree 目錄（如 `D:\abf-capacity-calculator-agy`）中運行，分支鎖定為 `agy/ai-analysis-eval-kit`。
- **嚴禁**在未獲授權前直接將 AGY 分支 merge 入生產 main 分支。

### 2. 白名單修改限制：
- AGY 分支只允許修改或新增 `docs/architecture-review/**`、`docs/phase6/**`、`docs/ai-eval/**`。
- **嚴格禁止**修改 `frontend/src/**` 正式產品原始碼，以防干擾 CC 正在開展的核心功能與權限加固開發。

### 3. 質量三部曲硬性門檻 (Pre-release Gates)：
任何代碼在發布或部署前，開發人員（CC）必須手動或在 CI/CD 中跑通以下三部曲：
1. **Vitest 100% 綠過**：`npm run test`。
2. **ESLint 零 Error 零 Warning**：`npm run lint -- --quiet` (字面量 BOM 不規則空白 `'﻿'` 必須轉義為 `'\ufeff'`，嚴禁使用 Irregular whitespace)。
3. **Vite Production Build 成功**：`tsc -b && vite build`，不允許有任何 chunk size 或 bundle 錯誤。

### 4. 版本升級與 Release History 規範：
- 每次正式發布，必須在 `frontend/package.json` 和 `App.tsx` 中同步更新版本號（如 v1.21.1）。
- 必須在項目根目錄的 `README.md` 的 **Release History** 中新增對應版本的更新日誌，詳細說明主要目標、交付物和改進，保持專案演進歷史的高度透明。

### 5. i18n 翻譯 Parity 規範：
- 任何新增的業務指標或 UI 文字，必須在 `en.ts` 與 `zhTW.ts` 中鏡像新增，並確保跑過 `i18nOutputs.test.ts` Parity 測試，禁止出現翻譯真空。
