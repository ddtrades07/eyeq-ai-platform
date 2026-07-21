'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Stethoscope, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { savePretestIntake } from '@/server/actions/pretest';

export function PretestDialog({
  appointmentId,
  patientId,
  patientName,
}: {
  appointmentId: string;
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [vaOD, setVaOD] = React.useState('20/20');
  const [vaOS, setVaOS] = React.useState('20/20');
  const [iopOD, setIopOD] = React.useState('');
  const [iopOS, setIopOS] = React.useState('');
  const [pdMm, setPdMm] = React.useState('');
  const [chiefComplaint, setChiefComplaint] = React.useState('');
  const [history, setHistory] = React.useState('');
  const [allergies, setAllergies] = React.useState('');
  const [meds, setMeds] = React.useState('');
  const [glasses, setGlasses] = React.useState(false);
  const [contacts, setContacts] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const objective = [
      `VA cc OD ${vaOD} | OS ${vaOS}`,
      iopOD || iopOS ? `IOP OD ${iopOD || '-'} mmHg | OS ${iopOS || '-'} mmHg` : null,
      pdMm ? `PD ${pdMm} mm` : null,
      glasses ? 'Patient wears glasses' : null,
      contacts ? 'Patient wears contact lenses' : null,
    ]
      .filter(Boolean)
      .join('\n');
    const subjective = [
      history ? `History: ${history}` : null,
      allergies ? `Allergies: ${allergies}` : null,
      meds ? `Current medications: ${meds}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    startTransition(async () => {
      const r = await savePretestIntake({
        patientId,
        appointmentId,
        chiefComplaint: chiefComplaint || null,
        subjective: subjective || null,
        objective: objective || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Pretest saved: appointment advanced to pretest');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Stethoscope className="h-4 w-4" /> Pretest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pretest, {patientName}</DialogTitle>
          <DialogDescription>
            Captured as a draft Pretest note on the patient&apos;s chart. The
            optometrist will pick this up at the slit lamp.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Chief complaint">
            <Input
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. annual exam, blurred vision OD"
            />
          </Field>

          <div className="grid grid-cols-4 gap-3">
            <Field label="VA cc OD">
              <Input value={vaOD} onChange={(e) => setVaOD(e.target.value)} />
            </Field>
            <Field label="VA cc OS">
              <Input value={vaOS} onChange={(e) => setVaOS(e.target.value)} />
            </Field>
            <Field label="IOP OD (mmHg)">
              <Input
                value={iopOD}
                onChange={(e) => setIopOD(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="IOP OS (mmHg)">
              <Input
                value={iopOS}
                onChange={(e) => setIopOS(e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="PD (mm)">
              <Input
                value={pdMm}
                onChange={(e) => setPdMm(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <div className="flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={glasses}
                  onChange={(e) => setGlasses(e.target.checked)}
                />
                Wears glasses
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contacts}
                  onChange={(e) => setContacts(e.target.checked)}
                />
                Wears CLs
              </label>
            </div>
          </div>

          <Field label="History of present illness">
            <Textarea
              rows={2}
              value={history}
              onChange={(e) => setHistory(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Allergies">
              <Textarea
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </Field>
            <Field label="Current medications">
              <Textarea
                rows={2}
                value={meds}
                onChange={(e) => setMeds(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save pretest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
