'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Send, SkipForward, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { GoogleReviewReplyStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  draftReviewReply,
  publishReviewReply,
  skipReviewReply,
  updateReviewReplyDraft,
} from '@/server/actions/reputation';
import { toastWithDemoNotice } from '@/lib/demo/toast-demo-action';
import { formatDateTime } from '@/lib/utils';

export type ReviewRow = {
  id: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewedAt: string;
  replyStatus: GoogleReviewReplyStatus;
  draftReply: string | null;
  publishedReply: string | null;
  locationName: string | null;
};

const STATUS_LABELS: Record<GoogleReviewReplyStatus, string> = {
  PENDING_REPLY: 'Needs reply',
  DRAFT: 'Draft ready',
  PUBLISHED: 'Published to Google',
  DEMO_PUBLISHED: 'Demo-published',
  SKIPPED: 'Skipped',
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function ReviewReplyCard({
  review,
  canManage,
}: {
  review: ReviewRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(review.draftReply ?? review.publishedReply ?? '');
  const [busy, setBusy] = React.useState<'draft' | 'save' | 'publish' | 'skip' | null>(null);

  React.useEffect(() => {
    setDraft(review.draftReply ?? review.publishedReply ?? '');
  }, [review.id, review.draftReply, review.publishedReply]);

  const isPublished =
    review.replyStatus === 'PUBLISHED' || review.replyStatus === 'DEMO_PUBLISHED';
  const isSkipped = review.replyStatus === 'SKIPPED';

  async function runDraft() {
    setBusy('draft');
    const result = await draftReviewReply({ reviewId: review.id });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDraft(result.data.draftReply ?? '');
    toast.success('AI draft generated: review before publishing.');
    router.refresh();
  }

  async function runSave() {
    if (!draft.trim()) {
      toast.error('Reply cannot be empty.');
      return;
    }
    setBusy('save');
    const result = await updateReviewReplyDraft({ reviewId: review.id, draftReply: draft.trim() });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Draft saved.');
    router.refresh();
  }

  async function runPublish() {
    if (!draft.trim()) {
      toast.error('Add or generate a reply before publishing.');
      return;
    }
    setBusy('publish');
    const result = await publishReviewReply({ reviewId: review.id, replyText: draft.trim() });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const mode = (result.data as { publishMode?: string } | undefined)?.publishMode;
    toastWithDemoNotice(
      mode === 'demo'
        ? 'Marked as demo-published (not posted to Google).'
        : 'Reply published to Google.',
      result.data,
    );
    router.refresh();
  }

  async function runSkip() {
    setBusy('skip');
    const result = await skipReviewReply({ reviewId: review.id });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.message('Review marked as skipped.');
    router.refresh();
  }

  return (
    <article className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{review.reviewerName}</p>
            <StarRating value={review.starRating} />
            <Badge variant="outline">{STATUS_LABELS[review.replyStatus]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(new Date(review.reviewedAt))}
            {review.locationName ? ` · ${review.locationName}` : null}
          </p>
        </div>
      </div>

      {review.comment ? (
        <blockquote className="rounded-md bg-muted/50 px-3 py-2 text-sm italic">
          &ldquo;{review.comment}&rdquo;
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">No written comment.</p>
      )}

      {canManage && !isSkipped ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {isPublished ? 'Published reply' : 'Reply draft'}
            </p>
            {!isPublished ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={runDraft}
                disabled={busy !== null}
              >
                {busy === 'draft' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                Draft with AI
              </Button>
            ) : null}
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            readOnly={isPublished}
            placeholder="Generate an AI draft or write your own reply…"
            className="text-sm"
          />
          {!isPublished ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={runSave}
                disabled={busy !== null}
              >
                {busy === 'save' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Save draft
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={runPublish}
                disabled={busy !== null}
              >
                {busy === 'publish' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1 h-3.5 w-3.5" />
                )}
                Approve &amp; publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={runSkip}
                disabled={busy !== null}
              >
                {busy === 'skip' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SkipForward className="mr-1 h-3.5 w-3.5" />
                )}
                Skip
              </Button>
            </div>
          ) : null}
        </div>
      ) : isPublished && review.publishedReply ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {review.publishedReply}
        </p>
      ) : null}
    </article>
  );
}

export function ReviewInbox({
  reviews,
  canManage,
}: {
  reviews: ReviewRow[];
  canManage: boolean;
}) {
  if (!reviews.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No Google reviews yet. Sync from your connected Business Profile location.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewReplyCard key={review.id} review={review} canManage={canManage} />
      ))}
    </div>
  );
}
