'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { updateCommunicationPreferences } from '@/server/actions/reminders';

type Pref = {
  smsOptIn: boolean;
  emailOptIn: boolean;
  portalOptIn: boolean;
  preferredChannel: string;
  optOutAt: string | null;
} | null;

export function PatientCommunicationCard({
  patientId,
  pref,
  canEdit,
}: {
  patientId: string;
  pref: Pref;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [sms, setSms] = React.useState(pref?.smsOptIn ?? false);
  const [email, setEmail] = React.useState(pref?.emailOptIn ?? false);
  const [portal, setPortal] = React.useState(pref?.portalOptIn ?? true);
  const [preferred, setPreferred] = React.useState(pref?.preferredChannel ?? 'PORTAL');
  const optedOut = Boolean(pref?.optOutAt);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">Communication consent</CardTitle>
        {optedOut ? (
          <Badge variant="destructive">Opted out</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          SMS/email reminders require explicit consent. Portal messaging stays available even when
          SMS/email are off. Opt-out blocks SMS/email reminders only.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <ConsentRow label="SMS consent" on={sms} />
          <ConsentRow label="Email consent" on={email} />
          <ConsentRow label="Portal messages" on={portal} />
          <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
            <span>Preferred method</span>
            <Badge variant="secondary">{preferred}</Badge>
          </div>
        </div>
        {canEdit ? (
          <div className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
                SMS
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={email}
                  onChange={(e) => setEmail(e.target.checked)}
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={portal}
                  onChange={(e) => setPortal(e.target.checked)}
                />
                Portal
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preferred channel</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
              >
                <option value="PORTAL">Portal</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE_CALL_SCRIPT">Call</option>
              </select>
            </div>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await updateCommunicationPreferences({
                    patientId,
                    smsOptIn: sms,
                    emailOptIn: email,
                    portalOptIn: portal,
                    preferredChannel: preferred as
                      | 'PORTAL'
                      | 'SMS'
                      | 'EMAIL'
                      | 'PHONE_CALL_SCRIPT',
                    clearOptOut: true,
                  });
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success('Communication preferences saved');
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save preferences
            </Button>
            {!optedOut ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await updateCommunicationPreferences({
                      patientId,
                      setOptOut: true,
                    });
                    if (!r.ok) toast.error(r.error);
                    else {
                      toast.success('Patient opted out of SMS/email reminders');
                      router.refresh();
                    }
                  })
                }
              >
                Mark SMS/email opt-out
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConsentRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
      <span>{label}</span>
      <Badge variant={on ? 'success' : 'outline'}>{on ? 'Yes' : 'No'}</Badge>
    </div>
  );
}
