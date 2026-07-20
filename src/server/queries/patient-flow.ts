import 'server-only';

import { AppointmentStatus } from '@prisma/client';
import { db } from '@/lib/db';

const FLOW_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PRETEST,
  AppointmentStatus.WITH_DOCTOR,
  AppointmentStatus.IN_OPTICAL,
];

export type PatientFlowRow = {
  id: string;
  startsAt: Date;
  status: AppointmentStatus;
  type: string;
  waitMinutes: number | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  provider: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  openInvoiceBalanceCents: number;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function listPatientFlowToday(args: {
  organizationId: string;
  locationId?: string | null;
}): Promise<PatientFlowRow[]> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const appointments = await db.appointment.findMany({
    where: {
      organizationId: args.organizationId,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: FLOW_STATUSES },
      ...(args.locationId ? { locationId: args.locationId } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      provider: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      location: { select: { id: true, name: true } },
    },
  });

  const patientIds = [...new Set(appointments.map((a) => a.patientId))];
  const openInvoices = patientIds.length
    ? await db.patientInvoice.findMany({
        where: {
          organizationId: args.organizationId,
          patientId: { in: patientIds },
          status: { in: ['OPEN', 'DRAFT'] },
        },
        select: { patientId: true, totalCents: true, paidCents: true },
      })
    : [];

  const balanceByPatient = new Map<string, number>();
  for (const inv of openInvoices) {
    const bal = inv.totalCents - inv.paidCents;
    balanceByPatient.set(
      inv.patientId,
      (balanceByPatient.get(inv.patientId) ?? 0) + bal,
    );
  }

  return appointments.map((a) => {
    const arrived =
      a.status !== AppointmentStatus.SCHEDULED &&
      a.status !== AppointmentStatus.CONFIRMED;
    const waitMinutes = arrived
      ? Math.max(0, Math.round((now.getTime() - a.startsAt.getTime()) / 60000))
      : null;

    return {
      id: a.id,
      startsAt: a.startsAt,
      status: a.status,
      type: a.type,
      waitMinutes,
      patient: a.patient,
      provider: a.provider
        ? {
            id: a.provider.id,
            name: `${a.provider.user.firstName} ${a.provider.user.lastName}`.trim(),
          }
        : null,
      location: a.location,
      openInvoiceBalanceCents: balanceByPatient.get(a.patientId) ?? 0,
    };
  });
}
