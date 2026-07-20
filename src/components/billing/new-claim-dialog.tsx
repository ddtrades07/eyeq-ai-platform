'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { createClaim } from '@/server/actions/billing';
import { formatFullName } from '@/lib/utils';

type LineDraft = {
  cptCode: string;
  charge: string;
  units: string;
  diagnosisCodes: string;
};

const emptyLine = (): LineDraft => ({
  cptCode: '',
  charge: '',
  units: '1',
  diagnosisCodes: '',
});

export function NewClaimDialog({
  patients,
}: {
  patients: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [patientId, setPatientId] = React.useState('');
  const [payerName, setPayerName] = React.useState('');
  const [memberId, setMemberId] = React.useState('');
  const [lines, setLines] = React.useState<LineDraft[]>([emptyLine()]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      toast.error('Select a patient');
      return;
    }
    const parsed = lines.map((l) => ({
      cptCode: l.cptCode.trim(),
      chargeCents: Math.round(parseFloat(l.charge) * 100),
      units: parseInt(l.units, 10) || 1,
      diagnosisCodes: l.diagnosisCodes
        .split(/[,;\s]+/)
        .map((d) => d.trim())
        .filter(Boolean),
    }));
    if (parsed.some((l) => !l.cptCode || !Number.isFinite(l.chargeCents) || l.chargeCents <= 0)) {
      toast.error('Each line needs a valid CPT code and charge');
      return;
    }
    startTransition(async () => {
      const r = await createClaim({
        patientId,
        payerName: payerName || undefined,
        memberId: memberId || undefined,
        lines: parsed,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Claim created as draft');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> New claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create insurance claim</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatFullName(p.firstName, p.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Payer</Label>
              <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Member ID</Label>
              <Input value={memberId} onChange={(e) => setMemberId(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Charge lines</Label>
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-4">
                <Input
                  placeholder="CPT"
                  value={line.cptCode}
                  onChange={(e) => updateLine(i, { cptCode: e.target.value })}
                />
                <Input
                  placeholder="Charge $"
                  type="number"
                  step="0.01"
                  value={line.charge}
                  onChange={(e) => updateLine(i, { charge: e.target.value })}
                />
                <Input
                  placeholder="Units"
                  value={line.units}
                  onChange={(e) => updateLine(i, { units: e.target.value })}
                />
                <Input
                  placeholder="Dx codes"
                  value={line.diagnosisCodes}
                  onChange={(e) => updateLine(i, { diagnosisCodes: e.target.value })}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((l) => [...l, emptyLine()])}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
              {lines.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLines((l) => l.slice(0, -1))}>
                  <Trash2 className="h-4 w-4" /> Remove last
                </Button>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
