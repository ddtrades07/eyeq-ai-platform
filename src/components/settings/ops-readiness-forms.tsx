'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  markIncidentResponseReviewed,
  markMonitoringVerified,
  markStaffTrainingCompleted,
  setControlledPilotMode,
  updateBackupReadiness,
} from '@/server/actions/ops-readiness';

export function OpsReadinessForms({
  backup,
  monitoringVerified,
  incidentReviewed,
  trainingCompleted,
  controlledPilotEnabled,
  canEnablePilot,
}: {
  backup: {
    provider: string | null;
    status: string | null;
    lastAt: string | null;
    retentionDays: number | null;
    restoreTestAt: string | null;
    restoreNotes: string | null;
  };
  monitoringVerified: boolean;
  incidentReviewed: boolean;
  trainingCompleted: boolean;
  controlledPilotEnabled: boolean;
  canEnablePilot: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [provider, setProvider] = React.useState(backup.provider ?? '');
  const [status, setStatus] = React.useState(backup.status ?? 'unknown');
  const [retention, setRetention] = React.useState(String(backup.retentionDays ?? 30));
  const [restoreNotes, setRestoreNotes] = React.useState(backup.restoreNotes ?? '');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup attestation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            EyeQ does not verify cloud backups automatically. Record provider, last backup, retention,
            and restore-test date after ops completes a real restore drill.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Input
                placeholder="Supabase PITR / AWS RDS / etc."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="unknown">unknown</option>
                <option value="configured">configured</option>
                <option value="verified">verified</option>
                <option value="failed">failed</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Retention (days)</Label>
              <Input value={retention} onChange={(e) => setRetention(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Restore test notes</Label>
            <Textarea rows={2} value={restoreNotes} onChange={(e) => setRestoreNotes(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await updateBackupReadiness({
                  backupProvider: provider || null,
                  backupStatus: status as 'unknown' | 'configured' | 'verified' | 'failed',
                  backupLastAt: new Date(),
                  backupRetentionDays: Number(retention) || null,
                  backupRestoreTestAt: status === 'verified' ? new Date() : backup.restoreTestAt
                    ? new Date(backup.restoreTestAt)
                    : null,
                  backupRestoreTestNotes: restoreNotes || null,
                });
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success('Backup readiness saved');
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save backup attestation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monitoring & incident</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await markMonitoringVerified({
                  verified: !monitoringVerified,
                  provider: 'ops-attested',
                });
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success('Monitoring status updated');
                  router.refresh();
                }
              })
            }
          >
            {monitoringVerified ? 'Clear monitoring verified' : 'Mark monitoring verified'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await markIncidentResponseReviewed({ reviewed: !incidentReviewed });
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success('Incident review updated');
                  router.refresh();
                }
              })
            }
          >
            {incidentReviewed ? 'Clear incident review' : 'Mark incident runbook reviewed'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await markStaffTrainingCompleted({ completed: !trainingCompleted });
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success('Training status updated');
                  router.refresh();
                }
              })
            }
          >
            {trainingCompleted ? 'Clear training' : 'Mark staff training complete'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controlled pilot mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Enables live PHI for this organization only after MFA/RLS/backup/incident gates. Demo org
            cannot enable this. Does not auto-send AI messages, auto-sign notes, or fake vendor publish.
          </p>
          <Button
            size="sm"
            disabled={pending || (!controlledPilotEnabled && !canEnablePilot)}
            onClick={() =>
              startTransition(async () => {
                const r = await setControlledPilotMode({ enabled: !controlledPilotEnabled });
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success(controlledPilotEnabled ? 'Pilot mode disabled' : 'Pilot mode enabled');
                  router.refresh();
                }
              })
            }
          >
            {controlledPilotEnabled ? 'Disable controlled pilot' : 'Enable controlled pilot'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
