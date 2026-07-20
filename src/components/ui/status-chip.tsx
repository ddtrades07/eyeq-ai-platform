import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusChipVariants = cva('status-chip', {
  variants: {
    tone: {
      neutral: 'border-border/80 bg-muted/80 text-muted-foreground',
      info: 'border-sky-300/50 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200',
      success:
        'border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-200',
      warning:
        'border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200',
      urgent:
        'border-red-300/50 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200',
      ai: 'border-violet-300/50 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200',
      aqua: 'border-cyan-300/50 bg-cyan-50 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-950/50 dark:text-cyan-200',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {}

export function StatusChip({ className, tone, ...props }: StatusChipProps) {
  return <span className={cn(statusChipVariants({ tone }), className)} {...props} />;
}

/** Maps appointment workflow statuses to readable chips with text labels. */
export function appointmentStatusTone(
  status: string,
): NonNullable<VariantProps<typeof statusChipVariants>['tone']> {
  switch (status) {
    case 'SCHEDULED':
      return 'neutral';
    case 'CONFIRMED':
      return 'info';
    case 'CHECKED_IN':
      return 'aqua';
    case 'IN_PRETEST':
      return 'warning';
    case 'WITH_DOCTOR':
      return 'success';
    case 'IN_OPTICAL':
      return 'info';
    case 'COMPLETED':
      return 'success';
    case 'NO_SHOW':
      return 'urgent';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function formatAppointmentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Arrived',
    IN_PRETEST: 'With Technician',
    WITH_DOCTOR: 'In Exam',
    IN_OPTICAL: 'Checkout',
    COMPLETED: 'Completed',
    NO_SHOW: 'No Show',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}
