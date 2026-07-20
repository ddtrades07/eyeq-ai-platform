import 'server-only';
import type { EncounterStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { appointmentLocationFilter } from '@/lib/location/scope';

const appointmentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
  provider: {
    select: {
      id: true,
      title: true,
      credentials: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  location: { select: { id: true, shortName: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export type AppointmentListItem = AppointmentRow & {
  encounter: { id: string; status: EncounterStatus } | null;
};

async function attachEncounters(
  appointments: AppointmentRow[],
): Promise<AppointmentListItem[]> {
  if (appointments.length === 0) return [];

  const encounters = await db.encounter.findMany({
    where: { appointmentId: { in: appointments.map((a) => a.id) } },
    select: { id: true, status: true, appointmentId: true },
  });
  const byAppointmentId = new Map(
    encounters.map((e) => [e.appointmentId, { id: e.id, status: e.status }]),
  );

  return appointments.map((appt) => ({
    ...appt,
    encounter: byAppointmentId.get(appt.id) ?? null,
  }));
}

export async function listAppointments(args: {
  organizationId: string;
  locationId?: string | null;
  from?: Date;
  to?: Date;
  status?: Prisma.AppointmentWhereInput['status'];
  providerId?: string;
  patientId?: string;
  search?: string;
  take?: number;
  skip?: number;
}): Promise<AppointmentListItem[]> {
  const appointments = await db.appointment.findMany({
    where: {
      organizationId: args.organizationId,
      ...appointmentLocationFilter(args.locationId),
      ...(args.from || args.to
        ? { startsAt: { gte: args.from, lt: args.to } }
        : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.providerId ? { providerId: args.providerId } : {}),
      ...(args.patientId ? { patientId: args.patientId } : {}),
      ...(args.search
        ? {
            patient: {
              OR: [
                { firstName: { contains: args.search, mode: 'insensitive' } },
                { lastName: { contains: args.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    include: appointmentInclude,
    orderBy: { startsAt: 'asc' },
    take: args.take ?? 100,
    skip: args.skip ?? 0,
  });

  return attachEncounters(appointments);
}
