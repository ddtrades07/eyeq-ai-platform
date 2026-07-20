import { redirect } from 'next/navigation';
import { requireStaffUser } from '@/lib/auth/require';

export const metadata = { title: 'Practice setup' };

/** Legacy /onboarding route → practice setup wizard. */
export default async function OnboardingPage() {
  await requireStaffUser();
  redirect('/provider/practice-setup');
}
