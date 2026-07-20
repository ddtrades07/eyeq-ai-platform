'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VendorKind } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { markVendorBaaComplete, testVendorConnection } from '@/server/actions/phi-readiness';

export function VendorCardActions({
  vendor,
  baaComplete,
  baaRequired,
}: {
  vendor: VendorKind;
  baaComplete: boolean;
  baaRequired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await testVendorConnection({ vendor });
            if (!r.ok) {
              toast.error(r.error);
              return;
            }
            toast.message(r.data.ok ? 'Connection check ok' : 'Not configured', {
              description: r.data.detail,
            });
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Test connection
      </Button>
      {baaRequired ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await markVendorBaaComplete({
                vendor,
                complete: !baaComplete,
              });
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              toast.success(baaComplete ? 'BAA cleared' : 'BAA marked complete');
              router.refresh();
            })
          }
        >
          {baaComplete ? 'Clear BAA mark' : 'Mark BAA complete'}
        </Button>
      ) : null}
    </div>
  );
}
