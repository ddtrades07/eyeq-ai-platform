'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createInvoiceCheckout, recordDemoPortalPayment } from '@/server/actions/payments';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

export function PayInvoiceButton({
  invoiceId,
  amountLabel,
  disabled,
  demoPayAvailable = false,
}: {
  invoiceId: string;
  amountLabel: string;
  disabled?: boolean;
  demoPayAvailable?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function pay() {
    startTransition(async () => {
      if (demoPayAvailable) {
        const r = await recordDemoPortalPayment({ invoiceId });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toastWithDemoNotice('Demo payment recorded', r.data);
        router.refresh();
        return;
      }

      const r = await createInvoiceCheckout({ invoiceId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      window.location.href = r.data.checkoutUrl;
    });
  }

  return (
    <Button size="sm" onClick={pay} disabled={pending || disabled}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      Pay {amountLabel}
    </Button>
  );
}
