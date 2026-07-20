import Link from 'next/link';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireStaffUser } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import {
  ReputationLockedPanel,
  ReputationShell,
} from '@/components/reputation/reputation-shell';
import { loadReputationContext } from '@/lib/reputation/load-reputation-context';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Review Analytics' };

export default async function ReputationAnalyticsPage() {
  const user = await requireStaffUser();
  if (!user.organizationId) return null;
  if (!hasPermission(user.role, 'reputation:read')) {
    return <ReputationLockedPanel />;
  }

  const [ctx, reviews, questions] = await Promise.all([
    loadReputationContext(user.organizationId, user.organizationSlug),
    db.googleReview.findMany({
      where: { organizationId: user.organizationId },
      select: { starRating: true, replyStatus: true },
      take: 200,
    }),
    db.googleBusinessQuestion.groupBy({
      by: ['replyStatus'],
      where: { organizationId: user.organizationId },
      _count: { _all: true },
    }),
  ]);

  const total = reviews.length;
  const avg =
    total > 0
      ? (reviews.reduce((s, r) => s + r.starRating, 0) / total).toFixed(2)
      : '—';
  const byStars = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.starRating === stars).length,
  }));
  const needingReply = reviews.filter(
    (r) => r.replyStatus === 'PENDING_REPLY' || r.replyStatus === 'DRAFT',
  ).length;
  const draftAwaiting = reviews.filter((r) => r.replyStatus === 'DRAFT').length;
  const demoPublished = reviews.filter((r) => r.replyStatus === 'DEMO_PUBLISHED').length;
  const unanswered =
    questions.find((q) => q.replyStatus === 'UNANSWERED')?._count._all ?? 0;

  return (
    <ReputationShell
      pathname="/provider/reputation/analytics"
      demoMode={ctx.demoMode}
      connectedLabel={ctx.connectedLabel}
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Review analytics</h3>
        <p className="text-sm text-muted-foreground">
          Compact reputation snapshot for the practice. Demo data is synthetic.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average rating</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {avg}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total reviews</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needing reply</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{needingReply}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unanswered questions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{unanswered}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Star distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byStars.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-sm">
              <span className="w-12 tabular-nums">{row.stars}★</span>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{
                    width: total ? `${Math.max(4, (row.count / total) * 100)}%` : '0%',
                  }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Drafts awaiting approval: {draftAwaiting}</Badge>
        <Badge variant="secondary">DEMO_PUBLISHED: {demoPublished}</Badge>
        <Link
          href="/provider/reputation"
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
        >
          Open reputation inbox
        </Link>
      </div>
    </ReputationShell>
  );
}
