'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
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
import { createWalkInEncounter } from '@/server/actions/appointments';
import { formatFullName } from '@/lib/utils';

export function WalkInDialog({
  patients,
}: {
  patients: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [patientId, setPatientId] = React.useState('');
  const [reason, setReason] = React.useState('Walk-in');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      toast.error('Select a patient');
      return;
    }
    startTransition(async () => {
      const r = await createWalkInEncounter({
        patientId,
        reason,
        durationMinutes: 30,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Walk-in checked in: encounter created');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <UserPlus className="h-4 w-4" /> Walk-in
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in walk-in</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Creates a lightweight walk-in appointment and opens a checked-in encounter.
        </p>
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
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Check in walk-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
