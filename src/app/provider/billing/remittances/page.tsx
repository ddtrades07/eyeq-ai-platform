import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { ManualRemittanceDialog } from '@/components/billing/manual-remittance-dialog';
import { PostRemittanceButton } from '@/components/billing/post-remittance-button';

export const metadata = { title: 'Remittances' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function RemittancesPage() {
  const user = await requirePermission('billing:read');
  const organizationId = user.organizationId!;
  const canPost = hasPermission(user.role, 'era:post');

  const [remittances, claims] = await Promise.all([
    db.remittanceAdvice.findMany({
      where: { organizationId },
      orderBy: { receivedAt: 'desc' },
      take: 50,
      include: { _count: { select: { lines: true } } },
    }),
    canPost
      ? db.claim.findMany({
          where: { organizationId, status: { in: ['SUBMITTED', 'ACCEPTED'] } },
          take: 100,
          include: { patient: { select: { firstName: true, lastName: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ERA / EOB remittances</h1>
          <p className="text-sm text-muted-foreground">
            Record manual EOBs today. ERA 835 import requires a configured remittance vendor.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/provider/billing" className="text-sm text-primary hover:underline">
            Back to billing
          </Link>
          {canPost ? <ManualRemittanceDialog claims={claims} /> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Remittance queue</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {remittances.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No remittances recorded yet.</p>
          ) : (
            remittances.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{r.payerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.source.replace(/_/g, ' ')} · {formatDate(r.receivedAt)} · {r._count.lines} line(s)
                    {r.checkNumber ? ` · Ref ${r.checkNumber}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === 'POSTED' ? 'default' : 'secondary'}>{r.status}</Badge>
                  <span className="font-semibold">{money(r.totalPaidCents)}</span>
                  {canPost && r.status !== 'POSTED' ? (
                    <PostRemittanceButton remittanceId={r.id} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
