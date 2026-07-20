import { redirect } from 'next/navigation';
import { requireStaffUser } from '@/lib/auth/require';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { db } from '@/lib/db';
import { DemoWalkthroughClient } from '@/components/demo/demo-walkthrough-client';
import { DemoFailSafe } from '@/components/demo/demo-fail-safe';

export const metadata = {
  title: 'Live Demo Walkthrough',
  description: 'Guided EyeQ demo walkthrough for optometry practices.',
};

export default async function DemoWalkthroughPage() {
  const user = await requireStaffUser();
  if (user.organizationSlug !== DEMO_ORG_SLUG || !user.organizationId) {
    redirect('/provider/dashboard');
  }

  try {
    const [michael, imaging, encounter] = await Promise.all([
      db.patient.findFirst({
        where: {
          organizationId: user.organizationId,
          firstName: 'Michael',
          lastName: 'Thompson',
        },
        select: { id: true },
      }),
      db.imagingCase.findFirst({
        where: {
          organizationId: user.organizationId,
          patient: { firstName: 'Michael', lastName: 'Thompson' },
        },
        orderBy: { capturedAt: 'desc' },
        select: { id: true },
      }),
      db.encounter.findFirst({
        where: {
          organizationId: user.organizationId,
          patient: { firstName: 'Michael', lastName: 'Thompson' },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      }),
    ]);

    return (
      <DemoWalkthroughClient
        michaelPatientId={michael?.id ?? null}
        imagingId={imaging?.id ?? null}
        encounterId={encounter?.id ?? null}
      />
    );
  } catch (err) {
    console.error('[demo-walkthrough] load failed', err instanceof Error ? err.message : 'unknown');
    return (
      <DemoFailSafe
        title="Demo walkthrough could not load"
        description="The guided demo hit an unexpected error. Return to the walkthrough after reset, or continue from the dashboard."
      />
    );
  }
}
