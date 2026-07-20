import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireStaffUser } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { ReviewInbox } from '@/components/reputation/review-inbox';
import {
  ReputationLockedPanel,
  ReputationShell,
} from '@/components/reputation/reputation-shell';
import { loadReputationContext } from '@/lib/reputation/load-reputation-context';

export const metadata = { title: 'Reply Drafts' };

export default async function ReputationDraftsPage() {
  const user = await requireStaffUser();
  if (!user.organizationId) return null;
  if (!hasPermission(user.role, 'reputation:read')) {
    return <ReputationLockedPanel />;
  }

  const [ctx, drafts] = await Promise.all([
    loadReputationContext(user.organizationId, user.organizationSlug),
    db.googleReview.findMany({
      where: {
        organizationId: user.organizationId,
        replyStatus: 'DRAFT',
      },
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
  ]);

  const canManage = hasPermission(user.role, 'reputation:manage');

  return (
    <ReputationShell
      pathname="/provider/reputation/drafts"
      demoMode={ctx.demoMode}
      connectedLabel={ctx.connectedLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Reply drafts awaiting approval</h3>
          <p className="text-sm text-muted-foreground">
            Review AI or template drafts here. Approve &amp; publish is required. Demo mode marks
            DEMO_PUBLISHED only.
          </p>
        </div>
        <Badge variant="outline">{drafts.length} awaiting approval</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draft queue</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewInbox
            canManage={canManage}
            reviews={drafts.map((r) => ({
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
