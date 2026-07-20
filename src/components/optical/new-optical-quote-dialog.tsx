'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { OpticalItemKind, OpticalOrderType } from '@prisma/client';
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
import { createOpticalQuote } from '@/server/actions/optical';
import { formatFullName } from '@/lib/utils';

type Line = { kind: OpticalItemKind; description: string; quantity: string; price: string };

const emptyLine = (): Line => ({
  kind: OpticalItemKind.FRAME,
  description: '',
  quantity: '1',
  price: '',
});

export function NewOpticalQuoteDialog({
  patients,
  labs,
  inventory,
}: {
  patients: { id: string; firstName: string; lastName: string }[];
  labs: { id: string; name: string }[];
  inventory: { id: string; name: string; retailCents: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [patientId, setPatientId] = React.useState('');
  const [labId, setLabId] = React.useState('');
  const [type, setType] = React.useState<OpticalOrderType>(OpticalOrderType.SPECTACLES);
  const [insurance, setInsurance] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([emptyLine()]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      toast.error('Select a patient');
      return;
    }
    const items = lines.map((l) => ({
      kind: l.kind,
      description: l.description,
      quantity: parseInt(l.quantity, 10) || 1,
      unitPriceCents: Math.round(parseFloat(l.price) * 100),
    }));
    if (items.some((i) => !i.description || !Number.isFinite(i.unitPriceCents))) {
      toast.error('Complete all line items');
      return;
    }
    startTransition(async () => {
      const r = await createOpticalQuote({
        patientId,
        labId: labId || null,
        type,
        insuranceAllowanceCents: Math.round(parseFloat(insurance || '0') * 100),
        depositCents: Math.round(parseFloat(deposit || '0') * 100),
        items,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Optical quote created');
      setOpen(false);
      router.push(`/provider/optical/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create optical quote</DialogTitle>
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
              <Label>Order type</Label>
              <Select value={type} onValueChange={(v) => setType(v as OpticalOrderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OpticalOrderType.SPECTACLES}>Spectacles</SelectItem>
                  <SelectItem value={OpticalOrderType.CONTACT_LENS}>Contact lenses</SelectItem>
                  <SelectItem value={OpticalOrderType.ACCESSORY}>Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lab</Label>
              <Select value={labId} onValueChange={setLabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-4">
              <Select
                value={line.kind}
                onValueChange={(v) =>
                  setLines((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, kind: v as OpticalItemKind } : row,
                    ),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OpticalItemKind).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Description"
                value={line.description}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, description: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, quantity: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                placeholder="Price $"
                type="number"
                step="0.01"
                value={line.price}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, price: e.target.value } : row,
                    ),
                  )
                }
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setLines((l) => [...l, emptyLine()])}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
            {lines.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((l) => l.slice(0, -1))}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Insurance allowance ($)</Label>
              <Input type="number" step="0.01" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit ($)</Label>
              <Input type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </div>
          </div>
          {inventory.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Tip: link inventory items when creating orders from the patient chart for automatic stock adjustment.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create quote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
