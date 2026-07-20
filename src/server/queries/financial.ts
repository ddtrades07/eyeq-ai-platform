import 'server-only';
import { db } from '@/lib/db';

export type FinancialFilters = {
  periodStart: Date;
  periodEnd: Date;
  locationId?: string | null;
  providerId?: string | null;
  appointmentType?: string | null;
};

export type FinancialReportData = {
  appointmentVolume: {
    scheduled: number;
    completed: number;
    noShow: number;
    cancelled: number;
    completionRate: number;
    noShowRate: number;
  };
  recall: {
    careGapsTotal: number;
    careGapsResolved: number;
    careGapsLeakage: number;
    conversionRate: number;
  };
  inventory: {
    totalSkus: number;
    inventoryCostCents: number;
    inventoryRetailCents: number;
    lowStockSkus: number;
    lowStockReorderCostCents: number;
  };
  retention: {
    patientsActive: number;
    patientsReturning: number;
    retentionRate: number;
  };
  workload: { providerId: string; providerName: string; completedAppointments: number }[];
  locations: { locationId: string; locationName: string; appointments: number }[];
  optical: {
    handoffsPending: number;
    appointmentsWithHandoff: number;
    handoffRate: number;
  };
  revenueOpportunity: {
    expiringRxNext90Days: number;
    overdueAnnualExams: number;
    estimatedOpportunity: string;
  };
};

export async function getFinancialReport(
  organizationId: string,
  { periodStart, periodEnd, locationId, providerId, appointmentType }: FinancialFilters,
): Promise<FinancialReportData> {
  const apptWhere = {
    organizationId,
    startsAt: { gte: periodStart, lte: periodEnd },
    ...(locationId ? { locationId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(appointmentType ? { type: appointmentType as 'COMPREHENSIVE_EYE_EXAM' } : {}),
  };

  const [
    scheduled,
    completed,
    noShow,
    cancelled,
    careGapsTotal,
    careGapsResolved,
    inventoryItems,
    activePatients,
    returningPatients,
    workloadAgg,
    locationAgg,
    handoffsPending,
    handoffsTotal,
    expiringRx,
    overdueAnnual,
  ] = await Promise.all([
    db.appointment.count({ where: apptWhere }),
    db.appointment.count({ where: { ...apptWhere, status: 'COMPLETED' } }),
    db.appointment.count({ where: { ...apptWhere, status: 'NO_SHOW' } }),
    db.appointment.count({ where: { ...apptWhere, status: 'CANCELLED' } }),
    db.careGap.count({
      where: { organizationId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
    db.careGap.count({
      where: {
        organizationId,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: { in: ['BOOKED', 'CONTACTED'] },
      },
    }),
    db.inventoryItem.findMany({
      where: {
        organizationId,
        archivedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      select: { quantityOnHand: true, costCents: true, retailCents: true, reorderAt: true, reorderQuantity: true, status: true },
    }),
    db.patient.count({
      where: {
        organizationId,
        archivedAt: null,
        appointments: { some: { startsAt: { gte: periodStart, lte: periodEnd } } },
      },
    }),
    db.patient.count({
      where: {
        organizationId,
        archivedAt: null,
        appointments: {
          some: {
            startsAt: { gte: periodStart, lte: periodEnd },
            status: 'COMPLETED',
          },
        },
      },
    }),
    db.appointment.groupBy({
      by: ['providerId'],
      where: { ...apptWhere, status: 'COMPLETED', providerId: { not: null } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by: ['locationId'],
      where: { ...apptWhere, locationId: { not: null } },
      _count: { _all: true },
    }),
    db.appointment.count({
      where: { ...apptWhere, opticalHandoffPending: true },
    }),
    db.appointment.count({
      where: { ...apptWhere, status: 'COMPLETED' },
    }),
    db.prescription.count({
      where: {
        organizationId,
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        },
      },
    }),
    db.careGap.count({
      where: {
        organizationId,
        type: 'ANNUAL_EXAM_OVERDUE',
        status: { in: ['DUE', 'OVERDUE'] },
      },
    }),
  ]);

  const inventoryCostCents = inventoryItems.reduce(
    (s, i) => s + i.quantityOnHand * i.costCents,
    0,
  );
  const inventoryRetailCents = inventoryItems.reduce(
    (s, i) => s + i.quantityOnHand * i.retailCents,
    0,
  );
  const lowStockSkus = inventoryItems.filter(
    (i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK',
  ).length;
  const lowStockReorderCostCents = inventoryItems.reduce((s, i) => {
    if (i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK') {
      return s + Math.max(i.reorderQuantity, 0) * i.costCents;
    }
    return s;
  }, 0);

  const providerIds = workloadAgg
    .map((w) => w.providerId)
    .filter((v): v is string => Boolean(v));
  const providers = await db.provider.findMany({
    where: { id: { in: providerIds } },
    include: { user: true },
  });
  const providerNameById = new Map(
    providers.map((p) => [
      p.id,
      `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim() || 'Unknown provider',
    ]),
  );

  const locationIds = locationAgg
    .map((l) => l.locationId)
    .filter((v): v is string => Boolean(v));
  const locations = await db.location.findMany({
    where: { id: { in: locationIds } },
  });
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  const completionRate = scheduled === 0 ? 0 : completed / scheduled;
  const noShowRate = scheduled === 0 ? 0 : noShow / scheduled;
  const conversionRate = careGapsTotal === 0 ? 0 : careGapsResolved / careGapsTotal;
  const retentionRate = activePatients === 0 ? 0 : returningPatients / activePatients;
  const handoffRate = handoffsTotal === 0 ? 0 : handoffsPending / handoffsTotal;

  return {
    appointmentVolume: {
      scheduled,
      completed,
      noShow,
      cancelled,
      completionRate,
      noShowRate,
    },
    recall: {
      careGapsTotal,
      careGapsResolved,
      careGapsLeakage: careGapsTotal - careGapsResolved,
      conversionRate,
    },
    inventory: {
      totalSkus: inventoryItems.length,
      inventoryCostCents,
      inventoryRetailCents,
      lowStockSkus,
      lowStockReorderCostCents,
    },
    retention: {
      patientsActive: activePatients,
      patientsReturning: returningPatients,
      retentionRate,
    },
    workload: workloadAgg.map((w) => ({
      providerId: w.providerId ?? 'unknown',
      providerName: w.providerId
        ? providerNameById.get(w.providerId) ?? 'Unknown provider'
        : 'Unassigned',
      completedAppointments: w._count._all,
    })),
    locations: locationAgg.map((l) => ({
      locationId: l.locationId ?? 'unknown',
      locationName: l.locationId
        ? locationNameById.get(l.locationId) ?? 'Unknown location'
        : 'Unassigned',
      appointments: l._count._all,
    })),
    optical: {
      handoffsPending,
      appointmentsWithHandoff: handoffsTotal,
      handoffRate,
    },
    revenueOpportunity: {
      expiringRxNext90Days: expiringRx,
      overdueAnnualExams: overdueAnnual,
      estimatedOpportunity: 'Owner / admin to model with practice-specific blended fee schedule.',
    },
  };
}
