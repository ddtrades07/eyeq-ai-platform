import type { SupportedLocale } from '@prisma/client';

export type Locale = 'en' | 'es' | 'hi' | 'gu' | 'ar' | 'zh' | 'vi';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'hi', 'gu', 'ar', 'zh', 'vi'];

export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  es: { native: 'Español', english: 'Spanish' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  gu: { native: 'ગુજરાતી', english: 'Gujarati' },
  ar: { native: 'العربية', english: 'Arabic' },
  zh: { native: '中文', english: 'Chinese' },
  vi: { native: 'Tiếng Việt', english: 'Vietnamese' },
};

/**
 * RTL locales, Arabic among the supported set. UI components can use
 * this to flip the document direction.
 */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar']);

export const DEFAULT_LOCALE: Locale = 'en';

const PRISMA_BY_LOCALE: Record<Locale, SupportedLocale> = {
  en: 'EN',
  es: 'ES',
  hi: 'HI',
  gu: 'GU',
  ar: 'AR',
  zh: 'ZH',
  vi: 'VI',
};

const LOCALE_BY_PRISMA: Record<SupportedLocale, Locale> = {
  EN: 'en',
  ES: 'es',
  HI: 'hi',
  GU: 'gu',
  AR: 'ar',
  ZH: 'zh',
  VI: 'vi',
};

export function toPrismaLocale(locale: Locale): SupportedLocale {
  return PRISMA_BY_LOCALE[locale];
}

export function fromPrismaLocale(locale: SupportedLocale): Locale {
  return LOCALE_BY_PRISMA[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

export function direction(locale: Locale): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}
