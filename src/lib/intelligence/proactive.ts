import 'server-only';
import { db } from '@/lib/db';
import { AppointmentStatus, CareGapStatus, ImagingStatus } from '@prisma/client';

export interface WorkflowAlert {
  id: string;
  type: 'pre_chart' | 'imaging_review' | 'recall' | 'incomplete_intake' | 'no_show_risk';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  detail: string;
  patientId?: string;
  patientName?: string;
  actionHref: string;
  actionLabel: string;
}

/**
 * Generates proactive workflow alerts for the dashboard.
 * These run server-side and highlight items that need attention
 * without the user needing to ask.
 */
export async function computeProactiveAlerts(
  organizationId: string,
  limit = 8,
): Promise<WorkflowAlert[]> {
  const alerts: WorkflowAlert[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    pendingImaging,
    overdueCareGaps,
    todayAppts,
  ] = await Promise.all([
    db.imagingCase.findMany({
      where: {
        organizationId,
        status: { in: [ImagingStatus.AWAITING_AI, ImagingStatus.AI_REVIEWED] },
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { capturedAt: 'asc' },
      take: 5,
    }),
    db.careGap.findMany({
      where: { organizationId, status: CareGapStatus.OVERDUE },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startsAt: { gte: today, lt: tomorrow },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN] },
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startsAt: 'asc' },
      take: 10,
    }),
  ]);

  // Imaging needing review
  for (const img of pendingImaging) {
    const pName = `${img.patient.firstName} ${img.patient.lastName}`;
    alerts.push({
      id: `img-${img.id}`,
      type: 'imaging_review',
      severity: img.status === ImagingStatus.AWAITING_AI ? 'warning' : 'info',
      title: `Imaging review pending`,
      detail: `${pName}: ${img.imageType.replace(/_/g, ' ')} captured, needs provider review.`,
      patientId: img.patient.id,
      patientName: pName,
      actionHref: `/provider/imaging/${img.id}`,
      actionLabel: 'Review',
    });
  }

  // Overdue care gaps
  for (const gap of overdueCareGaps) {
    const pName = `${gap.patient.firstName} ${gap.patient.lastName}`;
    alerts.push({
      id: `cg-${gap.id}`,
      type: 'recall',
      severity: 'warning',
      title: `Overdue: ${gap.type.replace(/_/g, ' ')}`,
      detail: `${pName}, ${gap.suggestedAction ?? 'Contact patient for follow-up.'}`,
      patientId: gap.patient.id,
      patientName: pName,
      actionHref: `/provider/care-gaps`,
      actionLabel: 'View',
    });
  }

  // Upcoming patients, surface as pre-chart prompts
  for (const appt of todayAppts.slice(0, 3)) {
    const pName = `${appt.patient.firstName} ${appt.patient.lastName}`;
    alerts.push({
      id: `pre-${appt.id}`,
      type: 'pre_chart',
      severity: 'info',
      title: `Pre-chart: ${pName}`,
      detail: `${appt.type.replace(/_/g, ' ')}, review chart and imaging before the visit.`,
      patientId: appt.patient.id,
      patientName: pName,
      actionHref: `/provider/patients/${appt.patient.id}`,
      actionLabel: 'Open chart',
    });
  }

  return alerts.slice(0, limit);
}
