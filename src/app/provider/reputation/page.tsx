import { ShieldCheck, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/auth/rbac';
import { isGoogleBusinessConfigured } from '@/lib/providers/google-business';
import { ReviewInbox } from '@/components/reputation/review-inbox';
import { SyncReviewsButton } from '@/components/reputation/sync-reviews-button';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Google Reviews' };

export default async function ReputationPage() {
  const user = await requireStaffUser();
  await requirePermission('reputation:read');
  if (!user.organizationId) return null;

  const [reviews, connections, org] = await Promise.all([
    db.googleReview.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { reviewedAt: 'desc' },
      include: { location: { select: { name: true } } },
    }),
    db.googleBusinessConnection.findMany({
      where: { organizationId: user.organizationId },
      include: { location: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    }),
  ]);

  const canManage = hasPermission(user.role, 'reputation:manage');
  const configured = isGoogleBusinessConfigured() || connections.some((c) => c.demoMode);
  const pendingCount = reviews.filter((r) => r.replyStatus === 'PENDING_REPLY' || r.replyStatus === 'DRAFT').length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Google review replies</h2>
          <p className="text-sm text-muted-foreground">
            AI drafts public responses to Google Business reviews. Staff review and approve before
            anything is posted.
          </p>
        </div>
        {canManage && connections.length ? (
          <SyncReviewsButton connectionId={connections[0]?.id} />
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Replies are public on Google. Never include PHI, specific diagnoses, or visit details.
          AI drafts require staff approval before publishing.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Average rating</p>
          <p className="text-2xl font-semibold flex items-center gap-1">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {avgRating}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total reviews</p>
          <p className="text-2xl font-semibold">{reviews.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Awaiting reply</p>
          <p className="text-2xl font-semibold">{pendingCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Google connection</p>
          <p className="text-sm font-medium mt-1">
            <Badge variant={configured ? 'default' : 'secondary'}>
              {configured ? 'Connected (demo or live)' : 'Not configured'}
            </Badge>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {connections.length ? (
            connections.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                <span>{c.placeName ?? c.location?.name ?? org?.name ?? 'Practice'}</span>
                <span className="text-xs text-muted-foreground">
                  {c.lastSyncedAt
                    ? `Last synced ${formatDateTime(c.lastSyncedAt)}`
                    : 'Not synced yet'}
                  {c.demoMode ? ' · Demo' : ''}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">
              No Google Business Profile linked. Connect a location from the Integration Center.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewInbox
            canManage={canManage}
            reviews={reviews.map((r) => ({
              id: r.id,
              reviewerName: r.reviewerName,
              starRating: r.starRating,
              comment: r.comment,
              reviewedAt: r.reviewedAt.toISOString(),
              replyStatus: r.replyStatus,
              draftReply: r.draftReply,
              publishedReply: r.publishedReply,
              locationName: r.location?.name ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
