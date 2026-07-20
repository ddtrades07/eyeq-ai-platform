import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { OpsReadinessForms } from '@/components/settings/ops-readiness-forms';
import { requirePermission } from '@/lib/auth/require';
import { evaluatePhiReadiness } from '@/lib/production/phi-readiness';
import {
  evaluatePilotLaunch,
  pilotStatusLabel,
} from '@/lib/production/pilot-launch';
import { getOpsHealthSnapshot } from '@/lib/ops/health';
import { db } from '@/lib/db';

export const metadata = { title: 'Pilot launch' };

function statusBadge(status: string) {
  if (status === 'live_production_ready' || status === 'controlled_pilot_ready') {
    return <Badge variant="success">{pilotStatusLabel(status as never)}</Badge>;
  }
  if (status === 'internal_demo_only') {
    return <Badge variant="warning">{pilotStatusLabel(status as never)}</Badge>;
  }
  return <Badge variant="destructive">{pilotStatusLabel(status as never)}</Badge>;
}

export default async function PilotLaunchPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [pilot, report, health, org] = await Promise.all([
    evaluatePilotLaunch(user.organizationId),
    evaluatePhiReadiness(user.organizationId),
    getOpsHealthSnapshot(),
    db.organization.findUnique({ where: { id: user.organizationId } }),
  ]);

  const canEnablePilot =
    report.checks.filter(
      (c) =>
        c.state === 'blocked' &&
        ['org_mfa_policy', 'org_rls', 'backup', 'incident_response', 'demo_mode'].includes(c.id),
    ).length === 0 && report.overall !== 'demo_only';

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/settings">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
      </Button>

      <PageHeader
        title="Controlled pilot launch"
        description="One-practice live pilot controls. Fail-closed until MFA, RLS, BAAs, backups, monitoring, and incident response are attested."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Launch status</CardTitle>
          {statusBadge(pilot.status)}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Controlled pilot: <strong>{pilot.controlledPilotEnabled ? 'On' : 'Off'}</strong>
            {' · '}
            livePhiEnabled: <strong>{pilot.livePhiEnabled ? 'On' : 'Off'}</strong>
          </p>
          <p className="text-muted-foreground">
            Health overall: {health.overall}
            {health.errorTrackingConfigured ? ' · error tracking configured' : ' · error tracking not configured'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {pilot.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <span>
                  {item.label}
                  {item.requiredForPilot ? (
                    <span className="ml-1 text-xs text-muted-foreground">(required)</span>
                  ) : null}
                </span>
                <Badge variant={item.done ? 'success' : 'outline'}>
                  {item.done ? 'Done' : 'Pending'}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {health.services.map((s) => (
            <div key={s.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{s.label}</span>
                <Badge
                  variant={
                    s.status === 'ok'
                      ? 'success'
                      : s.status === 'down'
                        ? 'destructive'
                        : 'warning'
                  }
                >
                  {s.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/phi-readiness">PHI readiness</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/vendors">Vendors / BAA</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/settings/staff-onboarding">Staff onboarding</Link>
        </Button>
      </div>
    </div>
  );
}
