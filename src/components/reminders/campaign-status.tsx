'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReminderCampaignStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { setCampaignStatus } from '@/server/actions/reminders';
import { SendCampaignButton } from '@/components/reminders/send-campaign-button';

export function CampaignStatusActions({
  id,
  status,
  canManage,
  canApprove,
}: {
  id: string;
  status: ReminderCampaignStatus;
  canManage: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function update(next: ReminderCampaignStatus) {
    startTransition(async () => {
      const r = await setCampaignStatus({ id, status: next });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Campaign ${next.toLowerCase().replace('_', ' ')}`);
      router.refresh();
    });
  }

  if (pending) {
    return <Loader2 className="ml-auto h-4 w-4 animate-spin" />;
  }

  if (status === 'DRAFT' && canManage) {
    return (
      <Button size="sm" variant="outline" onClick={() => update('PENDING_APPROVAL')}>
        Submit for approval
      </Button>
    );
  }
  if (status === 'PENDING_APPROVAL' && canApprove) {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => update('CANCELLED')}>Reject</Button>
        <Button size="sm" onClick={() => update('APPROVED')}>Approve</Button>
      </div>
    );
  }
  if (status === 'APPROVED' && canApprove) {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => update('SCHEDULED')}>Mark scheduled</Button>
        <SendCampaignButton campaignId={id} />
      </div>
    );
  }
  if (status === 'SCHEDULED' && canApprove) {
    return <SendCampaignButton campaignId={id} />;
  }
  return <span className="text-xs text-muted-foreground">-</span>;
}
