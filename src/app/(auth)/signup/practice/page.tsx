import Link from 'next/link';
import { SignupOrgForm } from '../signup-form';
import { isSaasPlanId } from '@/lib/billing/saas-plans';

export const metadata = { title: 'Start a practice · EyeQ' };

export default async function SignupPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  const plan = sp.plan && isSaasPlanId(sp.plan) ? sp.plan : 'PRACTICE';

  return (
    <div className="rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Start a practice</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your owner account, then choose a plan and complete Stripe Checkout. Patients never
        pay — the practice owns the subscription. Selected plan:{' '}
        <strong>{plan}</strong>.
      </p>
      <div className="mt-6">
        <SignupOrgForm nextPath={`/onboarding/practice?plan=${plan}`} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Prefer to explore first?{' '}
        <Link href="/demo" className="font-medium text-primary hover:underline">
          Live Demo (free)
        </Link>
        {' · '}
        <Link href="/pricing" className="font-medium text-primary hover:underline">
          Pricing
        </Link>
        {' · '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
