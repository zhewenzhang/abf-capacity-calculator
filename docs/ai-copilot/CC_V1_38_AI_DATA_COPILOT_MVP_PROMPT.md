# v1.38.0 AI Data Copilot MVP — Claude Code 實作整合提示

> **版本**: v1.38.0 MVP
> **狀態**: Ready for implementation
> **目標**: 在不修改任何既有核心計算模組的前提下，新增確定性本地 AI Copilot，讓規劃師能在應用內獲得資料品質診斷、產能風險解釋、What-If 分析建議，以及修復草案生成。
> **技術棧**: React 19 + TypeScript + Ant Design 6 + Firebase
> **核心原則**: 無真 AI API 呼叫、無自動寫入、無公式修改、Human-in-the-loop

---

## 一、允許修改檔案 (Allowed Files)

以下檔案可以在本次實作中新增或修改：

### 新增檔案 (NEW)

| 檔案路徑 | 用途 |
|---|---|
| `frontend/src/core/aiCopilotContext.ts` | Context Builder — 從既有模組組裝 Copilot 所需的 sanitized context payload |
| `frontend/src/core/aiCopilotTools.ts` | 6 個確定性診斷 tool 的實作（純函數，無副作用） |
| `frontend/src/core/aiCopilotGuardrails.ts` | Guardrail 常數與驗證工具（10 條紅線檢查） |
| `frontend/src/pages/AiCopilot.tsx` | Copilot 頁面主元件（含 Drawer/Panel 切換） |
| `frontend/src/components/copilot/CopilotChat.tsx` | 對話 UI 元件（訊息串列 + 快速提問按鈕） |
| `frontend/src/components/copilot/CopilotFixCard.tsx` | 修復建議卡片（Before/After 對比 + 確認/拒絕按鈕） |
| `frontend/src/components/copilot/CopilotQuickButtons.tsx` | 快速提問按鈕組元件 |
| `frontend/src/components/copilot/CopilotMessage.tsx` | 單則訊息渲染元件（含 F-A-I-R 標籤） |
| `frontend/src/core/aiCopilotContext.test.ts` | Context Builder 單元測試 |
| `frontend/src/core/aiCopilotTools.test.ts` | 6 個 Tool 的單元測試 |
| `frontend/src/core/aiCopilotGuardrails.test.ts` | Guardrail 驗證的單元測試 |

### 修改檔案 (MODIFY)

| 檔案路徑 | 修改內容 |
|---|---|
| `frontend/src/i18n/en.ts` | 新增 `copilot.*` 系列 i18n key |
| `frontend/src/i18n/zhTW.ts` | 新增對應的繁體中文翻譯 |
| `frontend/src/App.tsx` | 新增 `/copilot` route 與 sidebar menu item |
| `frontend/package.json` | 版本號更新至 `1.38.0`（如需要） |

---

## 二、禁止修改檔案 (Forbidden Files)

以下檔案**絕對不可修改**。這些是既有計算引擎、服務層、安全規則與測試檔案，任何變更都可能破壞現有功能或繞過安全防線：

### 核心計算模組 (Core Calculation — 禁止觸碰)

- `frontend/src/core/calculationEngine.ts`
- `frontend/src/core/analytics.ts`
- `frontend/src/core/bpTargets.ts`
- `frontend/src/core/bpTargetsHelpers.ts`
- `frontend/src/core/dataQuality.ts`
- `frontend/src/core/riskAttribution.ts`
- `frontend/src/core/bpAttribution.ts`
- `frontend/src/core/analysisContract.ts`
- `frontend/src/core/aiBriefExport.ts`
- `frontend/src/core/currency.ts`
- `frontend/src/core/impactAnalysis.ts`
- `frontend/src/core/keyFindings.ts`
- `frontend/src/core/metricDefinitions.ts`
- `frontend/src/core/scenarioEngine.ts`
- `frontend/src/core/changeImpact.ts`
- `frontend/src/core/changeImpactExport.ts`
- `frontend/src/core/forecastGrowth.ts`
- `frontend/src/core/skuDerived.ts`
- `frontend/src/core/defaults.ts`
- `frontend/src/core/formatters.ts`
- `frontend/src/core/panelLayout.ts`
- `frontend/src/core/yieldMatrix.ts`
- `frontend/src/core/validation.ts`
- `frontend/src/core/dataQualityVisibility.ts`
- `frontend/src/core/dataQualityRemediation.ts`
- `frontend/src/core/snapshotMetadata.ts`
- `frontend/src/core/readOnlyGuard.ts`

### 服務層 (Services — 禁止觸碰)

- `frontend/src/services/skuService.ts`
- `frontend/src/services/forecastService.ts`
- `frontend/src/services/capacityService.ts`
- `frontend/src/services/parameterService.ts`
- `frontend/src/services/snapshotService.ts`
- `frontend/src/services/projectScope.ts`
- `frontend/src/services/projectService.ts`
- `frontend/src/services/versionService.ts`
- `frontend/src/services/workspaceService.ts`
- `frontend/src/services/skuVersionService.ts`
- `frontend/src/services/demoDataService.ts`

### 安全規則與既有測試 (Security & Tests — 禁止觸碰)

