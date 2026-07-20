'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { runStructuredAIReview } from '@/server/actions/imaging';
import { ProviderVerificationDialog } from './provider-verification-dialog';
import { ImagingReviewResults } from './imaging-review-results';
import type { StructuredImagingReview } from '@/lib/imaging/types';

const PROGRESS_STEPS = [
  'Preparing image',
  'Checking image quality',
  'Analyzing visible features',
  'Structuring provider notes',
  'Saving review',
];

export function StructuredReviewActions({
  imagingCaseId,
  isSigned,
  canReview,
  initialReview,
}: {
  imagingCaseId: string;
  isSigned: boolean;
  canReview: boolean;
  analysisMode?: string | null;
  initialReview?: StructuredImagingReview | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progressStep, setProgressStep] = useState(0);
  const [review, setReview] = useState<StructuredImagingReview | null>(initialReview ?? null);

  function runReview() {
    let step = 0;
    const interval = setInterval(() => {
      step = Math.min(step + 1, PROGRESS_STEPS.length - 1);
      setProgressStep(step);
    }, 1200);

    startTransition(async () => {
      try {
        const r = await runStructuredAIReview({ id: imagingCaseId });
        clearInterval(interval);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        setReview(r.data);
        toast.success(r.data.analysisStatusLabel ?? 'Review complete');
        router.refresh();
      } catch (e) {
        clearInterval(interval);
        toast.error(e instanceof Error ? e.message : 'Analysis failed');
      } finally {
        setProgressStep(0);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={runReview} disabled={pending || isSigned}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Run AI image analysis
        </Button>
        {canReview && !isSigned ? (
          <ProviderVerificationDialog imagingCaseId={imagingCaseId} disabled={pending} />
        ) : null}
      </div>

      {pending ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {PROGRESS_STEPS[progressStep]}…
        </p>
      ) : null}

      {review ? <ImagingReviewResults review={review} /> : null}
    </div>
  );
}
