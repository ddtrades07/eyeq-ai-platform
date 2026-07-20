'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { postRemittance } from '@/server/actions/remittance';

export function PostRemittanceButton({ remittanceId }: { remittanceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function post() {
    if (!confirm('Post this remittance to claims and patient balances?')) return;
    startTransition(async () => {
      const r = await postRemittance({ id: remittanceId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Remittance posted');
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={post} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Post
    </Button>
  );
}
