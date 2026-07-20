import 'server-only';
import { db } from '@/lib/db';
import { AIGatewayError } from './types';

export async function assertTenantAccess(args: {
  userId: string;
  practiceId: string;
  locationId?: string | null;
  patientId?: string | null;
}): Promise<void> {
  const membership = await db.organizationMembership.findFirst({
    where: { userId: args.userId, organizationId: args.practiceId },
    select: { id: true },
  });
  if (!membership) {
    throw new AIGatewayError('Practice membership required.', 'FORBIDDEN', 403);
  }

  if (args.patientId) {
    const patient = await db.patient.findFirst({
      where: { id: args.patientId, organizationId: args.practiceId },
      select: { id: true },
    });
    if (!patient) {
      throw new AIGatewayError('Patient not found in this practice.', 'FORBIDDEN', 403);
    }
  }

  if (args.locationId) {
    const location = await db.location.findFirst({
      where: { id: args.locationId, organizationId: args.practiceId },
      select: { id: true },
    });
    if (!location) {
      throw new AIGatewayError('Location not found in this practice.', 'FORBIDDEN', 403);
    }
  }
}

export async function loadKnownPatientIdentifiers(
  patientId: string,
  practiceId: string,
) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, organizationId: practiceId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      externalId: true,
    },
  });
  if (!patient) return null;
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    phone: patient.phone ?? undefined,
    email: patient.email ?? undefined,
    mrn: patient.externalId ?? undefined,
  };
}
