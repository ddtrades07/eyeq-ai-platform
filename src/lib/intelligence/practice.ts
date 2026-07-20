import 'server-only';
import { differenceInCalendarDays } from 'date-fns';
import { db } from '@/lib/db';
import type { PracticeIntelligence } from './types';

/**
 * Practice-level intelligence, aggregations across all patients of an
 * organization. Used by the Timeline Intelligence "Practice" tab to
 * highlight patients falling through the cracks, no-show patterns,
 * imaging review delays, recall leakage, and follow-up completion.
 */
export async function computePracticeIntelligence(
  organizationId: string,
): Promise<PracticeIntelligence> {
  const now = new Date();
  const lookback = new Date(now);
  lookback.setMonth(lookback.getMonth() - 18);

  const [appointments, imaging, careGaps] = await Promise.all([
    db.appointment.findMany({
      where: { organizationId, startsAt: { gte: lookback } },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.imagingCase.findMany({
      where: {
        organizationId,
        capturedAt: { gte: lookback },
        status: { in: ['AWAITING_AI', 'AI_REVIEWED'] },
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    }),
    db.careGap.findMany({
      where: { organizationId, status: { in: ['DUE', 'OVERDUE'] } },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  // ----- Falling through cracks: open care gaps over 30 days + no future appt -----
  const fallingThroughCracks: PracticeIntelligence['fallingThroughCracks'] = [];
  const futureApptByPatient = new Set<string>();
  for (const a of appointments) {
    if (a.startsAt >= now && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
      futureApptByPatient.add(a.patientId);
    }
  }
  const seenPatients = new Set<string>();
  for (const g of careGaps) {
    if (!g.dueDate) continue;
    const ageDays = differenceInCalendarDays(now, g.dueDate);
    if (ageDays < 30) continue;
    if (futureApptByPatient.has(g.patientId)) continue;
    if (seenPatients.has(g.patientId)) continue;
    seenPatients.add(g.patientId);
    fallingThroughCracks.push({
      patientId: g.patientId,
      patientName: `${g.patient.firstName} ${g.patient.lastName}`,
      why: [
        `Care gap "${humanize(g.type)}" overdue ${ageDays} days.`,
        'No future appointment scheduled.',
      ],
      severity: ageDays > 90 ? 'priority' : 'attention',
    });
  }

  // ----- No-show patterns -----
  const noShowMap = new Map<
    string,
    { name: string; total: number; noShows: number; last?: Date }
  >();
  for (const a of appointments) {
    if (a.status === 'CANCELLED') continue;
    const cur = noShowMap.get(a.patientId) ?? {
      name: `${a.patient.firstName} ${a.patient.lastName}`,
      total: 0,
      noShows: 0,
    };
    cur.total += 1;
    if (a.status === 'NO_SHOW') {
      cur.noShows += 1;
      cur.last = !cur.last || a.startsAt > cur.last ? a.startsAt : cur.last;
    }
    noShowMap.set(a.patientId, cur);
  }
  const noShowPatterns = Array.from(noShowMap.entries())
    .map(([id, v]) => ({
      patientId: id,
      patientName: v.name,
      noShowCount: v.noShows,
      rate: v.total > 0 ? v.noShows / v.total : 0,
      lastNoShowAt: v.last,
    }))
    .filter((r) => r.noShowCount >= 2)
    .sort((a, b) => b.noShowCount - a.noShowCount || b.rate - a.rate)
    .slice(0, 10);

  // ----- Imaging review delays -----
  const imagingReviewDelays = imaging
    .map((i) => ({
      imagingCaseId: i.id,
      patientName: `${i.patient.firstName} ${i.patient.lastName}`,
      capturedAt: i.capturedAt,
      waitingDays: differenceInCalendarDays(now, i.capturedAt),
      imageType: i.imageType,
    }))
    .filter((i) => i.waitingDays >= 2)
    .sort((a, b) => b.waitingDays - a.waitingDays)
    .slice(0, 10);

  // ----- Recall leakage by gap type -----
  const recallMap = new Map<
    string,
    { count: number; sample: { patientId: string; patientName: string }[] }
  >();
  for (const g of careGaps) {
    const cur = recallMap.get(g.type) ?? { count: 0, sample: [] };
    cur.count += 1;
    if (cur.sample.length < 3) {
      cur.sample.push({
        patientId: g.patientId,
        patientName: `${g.patient.firstName} ${g.patient.lastName}`,
      });
    }
    recallMap.set(g.type, cur);
  }
  const recallLeakage = Array.from(recallMap.entries())
    .map(([type, v]) => ({
      type: humanize(type),
      overdueCount: v.count,
      sample: v.sample,
    }))
    .sort((a, b) => b.overdueCount - a.overdueCount);

  // ----- Follow-up completion -----
  let completed = 0;
  let missed = 0;
  let upcoming = 0;
  for (const a of appointments) {
    if (
      a.type === 'GLAUCOMA_FOLLOWUP' ||
      a.type === 'DIABETIC_EYE_EXAM' ||
      a.type === 'DRY_EYE_FOLLOWUP' ||
      a.type === 'CL_FIT_FOLLOWUP'
    ) {
      if (a.status === 'COMPLETED') completed += 1;
      else if (a.status === 'NO_SHOW' || a.status === 'CANCELLED') missed += 1;
      else if (a.startsAt >= now) upcoming += 1;
    }
  }
  const denom = completed + missed;
  const followUpCompletion = {
    completed,
    missed,
    upcoming,
    rate: denom > 0 ? completed / denom : 0,
  };

  return {
    generatedAt: now,
    fallingThroughCracks,
    noShowPatterns,
    imagingReviewDelays,
    recallLeakage,
    followUpCompletion,
  };
}

function humanize(t: string): string {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
