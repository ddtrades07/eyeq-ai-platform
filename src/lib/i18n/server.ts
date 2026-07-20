import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LOCALE, fromPrismaLocale, isLocale, type Locale } from './config';
import { translate, type DictionaryKey } from './dictionaries';
import { getCurrentUser } from '@/lib/auth/session';

const LOCALE_COOKIE = 'eyeq_locale';

/**
 * Resolve the active locale for the current request.
 *
 * Order of precedence:
 *   1. Logged-in user's `preferredLocale` (DB).
 *   2. `eyeq_locale` cookie.
 *   3. Default locale.
 *
 * Cached per-request so layout + page calls share a single read.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser();
  if (user) {
    const dbLocale = fromPrismaLocale(user.raw.preferredLocale);
    if (dbLocale) return dbLocale;
  }
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
});

/**
 * Convenience helper for server components: `const t = await getT();`
 * then `t('nav.dashboard')`.
 */
export async function getT() {
  const locale = await getLocale();
  return (key: DictionaryKey | string) => translate(locale, key);
}

export const LOCALE_COOKIE_NAME = LOCALE_COOKIE;
