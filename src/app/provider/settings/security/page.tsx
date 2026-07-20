import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { MfaEnrollmentPanel } from '@/components/settings/mfa-enrollment-panel';
import { OrgMfaPolicyForm } from '@/components/settings/org-mfa-policy-form';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { getMfaAssurance, isMfaProviderConfigured } from '@/lib/security/mfa';

export const metadata = { title: 'Security settings' };

export default async function SecuritySettingsPage() {
  const user = await requirePermission('org:read');
  const canManage = hasPermission(user.role, 'org:manage');
  const assurance = await getMfaAssurance();

  const org = user.organizationId
    ? await db.organization.findUnique({
        where: { id: user.organizationId },
        select: { mfaRequiredForStaff: true, livePhiEnabled: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/settings">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
      </Button>

      <PageHeader
        title="Security"
        description="MFA enrollment and organization authentication policy. MFA is only considered active when enforced."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isMfaProviderConfigured() ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            )}
            MFA provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isMfaProviderConfigured() ? (
            <Badge variant="success">Configured (Supabase Auth TOTP)</Badge>
          ) : (
            <>
              <Badge variant="warning">MFA provider not configured</Badge>
              <p className="text-muted-foreground">
                Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. EyeQ will not
                pretend MFA is active without a provider.
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Current AAL: {assurance.currentLevel}
            {assurance.enrolled ? ' · factor enrolled' : ' · not enrolled'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your authenticator</CardTitle>
        </CardHeader>
        <CardContent>
          <MfaEnrollmentPanel />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization MFA policy</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgMfaPolicyForm
              required={org?.mfaRequiredForStaff ?? false}
              providerConfigured={isMfaProviderConfigured()}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild variant="outline" size="sm">
            <Link href="/provider/settings/phi-readiness">PHI readiness</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/provider/settings/vendors">Vendor / BAA status</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/provider/audit-logs">Audit logs</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
