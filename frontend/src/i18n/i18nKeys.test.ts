import { describe, expect, it } from 'vitest';
import { en } from './en';
import { zhTW } from './zhTW';

// Common mojibake fragments produced when UTF-8 bytes are decoded as Big5/CP1252.
// If any of these appear in zhTW.ts, the file has been corrupted in transit.
const MOJIBAKE_FRAGMENTS = ['鐢', '鍎', '闋', '鈥', '鉁', '鉂', '鈮', '绻', '馃'];

// Obvious Simplified Chinese vocabulary that must not appear in a Traditional
// Chinese dictionary. Limited to clearly-Simplified words (not characters that
// happen to look the same in both scripts).
const SIMPLIFIED_TERMS = [
  '预测', // forecast
  '设置', // settings
  '产品', // products
  '数据', // data
  '结果', // results
  '用户', // user
  '登录', // login
  '删除', // delete
  '保存', // save
];

describe('i18n dictionaries', () => {
  it('zh-TW has every English translation key', () => {
    const missing = Object.keys(en).filter((key) => !(key in zhTW));
    expect(missing).toEqual([]);
  });

  it('English has every zh-TW translation key', () => {
    const missing = Object.keys(zhTW).filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });

  it('zh-TW contains no mojibake fragments', () => {
    const offenders: Array<{ key: string; value: string; fragment: string }> = [];
    for (const [key, value] of Object.entries(zhTW)) {
      for (const fragment of MOJIBAKE_FRAGMENTS) {
        if (value.includes(fragment)) {
          offenders.push({ key, value, fragment });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('zh-TW contains no U+FFFD replacement characters', () => {
    const offenders = Object.entries(zhTW).filter(([, value]) => value.includes('�'));
    expect(offenders).toEqual([]);
  });

  it('zh-TW contains no obvious Simplified Chinese vocabulary', () => {
    const offenders: Array<{ key: string; value: string; term: string }> = [];
    for (const [key, value] of Object.entries(zhTW)) {
      for (const term of SIMPLIFIED_TERMS) {
        if (value.includes(term)) {
          offenders.push({ key, value, term });
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
