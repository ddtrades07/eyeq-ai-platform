import { PatientSidebar } from '@/components/layout/patient-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { DemoBanner } from '@/components/demo/demo-banner';
import { PatientDemoGuideLauncher } from '@/components/demo/demo-guide-launcher';
import { requirePatientUser } from '@/lib/auth/require';
import { formatFullName } from '@/lib/utils';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePatientUser();
  const fullName = formatFullName(user.firstName, user.lastName);
  const inDemo = user.organizationSlug === DEMO_ORG_SLUG;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <PatientSidebar patientName={fullName} />
      <div className="flex flex-1 flex-col">
        {inDemo ? <DemoBanner /> : null}
        <TopBar
          userName={fullName}
          email={user.email}
          role={user.role}
          roleLabel="Patient"
          subtitle={user.organizationName ?? undefined}
          variant="patient"
          inDemo={inDemo}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
        <footer className="border-t bg-background px-6 py-3 text-center text-xs text-muted-foreground">
          Messages with your care team are not for emergencies. If you have
          sudden vision loss or severe eye pain, call your eye doctor&apos;s office or 911
          right away.
        </footer>
      </div>
      {inDemo ? <PatientDemoGuideLauncher /> : null}
    </div>
  );
}
