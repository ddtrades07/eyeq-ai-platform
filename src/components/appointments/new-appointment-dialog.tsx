'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppointmentType } from '@prisma/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAppointment } from '@/server/actions/appointments';
import { formatFullName } from '@/lib/utils';

type Option = { id: string; firstName?: string | null; lastName?: string | null };
type ProviderOption = {
  id: string;
  credentials: string | null;
  user: { firstName: string | null; lastName: string | null } | null;
};
type LocationOption = { id: string; shortName: string; name: string };

export function NewAppointmentDialog({
  patients,
  providers,
  locations,
  defaultOpen,
}: {
  patients: Option[];
  providers: ProviderOption[];
  locations: LocationOption[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [pending, startTransition] = React.useTransition();

  const [patientId, setPatientId] = React.useState<string>('');
  const [providerId, setProviderId] = React.useState<string>('');
  const [locationId, setLocationId] = React.useState<string>(locations[0]?.id ?? '');
  const [type, setType] = React.useState<string>(AppointmentType.COMPREHENSIVE_EYE_EXAM);
  const [duration, setDuration] = React.useState<string>('45');
  const [dilation, setDilation] = React.useState<boolean>(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startsAt = `${String(fd.get('date') ?? '')}T${String(fd.get('time') ?? '')}`;

    startTransition(async () => {
      const result = await createAppointment({
        patientId,
        providerId: providerId || null,
        locationId: locationId || null,
        type: type as AppointmentType,
        startsAt: new Date(startsAt),
        durationMinutes: Number(duration),
        reason: String(fd.get('reason') ?? '') || null,
        notes: String(fd.get('notes') ?? '') || null,
        dilationNeeded: dilation,
        imagingNeeded: [],
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Appointment scheduled');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule appointment</DialogTitle>
          <DialogDescription>
            Patient-facing details and provider assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
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
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(AppointmentType).map((t) => (
                    <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Start time</Label>
              <Input id="time" name="time" type="time" required />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['15', '30', '45', '60', '75', '90'].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatFullName(p.user?.firstName, p.user?.lastName)}
                      {p.credentials ? `, ${p.credentials}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason for visit</Label>
            <Input id="reason" name="reason" placeholder="e.g. annual exam, blurred vision" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Internal notes for the team." />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dilation}
              onChange={(e) => setDilation(e.target.checked)}
            />
            Dilation expected
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !patientId}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