- `firestore.rules`
- `firebase.json`
- 所有 `*.test.ts` 既有測試檔案（新增測試檔案除外）
- `frontend/src/types/index.ts`

---

## 三、可新增檔案 (New Files to Create)

完整清單如下，每個檔案附帶簡要說明：

```
frontend/src/core/aiCopilotContext.ts          # Context Builder
frontend/src/core/aiCopilotContext.test.ts      # Context Builder 單元測試
frontend/src/core/aiCopilotTools.ts            # 6 個診斷 Tool
frontend/src/core/aiCopilotTools.test.ts       # Tool 單元測試
frontend/src/core/aiCopilotGuardrails.ts       # Guardrail 常數與驗證
frontend/src/core/aiCopilotGuardrails.test.ts  # Guardrail 單元測試
frontend/src/pages/AiCopilot.tsx               # Copilot 頁面主元件
frontend/src/components/copilot/CopilotChat.tsx       # 對話 UI
frontend/src/components/copilot/CopilotFixCard.tsx    # 修復建議卡片
frontend/src/components/copilot/CopilotQuickButtons.tsx # 快速提問按鈕
frontend/src/components/copilot/CopilotMessage.tsx    # 單則訊息渲染
```

---

## 四、MVP 實作任務拆解 (Task Breakdown)

### Task A: `aiCopilotContext.ts` — 確定性 Context Builder

**目標**: 從既有核心模組組裝 Copilot 所需的 sanitized context payload，作為所有 Tool 的輸入。

**職責**:
1. 定義 `AiCopilotContext` 介面，包含：
   - `dataQuality: DataQualitySummary` — 直接複用 `buildDataQualitySummary()` 的回傳型別
   - `analytics: AnalyticsModel` — 直接複用 `buildAnalyticsModel()` 的回傳型別
   - `riskAttribution: RiskAttributionModel` — 直接複用 `buildRiskAttributionModel()` 的回傳型別
   - `bpAnalysis: BpAnalysisModel | null` — 直接複用 `buildBpAnalysis()` 的回傳型別
   - `sanitizedContract: SanitizedAnalysisContract` — 直接複用 `buildSanitizedAnalysisContract()` 的回傳型別
   - `summary: { totalSkus, totalForecasts, totalCapacityPlans, months, years }` — 宏觀統計
   - `role: WorkspaceRole` — 當前用戶角色（用於控制 fix UI 可見性）

2. 實作 `buildAiCopilotContext()` 函數：
   - 簽章: `buildAiCopilotContext(skus, forecasts, capacityPlans, params, model, bpModel?, role): AiCopilotContext`
   - 內部呼叫既有的 `buildDataQualitySummary()`, `buildAnalyticsModel()`, `buildRiskAttributionModel()`, `buildBpAnalysis()`, `buildSanitizedAnalysisContract()`, `buildAnalysisContractPayload()`
   - **不可自行計算任何指標**，僅負責組裝與傳遞

3. 實作 `sanitizeContextForDisplay()` 函數：
   - 移除 `uid`, `email`, `workspaceId`, `ownerUid` 等敏感欄位
   - 確保輸出可安全顯示於 UI

**依賴模組**（僅 import，不可修改）:
- `dataQuality.ts` → `buildDataQualitySummary()`
- `analytics.ts` → `buildAnalyticsModel()`
- `riskAttribution.ts` → `buildRiskAttributionModel()`
- `bpTargets.ts` → `buildBpAnalysis()`
- `analysisContract.ts` → `buildAnalysisContractPayload()`
- `aiBriefExport.ts` → `buildSanitizedAnalysisContract()`

**完成標準**:
- [ ] `AiCopilotContext` 介面定義完整
- [ ] `buildAiCopilotContext()` 正確呼叫所有既有模組
- [ ] `sanitizeContextForDisplay()` 移除所有敏感欄位
- [ ] 單元測試覆蓋正常輸入與空輸入情境

---

### Task B: `aiCopilotTools.ts` — 6 個確定性診斷 Tool

**目標**: 實作 6 個純函數 Tool，每個 Tool 接收 `AiCopilotContext` 並回傳結構化的診斷結果。

**Tool 清單**:

#### Tool 1: `inspectDataQuality(context): CopilotToolResult`
- 分析 `context.dataQuality.issues`
- 按 `severity`（error > warning > info）排序
- 按 `decisionImpact`（high > medium > low）分組
- 回傳格式化的問題清單，每個問題附帶：
  - 問題標題（使用 `titleMessage.key`）
  - 影響範圍（`affectedPeriods`, `affectedSkuIds`）
  - 修復指引（基於 `domain` 生成對應建議）
- F-A-I-R 標籤: 所有問題描述標記為 `[Fact / 事實]`

#### Tool 2: `explainCapacityRisk(context): CopilotToolResult`
- 分析 `context.analytics.yearlyHealth`
- 識別 `shortageMonths`（短缺月份）
- 分析 `maxCoreUtilization` 和 `maxBuUtilization` 是否超過閾值（90%）
- 回傳：
  - 瓶頸月份摘要
  - Core/BU 稼動率分析
  - 短缺趨勢
