import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Language } from '../types.ts';
import { getTranslation, type TranslationKey } from '../i18n/translations.ts';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
  formatDate: (dateStr: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_STORAGE_KEY = 'hns_society_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage failure
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Language) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'en' ? 'bn' : 'en'));

  const t = (key: TranslationKey) => getTranslation(lang, key);

  const formatNumber = (num: number) => {
    const locale = lang === 'bn' ? 'bn-BD' : 'en-BD';
    return new Intl.NumberFormat(locale).format(Number(num || 0));
  };

  const formatCurrency = (amount: number) => {
    const locale = lang === 'bn' ? 'bn-BD' : 'en-BD';
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
    return `৳${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, toggleLang, t, formatCurrency, formatNumber, formatDate }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
