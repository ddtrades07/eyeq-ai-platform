import 'server-only';
import { differenceInMonths } from 'date-fns';
import { db } from '@/lib/db';
import type { InsightFlag, TodayInsight } from './types';
import { safeMessage } from './vocab';

/**
 * "Why this patient matters today", a deliberately lightweight pass
 * over today's schedule. We do NOT run the full per-patient engine for
 * every booked visit (that'd be expensive). Instead, we evaluate a
 * compact set of high-signal rules using a single batched query.
 */
export async function computeTodayInsights(
  organizationId: string,
  limit = 8,
  locationId?: string | null,
): Promise<TodayInsight[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Phase 1: fetch today's appointments with lightweight patient data + risk flags.
  // Only pull the small sub-relation counts we actually need for the rules below.
  const appts = await db.appointment.findMany({
    where: {
      organizationId,
      startsAt: { gte: start, lt: end },
      status: { notIn: ['CANCELLED'] },
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: {
      patient: {
        include: {
          appointments: {
            where: { startsAt: { lt: start } },
            orderBy: { startsAt: 'desc' },
            take: 3,
            select: { id: true, startsAt: true, status: true },
          },
          imagingCases: { orderBy: { capturedAt: 'desc' }, take: 1, select: { capturedAt: true } },
          prescriptions: { orderBy: { issuedAt: 'desc' }, take: 5, select: { type: true, expiresAt: true } },
          careGaps: {
            where: { status: { in: ['DUE', 'OVERDUE'] } },
            take: 5,
            select: { id: true, type: true, status: true },
          },
          clinicalNotes: { orderBy: { createdAt: 'desc' }, take: 4, select: { chiefComplaint: true } },
        },
      },
    },
  });

  const now = new Date();
  const results: TodayInsight[] = [];

  for (const a of appts) {
    const reasons: InsightFlag[] = [];
    const p = a.patient;

    // Extended visit?
    if (
      a.type === 'GLAUCOMA_FOLLOWUP' ||
      a.type === 'DIABETIC_EYE_EXAM' ||
      a.type === 'DRY_EYE_FOLLOWUP'
    ) {
      reasons.push({
        id: `today-extended-${a.id}`,
        category: 'follow_up',
        severity: 'attention',
        message: safeMessage('Likely extended visit, chronic follow-up type.'),
        why: [`Appointment type: ${humanize(a.type)}.`],
        suggestion: 'Block additional chair time if scheduling allows.',
      });
    }

    // Imaging need?
    const lastImg = p.imagingCases[0];
    const imgMonths = lastImg ? differenceInMonths(now, lastImg.capturedAt) : null;
    if (
      p.hasGlaucomaPersonal ||
      p.hasGlaucomaFamily ||
      p.hasDiabetes ||
      (imgMonths !== null && imgMonths >= 12)
    ) {
      reasons.push({
        id: `today-imaging-${a.id}`,
        category: 'imaging',
        severity: 'attention',
        message: safeMessage('Likely imaging need at this visit.'),
        why: [
          p.hasGlaucomaPersonal ? 'Glaucoma on personal history.' : null,
          p.hasGlaucomaFamily ? 'Family history of glaucoma.' : null,
          p.hasDiabetes ? 'Diabetic, surveillance imaging interval.' : null,
          imgMonths !== null && imgMonths >= 12
            ? `Last imaging ${imgMonths} months ago.`
            : null,
        ].filter((x): x is string => Boolean(x)),
        suggestion: 'Prep OCT / fundus / VF per protocol.',
      });
    }

    // Optical discussion?
    const cls = p.prescriptions.filter((rx) => rx.type === 'CONTACTS');
    const glasses = p.prescriptions.filter((rx) => rx.type === 'GLASSES');
    const expiring = [...cls, ...glasses].some(
      (rx) => rx.expiresAt < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    );
    if (expiring) {
      reasons.push({
        id: `today-optical-${a.id}`,
        category: 'optical',
        severity: 'info',
        message: safeMessage('Likely optical discussion, Rx expiring soon.'),
        why: [
          'Active prescription within 60 days of expiration.',
        ],
        suggestion: 'Brief on optical hand-off after exam.',
      });
    }

    // Overdue testing?
    if (p.careGaps.length > 0) {
      reasons.push({
        id: `today-caregaps-${a.id}`,
        category: 'care_gap',
        severity: p.careGaps.some((g) => g.status === 'OVERDUE') ? 'priority' : 'attention',
        message: safeMessage(
          `${p.careGaps.length} open care gap${p.careGaps.length > 1 ? 's' : ''} to address.`,
        ),
        why: p.careGaps
          .slice(0, 3)
          .map((g) => `${humanize(g.type)}, ${g.status}.`),
        suggestion: 'Address or document deferral.',
      });
    }

    // Repeated unresolved symptom?
    const recentComplaints = p.clinicalNotes
      .map((n) => (n.chiefComplaint ?? '').toLowerCase())
      .filter(Boolean);
    const symptomTallies: Record<string, number> = {};
    for (const c of recentComplaints) {
      for (const sym of ['dry eye', 'blur', 'headache', 'floater', 'redness']) {
        if (c.includes(sym)) symptomTallies[sym] = (symptomTallies[sym] ?? 0) + 1;
      }
    }
    const repeats = Object.entries(symptomTallies).filter(([, n]) => n >= 2);
    if (repeats.length > 0) {
      reasons.push({
        id: `today-repeat-${a.id}`,
        category: 'symptom',
        severity: 'attention',
        message: safeMessage(
          `Repeated unresolved symptom${repeats.length > 1 ? 's' : ''}: ${repeats
            .map(([s]) => s)
            .join(', ')}.`,
        ),
        why: repeats.map(([s, n]) => `${s} mentioned in ${n} of recent notes.`),
        suggestion: 'Revisit prior plan; consider escalation of workup.',
      });
    }

    // Provider review priority?
    if (p.appointments.some((prev) => prev.status === 'NO_SHOW')) {
      reasons.push({
        id: `today-noshow-${a.id}`,
        category: 'compliance',
        severity: 'priority',
        message: safeMessage('Provider review priority, historical no-show pattern.'),
        why: [`${p.appointments.filter((x) => x.status === 'NO_SHOW').length} no-shows in last visits window.`],
        suggestion: 'Confirm engagement plan with patient at this visit.',
      });
    }

    if (reasons.length === 0) continue;

    results.push({
      patientId: p.id,
      patientName: `${p.firstName} ${p.lastName}`,
      appointmentId: a.id,
      startsAt: a.startsAt,
      appointmentType: humanize(a.type),
      reasons,
      topReason: reasons[0]?.message,
    });
  }

  // Sort by max severity of reasons, then time.
  results.sort((a, b) => {
    const aw = maxSev(a.reasons);
    const bw = maxSev(b.reasons);
    if (aw !== bw) return bw - aw;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });
  return results.slice(0, limit);
}

function humanize(t: string): string {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function maxSev(reasons: InsightFlag[]): number {
  const order: Record<string, number> = { urgent: 4, priority: 3, attention: 2, info: 1 };
  return Math.max(0, ...reasons.map((r) => order[r.severity] ?? 0));
}