- F-A-I-R 標籤:
  - 稼動率數值標記為 `[Fact / 事實]`
  - 趨勢判斷標記為 `[Inference / 推論]`

#### Tool 3: `analyzeBpGap(context): CopilotToolResult`
- 分析 `context.bpAnalysis` 和 `context.sanitizedContract.bpAttribution`
- 識別未達標年度（`status === 'miss'`）
- 列出 top drivers（按 `shareOfGap` 排序）
- 回傳：
  - BP 達成率摘要
  - 差距期間與金額
  - 主要驅動因子（附帶比例歸因免責聲明）
- F-A-I-R 標籤:
  - 達成率數值標記為 `[Fact / 事實]`
  - 驅動因子分析標記為 `[Inference / 推論]`
  - 必須附帶: 「此為比例歸因（proportional attribution），非嚴格因果關係」

#### Tool 4: `suggestWhatIf(context, params?): CopilotToolResult`
- 分析 `context.sanitizedContract.priceImpact` 和 `context.sanitizedContract.capacityImpact`
- 回傳預設的 What-If 情境摘要：
  - 價格 ±10% 對 BP 達成率的影響
  - Core/BU +10% 產能擴充可解除的缺口月份數
- 接受可選 `params` 以調整情境參數
- F-A-I-R 標籤: 所有情境結果標記為 `[Inference / 推論]`

#### Tool 5: `generateFixDraft(context, fixType): CopilotFixDraft`
- 根據 `fixType` 生成修復草案：
  - `'missing-forecast'`: 建議補齊缺失月份的預測資料
  - `'zero-price'`: 建議補齊零價格 SKU 的單價
  - `'missing-capacity'`: 建議補齊缺失月份的產能規劃
  - `'low-yield'`: 建議檢視低良率 SKU 的設定
- 回傳 `CopilotFixDraft` 介面：
  - `fixType: string`
  - `description: string`（繁體中文說明）
  - `beforeState: Record<string, unknown>`（當前狀態摘要）
  - `afterState: Record<string, unknown>`（建議修改後狀態）
  - `affectedItems: Array<{ id, label, field, currentValue, suggestedValue }>`
  - `requiresConfirmation: true`（固定為 true，強制 human-in-the-loop）
- **不可包含任何寫入邏輯**，僅生成草案物件

#### Tool 6: `buildExportPack(context): string`
- 呼叫既有的 `buildSanitizedAnalysisContract()` 和 `buildChineseAiBriefPrompt()`
- 組合為可複製的 Prompt + JSON 文字
- 回傳 UTF-8 編碼的完整文字

**共用型別定義**:

```typescript
interface CopilotToolResult {
  toolId: string;
  title: string;           // 工具標題（i18n key）
  titleMessage: LocalizedMessage;
  content: string;         // 格式化的診斷文字（繁體中文）
  fairTag: 'Fact' | 'Assumption' | 'Inference' | 'Recommendation';
  fairLabel: string;       // "[Fact / 事實]" 等
  severity?: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

interface CopilotFixDraft {
  fixType: string;
  description: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  affectedItems: Array<{
    id: string;
    label: string;
    field: string;
    currentValue: unknown;
    suggestedValue: unknown;
  }>;
  requiresConfirmation: true;
}
```

**完成標準**:
- [ ] 6 個 Tool 函數全部實作
- [ ] 每個 Tool 回傳結構化的 `CopilotToolResult` 或 `CopilotFixDraft`
- [ ] F-A-I-R 標籤正確標記
- [ ] `generateFixDraft` 不包含任何寫入邏輯
- [ ] `buildExportPack` 正確複用既有模組
- [ ] 單元測試覆蓋每個 Tool 的正常與邊界情境

---

### Task C: `AiCopilot.tsx` — 頁面主元件

**目標**: 建立 Copilot 頁面，作為所有 Copilot UI 的容器。

