'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generatePatientStatements } from '@/server/actions/remittance';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

export function GenerateStatementsButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function generate() {
    startTransition(async () => {
      const r = await generatePatientStatements({ deliveryMethod: 'PORTAL' });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toastWithDemoNotice(`Generated ${r.data.count} statement(s)`, r.data);
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={generate} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Generate statements
    </Button>
  );
}
