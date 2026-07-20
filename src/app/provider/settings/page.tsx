import Link from 'next/link';
import { Building2, Bot, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { KV } from '@/components/ui/kv';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatDate, formatFullName } from '@/lib/utils';
import { DataExportPanel } from '@/components/settings/data-export-panel';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requirePermission('org:read');
  if (!user.organizationId) return null;
  const canManageTeam = hasPermission(user.role, 'users:manage');

  const [org, locations, members] = await Promise.all([
    db.organization.findUnique({ where: { id: user.organizationId } }),
    db.location.findMany({ where: { organizationId: user.organizationId } }),
    canManageTeam
      ? db.user.findMany({
          where: { organizationId: user.organizationId, isActive: true },
          orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Practice profile, locations, and security."
        actions={
          hasPermission(user.role, 'org:manage') ? (
            <Link href="/provider/practice-setup" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Practice setup
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <KV k="Name" v={org?.name ?? '-'} />
          <KV k="Slug" v={org?.slug ?? '-'} />
          <KV k="Mode" v={formatPracticeMode(org?.practiceMode)} />
          <KV k="Connected EHR" v={org?.connectedEhr ?? '-'} />
          <KV k="Timezone" v={org?.timezone ?? '-'} />
          <KV k="Created" v={org ? formatDate(org.createdAt) : '-'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {locations.length === 0 ? (
            <p className="text-muted-foreground">No locations yet.</p>
          ) : (
            <ul className="space-y-1">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center justify-between">
                  <span>
                    <strong>{l.name}</strong>{' '}
                    <span className="text-muted-foreground">· {l.shortName}</span>
                  </span>
                  <div className="flex gap-1">
                    {l.isPrimary ? <Badge variant="info">Primary</Badge> : null}
                    {!l.active ? <Badge variant="outline">Inactive</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManageTeam ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Team members
            </CardTitle>
            <Link href="/provider/team" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Manage team
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <span>
                    {formatFullName(m.firstName, m.lastName)}{' '}
                    <span className="text-muted-foreground">· {m.email}</span>
                  </span>
                  <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {hasPermission(user.role, 'org:manage') ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Live PHI & vendors
            </CardTitle>
            <div className="flex gap-2">
              <Link
                href="/provider/settings/phi-readiness"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                PHI readiness
              </Link>
              <Link
                href="/provider/settings/vendors"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Vendors / BAA
              </Link>
              <Link
                href="/provider/settings/pilot-launch"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Pilot launch
              </Link>
              <Link
                href="/provider/settings/staff-onboarding"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Staff onboarding
              </Link>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Production PHI stays blocked until MFA, RLS, BAAs, backup restore attestation, monitoring,
            and incident response review pass. Controlled pilot is org-scoped and separate from demo
            mode.
          </CardContent>
        </Card>
      ) : null}

      {hasPermission(user.role, 'ai:configure') ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> AI platform
            </CardTitle>
            <Link href="/provider/settings/ai" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              AI Control Center
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configure approved AI providers, review PHI safety events, and monitor usage.
          </CardContent>
        </Card>
      ) : null}

      {hasPermission(user.role, 'patients:create') ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Data import
            </CardTitle>
            <Link href="/provider/settings/import" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Import patients
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Import patients from CSV with preview, validation, and audit logging.
          </CardContent>
        </Card>
      ) : null}

      {hasPermission(user.role, 'migration:create') ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Data migration
            </CardTitle>
            <Link href="/provider/migration" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Migration Center
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Staged imports with validation, trial migration, and reconciliation sign-off.
          </CardContent>
        </Card>
      ) : null}

      {hasPermission(user.role, 'export:manage') ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Data export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download practice data as CSV. Exports are audited and scoped to your organization.
            </p>
            <DataExportPanel />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Security
          </CardTitle>
          <Link href="/provider/settings/security" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Security settings
          </Link>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Enable TOTP two-factor authentication for your staff account.</p>
          <p>• AI outputs require provider review before they affect the chart or patient portal.</p>
          <p>• Imaging files use short-lived signed URLs.</p>
          <p>• Key actions are recorded in the audit log.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPracticeMode(mode: string | null | undefined): string {
  if (!mode) return '-';
  if (mode === 'NATIVE_EHR') return 'Native EHR';
  if (mode === 'CONNECTED_EHR') return 'Connected to external EHR';
  return mode;
}