**UI 結構**:
```
┌─────────────────────────────────────────────┐
│ AI Copilot                          [v1.38] │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │          CopilotChat 元件               │ │
│ │  ┌─────────────────────────────────┐    │ │
│ │  │  訊息串列 (scrollable)           │    │ │
│ │  │  - 系統歡迎訊息                  │    │ │
│ │  │  - 用戶提問                      │    │ │
│ │  │  - Copilot 回覆（含 F-A-I-R）   │    │ │
│ │  │  - FixCard（如適用）             │    │ │
│ │  └─────────────────────────────────┘    │ │
│ │  ┌─────────────────────────────────┐    │ │
│ │  │  快速提問按鈕組                   │    │ │
│ │  │  [資料品質] [產能風險] [BP差距]  │    │ │
│ │  │  [What-If]  [修復建議] [匯出]    │    │ │
│ │  └─────────────────────────────────┘    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │  Context 狀態列                          │ │
│ │  SKU: 42 | 預測: 504 | 月份: 42        │ │
│ │  資料品質: ⚠️ warning (72/100)          │ │
│ │  角色: editor                            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**實作要點**:
1. 使用 `useActiveScope()` 取得當前 scope
2. 透過既有 service 載入 SKU、Forecast、CapacityPlan、Parameters 資料
3. 呼叫 `buildAiCopilotContext()` 組裝 context
4. 將 context 傳遞給 `CopilotChat` 元件
5. 使用 Ant Design `Card` + `Space` 佈局
6. 支援 Drawer 模式（可從其他頁面觸發）

**完成標準**:
- [ ] 頁面可正常載入並顯示 context 狀態列
- [ ] 快速提問按鈕可觸發對應 Tool
- [ ] 訊息串列可滾動顯示
- [ ] 角色為 viewer 時隱藏 fix 相關 UI

---

### Task D: `CopilotChat.tsx` — 對話 UI 元件

**目標**: 實作對話式 UI，支援用戶提問與 Copilot 回覆。

**Props**:
```typescript
interface CopilotChatProps {
  context: AiCopilotContext;
  onToolCall: (toolId: string, params?: Record<string, unknown>) => CopilotToolResult;
  onFixRequest: (fixType: string) => CopilotFixDraft;
  onExport: () => string;
}
```

**功能**:
1. 訊息串列：
   - 系統歡迎訊息（i18n: `copilot.welcome`）
   - 用戶提問氣泡（右側，藍色）
   - Copilot 回覆氣泡（左側，灰色），內含 F-A-I-R 標籤
   - 時間戳記

2. 輸入區：
   - 文字輸入框（`Input.TextArea`）
   - 送出按鈕
   - 快速提問按鈕組（委派給 `CopilotQuickButtons`）

3. 訊息解析：
   - 用戶輸入關鍵字匹配 → 觸發對應 Tool
   - 匹配規則：
     - "資料品質" / "data quality" / "DQ" → `inspectDataQuality`
     - "產能" / "capacity" / "風險" / "risk" → `explainCapacityRisk`
     - "BP" / "差距" / "gap" / "達成" → `analyzeBpGap`
     - "What-If" / "情境" / "假設" / "如果" → `suggestWhatIf`
     - "修復" / "fix" / "建議" / "suggest" → `generateFixDraft`
     - "匯出" / "export" / "prompt" / "複製" → `buildExportPack`

4. 無匹配時：
   - 顯示提示訊息：「請選擇快速提問按鈕，或輸入關鍵字（資料品質、產能風險、BP差距、What-If、修復建議、匯出）」

**完成標準**:
- [ ] 訊息氣泡正確渲染
- [ ] 快速提問按鈕觸發對應 Tool
- [ ] 關鍵字匹配邏輯覆蓋所有 6 個 Tool
- [ ] F-A-I-R 標籤正確顯示
- [ ] 空輸入顯示提示訊息

---

### Task E: `CopilotFixCard.tsx` — 修復建議卡片

**目標**: 渲染 `CopilotFixDraft`，提供 Before/After 對比與確認/拒絕操作。

**Props**:
```typescript
interface CopilotFixCardProps {
  draft: CopilotFixDraft;
  onConfirm: (draft: CopilotFixDraft) => void;
  onReject: () => void;
  canFix: boolean;  // 基於 role，viewer 為 false
}
```

**UI 結構**:
```
┌─────────────────────────────────────────────┐
│ 🔧 修復建議: {draft.fixType}               │
│ {draft.description}                         │
├─────────────────────────────────────────────┤
│ 項目          | 目前值     | 建議值          │
│─────────────────────────────────────────────│
│ SKU-001 單價  | $0.00     | $2.50           │
│ SKU-002 單價  | $0.00     | $1.80           │
├─────────────────────────────────────────────┤
│ ⚠️ 此為建議草案，需人工確認後套用         │
│                                             │
│ [拒絕]                          [確認套用]  │
└─────────────────────────────────────────────┘
```

**行為**:
- `canFix === false`（viewer 角色）時：
  - 隱藏「確認套用」按鈕
  - 顯示唯讀提示：「您為檢視者，無法套用修復」
- `canFix === true`（owner/editor 角色）時：
  - 「確認套用」按鈕可點擊
  - 點擊後彈出 Ant Design `Modal.confirm()` 二次確認
  - 確認後呼叫 `onConfirm(draft)` — **注意：onConfirm 僅傳遞草案，實際寫入由父元件決定**
- 「拒絕」按鈕：清除卡片，回到對話串

**完成標準**:
- [ ] Before/After 表格正確渲染
- [ ] viewer 角色無法看到確認按鈕
- [ ] 二次確認 Modal 正常運作
- [ ] 拒絕按鈕可清除卡片

---

### Task F: i18n Keys — 英文與繁體中文

**目標**: 在 `en.ts` 和 `zhTW.ts` 中新增 Copilot 相關的 i18n key。

**需要新增的 Key 清單**:

```typescript
// en.ts 新增
'copilot.title': 'AI Copilot',
'copilot.welcome': 'Welcome! I can help you analyze data quality, capacity risks, BP gaps, and suggest What-If scenarios. Use the quick buttons below or type a keyword.',
'copilot.quick.dq': 'Data Quality',
'copilot.quick.capacity': 'Capacity Risk',
'copilot.quick.bp': 'BP Gap',
'copilot.quick.whatif': 'What-If',
'copilot.quick.fix': 'Suggest Fix',
'copilot.quick.export': 'Export Prompt',
'copilot.context.skus': 'SKUs',
'copilot.context.forecasts': 'Forecasts',
'copilot.context.months': 'Months',
'copilot.context.dqStatus': 'Data Quality',
'copilot.context.role': 'Role',
'copilot.tool.dq.title': 'Data Quality Inspection',
'copilot.tool.capacity.title': 'Capacity Risk Analysis',
'copilot.tool.bp.title': 'BP Gap Analysis',
'copilot.tool.whatif.title': 'What-If Scenario',
'copilot.tool.fix.title': 'Fix Suggestion',
'copilot.tool.export.title': 'Export Pack',
'copilot.fix.confirm': 'Apply Fix',
'copilot.fix.reject': 'Reject',
'copilot.fix.viewerNoPermission': 'You are a viewer — fix is read-only.',
'copilot.fix.confirmTitle': 'Confirm Fix',
'copilot.fix.confirmDesc': 'This will modify data. Are you sure?',
'copilot.fix.currentValue': 'Current',
'copilot.fix.suggestedValue': 'Suggested',
'copilot.noMatch': 'No matching tool found. Try: data quality, capacity risk, BP gap, What-If, suggest fix, export.',
'copilot.fair.fact': '[Fact]',
'copilot.fair.assumption': '[Assumption]',
'copilot.fair.inference': '[Inference]',
'copilot.fair.recommendation': '[Recommendation]',
'copilot.attributionWarning': 'This is proportional attribution, not strict causal analysis.',

