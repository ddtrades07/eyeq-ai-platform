import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { getLocale } from '@/lib/i18n/server';
import { direction } from '@/lib/i18n/config';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  title: {
    default: publicEnv.appName,
    template: `%s · ${publicEnv.appName}`,
  },
  description:
    'EyeQ AI, an AI-assisted operating layer for optometry practices. Scheduling, charting, imaging review support, patient portal, and care-gap automation.',
  applicationName: publicEnv.appName,
  icons: {
    icon: [{ url: '/brand/eyeq-icon.png', type: 'image/png' }],
    apple: [{ url: '/brand/eyeq-icon.png', type: 'image/png' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={direction(locale)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>{children}</QueryProvider>
        </LocaleProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
