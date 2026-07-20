'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppointmentStatus } from '@prisma/client';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cancelAppointment, setAppointmentStatus } from '@/server/actions/appointments';
import { APPOINTMENT_STATUS_LABEL } from './status-badge';

const NEXT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PRETEST,
  AppointmentStatus.WITH_DOCTOR,
  AppointmentStatus.IN_OPTICAL,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
];

export function AppointmentRowActions({
  appointmentId,
  canChangeStatus,
  canCancel,
}: {
  appointmentId: string;
  canChangeStatus: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function changeStatus(status: AppointmentStatus) {
    startTransition(async () => {
      const r = await setAppointmentStatus({ id: appointmentId, status });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Marked ${APPOINTMENT_STATUS_LABEL[status]}`);
      router.refresh();
    });
  }

  function doCancel() {
    if (!confirm('Cancel this appointment?')) return;
    startTransition(async () => {
      const r = await cancelAppointment({ id: appointmentId, reason: 'cancelled-by-staff' });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Appointment cancelled');
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canChangeStatus ? (
          <>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {NEXT_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => changeStatus(s)}>
                Mark {APPOINTMENT_STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {canCancel ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={doCancel} className="text-destructive">
              Cancel appointment
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
