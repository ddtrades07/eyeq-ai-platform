import { db } from '@/lib/db';
import { requireStaffUser, requirePatientUser } from '@/lib/auth/require';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { DemoGuidePanel } from '@/components/demo/demo-guide-panel';

async function loadMichaelPatientId(organizationId: string): Promise<string | null> {
  const patient = await db.patient.findFirst({
    where: {
      organizationId,
      firstName: 'Michael',
      lastName: 'Thompson',
    },
    select: { id: true },
  });
  return patient?.id ?? null;
}

export async function StaffDemoGuideLauncher() {
  const user = await requireStaffUser();
  if (user.organizationSlug !== DEMO_ORG_SLUG || !user.organizationId) return null;
  const michaelPatientId = await loadMichaelPatientId(user.organizationId);
  return <DemoGuidePanel michaelPatientId={michaelPatientId} />;
}

export async function PatientDemoGuideLauncher() {
  const user = await requirePatientUser();
  if (user.organizationSlug !== DEMO_ORG_SLUG || !user.organizationId) return null;
  const michaelPatientId = await loadMichaelPatientId(user.organizationId);
  return <DemoGuidePanel michaelPatientId={michaelPatientId} />;
}
