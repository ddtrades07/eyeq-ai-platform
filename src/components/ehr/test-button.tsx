'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ZapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { testIntegration } from '@/server/actions/ehr';

export function TestConnectionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const r = await testIntegration({ id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.message(r.data.message);
      router.refresh();
    });
  }

  return (
    <Button onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ZapIcon className="h-4 w-4" />}
      Test connection
    </Button>
  );
}
