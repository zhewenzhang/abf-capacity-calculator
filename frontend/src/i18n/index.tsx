/**
 * i18n hook and translation engine.
 * Usage: const { t, lang, setLang } = useI18n();
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { en } from './en';
import { zhTW } from './zhTW';

export type Language = 'en' | 'zh-TW';

const translations: Record<Language, Record<string, string>> = {
  en,
  'zh-TW': zhTW,
};

const STORAGE_KEY = 'abf-lang';

function getInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-TW' || stored === 'en') return stored;
  } catch {}
  return 'en';
}

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
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
    } catch {}
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[lang];
      return dict?.[key] ?? en[key] ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
