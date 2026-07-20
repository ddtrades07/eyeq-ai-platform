'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendReminderCampaign } from '@/server/actions/reminders';

export function SendCampaignButton({
  campaignId,
  disabled,
}: {
  campaignId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      const r = await sendReminderCampaign({ campaignId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Campaign send queued (job ${r.data.jobId})`);
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={run} disabled={pending || disabled}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Send now
    </Button>
  );
}
