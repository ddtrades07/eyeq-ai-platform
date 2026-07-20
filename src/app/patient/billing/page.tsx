import Link from 'next/link';
import { Receipt, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { isStripeConfigured } from '@/lib/providers/payments/stripe';
import { PayInvoiceButton } from '@/components/billing/pay-invoice-button';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { serverEnv } from '@/lib/env';

export const metadata = { title: 'Billing' };

function money(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default async function PatientBillingPage() {
  const session = await requirePortalPatient();
  const inDemo =
    serverEnv.demoModeEnabled && session.organizationSlug === DEMO_ORG_SLUG;

  const invoices = await db.patientInvoice.findMany({
    where: { patientId: session.patientId, status: { in: ['OPEN', 'PAID'] } },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  });

  const open = invoices.filter((i) => i.status === 'OPEN');
  const paid = invoices.filter((i) => i.status === 'PAID');
  const balance = open.reduce((sum, i) => sum + (i.totalCents - i.paidCents), 0);
  const stripeEnabled = isStripeConfigured();
  const demoPayAvailable = inDemo && !stripeEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Your statements and current balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold">{money(balance)}</span>
            {balance === 0 ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Nothing due
              </Badge>
            ) : null}
          </div>
          {balance > 0 ? (
            <div className="mt-4 space-y-2">
              {stripeEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Pay securely online with a card, or message the office for other options.
                </p>
              ) : demoPayAvailable ? (
                <p className="text-sm text-muted-foreground">
                  Pay your demo balance below. No real card will be charged.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can pay at your next visit, over the phone, or send us a
                  message and we will help you with payment options.
                </p>
              )}
              <Link href="/patient/messages" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                Message the office about billing
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No statements yet"
          description="Statements from your visits will appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {[...open, ...paid].map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{inv.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Issued {formatDate(inv.issuedAt)}
                      {inv.dueDate && inv.status === 'OPEN'
                        ? ` · Due ${formatDate(inv.dueDate)}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                      {inv.status === 'PAID' ? 'Paid' : 'Open'}
                    </Badge>
                    <span className="font-semibold">
                      {money(inv.status === 'PAID' ? inv.totalCents : inv.totalCents - inv.paidCents)}
                    </span>
                    {inv.status === 'OPEN' && (stripeEnabled || demoPayAvailable) ? (
                      <PayInvoiceButton
                        invoiceId={inv.id}
                        amountLabel={money(inv.totalCents - inv.paidCents)}
                        demoPayAvailable={demoPayAvailable}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
