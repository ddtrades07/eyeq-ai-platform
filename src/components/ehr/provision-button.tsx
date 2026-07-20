'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectedEhrVendor } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { provisionIntegration } from '@/server/actions/ehr';

export function ProvisionEhrButton({ vendor }: { vendor: ConnectedEhrVendor }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function provision() {
    startTransition(async () => {
      const r = await provisionIntegration({ vendor });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Integration provisioned (placeholder)');
      router.push(`/provider/ehr-integrations/${r.data.id}`);
    });
  }

  return (
    <Button onClick={provision} size="sm" variant="outline" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Add
    </Button>
  );
}
