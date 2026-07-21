'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2, Loader2, PenLine, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
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
  createClinicalNote,
  signClinicalNote,
  submitClinicalNoteForReview,
  updateClinicalNote,
} from '@/server/actions/notes';

type NoteFields = {
  type: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  followUp: string;
  patientInstructions: string;
};

const empty: NoteFields = {
  type: 'SOAP exam note',
  chiefComplaint: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  diagnosis: '',
  followUp: '',
  patientInstructions: '',
};

export function NewClinicalNoteDialog({
  patientId,
  appointmentId,
}: {
  patientId: string;
  appointmentId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [fields, setFields] = React.useState<NoteFields>(empty);

  function set<K extends keyof NoteFields>(key: K, value: NoteFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createClinicalNote({
        patientId,
        appointmentId: appointmentId ?? null,
        type: fields.type,
        chiefComplaint: fields.chiefComplaint || null,
        subjective: fields.subjective || null,
        objective: fields.objective || null,
        assessment: fields.assessment || null,
        plan: fields.plan || null,
        diagnosis: fields.diagnosis || null,
        followUp: fields.followUp || null,
        patientInstructions: fields.patientInstructions || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Draft note created: not signed');
      setFields(empty);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" /> New SOAP note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New clinical note (draft)</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Notes stay draft until a provider reviews and signs. Nothing auto-signs.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Note type" value={fields.type} onChange={(v) => set('type', v)} />
          <Field
            label="Chief complaint"
            value={fields.chiefComplaint}
            onChange={(v) => set('chiefComplaint', v)}
          />
          <Area label="HPI / Subjective" value={fields.subjective} onChange={(v) => set('subjective', v)} />
          <Area label="Exam / Objective" value={fields.objective} onChange={(v) => set('objective', v)} />
          <Area label="Assessment" value={fields.assessment} onChange={(v) => set('assessment', v)} />
          <Area label="Plan" value={fields.plan} onChange={(v) => set('plan', v)} />
          <Field label="Diagnosis" value={fields.diagnosis} onChange={(v) => set('diagnosis', v)} />
          <Field label="Follow-up" value={fields.followUp} onChange={(v) => set('followUp', v)} />
          <Area
            label="Patient instructions"
            value={fields.patientInstructions}
            onChange={(v) => set('patientInstructions', v)}
          />
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

export function NoteActions({
  noteId,
  status,
  canWrite,
  canSign,
  initial,
}: {
  noteId: string;
  status: string;
  canWrite: boolean;
  canSign: boolean;
  initial?: Partial<NoteFields>;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [editOpen, setEditOpen] = React.useState(false);
  const [fields, setFields] = React.useState<NoteFields>({ ...empty, ...initial });

  function set<K extends keyof NoteFields>(key: K, value: NoteFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateClinicalNote({
        id: noteId,
        type: fields.type,
        chiefComplaint: fields.chiefComplaint || null,
        subjective: fields.subjective || null,
        objective: fields.objective || null,
        assessment: fields.assessment || null,
        plan: fields.plan || null,
        diagnosis: fields.diagnosis || null,
        followUp: fields.followUp || null,
        patientInstructions: fields.patientInstructions || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Draft updated');
      setEditOpen(false);
      router.refresh();
    });
  }

  function submitReview() {
    startTransition(async () => {
      const r = await submitClinicalNoteForReview({ id: noteId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Submitted for provider review');
      router.refresh();
    });
  }

  function sign() {
    startTransition(async () => {
      const r = await signClinicalNote({ id: noteId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Note signed and locked');
      router.refresh();
    });
  }

  if (status === 'SIGNED' || status === 'AMENDED') return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canWrite && status === 'DRAFT' ? (
        <>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending}>
                <PenLine className="h-3.5 w-3.5" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit draft note</DialogTitle>
              </DialogHeader>
              <form onSubmit={saveEdit} className="space-y-3">
                <Field label="Note type" value={fields.type} onChange={(v) => set('type', v)} />
                <Field
                  label="Chief complaint"
                  value={fields.chiefComplaint}
                  onChange={(v) => set('chiefComplaint', v)}
                />
                <Area label="HPI / Subjective" value={fields.subjective} onChange={(v) => set('subjective', v)} />
                <Area label="Exam / Objective" value={fields.objective} onChange={(v) => set('objective', v)} />
                <Area label="Assessment" value={fields.assessment} onChange={(v) => set('assessment', v)} />
                <Area label="Plan" value={fields.plan} onChange={(v) => set('plan', v)} />
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="secondary" onClick={submitReview} disabled={pending}>
            Submit for review
          </Button>
        </>
      ) : null}
      {canSign && (status === 'DRAFT' || status === 'AWAITING_SIGNOFF') ? (
        <Button size="sm" onClick={sign} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Sign off
        </Button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
