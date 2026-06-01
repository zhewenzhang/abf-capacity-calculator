# v1.52.4 AI Assistant Response UX Polish — Command Log

## 狀態凍結

- **當前 branch**: `main`
- **最新 commit**: `a232fdf chore: enable v1.52.3 firebase deepseek runtime`
- **git status**: 乾淨，無未提交變更
- **開始時間**: 2026-06-01 ~10:25 (Asia/Taipei)

## 目標

將 AI 資料助手頁面的回答呈現從「一大坨文字」重構成可讀、可信、專業的 AI 分析報告：

1. Markdown 正確渲染（heading, bold, bullet list）
2. F-A-I-R 標籤改為 badge 視覺樣式
3. Validation warning 降噪與中文化
4. DeepSeek system prompt 強化輸出格式
5. 「請確認後執行」改為「建議人工確認後再採取行動」
6. 長回答段落化、卡片化

## 安全紅線

- ❌ 不寫入 API key 到源碼、docs、測試、log
- ❌ 不修改 firestore.rules
- ❌ 不修改 frontend/src/core/calculationEngine.ts
- ❌ 不改核心計算公式
- ❌ 不新增 Firestore schema
- ❌ 不新增自動寫入資料功能
- ❌ Viewer read-only 邏輯必須保持
- ✅ Windows PowerShell 相容

## Phase 1 — 問題定位 Root Cause

### 1. Markdown 為什麼沒渲染？

**Root Cause**: `CopilotMessage.tsx` 第 90 行使用 `<Paragraph>` 組件直接渲染 `result.summary`，但沒有任何 Markdown 解析。DeepSeek 回傳的 `##`、`**`、`*` 等 Markdown 語法被當作純文字顯示。

```tsx
<Paragraph style={{ marginBottom: 12 }}>{result.summary}</Paragraph>
```

### 2. F-A-I-R 為什麼沒有視覺結構？

**Root Cause**: DeepSeek 回傳的 AI 回應被整段塞入 `result.summary`，而 `facts`、`assumptions`、`inferences`、`recommends` 陣列都是空的（CopilotChat.tsx 第 148-151 行）：

```tsx
facts: [],
assumptions: [],
inferences: [],
recommendations: [],
```

F-A-I-R 標籤只在文字中以 `[Fact]`、`[Assumption]` 形式出現，沒有被解析成結構化資料。

### 3. Validation warning 為什麼會被觸發？

**Root Cause**:
- **Recommendation 無來源**: `validateSourceReferences` 使用 regex `/bRecommendationb/` 偵測到 `[Recommendation]` 關鍵字，但 `SOURCE_REFERENCE_PATTERN` 要求出現 `source|reference|according to` 等英文關鍵字。DeepSeek 中文回答中的「來源：」不符合 pattern。
- **USD/TWD 直接比較**: `validateCurrencyBpRules` 偵測到 `USD` 和 `TWD` 同時出現就觸發警告，但 DeepSeek 回答中的匯率換算描述（如「已按 1 USD = 32 TWD 換算」）沒有被 `CONVERSION_KEYWORDS` 覆蓋。

### 4. Prompt 是否要求 Recommendation 附 source？

**現狀**: `FAIR_OUTPUT_FORMAT` 說了「Every recommendation must cite source references」，但只是建議，沒有強制格式。DeepSeek 經常忽略。

### 5. Prompt 是否要求明確匯率換算？

**現狀**: `Currency / BP Rules` 段落說「Always state the conversion rate used」，但沒有給出具體格式範例。DeepSeek 經常省略。

---

## Phase 2 — DeepSeek System Prompt 修正

### 修改檔案: `frontend/src/core/aiProviderPromptPack.ts`

**變更摘要**:

1. **FAIR_OUTPUT_FORMAT** 重構:
   - 強制開頭「重點摘要」最多 3 條 bullet
   - 固定段落結構：主要發現 / 數據品質問題 / 產能與稼動率風險 / BP 營收差距 / 建議行動 / 需人工確認的事項
   - 每個段落使用 Markdown bullet
   - 正確標籤：[Fact] / [Assumption] / [Inference] / [Recommendation]
   - 禁止拼錯 [Inference]

2. **Recommendation 必須附來源**:
   - 來源：Data Quality Summary
   - 來源：Capacity Risk Model
   - 來源：BP Analysis
   - 來源：Scenario Result

3. **匯率換算要求**:
   - 涉及 USD/TWD/CNY 比較時必須寫出「以下已按 1 USD = 32 TWD 換算」

4. **禁止「請確認後執行」**:
   - 改成「建議人工確認後再採取行動」
   - 「此建議不會自動寫入系統」

5. **資料品質低時先提醒**:
   - 「由於資料品質不足，以下結論僅作為初步診斷。」

---

## Phase 3 — 回答渲染 UX 重構

