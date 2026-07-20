import { Badge } from '@/components/ui/badge';
import type { EncounterStatus } from '@prisma/client';

const LABELS: Record<EncounterStatus, string> = {
  SCHEDULED: 'Scheduled',
  CHECKED_IN: 'Checked in',
  IN_PRETEST: 'Pretest',
  WITH_PROVIDER: 'With provider',
  DOCUMENTATION: 'Documentation',
  CHECKOUT: 'Checkout',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function EncounterStatusBadge({ status }: { status: EncounterStatus }) {
  const variant =
    status === 'COMPLETED' ? 'default'
      : status === 'CANCELLED' ? 'secondary'
        : status === 'WITH_PROVIDER' ? 'info'
          : 'outline';
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
