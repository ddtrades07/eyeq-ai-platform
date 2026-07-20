import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandingForm } from '@/components/practice-setup/branding-form';
import { LocationsManager } from '@/components/practice-setup/locations-manager';
import { OnboardingReadinessCard } from '@/components/practice-setup/onboarding-readiness';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { buildReadinessSnapshot } from '@/lib/onboarding/readiness';
import { ConnectedEhrVendor, PracticeMode, SupportedLocale } from '@prisma/client';

export const metadata = { title: 'Practice setup' };

export default async function PracticeSetupPage() {
  const user = await requireStaffUser();
  await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [org, locations, providerCount, patientCount, providerWithNpiCount, staffCount] =
    await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
    db.location.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    }),
    db.provider.count({ where: { organizationId: user.organizationId } }),
    db.patient.count({
      where: { organizationId: user.organizationId, archivedAt: null },
    }),
    db.provider.count({
      where: { organizationId: user.organizationId, npi: { not: null } },
    }),
    db.user.count({ where: { organizationId: user.organizationId, isActive: true } }),
  ]);

  const readinessSnapshot = buildReadinessSnapshot({
    locationCount: locations.length,
    providerCount,
    providerWithNpiCount,
    staffCount,
    patientCount,
    hasPrimaryLocation: locations.some((l) => l.isPrimary),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Practice setup</h2>
        <p className="text-sm text-muted-foreground">
          Configure how EyeQ AI shows up to your team and your patients.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Locations" value={locations.length} />
        <StatTile label="Active patients" value={patientCount} />
        <StatTile label="Providers" value={providerCount} />
        <StatTile
          label="EHR mode"
          value={org.practiceMode === PracticeMode.NATIVE_EHR ? 'Native' : 'Connected'}
        />
      </div>

      <OnboardingReadinessCard snapshot={readinessSnapshot} />

      <Card>
        <CardHeader>
          <CardTitle>Practice profile</CardTitle>
          <CardDescription>
            Branding, default language, EHR mode and timezone. Changes apply
            across the whole organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm
            initial={{
              name: org.name,
              primaryColor: org.primaryColor,
              practiceMode: org.practiceMode,
              connectedEhr: org.connectedEhr,
              timezone: org.timezone,
              defaultLocale: org.defaultLocale,
            }}
          />
        </CardContent>
      </Card>

      <LocationsManager
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          shortName: l.shortName,
          addressLine1: l.addressLine1,
          addressLine2: l.addressLine2,
          city: l.city,
          region: l.region,
          postalCode: l.postalCode,
          phone: l.phone,
          rooms: l.rooms,
          isPrimary: l.isPrimary,
          active: l.active,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Quick reference</CardTitle>
          <CardDescription>
            Tweak deeper configuration in dedicated modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <RefRow
            label="Connected EHR"
            value={
              org.connectedEhr === ConnectedEhrVendor.NONE
                ? 'None, using native EHR'
                : org.connectedEhr.replace(/_/g, ' ')
            }
            link={{ href: '/provider/ehr-integrations', label: 'Manage integrations' }}
          />
          <RefRow
            label="Default language"
            value={localeLabel(org.defaultLocale)}
            link={{ href: '/provider/settings', label: 'Per-user overrides' }}
          />
          <RefRow
            label="Appointment templates"
            value="Configure pretest + duration per visit type"
            link={{ href: '/provider/workflow-builder', label: 'Open workflow builder' }}
          />
          <RefRow
            label="Reminder templates"
            value="SMS / email patient messaging"
            link={{ href: '/provider/reminders', label: 'Open reminders' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function RefRow({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link: { href: string; label: string };
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm">{value}</div>
      </div>
      <a
        href={link.href}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        {link.label} →
      </a>
    </div>
  );
}

function localeLabel(l: SupportedLocale) {
  return {
    EN: 'English',
    ES: 'Spanish',
    HI: 'Hindi',
    GU: 'Gujarati',
    AR: 'Arabic',
    ZH: 'Chinese',
    VI: 'Vietnamese',
  }[l];
}
