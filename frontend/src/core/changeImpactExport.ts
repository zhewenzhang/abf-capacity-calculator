/**
 * Change Impact Pack Export (Phase 6).
 *
 * Exports a sanitized Change Impact Pack for external AI analysis (DeepSeek V4-Flash).
 * Follows the same sanitization pattern as aiBriefExport.ts.
 *
 * IMPORTANT: This module does NOT call any AI API. It only prepares data
 * for users to copy and paste into external AI tools.
 */

import type { ChangeImpactResult } from './changeImpact';

/**
 * Sanitized Change Impact Pack for external AI consumption.
 */
export interface SanitizedChangeImpactPack {
  version: '1.0';
  generatedAt: string;
  appVersion: string;
  baseSnapshot: {
    id: string;
    name: string;
    createdAt: string;
  };
  targetSnapshot: {
    id: string;
    name: string;
    createdAt: string;
  };
  summary: ChangeImpactResult['summary'];
  priceQuantityAttribution: ChangeImpactResult['priceQuantityAttribution'];
  topChangedCustomers: Array<{
    label: string;
    revenueDeltaUsd: number;
    revenueDeltaPercent: number;
  }>;
  topChangedSkus: Array<{
    label: string;
    revenueDeltaUsd: number;
    revenueDeltaPercent: number;
  }>;
  topChangedMonths: Array<{
    label: string;
    revenueDeltaUsd: number;
    revenueDeltaPercent: number;
  }>;
  aiGuardrails: {
    attributionWarning: string[];
    factVsInference: string[];
    noCausalClaims: string[];
  };
  analysisPrompt: string;
}

/**
 * Build a sanitized Change Impact Pack for external AI consumption.
 */
export function buildSanitizedChangeImpactPack(
  result: ChangeImpactResult
): SanitizedChangeImpactPack {
  return {
    version: '1.0',
    generatedAt: result.generatedAt,
    appVersion: result.appVersion,
    baseSnapshot: {
      id: result.baseSnapshot.id,
      name: result.baseSnapshot.name,
      createdAt: result.baseSnapshot.createdAt,
    },
    targetSnapshot: {
      id: result.targetSnapshot.id,
      name: result.targetSnapshot.name,
      createdAt: result.targetSnapshot.createdAt,
    },
    summary: result.summary,
    priceQuantityAttribution: result.priceQuantityAttribution,
    topChangedCustomers: result.topChangedCustomers.map((c) => ({
      label: c.label,
      revenueDeltaUsd: c.revenueDeltaUsd,
      revenueDeltaPercent: c.revenueDeltaPercent ?? 0,
    })),
    topChangedSkus: result.topChangedSkus.map((s) => ({
      label: s.label,
      revenueDeltaUsd: s.revenueDeltaUsd,
      revenueDeltaPercent: s.revenueDeltaPercent ?? 0,
    })),
    topChangedMonths: result.topChangedMonths.map((m) => ({
      label: m.label,
      revenueDeltaUsd: m.revenueDeltaUsd,
      revenueDeltaPercent: m.revenueDeltaPercent ?? 0,
    })),
    aiGuardrails: {
      attributionWarning: [
        'All attribution is PROPORTIONAL, not causal.',
        'A "top changed customer" means that customer\'s revenue changed significantly.',
        'It does NOT mean the customer caused the change.',
        'Price vs quantity attribution shows first-order effects only.',
      ],
      factVsInference: [
        'Facts: The numeric deltas between snapshots are facts.',
        'Attribution: Revenue attribution to customers/SKUs is proportional.',
        'Inference: Any explanation of "why" something changed is inference.',
        'Recommendation: Any suggested action is a recommendation.',
      ],
      noCausalClaims: [
        'DO NOT claim that any customer/SKU "caused" a change.',
        'DO NOT assign responsibility for revenue changes.',
        'DO NOT make business decisions based solely on this data.',
        'Always require human review before taking action.',
      ],
    },
    analysisPrompt: buildDeepSeekPrompt(),
  };
}

/**
 * Build the Chinese Change Impact analysis prompt for DeepSeek V4-Flash.
 */