// zhTW.ts 新增
'copilot.title': 'AI 資料副駕駛',
'copilot.welcome': '歡迎！我可以協助您分析資料品質、產能風險、BP 差距，並提供 What-If 情境建議。請使用下方快速按鈕或輸入關鍵字。',
'copilot.quick.dq': '資料品質',
'copilot.quick.capacity': '產能風險',
'copilot.quick.bp': 'BP 差距',
'copilot.quick.whatif': 'What-If 情境',
'copilot.quick.fix': '修復建議',
'copilot.quick.export': '匯出 Prompt',
'copilot.context.skus': '產品 SKU',
'copilot.context.forecasts': '預測筆數',
'copilot.context.months': '月份數',
'copilot.context.dqStatus': '資料品質',
'copilot.context.role': '角色',
'copilot.tool.dq.title': '資料品質檢查',
'copilot.tool.capacity.title': '產能風險分析',
'copilot.tool.bp.title': 'BP 差距分析',
'copilot.tool.whatif.title': 'What-If 情境分析',
'copilot.tool.fix.title': '修復建議',
'copilot.tool.export.title': '匯出分析包',
'copilot.fix.confirm': '套用修復',
'copilot.fix.reject': '拒絕',
'copilot.fix.viewerNoPermission': '您為檢視者，無法套用修復。',
'copilot.fix.confirmTitle': '確認修復',
'copilot.fix.confirmDesc': '此操作將修改資料，確定要繼續嗎？',
'copilot.fix.currentValue': '目前值',
'copilot.fix.suggestedValue': '建議值',
'copilot.noMatch': '找不到對應工具。請嘗試：資料品質、產能風險、BP差距、What-If、修復建議、匯出。',
'copilot.fair.fact': '[Fact / 事實]',
'copilot.fair.assumption': '[Assumption / 假設]',
'copilot.fair.inference': '[Inference / 推論]',
'copilot.fair.recommendation': '[Recommendation / 建議]',
'copilot.attributionWarning': '此為比例歸因（proportional attribution），非嚴格因果關係。',
```

**完成標準**:
- [ ] `en.ts` 新增所有 copilot key
- [ ] `zhTW.ts` 新增對應翻譯
- [ ] key 數量一致（i18n parity test 通過）
- [ ] 無 mojibake 或簡體中文混入

---

### Task G: `App.tsx` — Route 與 Menu 項目

**目標**: 在既有 App.tsx 中新增 Copilot 頁面的路由與側邊欄入口。

**修改內容**:

1. 新增 lazy import:
```typescript
const AiCopilotPage = lazy(() => import('./pages/AiCopilot'));
```

2. 新增 sidebar menu item（在 `scenario` 之後）:
```typescript
{ key: 'copilot', icon: <RobotOutlined />, label: t('menu.copilot') },
```
- 需要從 `@ant-design/icons` 引入 `RobotOutlined`（或使用 `BulbOutlined` 作為備選）

3. 新增 route:
```typescript
<Route path="/copilot" element={<AiCopilotPage key={routeKey} scope={scope} />} />
```

4. 更新 `validKeys` 陣列:
```typescript
const validKeys = ['dashboard', 'products', 'products-sheet-lab', 'forecasts', 'forecasts-lab', 'capacity', 'capacity-lab', 'parameters', 'bp-targets', 'results', 'scenario', 'copilot'];
```

5. 更新 `pageTitles`:
```typescript
copilot: t('copilot.title'),
```

6. i18n key 新增:
```typescript
// en.ts
'menu.copilot': 'AI Copilot',

