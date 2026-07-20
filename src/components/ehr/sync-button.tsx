'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncIntegration } from '@/server/actions/ehr';

export function SyncIntegrationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const r = await syncIntegration({ id, resource: 'Patient', records: 50 });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Sync queued (job ${r.data.jobId})`);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Sync patients
    </Button>
  );
}
