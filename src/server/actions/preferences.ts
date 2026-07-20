'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { getCurrentUser } from '@/lib/auth/session';
import { SUPPORTED_LOCALES, toPrismaLocale, type Locale } from '@/lib/i18n/config';
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/server';

const localeSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES as [Locale, ...Locale[]]),
});

export const setPreferredLocale = action({
  schema: localeSchema,
  async handler({ locale }) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    const user = await getCurrentUser();
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { preferredLocale: toPrismaLocale(locale) },
      });
    }
    return { locale };
  },
});
