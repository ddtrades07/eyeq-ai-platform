import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';
import { GenerateStatementsButton } from '@/components/billing/generate-statements-button';
import { MarkStatementSentButton } from '@/components/billing/mark-statement-sent-button';

export const metadata = { title: 'Statements' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function StatementsPage() {
  const user = await requirePermission('billing:read');
  const organizationId = user.organizationId!;
  const canManage = hasPermission(user.role, 'statements:manage');

  const statements = await db.patientStatement.findMany({
    where: { organizationId },
    orderBy: { statementDate: 'desc' },
    take: 100,
    include: { patient: { select: { id: true, firstName: true, lastName: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patient statements</h1>
          <p className="text-sm text-muted-foreground">
            Batch statements from open invoice balances. Delivery is queued for portal or print export.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/provider/billing" className="text-sm text-primary hover:underline">
            Back to billing
          </Link>
          {canManage ? <GenerateStatementsButton /> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statement history</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {statements.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No statements yet. Generate from patients with open balances.
            </p>
          ) : (
            statements.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/provider/patients/${s.patient.id}`} className="font-medium hover:underline">
                    {formatFullName(s.patient.firstName, s.patient.lastName)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(s.statementDate)} · {s.deliveryMethod} · {s.deliveryStatus}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === 'SENT' ? 'default' : 'secondary'}>{s.status}</Badge>
                  <span className="font-semibold">{money(s.balanceCents)}</span>
                  {canManage && s.status === 'DRAFT' ? (
                    <MarkStatementSentButton statementId={s.id} />
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
