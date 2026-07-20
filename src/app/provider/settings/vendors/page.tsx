import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { VendorCardActions } from '@/components/settings/vendor-card-actions';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { listVendorCards } from '@/lib/vendors/readiness';

export const metadata = { title: 'Vendor readiness' };

function stateBadge(state: string) {
  if (state === 'ready') return <Badge variant="success">Ready</Badge>;
  if (state === 'blocked') return <Badge variant="destructive">Blocked</Badge>;
  if (state === 'demo_only') return <Badge variant="warning">Demo only</Badge>;
  return <Badge variant="outline">Needs configuration</Badge>;
}

export default async function VendorsSettingsPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;
  const canManage = hasPermission(user.role, 'org:manage');
  const cards = await listVendorCards(user.organizationId);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/settings">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
      </Button>

      <PageHeader
        title="Vendor & BAA readiness"
        description="Secrets never appear in full. Production PHI mode depends on configured vendors with BAAs where required."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.vendor}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">{c.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{c.statusLabel}</p>
              </div>
              {stateBadge(c.state)}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{c.detail}</p>
              {c.configHint ? (
                <p className="text-xs text-muted-foreground">Hint: {c.configHint}</p>
              ) : null}
              <p className="text-xs">
                BAA: {c.baaRequired ? (c.baaComplete ? 'Complete' : 'Required') : 'N/A'}
              </p>
              {c.lastTestAt ? (
                <p className="text-xs text-muted-foreground">
                  Last test: {new Date(c.lastTestAt).toLocaleString()}{' '}
                  {c.lastTestOk ? '(ok)' : '(failed)'}
                </p>
              ) : null}
              {c.lastError ? (
                <p className="text-xs text-destructive">{c.lastError}</p>
              ) : null}
              {canManage ? (
                <VendorCardActions
                  vendor={c.vendor}
                  baaComplete={c.baaComplete}
                  baaRequired={c.baaRequired}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
