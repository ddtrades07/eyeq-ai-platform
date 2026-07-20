import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireStaffUser } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import {
  ReputationLockedPanel,
  ReputationShell,
} from '@/components/reputation/reputation-shell';
import { loadReputationContext } from '@/lib/reputation/load-reputation-context';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Google Questions' };

const STATUS_LABELS: Record<string, string> = {
  UNANSWERED: 'Needs answer',
  DRAFT: 'Draft ready',
  PUBLISHED: 'Published to Google',
  DEMO_PUBLISHED: 'Demo-published',
  SKIPPED: 'Skipped',
};

export default async function ReputationQuestionsPage() {
  const user = await requireStaffUser();
  if (!user.organizationId) return null;
  if (!hasPermission(user.role, 'reputation:read')) {
    return <ReputationLockedPanel />;
  }

  const [ctx, questions] = await Promise.all([
    loadReputationContext(user.organizationId, user.organizationSlug),
    db.googleBusinessQuestion.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { askedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        authorName: true,
        questionText: true,
        askedAt: true,
        replyStatus: true,
        draftReply: true,
        publishedReply: true,
        location: { select: { name: true } },
      },
    }),
  ]);

  return (
    <ReputationShell
      pathname="/provider/reputation/questions"
      demoMode={ctx.demoMode}
      connectedLabel={ctx.connectedLabel}
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Google questions</h3>
        <p className="text-sm text-muted-foreground">
          Public Q&amp;A from Google Business. Draft answers here; live posting requires a connected
          profile. Demo answers use DEMO_PUBLISHED only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!questions.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No Google questions yet. Demo seed includes appointment, insurance, and contact lens
              questions.
            </p>
          ) : (
            questions.map((q) => (
              <article key={q.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{q.authorName ?? 'Google visitor'}</p>
                  <Badge variant="outline">{STATUS_LABELS[q.replyStatus] ?? q.replyStatus}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(q.askedAt)}
                  {q.location?.name ? ` · ${q.location.name}` : ''}
                </p>
                <blockquote className="rounded-md bg-muted/50 px-3 py-2 text-sm italic">
                  &ldquo;{q.questionText}&rdquo;
                </blockquote>
                {q.publishedReply || q.draftReply ? (
                  <p className="rounded-md border px-3 py-2 text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {q.replyStatus === 'DEMO_PUBLISHED' || q.replyStatus === 'PUBLISHED'
                        ? 'Answer'
                        : 'Draft'}
                    </span>
                    <br />
                    {q.publishedReply ?? q.draftReply}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Awaiting draft. Owner/Admin can prepare a reply; publishing stays demo-only unless
                    Google is connected.
                  </p>
                )}
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </ReputationShell>
  );
}
