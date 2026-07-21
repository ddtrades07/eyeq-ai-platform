import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import { InviteDialog } from '@/components/team/invite-dialog';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatFullName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Team settings' };

export default async function SettingsTeamPage() {
  const user = await requirePermission('users:manage');
  if (!user.organizationId) return null;

  const members = await db.user.findMany({
    where: { organizationId: user.organizationId, isActive: true, role: { not: Role.PATIENT } },
    include: { staffOnboarding: true },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite providers, office managers, front desk, billing/admin, and technicians. Seat limits follow your subscription."
        actions={
          <div className="flex gap-2">
            <InviteDialog inviterIsOwner={user.role === Role.OWNER} />
            <Link
              href="/provider/team"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Full team page
            </Link>
          </div>
        }
      />
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {members.map((m) => {
          const o = m.staffOnboarding;
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div>
                  {formatFullName(m.firstName, m.lastName)}{' '}
                  <span className="text-muted-foreground">· {m.email}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                  {o?.inviteAcceptedAt ? (
                    <Badge variant="outline">Invite accepted</Badge>
                  ) : (
                    <Badge variant="warning">Invite pending</Badge>
                  )}
                  {o?.mfaEnrolledAt ? (
                    <Badge variant="outline">MFA</Badge>
                  ) : (
                    <Badge variant="outline">MFA pending</Badge>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
