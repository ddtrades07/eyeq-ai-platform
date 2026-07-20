'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordStaffPayment } from '@/server/actions/billing';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

export function RecordPaymentDialog({
  invoiceId,
  balanceCents,
  patientName,
}: {
  invoiceId: string;
  balanceCents: number;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [amount, setAmount] = React.useState((balanceCents / 100).toFixed(2));
  const [method, setMethod] = React.useState<'CASH' | 'CHECK' | 'EXTERNAL' | 'CARD_TERMINAL'>('CASH');
  const [reference, setReference] = React.useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    startTransition(async () => {
      const r = await recordStaffPayment({
        id: invoiceId,
        amountCents: cents,
        method,
        reference: reference || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toastWithDemoNotice('Demo payment recorded', r.data);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <DollarSign className="h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment: {patientName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="CARD_TERMINAL">Card terminal (external)</SelectItem>
                <SelectItem value="EXTERNAL">External / other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="Check #, receipt #, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
