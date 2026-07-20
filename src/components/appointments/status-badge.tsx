import { AppointmentStatus } from '@prisma/client';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  IN_PRETEST: 'In pretest',
  WITH_DOCTOR: 'With doctor',
  IN_OPTICAL: 'Optical',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
};

const VARIANTS: Record<AppointmentStatus, NonNullable<BadgeProps['variant']>> = {
  SCHEDULED: 'secondary',
  CONFIRMED: 'info',
  CHECKED_IN: 'info',
  IN_PRETEST: 'warning',
  WITH_DOCTOR: 'default',
  IN_OPTICAL: 'default',
  COMPLETED: 'success',
  NO_SHOW: 'destructive',
  CANCELLED: 'outline',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}

export const APPOINTMENT_STATUS_LABEL = LABELS;
