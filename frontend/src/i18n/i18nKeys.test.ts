import { describe, expect, it } from 'vitest';
import { en } from './en';
import { zhTW } from './zhTW';

describe('i18n dictionaries', () => {
  it('zh-TW has every English translation key', () => {
    const missing = Object.keys(en).filter((key) => !(key in zhTW));
    expect(missing).toEqual([]);
  });

  it('English has every zh-TW translation key', () => {
    const missing = Object.keys(zhTW).filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });
});
