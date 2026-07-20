import Link from 'next/link';
import { Receipt, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDate, formatFullName } from '@/lib/utils';
import { isClearinghouseConfigured } from '@/lib/providers/clearinghouse';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { DEMO_EXTERNAL_ACTION_MESSAGE } from '@/lib/demo/safety';
import { serverEnv } from '@/lib/env';
import { NewInvoiceDialog } from '@/components/billing/new-invoice-dialog';
import { NewClaimDialog } from '@/components/billing/new-claim-dialog';
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog';
import { ClaimActions } from '@/components/billing/claim-actions';

export const metadata = { title: 'Billing' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function BillingPage() {
  const user = await requirePermission('billing:read');
  const organizationId = user.organizationId!;
  const canManage = hasPermission(user.role, 'billing:manage');
  const canCreateClaims = hasPermission(user.role, 'claims:create');
  const canManageClaims = hasPermission(user.role, 'claims:submit');
  const clearinghouseConfigured = isClearinghouseConfigured();
  const inDemo =
    serverEnv.demoModeEnabled && user.organizationSlug === DEMO_ORG_SLUG;

  const now = new Date();
  const [openInvoices, overdueCount, openAgg, paidAgg, claims, patients] = await Promise.all([
    db.patientInvoice.findMany({
      where: { organizationId, status: { in: ['OPEN', 'DRAFT'] } },
      orderBy: { issuedAt: 'desc' },
      take: 100,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.patientInvoice.count({
      where: { organizationId, status: 'OPEN', dueDate: { lt: now } },
    }),
    db.patientInvoice.aggregate({
      where: { organizationId, status: 'OPEN' },
      _sum: { totalCents: true, paidCents: true },
    }),
    db.patientInvoice.aggregate({
      where: {
        organizationId,
        status: 'PAID',
        updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { totalCents: true },
    }),
    db.claim.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    }),
    canManage || canCreateClaims
      ? db.patient.findMany({
          where: { organizationId, archivedAt: null },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          take: 200,
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  const outstanding = (openAgg._sum.totalCents ?? 0) - (openAgg._sum.paidCents ?? 0);
  const collectedThisMonth = paidAgg._sum.totalCents ?? 0;
  const draftClaims = claims.filter((c) => c.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Patient balances, open invoices, claims, and payment activity.
          </p>
        </div>
        {(canManage || canCreateClaims) && patients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {canManage ? <NewInvoiceDialog patients={patients} /> : null}
            {canCreateClaims ? <NewClaimDialog patients={patients} /> : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/provider/billing/remittances" className="text-primary hover:underline">
          ERA / EOB remittances
        </Link>
        <Link href="/provider/billing/statements" className="text-primary hover:underline">
          Patient statements
        </Link>
      </div>

      {inDemo ? (
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>Demo billing workflow</AlertTitle>
          <AlertDescription>
            Claims, payments, and statements update demo data only.{' '}
            {DEMO_EXTERNAL_ACTION_MESSAGE}
          </AlertDescription>
        </Alert>
      ) : null}

      {!clearinghouseConfigured ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Clearinghouse not configured</AlertTitle>
          <AlertDescription>
            Electronic claim submission is unavailable. Create and validate claims in EyeQ, then use
            &quot;Record external submission&quot; after submitting through your payer or
            clearinghouse portal. Configure a clearinghouse under{' '}
            <Link href="/provider/ehr-integrations" className="underline">
              Integrations
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(outstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Across {openInvoices.length} open invoice{openInvoices.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Past due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-semibold">
              {overdueCount}
              {overdueCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Invoices past their due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(collectedThisMonth)}</div>
            <p className="text-xs text-muted-foreground">Paid invoices since the 1st</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{draftClaims}</div>
            <p className="text-xs text-muted-foreground">Ready for validation and submission</p>
          </CardContent>
        </Card>
      </div>

      {openInvoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No open invoices"
          description="New invoices will appear here as visits are billed."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {openInvoices.map((inv) => {
                const balance = inv.totalCents - inv.paidCents;
                const pastDue = inv.dueDate && inv.dueDate < now;
                return (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/provider/patients/${inv.patient.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatFullName(inv.patient.firstName, inv.patient.lastName)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.description} · Issued {formatDate(inv.issuedAt)}
                        {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {pastDue ? <Badge variant="destructive">Past due</Badge> : null}
                      {inv.status === 'DRAFT' ? <Badge variant="secondary">Draft</Badge> : null}
                      <span className="font-semibold">{money(balance)}</span>
                      {canManage && balance > 0 ? (
                        <RecordPaymentDialog
                          invoiceId={inv.id}
                          balanceCents={balance}
                          patientName={formatFullName(inv.patient.firstName, inv.patient.lastName)}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No claims yet. Create a draft claim from a signed encounter charge review or use New
              claim above.
            </p>
          ) : (
            <div className="divide-y">
              {claims.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link
                      href={`/provider/patients/${c.patient.id}`}
                      className="font-medium hover:underline"
                    >
                      {formatFullName(c.patient.firstName, c.patient.lastName)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.payerName ?? 'Payer TBD'} · {c.status}
                      {c.externalId ? ` · Ref ${c.externalId}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{money(c.totalCents)}</span>
                    {canManageClaims ? (
                      <ClaimActions
                        claimId={c.id}
                        status={c.status}
                        clearinghouseConfigured={clearinghouseConfigured}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
