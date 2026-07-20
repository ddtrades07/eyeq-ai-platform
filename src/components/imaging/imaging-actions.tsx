'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runAIReview, signImagingCase } from '@/server/actions/imaging';

export function ImagingActions({
  imagingCaseId,
  isSigned,
  canReview,
}: {
  imagingCaseId: string;
  isSigned: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function review() {
    startTransition(async () => {
      const r = await runAIReview({ id: imagingCaseId });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('AI image analysis ready for provider review');
      router.refresh();
    });
  }

  function sign() {
    startTransition(async () => {
      const r = await signImagingCase({ id: imagingCaseId, trend: 'baseline' });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Provider sign-off recorded');
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={review} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Run review
      </Button>
      {canReview && !isSigned ? (
        <Button size="sm" onClick={sign} disabled={pending}>
          <CheckCircle2 className="h-4 w-4" /> Sign
        </Button>
      ) : null}
    </div>
  );
}
