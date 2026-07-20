'use client';

import * as React from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { translate, type DictionaryKey } from '@/lib/i18n/dictionaries';

type LocaleCtx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: DictionaryKey | string) => string;
};

const Ctx = React.createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `eyeq_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = React.useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
    }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key: string) => translate(DEFAULT_LOCALE, key),
    } satisfies LocaleCtx;
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}
