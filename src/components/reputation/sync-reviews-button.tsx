'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncGoogleReviews } from '@/server/actions/reputation';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';

export function SyncReviewsButton({ connectionId }: { connectionId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    const result = await syncGoogleReviews({ connectionId });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toastWithDemoNotice(`Synced ${result.data.imported} review(s).`, result.data);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={run} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-1.5 h-4 w-4" />
      )}
      Sync reviews
    </Button>
  );
}