// zhTW.ts
'menu.copilot': 'AI 副駕駛',
```

**Feature Flag 機制**（用於 rollback）:
- 在 `App.tsx` 中定義常數 `const COPILOT_ENABLED = true;`
- menu item 和 route 均以 `COPILOT_ENABLED` 為條件渲染
- 設為 `false` 即可隱藏 Copilot 功能，無需刪除程式碼

**完成標準**:
- [ ] `/copilot` 路由可正常導航
- [ ] 側邊欄顯示 Copilot 項目
- [ ] `COPILOT_ENABLED = false` 時項目隱藏
- [ ] 頁面標題正確顯示

---

### Task H: 單元測試 (Unit Tests)

**目標**: 確保所有新增核心模組的正確性與安全邊界。

#### H1: `aiCopilotContext.test.ts`

```typescript
describe('buildAiCopilotContext', () => {
  it('should return valid context with full input data')
  it('should handle empty SKUs array')
  it('should handle empty forecasts array')
  it('should handle empty capacity plans array')
  it('should correctly pass through dataQuality from buildDataQualitySummary')
  it('should correctly pass through analytics from buildAnalyticsModel')
  it('should set role from input parameter')
})

describe('sanitizeContextForDisplay', () => {
  it('should remove uid fields')
  it('should remove email fields')
  it('should remove workspaceId fields')
  it('should preserve numeric and string data fields')
})
```

#### H2: `aiCopilotTools.test.ts`

```typescript
describe('inspectDataQuality', () => {
  it('should list issues sorted by severity (error > warning > info)')
  it('should group by decisionImpact')
  it('should return Fact tag for all issue descriptions')
  it('should handle empty issues array')
})

describe('explainCapacityRisk', () => {
  it('should identify months with utilization > 90%')
  it('should identify shortage months')
  it('should tag utilization values as Fact')
  it('should tag trend analysis as Inference')
})

describe('analyzeBpGap', () => {
  it('should identify years with status === miss')
  it('should list top drivers sorted by shareOfGap')
  it('should include proportional attribution disclaimer')
  it('should tag attainment as Fact, drivers as Inference')
})

describe('suggestWhatIf', () => {
  it('should return price impact scenarios')
  it('should return capacity impact scenarios')
  it('should tag all scenarios as Inference')
})

describe('generateFixDraft', () => {
  it('should generate draft for missing-forecast fixType')
  it('should generate draft for zero-price fixType')
  it('should generate draft for missing-capacity fixType')
  it('should set requiresConfirmation to true')
  it('should NOT contain any service import or write logic')
})

describe('buildExportPack', () => {
  it('should return valid prompt + JSON string')
  it('should reuse buildSanitizedAnalysisContract')
  it('should reuse buildChineseAiBriefPrompt')
})
```

#### H3: `aiCopilotGuardrails.test.ts`

```typescript
describe('guardrail validation', () => {
  it('should have 10 veto red lines defined')
  it('each red line should have id, description, check function')
})

describe('guardrail grep checks', () => {
  it('aiCopilotContext.ts should NOT import from services/')
  it('aiCopilotTools.ts should NOT import from services/')
  it('aiCopilotTools.ts should NOT contain save/write/update/delete patterns')
  it('aiCopilotContext.ts should NOT contain save/write/update/delete patterns')
})
```

**完成標準**:
- [ ] 所有測試檔案建立
- [ ] `npm run test` 通過
- [ ] 無既有測試被破壞

---

## 五、測試要求 (Testing Requirements)

### 5.1 單元測試

| 測試檔案 | 覆蓋目標 |
|---|---|
| `aiCopilotContext.test.ts` | `buildAiCopilotContext()`, `sanitizeContextForDisplay()` |
| `aiCopilotTools.test.ts` | 6 個 Tool 函數的正常與邊界情境 |
| `aiCopilotGuardrails.test.ts` | Guardrail 常數完整性與 grep 檢查 |

### 5.2 整合測試

- Context → Tool → Output 端到端流程驗證
- 使用 fixture data 建立 context，依序呼叫 Tool，驗證輸出格式

### 5.3 Guardrail Grep 檢查

在 CI 或手動驗證時執行以下 grep 檢查：

```bash
# 確認 core 模組不引入 service 層
grep -r "from.*services/" frontend/src/core/aiCopilotContext.ts && echo "FAIL: service import in context" || echo "PASS"
grep -r "from.*services/" frontend/src/core/aiCopilotTools.ts && echo "FAIL: service import in tools" || echo "PASS"

# 確認無自動儲存模式
grep -rn "save\|write\|update\|delete\|setDoc\|addDoc\|updateDoc\|deleteDoc" frontend/src/core/aiCopilotContext.ts frontend/src/core/aiCopilotTools.ts && echo "FAIL: auto-save pattern found" || echo "PASS"

# 確認無 AI API 呼叫
grep -rn "fetch\|axios\|openai\|anthropic\|gemini\|claude" frontend/src/core/aiCopilotContext.ts frontend/src/core/aiCopilotTools.ts frontend/src/pages/AiCopilot.tsx frontend/src/components/copilot/ && echo "FAIL: API call found" || echo "PASS"

