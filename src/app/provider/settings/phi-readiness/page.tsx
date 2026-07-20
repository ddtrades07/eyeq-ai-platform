import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PhiReadinessActions } from '@/components/settings/phi-readiness-actions';
import { OpsReadinessForms } from '@/components/settings/ops-readiness-forms';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { evaluatePhiReadiness } from '@/lib/production/phi-readiness';
import { getOpsHealthSnapshot } from '@/lib/ops/health';
import { db } from '@/lib/db';

export const metadata = { title: 'PHI readiness' };

function stateBadge(state: string) {
  if (state === 'ready') return <Badge variant="success">Ready</Badge>;
  if (state === 'blocked') return <Badge variant="destructive">Blocked</Badge>;
  if (state === 'demo_only') return <Badge variant="warning">Demo only</Badge>;
  return <Badge variant="outline">Needs configuration</Badge>;
}

export default async function PhiReadinessPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [report, health, org] = await Promise.all([
    evaluatePhiReadiness(user.organizationId),
    getOpsHealthSnapshot(),
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        livePhiEnabled: true,
        controlledPilotEnabled: true,
        mfaRequiredForStaff: true,
        rlsVerifiedAt: true,
        auditVerifiedAt: true,
        backupProvider: true,
        backupStatus: true,
        backupLastAt: true,
        backupRetentionDays: true,
        backupRestoreTestAt: true,
        backupRestoreTestNotes: true,
        monitoringVerifiedAt: true,
        incidentResponseReviewedAt: true,
        staffTrainingCompletedAt: true,
      },
    }),
  ]);
  const canManage = hasPermission(user.role, 'org:manage');

  const canEnablePilot =
    report.checks.filter(
      (c) =>
        c.state === 'blocked' &&
        [
          'org_mfa_policy',
          'org_rls',
          'backup',
          'incident_response',
          'demo_mode',
          'monitoring',
        ].includes(c.id),
    ).length === 0 && report.overall !== 'demo_only';

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/settings">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
      </Button>

      <PageHeader
        title="Live PHI readiness"
        description="Hard gate for production PHI. Includes security, vendors, backup, monitoring, incident response, MFA, RLS, and audit. Demo mode stays usable; live PHI stays blocked until checks pass."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overall</CardTitle>
          {stateBadge(report.overall)}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Live PHI enablement:{' '}
            <strong>{report.canEnableLivePhi ? 'Allowed by checks' : 'Blocked'}</strong>
          </p>
          <p>
            Org flag livePhiEnabled: <strong>{org?.livePhiEnabled ? 'On' : 'Off'}</strong>
            {' · '}
            Controlled pilot: <strong>{org?.controlledPilotEnabled ? 'On' : 'Off'}</strong>
          </p>
          <p className="text-muted-foreground">
            Ops health: {health.overall}
            {health.errorTrackingConfigured
              ? ' · error tracking configured'
              : ' · error tracking not configured'}
          </p>
          {report.blockers.length ? (
            <ul className="list-disc space-y-1 pl-5 text-destructive">
              {report.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {report.checks.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
              {stateBadge(c.state)}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{c.detail}</CardContent>
          </Card>
        ))}
      </div>

      {canManage ? (
        <>
          <PhiReadinessActions
            livePhiEnabled={org?.livePhiEnabled ?? false}
            canEnableLivePhi={report.canEnableLivePhi}
            rlsVerified={Boolean(org?.rlsVerifiedAt)}
            auditVerified={Boolean(org?.auditVerifiedAt)}
            mfaRequired={org?.mfaRequiredForStaff ?? false}
          />
          <OpsReadinessForms
            backup={{
              provider: org?.backupProvider ?? null,
              status: org?.backupStatus ?? null,
              lastAt: org?.backupLastAt?.toISOString() ?? null,
              retentionDays: org?.backupRetentionDays ?? null,
              restoreTestAt: org?.backupRestoreTestAt?.toISOString() ?? null,
              restoreNotes: org?.backupRestoreTestNotes ?? null,
            }}
            monitoringVerified={Boolean(org?.monitoringVerifiedAt)}
            incidentReviewed={Boolean(org?.incidentResponseReviewedAt)}
            trainingCompleted={Boolean(org?.staffTrainingCompletedAt)}
            controlledPilotEnabled={Boolean(org?.controlledPilotEnabled)}
            canEnablePilot={canEnablePilot}
          />
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/vendors">Vendor / BAA settings</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/security">Security / MFA</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/pilot-launch">Pilot launch</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/staff-onboarding">Staff onboarding</Link>
        </Button>
      </div>
    </div>
  );
}
