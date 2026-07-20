'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { markStatementSent } from '@/server/actions/remittance';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

export function MarkStatementSentButton({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function send() {
    startTransition(async () => {
      const r = await markStatementSent({ id: statementId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toastWithDemoNotice('Statement marked sent', r.data);
      router.refresh();
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={send} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Mark sent
    </Button>
  );
}
