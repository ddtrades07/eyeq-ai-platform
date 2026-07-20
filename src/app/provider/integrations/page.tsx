import Link from 'next/link';
import { PlugZap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requirePermission } from '@/lib/auth/require';
import { isClearinghouseConfigured } from '@/lib/providers/clearinghouse';
import { stripePaymentProvider } from '@/lib/providers/payments/stripe';
import { twilioMessagingProvider } from '@/lib/providers/messaging/twilio';
import { sendgridEmailProvider } from '@/lib/providers/email/sendgrid';
import { serverEnv } from '@/lib/env';
import { isSimulatedClaimsAllowed } from '@/lib/production/mode';
import { isGoogleBusinessConfigured } from '@/lib/providers/google-business';

export const metadata = { title: 'Integration Center' };

type IntegrationRow = {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  detail: string;
  manualWorkflow?: string;
  href?: string;
};

export default async function IntegrationCenterPage() {
  await requirePermission('org:manage');

  const clearinghouse = isClearinghouseConfigured();
  const simulatedClaims = isSimulatedClaimsAllowed();
  const googleBusiness = isGoogleBusinessConfigured() || serverEnv.demoModeEnabled;

  const integrations: IntegrationRow[] = [
    {
      id: 'clearinghouse',
      name: 'Claims clearinghouse',
      category: 'Billing',
      configured: clearinghouse,
      detail: clearinghouse
        ? simulatedClaims
          ? 'Simulation enabled for demo or development only.'
          : 'Live adapter configured.'
        : 'Not configured.',
      manualWorkflow: 'Create and validate claims in Billing, then record external submission.',
      href: '/provider/ehr-integrations',
    },
    {
      id: 'eligibility',
      name: 'Eligibility (270/271)',
      category: 'Billing',
      configured: clearinghouse && simulatedClaims,
      detail: 'Requires contracted eligibility vendor. Manual verification is always available on the patient chart.',
      manualWorkflow: 'Record verification date, staff member, and reference on the patient insurance record.',
    },
    {
      id: 'stripe',
      name: 'Stripe payments',
      category: 'Payments',
      configured: stripePaymentProvider.isConfigured(),
      detail: stripePaymentProvider.isConfigured()
        ? 'Card payments enabled for portal checkout.'
        : 'Not configured.',
      manualWorkflow: 'Record cash, check, and external payments from Billing.',
      href: '/provider/billing',
    },
    {
      id: 'twilio',
      name: 'Twilio SMS',
      category: 'Communications',
      configured: twilioMessagingProvider.isConfigured(),
      detail: twilioMessagingProvider.isConfigured()
        ? 'SMS reminders available when patient consent is on file.'
        : 'Not configured or BAA not confirmed.',
      manualWorkflow: 'Use portal messages or phone call logs.',
      href: '/provider/reminders',
    },
    {
      id: 'sendgrid',
      name: 'SendGrid email',
      category: 'Communications',
      configured: sendgridEmailProvider.isConfigured(),
      detail: sendgridEmailProvider.isConfigured()
        ? 'Email reminders available when patient consent is on file.'
        : 'Not configured or BAA not confirmed.',
      manualWorkflow: 'Use portal messages.',
      href: '/provider/reminders',
    },
    {
      id: 'google-business',
      name: 'Google Business Profile',
      category: 'Reputation',
      configured: googleBusiness,
      detail: googleBusiness
        ? serverEnv.demoModeEnabled && !isGoogleBusinessConfigured()
          ? 'Demo profile linked. AI drafts review replies for staff approval.'
          : 'Reviews sync from your linked Business Profile locations.'
        : 'Not configured. Link a location to sync reviews and draft replies.',
      manualWorkflow: 'Respond to Google reviews directly in the Business Profile manager.',
      href: '/provider/reputation',
    },
    {
      id: 'eprescribe',
      name: 'E-prescribing',
      category: 'Clinical',
      configured: false,
      detail: 'No e-prescribing vendor is connected.',
      manualWorkflow: 'Draft medications in the chart and use print workflow where permitted.',
    },
    {
      id: 'era',
      name: 'ERA / remittance (835)',
      category: 'Billing',
      configured: false,
      detail: 'ERA import not yet connected to a live vendor.',
      manualWorkflow: 'Post payments and adjustments manually from EOB paperwork.',
      href: '/provider/billing',
    },
    {
      id: 'fax',
      name: 'Secure fax',
      category: 'Communications',
      configured: false,
      detail: 'Fax adapter not configured.',
      manualWorkflow: 'Export records and send through your practice fax system.',
    },
    {
      id: 'optical-lab',
      name: 'Optical lab ordering',
      category: 'Optical',
      configured: false,
      detail: 'Electronic lab ordering requires a tested vendor connection.',
      manualWorkflow: 'Create lab orders manually and track status in inventory workflows.',
      href: '/provider/inventory',
    },
  ];

  const configuredCount = integrations.filter((i) => i.configured).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integration Center</h1>
        <p className="text-sm text-muted-foreground">
          Vendor connection status for this practice. Missing integrations keep manual workflows
          available; production never simulates live vendor responses without explicit demo flags.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Configured</p>
          <p className="text-2xl font-semibold">{configuredCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Needs setup</p>
          <p className="text-2xl font-semibold">{integrations.length - configuredCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Environment</p>
          <p className="text-2xl font-semibold">{serverEnv.appEnv}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" /> Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {integrations.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <Badge variant="outline">{row.category}</Badge>
                  <Badge variant={row.configured ? 'default' : 'secondary'}>
                    {row.configured ? 'Configured' : 'Not configured'}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{row.detail}</p>
                {row.manualWorkflow ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Manual workflow: {row.manualWorkflow}
                  </p>
                ) : null}
              </div>
              {row.href ? (
                <Link href={row.href} className="text-xs font-medium text-primary hover:underline">
                  Open module
                </Link>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
