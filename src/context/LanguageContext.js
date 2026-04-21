import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LANGUAGES } from '../i18n/translations';

const LANG_KEY = 'farmeasy_seller_language';
const LanguageContext = createContext(null);

const SUPPORTED_CODES = new Set(LANGUAGES.map((l) => l.code));

function resolveLocale(raw) {
  if (!raw) return 'mr'; // Default to Marathi for seller app (Maharashtra-focused)
  const base = raw.split(/[-_]/)[0].toLowerCase();
  if (SUPPORTED_CODES.has(base)) return base;
  return 'mr';
}

function getDeviceLocale() {
  try {
    const { getLocales } = require('expo-localization');
    const locales = getLocales?.();
    if (Array.isArray(locales) && locales.length > 0) {
      return locales[0].languageCode || locales[0].languageTag || 'mr';
    }
  } catch { /* not installed */ }

  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale || 'mr';
  } catch { /* not available */ }

  return 'mr';
}

export function LanguageProvider({ children }) {
  const [language,  setLanguageState] = useState('mr');
  const [langReady, setLangReady]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANG_KEY);
        if (stored && SUPPORTED_CODES.has(stored)) {
          setLanguageState(stored);
        } else {
          setLanguageState(resolveLocale(getDeviceLocale()));
        }
      } catch {
        // Keep default on error
      } finally {
        setLangReady(true);
      }
    })();
  }, []);

  async function setLanguage(code) {
    const resolved = SUPPORTED_CODES.has(code) ? code : 'mr';
    setLanguageState(resolved);
    try { await AsyncStorage.setItem(LANG_KEY, resolved); } catch { /* ignore */ }
  }

  /**
   * Translate a dot-notation key with optional interpolation.
   * Falls back: current language → Marathi → English → raw key string.
   */
  function t(key, params) {
    const parts = key.split('.');

    let value = translations[language];
    for (const k of parts) { value = value?.[k]; }

    if (value === undefined || value === null) {
      let fallback = translations.mr;
      for (const k of parts) { fallback = fallback?.[k]; }
      if (fallback === undefined || fallback === null) {
        let en = translations.en;
        for (const k of parts) { en = en?.[k]; }
        value = en ?? key;
      } else {
        value = fallback;
      }
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, p) =>
        params[p] !== undefined ? String(params[p]) : `{{${p}}}`
      );
    }
    return value;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, LANGUAGES, langReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
