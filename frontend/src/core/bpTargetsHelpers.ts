/**
 * BP Targets 表格数据双向转换与校验助手纯函数
 * v1.29.0 规范版
 */

export interface BpSheetRow {
  metric: string;
  [year: string]: number | null | undefined | string;
}

export const START_YEAR = 2026;
export const END_YEAR = 2040;

/**
 * 将 Firestore 中的 Record 字典结构转换为 react-datasheet-grid 适用的一行多列结构
 * @param record 年份营业目标字典 (Million TWD)
 * @param metricLabel 首列“项目”只读显示的标签
 */
export function recordToRows(
  record: Record<string, number> | undefined | null,
  metricLabel: string
): BpSheetRow[] {
  const row: BpSheetRow = {
    metric: metricLabel,
  };

  const data = record || {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const key = String(year);
    const value = data[key];
    
    // 如果值为 0，应该保留；如果是 null/undefined 则为 null
    if (value !== undefined && value !== null) {
      row[key] = value;
    } else {
      row[key] = null;
    }
  }

  return [row];
}

/**
 * 将 react-datasheet-grid 行数据还原为可存储于 Firestore 的 Record 字典结构，并进行严密校验
 * @param rows 表格行数据数组
 * @returns 经过校验过滤后的年份 Record 字典
 * @throws 当检测到负数或非有效数字时抛出 Error 异常
 */
export function rowsToRecord(rows: BpSheetRow[]): Record<string, number> {
  const record: Record<string, number> = {};
  if (!rows || rows.length === 0) {
    return record;
  }

  const row = rows[0];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const key = String(year);
    const val = row[key];

    // 过滤掉所有未填写的空值（null, undefined, '', '   '）
    if (val === null || val === undefined || String(val).trim() === '') {
      continue;
    }

    const num = Number(val);

    // 嚴防 NaN 及非有限數字
    if (isNaN(num) || !isFinite(num)) {
      throw new Error(`INVALID_VALUE:${year}`);
    }

    // 嚴防負數
    if (num < 0) {
      throw new Error(`NEGATIVE_VALUE:${year}`);
    }

    record[key] = num;
  }

  return record;
}
