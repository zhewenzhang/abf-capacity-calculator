# v1.54.4 Data Quality Notice UX Audit & Remediation Command

## 0. 問題背景

使用者回報：系統內有大量「看不懂的提醒」。

截圖例子位於 `/bp-targets`：

```text
2 data quality issue(s) found

66ea 年有預測需求，但參數設定中未設定 BP 目標。
c5a3 年有預測需求，但參數設定中未設定 BP 目標。
```

這裡有兩個明顯問題：

1. 標題硬編碼英文：`2 data quality issue(s) found`
2. `66ea / c5a3` 被當成年份顯示，但它們看起來像 ID / 短碼，不是合法年份。

這類提醒會讓使用者不知道：

- 這是什麼問題？
- 影響什麼？
- 為什麼系統這樣判定？
- 下一步該去哪裡修？
- `66ea` 到底是 SKU、forecast ID、還是錯誤資料？

## 1. 任務目標

全面盤點並整改使用者可見的 Data Quality / Warning / Alert / Notice 類提醒。

目標不是讓提醒消失，而是讓提醒變成：

- 看得懂
- 能定位
- 能修復
- 語言一致
- 不露出技術 key / ID 當業務詞
- 不把非法資料當成年份、月份、SKU 名稱

## 2. 必須遵守

1. 全程使用中文回報。
2. 必須建立並持續更新命令日誌：
   - `docs/release/V1_54_4_DATA_QUALITY_NOTICE_UX_AUDIT_COMMAND_LOG.md`
3. 不得修改：
   - `firestore.rules`
   - `frontend/src/core/calculationEngine.ts`
   - Firebase Functions / DeepSeek runtime
4. 不得刪除 Data Quality 規則來掩蓋問題。
5. 不得靜默修改使用者資料。
6. 不得把所有 warning 改成 info 來降低嚴重性。
7. 不得只修 `/bp-targets` 這一處；必須全站盤點。

## 3. 初步根因線索

請先檢查以下已知風險：

### 3.1 DataQualityAlert 硬編碼英文

文件：

- `frontend/src/components/common/DataQualityAlert.tsx`

目前存在硬編碼：

```tsx
`${filteredIssues.length} data quality issue(s) found`
`+${remaining} more issue(s)`
`${issues.length} issue(s)`
```

這些必須改為 i18n：

- 繁中：`發現 {count} 個資料品質提醒`
- 英文：`{count} data quality issue(s) found`
- `還有 {count} 項`
- `{count} issue(s)`

### 3.2 非法 month 被當成年份

文件：

- `frontend/src/core/dataQuality.ts`

目前 forecast year 來源類似：

```ts
const year = fc.month.substring(0, 4);
forecastYears.add(year);
```

如果 `fc.month` 是 `66ea...`、`c5a3...`、空值、或非 `YYYY-MM` 格式，就會被當成年份，最後顯示：

```text
66ea 年有預測需求
```

這是錯誤的使用者體驗。

請新增明確的 month 格式驗證：

- 合法格式：`YYYY-MM`
- 年份：四位數
- 月份：01-12

非法 month 不得進入：

- `forecastYears`
- `forecastMonths`
- BP missing target check
- capacity missing check
- partial-year check

應改為產生清楚的 DQ issue，例如：

- title：`預測月份格式無效`
- detail：`有 {count} 筆預測資料的月份不是 YYYY-MM 格式，系統無法判斷年度與月份。請到「預測」頁修正月份欄位。`
- evidence：包含 sample values，但不要把它們當成年份。

### 3.3 技術 key 泄漏

請搜尋並修復使用者可見的 key 泄漏，例如：

```powershell
rg "titleMessage.key|detailMessage.key|dq\\.|issue\\(s\\)|data quality issue|Missing or insufficient permissions|forecastOrphan|bp-target" frontend/src
```

需要特別檢查：

- `frontend/src/core/aiCopilotTools.ts`
- `frontend/src/components/common/DataQualityAlert.tsx`
- `frontend/src/components/common/DataQualityBadge.tsx`
- `frontend/src/components/common/DataQualityQuickFixDrawer.tsx`
- `frontend/src/components/common/DataQualityGuidedFixModal.tsx`
- `frontend/src/pages/*`
- `frontend/src/core/managementReport.ts`
- `frontend/src/core/workbench.ts`

不要讓一般使用者看到：

- `dq.forecastOrphan.title`
- `forecast-missing-bp-target-66ea`
- `titleMessage.key`
- `detailMessage.key`
- `issue(s)`
- raw Firestore permission error

### 3.4 提醒缺少下一步

Data Quality 提醒應該盡量包含：

1. 問題名稱
2. 影響範圍
3. 為什麼重要
4. 建議修復入口

例如：

```text
預測資料月份格式無效
有 2 筆預測資料的月份欄位不是 YYYY-MM，系統無法判斷它們屬於哪一年，因此不會把它們納入 BP 與產能分析。
建議：前往「預測」頁，修正月份欄位。
```

## 4. 必做盤點

請建立一份盤點表，寫入命令日誌：

| 類型 | 位置 | 問題 | 是否修復 | 備註 |
|---|---|---|---|---|
| DataQualityAlert | ... | 英文硬編碼 | yes/no | ... |
| DQ Engine | ... | 非法 month 當年份 | yes/no | ... |
| AI Copilot | ... | 顯示 titleMessage.key | yes/no | ... |
| Page Alert | ... | 無下一步 | yes/no | ... |

至少盤點：

- Data Quality alert / badge / indicator
- Quick fix drawer / guided fix modal
- Operations workbench abnormality summary
- BP Targets page
- Products page
- Forecasts page
- Capacity page
- Results page
- AI Assistant / Copilot data-quality answer
- Management report / export 文案

