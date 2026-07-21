import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import { InviteDialog } from '@/components/team/invite-dialog';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatFullName } from '@/lib/utils';

export const metadata = { title: 'Invite team' };

export default async function OnboardingTeamPage() {
  const user = await requirePermission('users:manage');
  if (!user.organizationId) return null;

  const members = await db.user.findMany({
    where: { organizationId: user.organizationId, isActive: true, role: { not: Role.PATIENT } },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    take: 100,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <PageHeader
        title="Invite your team"
        description="Invite providers, office managers, front desk, billing/admin, and technicians. Seat limits follow your plan."
        actions={<InviteDialog inviterIsOwner={user.role === Role.OWNER} />}
      />
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3">
            <span>
              {formatFullName(m.firstName, m.lastName)}{' '}
              <span className="text-muted-foreground">· {m.email}</span>
            </span>
            <span className="text-muted-foreground">{ROLE_LABELS[m.role]}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <Link href="/onboarding/locations" className={buttonVariants()}>
          Continue to locations
        </Link>
        <Link href="/onboarding/practice" className={buttonVariants({ variant: 'outline' })}>
          Back
        </Link>
      </div>
    </div>
  );
}