### 修改檔案: `frontend/src/components/copilot/CopilotMessage.tsx`

**變更摘要**:

1. **Markdown 渲染器**: 安裝 `react-markdown` + `remark-gfm` 支援 heading/bold/list/inline code
2. **F-A-I-R badge**: 每個標籤有獨立顏色 badge（Fact 藍、Assumption 灰、Inference 紫、Recommendation 綠）
3. **長回答段落化**: 使用 CSS 控制行距、段落距、最大寬度
4. **建議行動獨立區塊**: 淺色背景，不可點擊，不誤導
5. **Warning 區塊**: 改為「品質提示」樣式，可摺疊
6. **「為何產生此回答？」**: 視覺弱化

---

## Phase 4 — Validation Warning 降噪與中文化

### 修改檔案: `frontend/src/core/aiCopilotOutputValidation.ts`

**變更摘要**:

1. `validateSourceReferences`: 增加中文「來源」關鍵字匹配
2. `validateCurrencyBpRules`: 增加「換算」「匯率」等中文關鍵字
3. 新增中文 warning 訊息

### 修改檔案: `frontend/src/i18n/zhTW.ts`

**變更摘要**:
- 新增 validation warning 中文化 key

---

## Phase 5 — 測試

### 測試清單:
1. CopilotMessage markdown rendering test
2. F-A-I-R badge rendering test
3. Recommendation with source should not trigger warning
4. Currency comparison with explicit exchange rate should not trigger warning
5. Chinese output validation test
6. No fake save / no auto execute claim test
7. Snapshot 或 RTL 測試驗證 warning 區塊

---

## Phase 6 — Browser QA

**執行狀態**: 未執行 Browser QA（無可用瀏覽器工具）

**替代方案**:
- 使用 build 驗證編譯通過
- 使用 RTL 測試驗證組件渲染
- 使用 lint 驗證代碼品質

---

## Phase 7 — 驗證命令執行結果

### 1. npm run test
```
Test Files  59 passed (59)
     Tests  1472 passed (1472)
  Start at  10:48:45
Duration  20.12s
```
✅ 全部通過

### 2. npm run lint -- --quiet
```
> eslint . --quiet
(無輸出 = 無錯誤)
```
✅ 通過

### 3. npm run build
```
✓ built in 1.55s
```
✅ 通過

### 4. Secret grep
```
檢查 src/ 和 docs/ 目錄
結果：僅發現變數名稱引用（如 apiKey），無真實 API key
```
✅ 安全

### 5. git diff -- firestore.rules
```
(無輸出 = 無變更)
```
✅ 未修改

### 6. git diff -- src/core/calculationEngine.ts
```
(無輸出 = 無變更)
```
✅ 未修改

---

## Phase 8 — 版本與提交

### 版本同步
- `package.json`: 1.52.0 → 1.52.4
- `package-lock.json`: 同步更新

### 修改檔案清單

1. **src/core/aiProviderPromptPack.ts**
   - FAIR_OUTPUT_FORMAT 重構：強制段落結構
   - 新增「重要禁止用語」段落
   - 禁止「請確認後執行」

2. **src/core/aiCopilotOutputValidation.ts**
   - 新增中文來源關鍵字匹配（來源/依據/根據）
   - 新增中文匯率換算關鍵字匹配（換算/匯率/折算）
   - 新增「請確認後執行」禁止規則
   - Warning 訊息中文化

3. **src/components/copilot/CopilotMessage.tsx**
   - 安裝 react-markdown + remark-gfm
   - 實作 MarkdownRenderer 組件
   - 實作 FairBadge 組件（顏色區分）
   - 實作 QualityHints 組件（可摺疊）
   - 實作 RecommendationBlock 組件（淺色區塊）
   - 視覺弱化「為何產生此回答？」區塊

4. **src/i18n/zhTW.ts**
   - 新增品質提示相關 i18n keys

5. **src/i18n/en.ts**
   - 新增品質提示相關 i18n keys

6. **src/App.css**
   - 新增 .copilot-markdown-content 樣式

7. **src/components/copilot/CopilotMessage.ux.test.tsx**
   - 新增 Markdown 渲染測試
   - 新增 F-A-I-R Badge 渲染測試
   - 新增品質提示測試
   - 新增建議行動區塊測試
   - 新增無假儲存聲明測試

8. **src/core/aiCopilotOutputValidation.test.ts**
   - 新增中文來源引用測試
   - 新增中文匯率換算測試
   - 新增「請確認後執行」禁止測試
   - 新增中文內容完整驗證測試

9. **docs/release/V1_52_4_AI_ASSISTANT_RESPONSE_UX_POLISH_COMMAND_LOG.md**
   - 本命令日誌

10. **package.json / package-lock.json**
    - 新增 react-markdown、remark-gfm 依賴
    - 版本更新至 1.52.4
