'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GitMerge, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { mergePatients, previewPatientMerge } from '@/server/actions/patient-merge';
import { formatFullName } from '@/lib/utils';
import type { MergeableField } from '@/lib/patients/merge';

type PatientOption = { id: string; firstName: string; lastName: string };

type FieldRow = {
  field: MergeableField;
  survivingValue: string;
  mergedValue: string;
  conflict: boolean;
};

export function PatientMergeDialog({
  patients,
  defaultSurvivingId,
  defaultMergedId,
}: {
  patients: PatientOption[];
  defaultSurvivingId?: string;
  defaultMergedId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [survivingId, setSurvivingId] = React.useState(defaultSurvivingId ?? '');
  const [mergedId, setMergedId] = React.useState(defaultMergedId ?? '');
  const [fields, setFields] = React.useState<FieldRow[]>([]);
  const [selections, setSelections] = React.useState<Record<string, 'surviving' | 'merged'>>({});

  function loadPreview() {
    if (!survivingId || !mergedId || survivingId === mergedId) {
      toast.error('Select two different patients');
      return;
    }
    startTransition(async () => {
      const r = await previewPatientMerge({ survivingId, mergedId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setFields(r.data.fields as FieldRow[]);
      const defaults: Record<string, 'surviving' | 'merged'> = {};
      for (const f of r.data.fields) {
        defaults[f.field] = 'surviving';
      }
      setSelections(defaults);
    });
  }

  function setField(field: string, choice: 'surviving' | 'merged') {
    setSelections((prev) => ({ ...prev, [field]: choice }));
  }

  function executeMerge() {
    startTransition(async () => {
      const r = await mergePatients({
        survivingId,
        mergedId,
        fieldSelections: selections,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Patients merged successfully');
      setOpen(false);
      router.push(`/provider/patients/${survivingId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <GitMerge className="h-4 w-4" /> Merge patients
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Merge duplicate patients</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Clinical, financial, and document history from the merged record moves to the surviving
          record. Choose which demographic values to keep.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Surviving record (keep)</Label>
            <Select value={survivingId} onValueChange={setSurvivingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === mergedId}>
                    {formatFullName(p.firstName, p.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Record to merge in</Label>
            <Select value={mergedId} onValueChange={setMergedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select duplicate" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === survivingId}>
                    {formatFullName(p.firstName, p.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={loadPreview} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Preview conflicts
        </Button>
        {fields.length > 0 ? (
          <div className="space-y-2 rounded-md border p-3">
            {fields.map((f) => (
              <div key={f.field} className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{labelForField(f.field)}</span>
                  {f.conflict ? <Badge variant="warning">Conflict</Badge> : null}
                </div>
                {f.conflict ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded border p-2 text-left text-xs ${selections[f.field] === 'surviving' ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setField(f.field, 'surviving')}
                    >
                      Keep: {f.survivingValue || '(empty)'}
                    </button>
                    <button
                      type="button"
                      className={`rounded border p-2 text-left text-xs ${selections[f.field] === 'merged' ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setField(f.field, 'merged')}
                    >
                      Use: {f.mergedValue || '(empty)'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{f.survivingValue || f.mergedValue || '(empty)'}</p>
                )}
              </div>
            ))}
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/provider/patients">Cancel</Link>
          </Button>
          <Button onClick={executeMerge} disabled={pending || !survivingId || !mergedId}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelForField(field: MergeableField): string {
  const labels: Record<MergeableField, string> = {
    firstName: 'First name',
    lastName: 'Last name',
    dateOfBirth: 'Date of birth',
    email: 'Email',
    phone: 'Phone',
    addressLine1: 'Address',
    addressLine2: 'Address line 2',
    city: 'City',
    region: 'State',
    postalCode: 'Postal code',
    insuranceCarrier: 'Insurance carrier',
    insuranceMemberId: 'Member ID',
    preferredLanguage: 'Preferred language',
  };
  return labels[field];
}