# 確認無硬編碼 API key
grep -rn "sk-\|api_key\|apiKey\|API_KEY" frontend/src/ && echo "FAIL: hardcoded key found" || echo "PASS"
```

### 5.4 角色權限測試

- Viewer 角色：確認 `CopilotFixCard` 不顯示「確認套用」按鈕
- Editor 角色：確認「確認套用」按鈕可點擊
- Owner 角色：確認完整功能可用

---

## 六、Release Checklist

實作完成後，依序執行以下檢查：

- [ ] `npm run test` — 所有測試通過（含新增與既有）
- [ ] `npm run lint -- --quiet` — 無 lint 錯誤
- [ ] `npm run build` — 建置成功，無 TypeScript 錯誤
- [ ] Guardrail grep 檢查 — 全部 PASS
- [ ] Viewer 角色測試 — fix UI 不可見
- [ ] 無真 AI API 呼叫 — 所有回應為確定性本地輸出
- [ ] i18n key parity — `en.ts` 與 `zhTW.ts` key 數量一致
- [ ] Feature flag 可用 — `COPILOT_ENABLED = false` 時功能隱藏
- [ ] 無 Firestore schema 變更 — firestore.rules 未修改

---

## 七、Rollback Plan

### 7.1 Feature Flag 隱藏

```typescript
// App.tsx
const COPILOT_ENABLED = false; // 設為 false 即隱藏
```

- 側邊欄 Copilot 項目隱藏
- `/copilot` 路由導回首頁
- 無需修改任何其他檔案

### 7.2 完整移除

如需完全移除 Copilot 功能：

1. 刪除以下檔案：
   - `frontend/src/core/aiCopilotContext.ts`
   - `frontend/src/core/aiCopilotContext.test.ts`
   - `frontend/src/core/aiCopilotTools.ts`
   - `frontend/src/core/aiCopilotTools.test.ts`
   - `frontend/src/core/aiCopilotGuardrails.ts`
   - `frontend/src/core/aiCopilotGuardrails.test.ts`
   - `frontend/src/pages/AiCopilot.tsx`
   - `frontend/src/components/copilot/`（整個目錄）

2. 從 `App.tsx` 移除：
   - `AiCopilotPage` lazy import
   - `copilot` menu item
   - `/copilot` route
   - `COPILOT_ENABLED` 常數

3. 從 `en.ts` 和 `zhTW.ts` 移除所有 `copilot.*` key

### 7.3 安全保證

- **無 Firestore schema 變更**：不需回滾任何資料庫結構
- **無 service 層變更**：不影響任何既有 CRUD 操作
- **無計算引擎變更**：不影響任何產能計算邏輯
- **純前端新增**：移除檔案即可完全回滾

---

## 八、完成報告格式

實作完成後，產出以下格式的報告：

```markdown
# v1.38.0 AI Data Copilot MVP — 完成報告

## 檔案變更摘要

### 新增檔案
| 檔案 | 行數 | 用途 |
|---|---|---|
| frontend/src/core/aiCopilotContext.ts | ~XXX | Context Builder |
| frontend/src/core/aiCopilotTools.ts | ~XXX | 6 個診斷 Tool |
| ... | ... | ... |

### 修改檔案
| 檔案 | 變更行數 | 變更內容 |
|---|---|---|
| frontend/src/i18n/en.ts | +XX | copilot i18n keys |
| frontend/src/i18n/zhTW.ts | +XX | copilot 翻譯 |
| frontend/src/App.tsx | +XX | route + menu |

## 測試結果

- npm run test: PASS (XX tests, 0 failures)
- npm run lint -- --quiet: PASS
- npm run build: PASS

## Guardrail 檢查結果

- [PASS] aiCopilotContext.ts 無 service import
- [PASS] aiCopilotTools.ts 無 service import
- [PASS] 無自動儲存模式
- [PASS] 無 AI API 呼叫
- [PASS] 無硬編碼 API key

## 角色權限測試

- [PASS] Viewer: fix UI 隱藏
- [PASS] Editor: fix UI 可用
- [PASS] Owner: 完整功能

