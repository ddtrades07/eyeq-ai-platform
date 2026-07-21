import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Locations onboarding' };

export default async function OnboardingLocationsPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const locations = await db.location.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <PageHeader
        title="Confirm locations"
        description="Your primary location was created at signup. Add more from Practice setup — location limits follow your plan."
        actions={
          <Link href="/provider/practice-setup" className={buttonVariants({ size: 'sm' })}>
            Practice setup
          </Link>
        }
      />
      <ul className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center justify-between">
            <span>
              <strong>{l.name}</strong> · {l.shortName}
            </span>
            <div className="flex gap-1">
              {l.isPrimary ? <Badge variant="info">Primary</Badge> : null}
              {!l.active ? <Badge variant="outline">Inactive</Badge> : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Link href="/onboarding/patients" className={buttonVariants()}>
          Continue to patient invites
        </Link>
        <Link href="/onboarding/team" className={buttonVariants({ variant: 'outline' })}>
          Back
        </Link>
      </div>
    </div>
  );
}
