"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, resolveLocale, supportedLocales, translate, type TranslationVars, type UiLocale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: (key: string, vars?: TranslationVars) => string;
};

const LanguageContext = createContext<LanguageContextValue>({ locale: defaultLocale, setLocale: () => undefined, t: (key, vars) => translate(defaultLocale, key, vars) });

export function LanguageProvider({ initialLocale, children }: { initialLocale: UiLocale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState(resolveLocale(initialLocale));
  useEffect(() => { document.documentElement.lang = locale; localStorage.setItem("story-studio-ui-locale", locale); }, [locale]);
  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    t: (key, vars) => translate(locale, key, vars),
    setLocale: (next) => {
      setLocaleState(next);
      document.cookie = `ui_locale=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.location.reload();
    },
  }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() { return useContext(LanguageContext); }

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`language-switcher ${compact ? "compact" : ""}`} title={t("language.label")}><span aria-hidden>文</span><span className="sr-only">{t("language.label")}</span><select aria-label={t("language.label")} value={locale} onChange={(event) => setLocale(event.target.value as UiLocale)}>{supportedLocales.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}</select></label>;
}
