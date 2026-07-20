import 'server-only';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePatientUser, type SessionUser } from './require';

export type PortalSession = SessionUser & {
  patientId: string;
};

/**
 * Resolves the portal session for the current patient, ensuring there
 * is an underlying `Patient` row in the same organization. If no patient
 * row is found we redirect to a friendly setup page (production should
 * walk through a more elaborate onboarding flow).
 */
export async function requirePortalPatient(): Promise<PortalSession> {
  const user = await requirePatientUser();
  if (!user.organizationId) redirect('/login');

  const patient = await db.patient.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!patient) redirect('/login?error=patient_record_missing');

  return { ...user, patientId: patient.id };
}