## 5. 必做修復

### 5.1 DataQualityAlert 文案 i18n

新增 i18n key：

繁中：

- `dqAlert.countFound`: `發現 {count} 個資料品質提醒`
- `dqAlert.countCompact`: `{count} 個提醒`
- `dqAlert.more`: `還有 {count} 項`
- `dqAlert.errorCount`: `{count} 個錯誤`
- `dqAlert.warningCount`: `{count} 個警告`

英文：

- `dqAlert.countFound`: `{count} data quality issue(s) found`
- `dqAlert.countCompact`: `{count} issue(s)`
- `dqAlert.more`: `+{count} more`
- `dqAlert.errorCount`: `{count} error(s)`
- `dqAlert.warningCount`: `{count} warning(s)`

### 5.2 Forecast month validation

新增 helper，建議位置：

- `frontend/src/core/dateValidation.ts`

或放在 `dataQuality.ts` 附近。

需求：

```ts
isValidMonthKey(value: unknown): value is string
extractYearFromMonthKey(value: string): string | null
```

合法：

- `2026-01`
- `2030-12`

非法：

- `66ea`
- `c5a3`
- `2026`
- `2026-13`
- `2026-00`
- ``
- `null`

非法 forecast month 應產生新的 DQ issue：

- id: `forecast-invalid-month`
- severity: `error`
- domain: `forecast`
- affectedPeriods: 不要填非法值當 period
- evidence: `{ count, samples }`

並且非法 month 的 forecast 不得被納入：

- forecastYears
- forecastMonths
- forecastsBySkuYear
- BP missing target check
- capacity missing check

### 5.3 人話化 issue detail

對高頻 DQ issue 做人話化改善：

- orphan forecast
- invalid forecast month
- missing BP target
- BP target exists without forecast
- missing capacity
- missing SKU attributes
- zero price
- unsupported currency

每個 detail 至少包含：

- 問題是什麼
- 影響什麼分析
- 建議到哪個頁面修

### 5.4 技術 key 外露清零

使用 grep 掃描，至少在 UI 路徑中不能出現直接渲染 key：

```powershell
rg "titleMessage.key|detailMessage.key|dq\\.[a-zA-Z0-9_.-]+|issue\\(s\\)|data quality issue\\(s\\)" frontend/src/components frontend/src/pages
```

若 core 內部為測試或 prompt pack 使用 key，可以保留，但需要確認不會直接顯示給使用者。

## 6. 測試要求

請新增或更新測試：

### 6.1 DataQualityAlert tests

新增：

- 中文語言下顯示 `發現 2 個資料品質提醒`
- 英文語言下顯示 `{count} data quality issue(s) found`
- `還有 {count} 項` 不再硬編碼英文
- 不顯示 raw key

### 6.2 DataQuality engine tests

新增：

- `fc.month = '66ea'` 不會產生 `66ea 年有預測需求`
- invalid month 會產生 `forecast-invalid-month`
- invalid month 不進入 BP missing target check
- valid `2026-01` 仍正常進入 BP / capacity checks

### 6.3 i18n output tests

新增或更新：

- 所有 DataQualityIssue 的 `titleMessage/detailMessage` 都能在 zh-TW 和 en resolve
- 不得返回 key 本身
- invalid month 的中文/英文文案都存在

### 6.4 UI smoke tests

至少針對：

- `/bp-targets` 的 DQ alert
- DataQualityBadge / Indicator
- QuickFix Drawer 若有提示文案

## 7. Browser / Visual QA

如有登入態，請截圖：

- `docs/qa/screenshots/v1-54-4/dq-alert-bp-targets.png`
- `docs/qa/screenshots/v1-54-4/dq-alert-forecast-invalid-month.png`
- `docs/qa/screenshots/v1-54-4/dq-alert-mobile-375.png`

截圖要證明：

- 不再出現 `66ea 年`
- 不再出現英文硬編碼標題
- 提醒有清楚下一步

若沒有登入態，請明確寫：

```text
Browser QA limited due to missing authenticated session.
```

## 8. 驗證命令

在 `frontend` 目錄執行：

```powershell
npm run test
npm run lint -- --quiet
npm run build
```

在 repo root 執行：

```powershell
git diff -- firestore.rules
git diff -- frontend/src/core/calculationEngine.ts
git status --short
```

額外掃描：

```powershell
rg "data quality issue\\(s\\)|issue\\(s\\) found|titleMessage.key|detailMessage.key|dq\\.forecastOrphan|dq\\.forecastMissingBpTarget" frontend/src/components frontend/src/pages frontend/src/core
```

請人工判讀掃描結果：測試或內部 prompt 可保留，UI 直接渲染不可保留。

## 9. Git 要求

建議分支：

- `xiaomi/v1-54-4-data-quality-notice-ux-audit`

Commit message：

- `fix: improve data quality notice ux v1.54.4`

Push：

- `origin/xiaomi/v1-54-4-data-quality-notice-ux-audit`

## 10. 最終回報格式

請用中文回報：

1. 是否已建立並更新命令日誌。
2. 全站提醒盤點結果。
3. `66ea 年 / c5a3 年` 根因是否確認。
4. 是否新增 invalid month DQ issue。
5. 是否修復 DataQualityAlert 英文硬編碼。
6. 是否清除 UI 直接顯示 technical key。
7. 修改檔案清單。
8. 新增/修改測試清單。
9. Browser QA 截圖路徑或受限原因。
10. test / lint / build 結果。
11. 紅線檔案是否未修改。
12. Commit hash、branch、push 狀態。
13. 是否可交 AGY 驗收。

