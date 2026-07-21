import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';

export const metadata = { title: 'Invite patients' };

export default async function OnboardingPatientsPage() {
  await requirePermission('patients:create');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <PageHeader
        title="Invite patients"
        description="Patients never pay for EyeQ. Share your practice portal link: emails must not include PHI (no diagnoses, DOB, or chart details)."
      />
      <div className="space-y-3 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <p>
          Recommended invite copy: “Your eye care practice invited you to the EyeQ patient portal.
          Sign in to manage appointments and view information your provider shares.”
        </p>
        <p>
          Create patient records in Patients, then share{' '}
          <code className="rounded bg-muted px-1">/signup-patient</code> with your practice slug, or
          the login portal link.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/provider/patients" className={buttonVariants()}>
            Open patients
          </Link>
          <Link href="/signup-patient" className={buttonVariants({ variant: 'outline' })}>
            Patient self-signup link
          </Link>
        </div>
      </div>
      <div className="flex gap-3">
        <Link href="/provider/dashboard" className={buttonVariants()}>
          Finish: dashboard
        </Link>
        <Link href="/provider/settings/billing" className={buttonVariants({ variant: 'outline' })}>
          Billing settings
        </Link>
      </div>
    </div>
  );
}
