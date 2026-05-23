/**
 * i18n hook and translation engine.
 * Usage: const { t, lang, setLang } = useI18n();
 *
 * t(key) returns the dictionary value or the key itself when missing.
 * t(key, params) substitutes {placeholder} tokens with values from params.
 * t({ key, params }) accepts the same LocalizedMessage shape used by core
 *   analysis modules (riskBrief, dataQuality) so callers can pass through
 *   structured messages without manually destructuring.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { en } from './en';
import { zhTW } from './zhTW';

export type Language = 'en' | 'zh-TW';

export interface LocalizedMessage {
  key: string;
  params?: Record<string, string | number>;
}

const translations: Record<Language, Record<string, string>> = {
  en,
  'zh-TW': zhTW,
};

const STORAGE_KEY = 'abf-lang';

function getInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-TW' || stored === 'en') return stored;
  } catch { /* localStorage unavailable */ }
  return 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Translate a key or LocalizedMessage for a specific language. Useful in
 * tests / non-React contexts where the I18nProvider hook isn't available.
 */
export function translateFor(
  lang: Language,
  keyOrMessage: string | LocalizedMessage,
  params?: Record<string, string | number>
): string {
  const key = typeof keyOrMessage === 'string' ? keyOrMessage : keyOrMessage.key;
  const effectiveParams = typeof keyOrMessage === 'string' ? params : keyOrMessage.params;
  const dict = translations[lang];
  const template = dict?.[key] ?? en[key] ?? key;
  return interpolate(template, effectiveParams);
}

export type TranslateFn = (
  keyOrMessage: string | LocalizedMessage,
  params?: Record<string, string | number>
) => string;

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslateFn;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (keyOrMessage) =>
    typeof keyOrMessage === 'string' ? keyOrMessage : keyOrMessage.key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch { /* localStorage unavailable */ }
  }, []);

  const t = useCallback<TranslateFn>(
    (keyOrMessage, params) => {
      const key = typeof keyOrMessage === 'string' ? keyOrMessage : keyOrMessage.key;
      const effectiveParams = typeof keyOrMessage === 'string'
        ? params
        : keyOrMessage.params;
      const dict = translations[lang];
      const template = dict?.[key] ?? en[key] ?? key;
      return interpolate(template, effectiveParams);
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
