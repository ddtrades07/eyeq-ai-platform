import 'server-only';
import { db } from '@/lib/db';
import { runAllRules, bySeverity, type PatientContext } from './rules';
export type { PatientContext };
import type {
  AttentionDistribution,
  InsightCategory,
  InsightFlag,
  PatientIntelligence,
  TimelineEvent,
} from './types';

/**
 * Pre-loaded patient data that can be passed to avoid duplicate DB queries.
 * When provided, the function skips the DB fetch for those relations.
 */
export interface PreloadedPatientData {
  patient: PatientContext['patient'];
  appointments?: PatientContext['appointments'];
  imaging?: PatientContext['imaging'];
  notes?: PatientContext['notes'];
  prescriptions?: PatientContext['prescriptions'];
  careGaps?: PatientContext['careGaps'];
}

/**
 * Compute a full, explainable Timeline Intelligence snapshot for a single
 * patient. This is a deterministic projection over chart data, nothing
 * is persisted. Callers should be tenant-scoped before invoking.
 *
 * Pass `preloaded` to reuse data already fetched by the page and avoid
 * duplicate DB round-trips.
 */
export async function computePatientIntelligence(
  patientId: string,
  organizationId: string,
  preloaded?: PreloadedPatientData,
): Promise<PatientIntelligence | null> {
  let patient = preloaded?.patient ?? null;
  if (!patient) {
    patient = await db.patient.findFirst({ where: { id: patientId, organizationId } });
  }
  if (!patient) return null;

  const [
    appointments,
    imaging,
    notes,
    prescriptions,
    careGaps,
    threads,
  ] = await Promise.all([
    preloaded?.appointments ??
      db.appointment.findMany({
        where: { patientId, organizationId },
        orderBy: { startsAt: 'desc' },
        include: {
          provider: {
            select: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
    preloaded?.imaging ??
      db.imagingCase.findMany({
        where: { patientId, organizationId },
        orderBy: { capturedAt: 'desc' },
      }),
    preloaded?.notes ??
      db.clinicalNote.findMany({
        where: { patientId, organizationId },
        orderBy: { createdAt: 'desc' },
      }),
    preloaded?.prescriptions ??
      db.prescription.findMany({
        where: { patientId, organizationId },
        orderBy: { issuedAt: 'desc' },
      }),
    preloaded?.careGaps ??
      db.careGap.findMany({
        where: { patientId, organizationId },
        orderBy: { dueDate: 'asc' },
      }),
    // Always load threads with full message history (chart preload only includes last message).
    db.messageThread.findMany({
      where: { patientId, organizationId },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    }),
  ]);

  const now = new Date();
  const ctx: PatientContext = {
    patient,
    appointments,
    imaging,
    notes,
    prescriptions,
    careGaps,
    threads,
    now,
  };

  const flags = runAllRules(ctx).sort(bySeverity);

  // Bucket into the UI sections.
  const by = (cats: InsightCategory[]) =>
    flags.filter((f) => cats.includes(f.category));

  const attentionFactors = by(['follow_up', 'symptom', 'imaging', 'risk_factor', 'care_gap']);
  const complianceInsights = by(['compliance', 'medication']);
  const imagingProgressionNotes = flags.filter(
    (f) => f.category === 'imaging' && f.message.includes('progression'),
  );
  const providerAttentionAreas = flags.filter(
    (f) => f.severity === 'priority' || f.severity === 'urgent',
  );

  const followUpFlags = by(['follow_up', 'care_gap', 'compliance']);
  const followUpRisk = computeFollowUpRisk(followUpFlags, ctx);

  const summary = buildSummary(flags, ctx);
  const suggestedQuestions = buildSuggestedQuestions(flags, ctx);

  const clinicalMemory: PatientIntelligence['clinicalMemory'] = {
    unresolvedIssues: flags.filter(
      (f) =>
        f.category === 'symptom' ||
        f.category === 'care_gap' ||
        (f.category === 'follow_up' && f.severity !== 'info'),
    ),
    priorRecommendations: flags.filter((f) => f.id.startsWith('prior-rec-')),
    repeatedComplaints: flags.filter((f) => f.id.startsWith('repeat-')),
    deferredTesting: flags.filter((f) => f.id.startsWith('deferred-testing')),
    imagingReviewNotes: flags.filter(
      (f) => f.category === 'imaging' && !f.id.startsWith('imaging-progression'),
    ),
    lifestyleConsiderations: by(['lifestyle']),
    communicationPreferences: flags.filter((f) => f.id.startsWith('comm-pref')),
  };

  const attentionDistribution = computeAttentionDistribution(flags);
  const timeline = buildTimeline(ctx);

  return {
    patientId,
    generatedAt: now,
    summary,
    attentionFactors,
    complianceInsights,
    followUpRisk,
    imagingProgressionNotes,
    providerAttentionAreas,
    suggestedQuestions,
    clinicalMemory,
    attentionDistribution,
    timeline,
  };
}

// ---------- Helpers ----------

function computeFollowUpRisk(
  flags: InsightFlag[],
  ctx: PatientContext,
): PatientIntelligence['followUpRisk'] {
  let score = 0;
  const factors: string[] = [];

  for (const f of flags) {
    if (f.severity === 'urgent') score += 35;
    else if (f.severity === 'priority') score += 18;
    else if (f.severity === 'attention') score += 8;
    else score += 2;
  }
  const noShows = ctx.appointments.filter((a) => a.status === 'NO_SHOW').length;
  if (noShows > 0) {
    score += noShows * 6;
    factors.push(`${noShows} historical no-show${noShows > 1 ? 's' : ''}.`);
  }
  if (ctx.patient.hasDiabetes) {
    score += 5;
    factors.push('Diabetic, surveillance interval important.');
  }
  if (ctx.patient.hasGlaucomaPersonal) {
    score += 6;
    factors.push('Glaucoma on personal history.');
  }
  if (flags.some((f) => f.id.startsWith('annual-overdue'))) {
    factors.push('Annual exam interval exceeded.');
  }
  if (flags.some((f) => f.id.startsWith('glaucoma-followup'))) {
    factors.push('Prior glaucoma follow-up was missed.');
  }

  score = Math.min(100, score);
  let band: PatientIntelligence['followUpRisk']['band'] = 'low';
  if (score >= 70) band = 'high';
  else if (score >= 40) band = 'elevated';
  else if (score >= 18) band = 'moderate';

  return { score, band, factors };
}

function computeAttentionDistribution(flags: InsightFlag[]): AttentionDistribution[] {
  const map = new Map<InsightCategory, AttentionDistribution>();
  for (const f of flags) {
    const cur = map.get(f.category) ?? { category: f.category, count: 0, weight: 0 };
    cur.count += 1;
    cur.weight +=
      f.severity === 'urgent'
        ? 4
        : f.severity === 'priority'
          ? 3
          : f.severity === 'attention'
            ? 2
            : 1;
    map.set(f.category, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
}

function buildSummary(flags: InsightFlag[], ctx: PatientContext): string[] {
  const out: string[] = [];
  const priority = flags.filter((f) => f.severity === 'priority' || f.severity === 'urgent');
  if (priority.length > 0) {
    out.push(
      `${priority.length} priority signal${priority.length > 1 ? 's' : ''} require provider attention.`,
    );
  } else if (flags.length > 0) {
    out.push(`${flags.length} contextual signal${flags.length > 1 ? 's' : ''} surfaced.`);
  } else {
    out.push('No active signals, chart appears clean against current rules.');
  }
  if (ctx.appointments.length > 0) {
    const last = ctx.appointments[0];
    out.push(`Last visit ${last.startsAt.toDateString()} (${humanize(last.type)}).`);
  }
  if (ctx.imaging.length > 0) {
    out.push(`${ctx.imaging.length} imaging case${ctx.imaging.length > 1 ? 's' : ''} on file.`);
  }
  if (ctx.notes.length > 0) {
    out.push(`${ctx.notes.length} clinical note${ctx.notes.length > 1 ? 's' : ''} reviewed.`);
  }
  return out;
}

function buildSuggestedQuestions(flags: InsightFlag[], ctx: PatientContext): string[] {
  const q: string[] = [];
  if (flags.some((f) => f.id.startsWith('repeat-dry-eye'))) {
    q.push('Are the dry eye symptoms still occurring? Any change in environment, screen time, or medications?');
  }
  if (flags.some((f) => f.id.startsWith('repeat-headache'))) {
    q.push('Have the headaches changed in pattern, severity, or location since last visit?');
  }
  if (flags.some((f) => f.id.startsWith('glaucoma-followup'))) {
    q.push('What prevented the prior glaucoma follow-up? Any drop adherence issues since?');
  }
  if (flags.some((f) => f.id.startsWith('no-dilation'))) {
    q.push('Open the conversation about why dilation is recommended at this visit.');
  }
  if (flags.some((f) => f.id.startsWith('declined-imaging'))) {
    q.push('Revisit the imaging recommendation, is there a barrier we can address?');
  }
  if (flags.some((f) => f.id.startsWith('cl-rx-lapse'))) {
    q.push('Discuss CL Rx renewal cadence, does the patient want a recall scheduled automatically?');
  }
  if (ctx.patient.hasDiabetes) {
    q.push('When was last A1C? Any new diabetic medications or hypoglycemic episodes?');
  }
  return q;
}

function buildTimeline(ctx: PatientContext): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const a of ctx.appointments) {
    out.push({
      id: `appt-${a.id}`,
      at: a.startsAt,
      kind: 'appointment',
      title: `${humanize(a.type)} (${humanize(a.status)})`,
      detail: a.provider?.user
        ? `Provider: ${formatProvider(a.provider.user.firstName, a.provider.user.lastName)}`
        : undefined,
      tone:
        a.status === 'NO_SHOW' || a.status === 'CANCELLED'
          ? 'destructive'
          : a.status === 'COMPLETED'
            ? 'positive'
            : 'neutral',
    });
  }
  for (const i of ctx.imaging) {
    out.push({
      id: `img-${i.id}`,
      at: i.capturedAt,
      kind: 'imaging',
      title: `${humanize(i.imageType)} captured`,
      detail: i.aiNotes?.[0],
      href: `/provider/imaging/${i.id}`,
      tone: (i.aiFlags?.length ?? 0) > 0 ? 'warning' : 'neutral',
    });
  }
  for (const n of ctx.notes) {
    out.push({
      id: `note-${n.id}`,
      at: n.createdAt,
      kind: 'note',
      title: `${n.type} note${n.chiefComplaint ? `, ${n.chiefComplaint.slice(0, 50)}` : ''}`,
      detail: n.assessment?.slice(0, 120),
      tone: n.status === 'SIGNED' ? 'positive' : 'neutral',
    });
  }
  for (const rx of ctx.prescriptions) {
    out.push({
      id: `rx-${rx.id}`,
      at: rx.issuedAt,
      kind: 'prescription',
      title: `${rx.type === 'CONTACTS' ? 'Contact lens' : 'Glasses'} Rx issued`,
      detail: `Expires ${rx.expiresAt.toDateString()}`,
      tone: rx.expiresAt < ctx.now ? 'warning' : 'neutral',
    });
  }
  for (const g of ctx.careGaps) {
    out.push({
      id: `gap-${g.id}`,
      at: g.dueDate ?? g.createdAt,
      kind: 'care_gap',
      title: `Care gap: ${humanize(g.type)}`,
      detail: g.suggestedAction ?? undefined,
      tone:
        g.status === 'OVERDUE'
          ? 'destructive'
          : g.status === 'BOOKED'
            ? 'positive'
            : 'warning',
    });
  }
  for (const t of ctx.threads) {
    const last = t.messages[0];
    if (!last) continue;
    out.push({
      id: `msg-${t.id}`,
      at: last.createdAt,
      kind: 'message',
      title: `Message: ${t.subject}`,
      detail: last.body.slice(0, 120),
      tone: 'neutral',
    });
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}

function humanize(t: string): string {
  return t
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatProvider(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(' ') || 'Unknown';
}
