'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, CheckCircle2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { PrescriptionType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  archivePrescription,
  createPrescription,
  signPrescription,
} from '@/server/actions/prescriptions';

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewPrescriptionDialog({
  patientId,
  defaultType = 'GLASSES',
}: {
  patientId: string;
  defaultType?: 'GLASSES' | 'CONTACTS';
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [type, setType] = React.useState<'GLASSES' | 'CONTACTS'>(defaultType);
  const [expiresAt, setExpiresAt] = React.useState(defaultExpiry);
  const [providerName, setProviderName] = React.useState('');
  const [odSphere, setOdSphere] = React.useState('');
  const [odCyl, setOdCyl] = React.useState('');
  const [odAxis, setOdAxis] = React.useState('');
  const [odAdd, setOdAdd] = React.useState('');
  const [osSphere, setOsSphere] = React.useState('');
  const [osCyl, setOsCyl] = React.useState('');
  const [osAxis, setOsAxis] = React.useState('');
  const [osAdd, setOsAdd] = React.useState('');
  const [pd, setPd] = React.useState('');
  const [modality, setModality] = React.useState('');
  const [notes, setNotes] = React.useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createPrescription({
        patientId,
        type: type as PrescriptionType,
        expiresAt: new Date(expiresAt),
        providerName: providerName || null,
        odSphere: odSphere || null,
        odCyl: odCyl || null,
        odAxis: odAxis || null,
        odAdd: odAdd || null,
        osSphere: osSphere || null,
        osCyl: osCyl || null,
        osAxis: osAxis || null,
        osAdd: osAdd || null,
        pd: pd || null,
        modality: modality || null,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Prescription draft created — provider sign-off required');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Rx
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create prescription (draft)</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Draft only. A provider must sign before this Rx is active for the portal.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'GLASSES' | 'CONTACTS')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLASSES">Glasses</SelectItem>
                <SelectItem value="CONTACTS">Contact lenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Provider name</Label>
              <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">OD</p>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Sph" value={odSphere} onChange={(e) => setOdSphere(e.target.value)} />
            <Input placeholder="Cyl" value={odCyl} onChange={(e) => setOdCyl(e.target.value)} />
            <Input placeholder="Axis" value={odAxis} onChange={(e) => setOdAxis(e.target.value)} />
            <Input placeholder="Add" value={odAdd} onChange={(e) => setOdAdd(e.target.value)} />
          </div>
          <p className="text-xs font-medium text-muted-foreground">OS</p>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Sph" value={osSphere} onChange={(e) => setOsSphere(e.target.value)} />
            <Input placeholder="Cyl" value={osCyl} onChange={(e) => setOsCyl(e.target.value)} />
            <Input placeholder="Axis" value={osAxis} onChange={(e) => setOsAxis(e.target.value)} />
            <Input placeholder="Add" value={osAdd} onChange={(e) => setOsAdd(e.target.value)} />
          </div>
          {type === 'GLASSES' ? (
            <div className="space-y-1.5">
              <Label>PD</Label>
              <Input value={pd} onChange={(e) => setPd(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Modality</Label>
              <Input
                placeholder="Daily / Monthly"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PrescriptionActions({
  rxId,
  status,
  canWrite,
  canSign,
}: {
  rxId: string;
  status: string;
  canWrite: boolean;
  canSign: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function sign() {
    startTransition(async () => {
      const r = await signPrescription({ id: rxId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Prescription signed');
      router.refresh();
    });
  }

  function archive() {
    startTransition(async () => {
      const r = await archivePrescription({ id: rxId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.message('Prescription archived');
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {canSign && status === 'DRAFT' ? (
        <Button size="sm" onClick={sign} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Sign
        </Button>
      ) : null}
      {canWrite && status !== 'ARCHIVED' ? (
        <Button size="sm" variant="ghost" onClick={archive} disabled={pending}>
          <Archive className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
