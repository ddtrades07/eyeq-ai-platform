'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
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
import { createManualRemittance } from '@/server/actions/remittance';
import { formatFullName } from '@/lib/utils';

export function ManualRemittanceDialog({
  claims,
}: {
  claims: {
    id: string;
    totalCents: number;
    patient: { firstName: string; lastName: string };
    payerName: string | null;
  }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [payerName, setPayerName] = React.useState('');
  const [checkNumber, setCheckNumber] = React.useState('');
  const [claimId, setClaimId] = React.useState('');
  const [paid, setPaid] = React.useState('');
  const [patientResp, setPatientResp] = React.useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const paidCents = Math.round(parseFloat(paid) * 100);
    const patientRespCents = Math.round(parseFloat(patientResp || '0') * 100);
    if (!payerName || !Number.isFinite(paidCents)) {
      toast.error('Enter payer and payment amount');
      return;
    }
    startTransition(async () => {
      const r = await createManualRemittance({
        payerName,
        checkNumber: checkNumber || undefined,
        lines: [
          {
            claimId: claimId || null,
            paidCents,
            patientRespCents,
            billedCents: paidCents,
            allowedCents: paidCents,
          },
        ],
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('EOB recorded. Post when ready.');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Record manual EOB
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record manual EOB / remittance</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Payer</Label>
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Check / reference #</Label>
            <Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Match to claim (optional)</Label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger>
                <SelectValue placeholder="Unmatched payment" />
              </SelectTrigger>
              <SelectContent>
                {claims.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatFullName(c.patient.firstName, c.patient.lastName)} · $
                    {(c.totalCents / 100).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Insurance paid (USD)</Label>
              <Input type="number" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Patient responsibility (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={patientResp}
                onChange={(e) => setPatientResp(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save EOB
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
