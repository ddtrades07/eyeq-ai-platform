import 'server-only';
import { db } from '@/lib/db';
import { AppointmentStatus, ClaimStatus, InvoiceStatus } from '@prisma/client';
import { appointmentLocationFilter } from '@/lib/location/scope';

export async function getOwnerDashboardMetrics(organizationId: string, locationId?: string | null) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const apptLoc = appointmentLocationFilter(locationId);

  const [
    revenueTodayCents,
    revenueMonthCents,
    openCharts,
    claimsAttention,
    outstandingCents,
    noShowsToday,
    locationCount,
  ] = await Promise.all([
    db.patientInvoice.aggregate({
      where: {
        organizationId,
        paidCents: { gt: 0 },
        updatedAt: { gte: start },
      },
      _sum: { paidCents: true },
    }),
    db.patientInvoice.aggregate({
      where: {
        organizationId,
        paidCents: { gt: 0 },
        updatedAt: { gte: monthStart },
      },
      _sum: { paidCents: true },
    }),
    db.encounter.count({
      where: {
        organizationId,
        status: { in: ['WITH_PROVIDER', 'DOCUMENTATION', 'CHECKOUT'] },
      },
    }),
    db.claim.count({
      where: {
        organizationId,
        status: { in: [ClaimStatus.REJECTED, ClaimStatus.DRAFT] },
      },
    }),
    db.patientInvoice.aggregate({
      where: { organizationId, status: InvoiceStatus.OPEN },
      _sum: { totalCents: true, paidCents: true },
    }),
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start },
        status: AppointmentStatus.NO_SHOW,
      },
    }),
    db.location.count({ where: { organizationId } }),
  ]);

  const outstanding =
    (outstandingCents._sum.totalCents ?? 0) - (outstandingCents._sum.paidCents ?? 0);

  return {
    revenueTodayCents: revenueTodayCents._sum.paidCents ?? 0,
    revenueMonthCents: revenueMonthCents._sum.paidCents ?? 0,
    openCharts,
    claimsAttention,
    outstandingCents: outstanding,
    noShowsToday,
    locationCount,
  };
}

export async function getBillingDashboardMetrics(organizationId: string) {
  const [draftClaims, submittedClaims, rejectedClaims, openInvoices, overdueInvoices] =
    await Promise.all([
      db.claim.count({ where: { organizationId, status: ClaimStatus.DRAFT } }),
      db.claim.count({ where: { organizationId, status: ClaimStatus.SUBMITTED } }),
      db.claim.count({ where: { organizationId, status: ClaimStatus.REJECTED } }),
      db.patientInvoice.count({ where: { organizationId, status: InvoiceStatus.OPEN } }),
      db.patientInvoice.count({
        where: {
          organizationId,
          status: InvoiceStatus.OPEN,
          dueDate: { lt: new Date() },
        },
      }),
    ]);

  return { draftClaims, submittedClaims, rejectedClaims, openInvoices, overdueInvoices };
}

export async function getFrontDeskDashboardMetrics(
  organizationId: string,
  locationId?: string | null,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const apptLoc = appointmentLocationFilter(locationId);

  const [arrivingSoon, checkedIn, noShows, pendingForms] = await Promise.all([
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: new Date(), lt: end },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      },
    }),
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start, lt: end },
        status: {
          in: [
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_PRETEST,
            AppointmentStatus.WITH_DOCTOR,
          ],
        },
      },
    }),
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start, lt: end },
        status: AppointmentStatus.NO_SHOW,
      },
    }),
    db.patientForm.count({
      where: { organizationId, status: 'PENDING' },
    }),
  ]);

  return { arrivingSoon, checkedIn, noShows, pendingForms };
}

export async function getTechnicianDashboardMetrics(
  organizationId: string,
  locationId?: string | null,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const apptLoc = appointmentLocationFilter(locationId);

  const [waitingPretest, inPretest, imagingOrders, openTasks] = await Promise.all([
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start, lt: end },
        status: AppointmentStatus.CHECKED_IN,
      },
    }),
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start, lt: end },
        status: AppointmentStatus.IN_PRETEST,
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        signedAt: null,
        capturedAt: { gte: start },
      },
    }),
    db.staffTask.count({
      where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
  ]);

  return { waitingPretest, inPretest, imagingOrders, openTasks };
}

export async function getOpticalDashboardMetrics(
  organizationId: string,
  locationId?: string | null,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [activeOrders, readyForPickup, labInProgress, lowStock, salesToday] =
    await Promise.all([
      db.opticalOrder.count({
        where: {
          organizationId,
          status: { in: ['ORDERED', 'AT_LAB', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'QUALITY_CHECK'] },
        },
      }),
      db.opticalOrder.count({
        where: { organizationId, status: 'READY_FOR_PICKUP' },
      }),
      db.opticalOrder.count({
        where: { organizationId, status: { in: ['AT_LAB', 'IN_PRODUCTION'] } },
      }),
      db.inventoryItem.count({
        where: { organizationId, status: 'LOW_STOCK' },
      }),
      db.opticalOrder.aggregate({
        where: { organizationId, dispensedAt: { gte: start } },
        _sum: { patientRespCents: true },
      }),
    ]);

  return {
    activeOrders,
    readyForPickup,
    labInProgress,
    lowStock,
    salesTodayCents: salesToday._sum.patientRespCents ?? 0,
  };
}

export async function getAdminDashboardMetrics(organizationId: string) {
  const [staffCount, integrations, openAuditIssues, pendingJobs] = await Promise.all([
    db.user.count({ where: { organizationId, role: { not: 'PATIENT' }, isActive: true } }),
    db.ehrIntegration.count({ where: { organizationId } }),
    db.auditLog.count({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
    db.backgroundJob.count({
      where: { organizationId, status: { in: ['QUEUED', 'FAILED'] } },
    }),
  ]);

  return { staffCount, integrations, openAuditIssues, pendingJobs };
}
