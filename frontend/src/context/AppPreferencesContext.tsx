/**
 * App preferences context: language and display currency.
 * Persisted to localStorage. Synced with Parameters currency settings on load.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { DisplayCurrency } from '../core/currency';

const STORAGE_KEY = 'abf-prefs';

export interface AppPreferences {
  language: 'en' | 'zh-TW';
  displayCurrency: DisplayCurrency;
}

const DEFAULT_PREFS: AppPreferences = {
  language: 'en',
  displayCurrency: 'USD',
};

function loadPrefs(): AppPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        language: parsed.language === 'zh-TW' ? 'zh-TW' : 'en',
        displayCurrency: parsed.displayCurrency === 'TWD' ? 'TWD' : 'USD',
      };
    }
  } catch { /* localStorage unavailable — use defaults */ }
  return { ...DEFAULT_PREFS };
}

function savePrefs(prefs: AppPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* localStorage unavailable — skip persist */ }
}

interface AppPrefsContextValue {
  prefs: AppPreferences;
  setLanguage: (lang: 'en' | 'zh-TW') => void;
  setCurrency: (currency: DisplayCurrency) => void;
}

export const AppPrefsContext = createContext<AppPrefsContextValue>({
  prefs: DEFAULT_PREFS,
  setLanguage: () => {},
  setCurrency: () => {},
});

export function useAppPrefs() {
  return useContext(AppPrefsContext);
}

export function AppPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(loadPrefs);

  const setLanguage = useCallback((lang: 'en' | 'zh-TW') => {
    setPrefs(prev => {
      const next = { ...prev, language: lang };
      savePrefs(next);
      return next;
    });
  }, []);

  const setCurrency = useCallback((currency: DisplayCurrency) => {
    setPrefs(prev => {
      const next = { ...prev, displayCurrency: currency };
      savePrefs(next);
      return next;
    });
  }, []);

  return (
    <AppPrefsContext.Provider value={{ prefs, setLanguage, setCurrency }}>
      {children}
    </AppPrefsContext.Provider>
  );
}
