'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createScribeSession } from '@/server/actions/scribe';

export function NewScribeSessionButton({ patientId }: { patientId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function start() {
    startTransition(async () => {
      const r = await createScribeSession({
        patientId: patientId ?? null,
        appointmentId: null,
        consentRecorded: false,
        consentBy: null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push(`/provider/ambient-scribe/${r.data.id}`);
    });
  }

  return (
    <Button onClick={start} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      New session
    </Button>
  );
}
