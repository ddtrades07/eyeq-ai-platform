'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  convertAppointmentRequest,
  declineAppointmentRequest,
} from '@/server/actions/appointment-requests';

export function AppointmentRequestActions({
  requestId,
  preferredStartsAt,
}: {
  requestId: string;
  preferredStartsAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const defaultLocal = preferredStartsAt
    ? new Date(preferredStartsAt).toISOString().slice(0, 16)
    : new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  const [startsAt, setStartsAt] = React.useState(defaultLocal);

  function convert() {
    startTransition(async () => {
      const r = await convertAppointmentRequest({
        requestId,
        startsAt: new Date(startsAt),
        durationMinutes: 45,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Request converted to appointment');
      router.refresh();
    });
  }

  function decline() {
    startTransition(async () => {
      const r = await declineAppointmentRequest({ requestId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.message('Request declined');
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="space-y-1">
        <Label className="text-xs">Confirm start time</Label>
        <Input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={convert} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Convert to appointment
        </Button>
        <Button size="sm" variant="outline" onClick={decline} disabled={pending}>
          Decline
        </Button>
      </div>
    </div>
  );
}
