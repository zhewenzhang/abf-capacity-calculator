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

## 分析任務

請針對以下面向進行分析：

1. **總體變化摘要**
   - 營收變化金額與百分比
   - BP 達成率變化
   - 產能利用率變化
   - 短缺月份變化

2. **價格 vs 數量歸因**
   - 價格變動驅動的營收變化
   - 數量變動驅動的營收變化

3. **主要變動項目**
   - 變動最大的客戶
   - 變動最大的 SKU
   - 變動最大的月份

## ⚠️ 嚴格禁止事項

1. **不可宣稱因果關係**
   - 「變動最大的客動最大的客戶」僅表示該客戶的營收變化幅度大
   - 不表示該客戶「造成」了變化
   - 不可將比例歸因解讀為責任分配

2. **不可做出商業決策**
   - 只提供分析，不提供「應該做什麼」的決策
   - 所有建議都需要人類確認

3. **必須標記類型**
   - [Fact / 事實]：數字本身
   - [Attribution / 歸因]：比例分攤
   - [Inference / 推論]：可能原因
   - [Recommendation / 建議]：行動建議

## 輸出格式

### 1. 一句話結論
### 2. 總體變化摘要
### 3. 價格 vs 數量分析
### 4. 主要變動項目分析
### 5. 需要人類確認的問題

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
