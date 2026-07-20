import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StaffOnboardingActions } from '@/components/settings/staff-onboarding-actions';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatFullName } from '@/lib/utils';

export const metadata = { title: 'Staff onboarding' };

export default async function StaffOnboardingPage() {
  const user = await requirePermission('org:read');
  if (!user.organizationId) return null;
  const canManage = hasPermission(user.role, 'users:manage');

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { mfaRequiredForStaff: true },
  });

  const staff = await db.user.findMany({
    where: {
      organizationId: user.organizationId,
      isActive: true,
      role: { not: 'PATIENT' },
    },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    include: { staffOnboarding: true },
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/settings">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
      </Button>

      <PageHeader
        title="Staff onboarding"
        description="Track invite acceptance, MFA, location access, PHI notice, and workflow intro for each staff user."
      />

      <div className="space-y-3">
        {staff.map((s) => {
          const o = s.staffOnboarding;
          const steps = [
            { key: 'invite', done: Boolean(o?.inviteAcceptedAt), label: 'Invite accepted' },
            { key: 'password', done: Boolean(o?.passwordSetAt), label: 'Password set' },
            {
              key: 'mfa',
              done: Boolean(o?.mfaEnrolledAt || s.mfaEnrolledAt),
              label: org?.mfaRequiredForStaff ? 'MFA enrolled (required)' : 'MFA enrolled',
            },
            { key: 'role', done: Boolean(o?.roleConfirmedAt), label: 'Role confirmed' },
            {
              key: 'location',
              done: Boolean(o?.locationAccessConfirmedAt),
              label: 'Location access confirmed',
            },
            {
              key: 'perms',
              done: Boolean(o?.permissionsReviewedAt),
              label: 'Permissions reviewed',
            },
            { key: 'phi', done: Boolean(o?.phiNoticeAcceptedAt), label: 'PHI notice accepted' },
            {
              key: 'workflow',
              done: Boolean(o?.workflowIntroCompletedAt),
              label: 'Workflow intro complete',
            },
          ];
          const doneCount = steps.filter((x) => x.done).length;

          return (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">
                    {formatFullName(s.firstName, s.lastName)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {s.email} · {ROLE_LABELS[s.role]}
                  </p>
                </div>
                <Badge variant={o?.completedAt ? 'success' : 'warning'}>
                  {o?.completedAt ? 'Complete' : `${doneCount}/${steps.length}`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {steps.map((step) => (
                    <li key={step.key} className="flex items-center justify-between gap-2">
                      <span>{step.label}</span>
                      <Badge variant={step.done ? 'success' : 'outline'}>
                        {step.done ? 'Done' : 'Pending'}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {(canManage || s.id === user.id) && !o?.completedAt ? (
                  <StaffOnboardingActions
                    userId={s.id}
                    isSelf={s.id === user.id}
                    mfaRequired={Boolean(org?.mfaRequiredForStaff)}
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
