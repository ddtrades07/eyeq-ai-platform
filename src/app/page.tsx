import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LandingPageContent } from '@/components/landing/landing-page';
import { getCurrentUser } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/rbac';
import { serverEnv, publicEnv } from '@/lib/env';
import { Fraunces } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-landing-display',
  weight: ['500', '600'],
});

export const metadata: Metadata = {
  title: 'EyeQ AI | A Home for Connected Eye Care',
  description:
    'EyeQ AI brings eye care practices and patients together through connected appointments, prescriptions, communication, clinical workflows, and provider-guided intelligence.',
  metadataBase: new URL(publicEnv.appUrl),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'EyeQ AI | A Home for Connected Eye Care',
    description:
      'EyeQ AI brings eye care practices and patients together through connected appointments, prescriptions, communication, clinical workflows, and provider-guided intelligence.',
    url: publicEnv.appUrl,
    siteName: 'EyeQ AI',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EyeQ AI | A Home for Connected Eye Care',
    description:
      'A connected home for modern eye care, for practices and patients.',
  },
  robots: { index: true, follow: true },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(isStaffRole(user.role) ? '/provider/dashboard' : '/patient/home');
  }

  return (
    <div className={fraunces.variable}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'EyeQ AI',
            url: publicEnv.appUrl,
            description:
              'A connected home for modern eye care, appointments, prescriptions, imaging, and provider-guided workflows.',
          }),
        }}
      />
      <LandingPageContent demoModeEnabled={serverEnv.demoModeEnabled} />
    </div>
  );
}