## Commit Hash
`abc1234` — feat(copilot): add v1.38 AI Data Copilot MVP
```

---

## 九、第一版不接真 AI API (No Real AI API in v1.38)

### 9.1 核心原則

v1.38 MVP 的所有回應均為**確定性本地工具輸出**，不涉及任何 AI API 呼叫：

- `aiCopilotContext.ts` 從既有模組組裝資料
- `aiCopilotTools.ts` 以純 JavaScript 函數格式化回應
- 所有診斷結果基於數學計算與規則引擎，非機率性生成
- F-A-I-R 分類由程式邏輯決定，非 AI 判斷

### 9.2 為何不接 API

| 原因 | 說明 |
|---|---|
| 安全性 | 避免 API key 在前端暴露 |
| 穩定性 | 確定性輸出可測試、可重現 |
| 成本 | 無 API 調用費用 |
| 速度 | 本地計算即時回應 |
| 合規 | 不涉及外部資料傳輸 |

### 9.3 用戶仍可使用外部 AI

透過 `buildExportPack()` Tool，用戶可以：
1. 一鍵複製 sanitized 的 Prompt + JSON
2. 貼到外部 AI 工具（Claude、ChatGPT、Gemini）
3. 在外部環境進行深度分析
4. 所有敏感資料已在本地清洗，可安全分享

---

## 十、未來接 API 的規劃 (Future API Integration Plan)

### 10.1 架構要求

當 v1.39+ 決定接入真 AI API 時，必須遵循以下架構：

```
┌──────────┐     ┌──────────────────┐     ┌─────────────┐
│ Frontend │────>│ Cloud Function   │────>│ AI Provider │
│ (client) │     │ (server-side)    │     │ (Claude/    │
│          │<────│ - API key 處理   │<────│  GPT/etc)   │
│          │     │ - Rate limiting  │     │             │
│          │     │ - Error handling │     └─────────────┘
└──────────┘     └──────────────────┘
```

### 10.2 安全規則

| 規則 | 說明 |
|---|---|
| **API key 必須在伺服器端** | 絕不在前端程式碼中硬編碼或暴露 API key |
| **Cloud Functions 代理** | 所有 AI API 呼叫必須透過 Firebase Cloud Functions 轉發 |
| **替代方案：用戶自帶 key** | 如採用 user-provided session key，必須：(1) 儲存在 `sessionStorage`（非 `localStorage`），(2) 絕不寫入 Firestore，(3) 頁面關閉即清除 |
| **Rate limiting** | Cloud Functions 端實作速率限制（如 10 req/min/user） |
| **Error handling** | API 不可用時優雅降級至本地確定性工具 |
| **Graceful degradation** | 即使 API 完全不可用，v1.38 的 6 個本地 Tool 仍正常運作 |

### 10.3 前端擴充點

在 `aiCopilotTools.ts` 中預留的擴充介面：

```typescript
// 未來可擴充的 AI tool 介面
interface AiEnhancedTool {
  toolId: string;
  localFallback: (context: AiCopilotContext) => CopilotToolResult;
  remoteEnhanced?: (context: AiCopilotContext, apiKey: string) => Promise<CopilotToolResult>;
}

// Tool 執行策略
function executeTool(tool: AiEnhancedTool, context: AiCopilotContext, apiKey?: string): CopilotToolResult | Promise<CopilotToolResult> {
  if (apiKey && tool.remoteEnhanced) {
    return tool.remoteEnhanced(context, apiKey);
  }
  return tool.localFallback(context);
}
```

### 10.4 不實作清單（永禁止）

- **永不**在前端儲存 API key 到 `localStorage` 或 Firestore
- **永不**讓 AI 直接呼叫 `services/*.ts` 的寫入 API
- **永不**讓 AI 修改 `calculationEngine.ts` 的公式
- **永不**跳過 human-in-the-loop 確認流程
- **永不**讓 AI 自主做出商業決策（採購、排產、調價）

---

## 附錄 A: 10 條 Veto Red Lines 完整定義

| # | 紅線 | 檢查方式 |
|---|---|---|
| 1 | 不可修改公式 | grep 無 formula/計算邏輯變更 |
| 2 | 不可發明資料 | Tool 僅使用 context 內資料 |
| 3 | 不可跨幣別比較 | 回應中明確標示幣別 |
| 4 | 不可將歸因當因果 | 附帶比例歸因免責聲明 |
| 5 | 不可違反假設 | 尊重 assumptions 欄位 |
| 6 | 不可繞過信心等級 | blocked 時不產出建議 |
| 7 | 不可自動商業決策 | 無自動寫入 |
| 8 | 不可繞過 human-in-the-loop | requiresConfirmation: true |
| 9 | 不可違反 metric registry | 使用既有 metricDefinitions |
| 10 | 不可過度承諾 | F-A-I-R 標籤區分事實與推論 |

---

## 附錄 B: Copilot 回應範例

### 範例 1: inspectDataQuality 回應

```
📋 資料品質檢查結果

[Fact / 事實] 發現 3 個高優先度問題：

1. ❌ [error] 缺失預測資料
   影響範圍: SKU-042 在 2026-07 至 2026-12 無預測
   修復指引: 請至「預測」頁面補齊該 SKU 的月度預測數量

2. ⚠️ [warning] 零價格 SKU
   影響範圍: SKU-018, SKU-023 單價為 $0
   修復指引: 請至「產品」頁面設定正確的 unitPrice

3. ℹ️ [info] 缺失產能規劃
   影響範圍: 2027-01 至 2027-03 無產能規劃
   修復指引: 請至「產能規劃」頁面補齊未來月份的產能設定

信心等級: medium (72/100)
```

### 範例 2: explainCapacityRisk 回應

```
📊 產能風險分析

[Fact / 事實] 關鍵數值：
- Core 最高稼動率: 95.2%（2026-09）
- BU 最高稼動率: 88.7%（2026-10）
- 缺口月份數: 4 個月

[Inference / 推論] 趨勢分析：
- 2026-Q3 至 Q4 為產能壓力高峰期
- Core 產能在 2026-09 超過 90% 閾值，建議關注
- BU 產能尚有餘裕，短期無缺口風險

[Recommendation / 建議]：
- 建議評估 2026-Q3 的 Core 產能擴充方案
- 可使用 What-If 工具評估 +10% 產能的效果
```