function buildDeepSeekPrompt(): string {
  return `## 角色定位

你是 ABF 載板產能與產品規劃變更分析顧問。
你的任務是根據提供的 Change Impact Pack 資料，分析兩個資料快照之間的變化。

## 快照比較方向

⚠️ 重要：比較方向為「目標快照 − 基準快照」（Target − Base）
- Base Snapshot（基準快照）= 舊版本
- Target Snapshot（目標快照）= 新版本
- 所有 Delta 數值 = Target − Base

例如：
- Revenue Delta = +100,000 USD 表示新版本比舊版本多 100,000 USD 營收
- Shortage Month Delta = -2 表示新版本比舊版本少 2 個短缺月份

## F-A-I-R 分類架構

你必須在分析中明確標記每一項內容的類型：

1. **[Fact / 事實]**：數字本身及其直接計算結果
   - 例：「營收增加 100,000 USD（+10%）」
   - 例：「短缺月份從 3 個減少到 1 個」

2. **[Attribution / 比例歸因]**：依營收比例分攤的數值
   - 例：「客戶 TSMC 佔總營收變化的 16.7%（比例歸因）」
   - ⚠️ 這是比例分攤，不是因果關係

3. **[Inference / 推論]**：對「為什麼發生變化」的解釋
   - 例：「價格驅動佔 30%，可能與單價調整有關」（需明確標記為推論）
   - ⚠️ 推論需要人類驗證

4. **[Recommendation / 建議]**：建議的行動方向
   - 例：「建議確認 TSMC 的訂單變化原因」
   - ⚠️ 建議僅供參考，不可直接作為決策

## ⚠️ 嚴格禁止事項

### 1. 不可修改公式
- 所有計算公式已固定，不可更動
- 不可假設不同的計算邏輯

### 2. 不可補充缺失資料
- 不可自行假設或補充未提供的數值
- 如有資料不足，請明確標記並建議人類查證

### 3. 不可混淆貨幣單位
- 營收（Revenue）以 USD 計算
- BP 目標（BP Target）以百萬 TWD 計算
- ⚠️ 不可直接比較 USD 營收與 TWD BP 目標
- 匯率換算已在系統內部處理

### 4. 不可將比例歸因說成因果
- 「變動最大的客最大的客戶」僅表示該客戶的營收變化幅度大
- 不表示該客戶「造成」了變化
- 不可將比例歸因解讀為責任分配
- Price vs Quantity attribution 是一階拆解，不是完整因果模型

### 5. 不可跳過人類確認
- 所有分析結論都需要人類確認
- 不可直接做出商業決策
- 不可宣稱「應該」採取某個行動

## 輸出格式建議

### 1. Executive Summary（一句話結論）
用一句話總結這次比較最重要的發現。

### 2. What Changed（什麼改變了）
列出主要數值變化，全部標記為 [Fact / 事實]。

### 3. Business Impact（營收與 BP 影響）
分析營收和 BP 達成率的變化，清楚標記 [Fact] 和 [Attribution]。

### 4. Capacity Risk Impact（產能風險影響）
分析短缺月份、稼動率變化，標記 [Fact] 和 [Inference]。

### 5. Top Changes Analysis（主要變更分析）
分析 Top changed customers / SKUs / months，明確標記 [Attribution]，
並說明這是比例歸因非因果。

### 6. Data Caveats（資料限制與注意事項）
列出資料品質問題、缺失項目、需要注意的事項。

### 7. Questions for Human Review（需要人類確認的問題）
列出需要人類進一步確認的事項，格式為問題。

---

以下是受控 Change Impact Pack JSON，請只根據此資料分析：`;
}

/**
 * Build the Combined Change Impact Pack (Prompt + Sanitized JSON).
 */
export function buildCombinedChangeImpactPack(result: ChangeImpactResult): string {
  const sanitized = buildSanitizedChangeImpactPack(result);
  const jsonContent = JSON.stringify(sanitized, null, 2);

  return [
    buildDeepSeekPrompt(),
    '```json',
    jsonContent,
    '```',
  ].join('\n');
}

/**
 * Build JSON content with UTF-8 BOM for download.
 */
export function buildChangeImpactJsonContent(result: ChangeImpactResult): string {
  const sanitized = buildSanitizedChangeImpactPack(result);
  const jsonContent = JSON.stringify(sanitized, null, 2);
  // UTF-8 BOM
  return '﻿' + jsonContent;
}

/**
 * Download the sanitized Change Impact Pack as a JSON file.
 */
export function downloadChangeImpactPack(result: ChangeImpactResult): {
  dataUrl: string;
  filename: string;
} {
  const content = buildChangeImpactJsonContent(result);
  const blob = new Blob([content], {
    type: 'application/json;charset=utf-8;',
  });
  const dataUrl = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `change-impact-${result.baseSnapshot.name}-to-${result.targetSnapshot.name}-${date}.json`
    .replace(/[^a-zA-Z0-9\-_.]/g, '-');

  return { dataUrl, filename };
}

/**
 * Revoke the download URL to free memory.
 */
export function revokeDownloadUrl(dataUrl: string): void {
  URL.revokeObjectURL(dataUrl);
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Validate the combined pack JSON content.
 */
export function validateChangeImpactPack(pack: string): {
  valid: boolean;
  error?: string;
  parsed?: SanitizedChangeImpactPack;
} {
  try {
    const match = pack.match(/```json\n([\s\S]*?)\n```$/);
    if (!match) {
      return { valid: false, error: 'JSON fence not found' };
    }

    const jsonContent = match[1];
    const parsed = JSON.parse(jsonContent) as SanitizedChangeImpactPack;

    if (!parsed.version) {
      return { valid: false, error: 'Missing version field' };
    }
    if (!parsed.summary) {
      return { valid: false, error: 'Missing summary field' };
    }
    if (!parsed.aiGuardrails) {
      return { valid: false, error: 'Missing aiGuardrails field' };
    }

    return { valid: true, parsed };
  } catch {
    return { valid: false, error: 'JSON parse error' };
  }
}
