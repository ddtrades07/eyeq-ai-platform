'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { recomputeCareGaps } from '@/server/actions/care-gaps';

export function RecomputeCareGapsButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const r = await recomputeCareGaps({});
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Created ${r.data.created} new care gap${r.data.created === 1 ? '' : 's'}`);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Recompute care gaps
    </Button>
  );
}
