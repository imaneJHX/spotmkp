import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_META, SUPPORTED_LANGUAGES, translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'beauty-spot-language';

const LanguageContext = createContext(null);

function getValueByPath(source, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => (current && segment in current ? current[segment] : undefined), source);
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

function readStoredLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readStoredLanguage);
  const meta = LANGUAGE_META[language] || LANGUAGE_META[DEFAULT_LANGUAGE];
  const dir = meta.dir;
  const isRTL = dir === 'rtl';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    document.body.dataset.language = language;
  }, [dir, language]);

  const value = useMemo(() => {
    const t = (key, params = {}) => {
      const activeDictionary = translations[language] || translations[DEFAULT_LANGUAGE];
      const fallbackDictionary = translations[DEFAULT_LANGUAGE];
      const rawValue = getValueByPath(activeDictionary, key) ?? getValueByPath(fallbackDictionary, key);

      if (typeof rawValue === 'function') {
        return rawValue(params);
      }

      if (typeof rawValue === 'string') {
        return interpolate(rawValue, params);
      }

      if (rawValue == null) {
        return key;
      }

      return rawValue;
    };

    return {
      language,
      setLanguage,
      dir,
      isRTL,
      languages: SUPPORTED_LANGUAGES.map((code) => ({
        value: code,
        code: LANGUAGE_META[code].code,
        nativeName: LANGUAGE_META[code].nativeName,
        dir: LANGUAGE_META[code].dir,
      })),
      t,
    };
  }, [dir, isRTL, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
}

export { LANGUAGE_STORAGE_KEY };
