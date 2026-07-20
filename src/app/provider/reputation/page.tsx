import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireStaffUser } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/auth/rbac';
import { ReviewInbox } from '@/components/reputation/review-inbox';
import { SyncReviewsButton } from '@/components/reputation/sync-reviews-button';
import {
  ReputationLockedPanel,
  ReputationShell,
} from '@/components/reputation/reputation-shell';
import { loadReputationContext } from '@/lib/reputation/load-reputation-context';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Google Reviews' };

export default async function ReputationPage() {
  const user = await requireStaffUser();
  if (!user.organizationId) return null;

  if (!hasPermission(user.role, 'reputation:read')) {
    return <ReputationLockedPanel />;
  }

  const [ctx, reviews, org, questionCounts] = await Promise.all([
    loadReputationContext(user.organizationId, user.organizationSlug),
    db.googleReview.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { reviewedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        reviewerName: true,
        starRating: true,
        comment: true,
        reviewedAt: true,
        replyStatus: true,
        draftReply: true,
        publishedReply: true,
        location: { select: { name: true } },
      },
    }),
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    }),
    db.googleBusinessQuestion.groupBy({
      by: ['replyStatus'],
      where: { organizationId: user.organizationId },
      _count: { _all: true },
    }),
  ]);

  const canManage = hasPermission(user.role, 'reputation:manage');
  const pendingCount = reviews.filter(
    (r) => r.replyStatus === 'PENDING_REPLY' || r.replyStatus === 'DRAFT',
  ).length;
  const draftCount = reviews.filter((r) => r.replyStatus === 'DRAFT').length;
  const demoPublishedCount = reviews.filter((r) => r.replyStatus === 'DEMO_PUBLISHED').length;
  const unansweredQuestions =
    questionCounts.find((q) => q.replyStatus === 'UNANSWERED')?._count._all ?? 0;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.starRating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <ReputationShell
      pathname="/provider/reputation"
      demoMode={ctx.demoMode}
      connectedLabel={ctx.connectedLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Google review inbox</h3>
          <p className="text-sm text-muted-foreground">
            Draft thank-yous for 5-star reviews, escalate negative feedback, and approve before publish.
          </p>
        </div>
        {canManage && ctx.connections.length ? (
          <SyncReviewsButton connectionId={ctx.connections[0]?.id} />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Average rating</p>
          <p className="text-2xl font-semibold">{avgRating}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Reviews</p>
          <p className="text-2xl font-semibold">{reviews.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Needing reply</p>
          <p className="text-2xl font-semibold">{pendingCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Drafts awaiting approval</p>
          <p className="text-2xl font-semibold">{draftCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Unanswered questions</p>
          <p className="text-2xl font-semibold">{unansweredQuestions}</p>
        </div>
      </div>

      {demoPublishedCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {demoPublishedCount} reply marked DEMO_PUBLISHED (synthetic demo only, not live on Google).
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ctx.connections.length ? (
            ctx.connections.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
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
              No Google Business Profile linked. Connect a location from the Integration Center, or use
              demo seed data.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Review inbox</CardTitle>
          <Badge variant="outline">Approve before publish</Badge>
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
    </ReputationShell>
  );
}
