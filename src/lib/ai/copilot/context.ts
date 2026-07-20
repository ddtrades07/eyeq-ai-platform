import 'server-only';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

/**
 * Context builders for the copilot orchestrator.
 *
 * Each builder produces a short, structured plain-text summary from
 * database records. These summaries are injected into the AI system
 * prompt so the copilot can answer patient-specific questions without
 * the user having to paste clinical data.
 *
 * IMPORTANT: The patient assistant (portal) context builder deliberately
 * omits internal AI flags, urgency scores, and clinical signals that
 * are not provider-approved.
 */

export async function buildPatientSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const p = await db.patient.findFirst({
    where: { id: patientId, organizationId },
  });
  if (!p) return null;

  const age = Math.floor(
    (Date.now() - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  const flags: string[] = [];
  if (p.hasDiabetes) flags.push('DM');
  if (p.hasHypertension) flags.push('HTN');
  if (p.hasGlaucomaPersonal) flags.push('Glaucoma (personal)');
  if (p.hasGlaucomaFamily) flags.push('Glaucoma (family hx)');
  if (p.isSmoker) flags.push('Smoker');

  return [
    `Patient: ${p.firstName} ${p.lastName}, ${age}y/o, DOB ${formatDate(p.dateOfBirth)}`,
    flags.length > 0 ? `Flags: ${flags.join(', ')}` : 'No systemic flags',
    p.insuranceCarrier ? `Insurance: ${p.insuranceCarrier}` : null,
    p.notes ? `Notes: ${p.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function buildAppointmentSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const appts = await db.appointment.findMany({
    where: { patientId, organizationId },
    orderBy: { startsAt: 'desc' },
    take: 10,
    include: {
      provider: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (appts.length === 0) return null;
  const lines = appts.map((a) => {
    const prov = a.provider?.user
      ? `${a.provider.user.firstName ?? ''} ${a.provider.user.lastName ?? ''}`.trim()
      : 'Unassigned';
    return `- ${formatDate(a.startsAt)}: ${humanize(a.type)} (${humanize(a.status)}) with ${prov}${a.reason ? `, ${a.reason}` : ''}`;
  });
  return `Recent appointments (${appts.length}):\n${lines.join('\n')}`;
}

export async function buildImagingSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const cases = await db.imagingCase.findMany({
    where: { patientId, organizationId },
    orderBy: { capturedAt: 'desc' },
    take: 12,
  });
  if (cases.length === 0) return null;
  const lines = cases.map((c) => {
    const flagStr =
      c.aiFlags.length > 0 ? ` | AI flags: ${c.aiFlags.join('; ')}` : '';
    const noteStr =
      c.aiNotes.length > 0 ? ` | Notes: ${c.aiNotes[0]}` : '';
    return `- ${formatDate(c.capturedAt)}: ${humanize(c.imageType)} (${humanize(c.status)})${flagStr}${noteStr}`;
  });
  return `Imaging history (${cases.length} studies):\n${lines.join('\n')}`;
}

export async function buildCareGapSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const gaps = await db.careGap.findMany({
    where: { patientId, organizationId, status: { in: ['DUE', 'OVERDUE'] } },
    take: 10,
  });
  if (gaps.length === 0) return null;
  const lines = gaps.map(
    (g) =>
      `- ${humanize(g.type)}: ${g.status}${g.dueDate ? ` (due ${formatDate(g.dueDate)})` : ''}${g.suggestedAction ? `, ${g.suggestedAction}` : ''}`,
  );
  return `Open care gaps (${gaps.length}):\n${lines.join('\n')}`;
}

export async function buildPrescriptionSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const rxs = await db.prescription.findMany({
    where: { patientId, organizationId },
    orderBy: { issuedAt: 'desc' },
    take: 6,
  });
  if (rxs.length === 0) return null;
  const now = new Date();
  const lines = rxs.map((r) => {
    const status = r.expiresAt < now ? 'EXPIRED' : 'Active';
    return `- ${r.type === 'CONTACTS' ? 'CL' : 'Glasses'} Rx: issued ${formatDate(r.issuedAt)}, expires ${formatDate(r.expiresAt)} (${status})`;
  });
  return `Prescriptions (${rxs.length}):\n${lines.join('\n')}`;
}

export async function buildRecentNotesSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const notes = await db.clinicalNote.findMany({
    where: { patientId, organizationId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  if (notes.length === 0) return null;
  const lines = notes.map((n) => {
    const parts = [
      `- ${formatDate(n.createdAt)}: ${n.type} (${n.status})`,
      n.chiefComplaint ? `  CC: ${n.chiefComplaint}` : null,
      n.assessment ? `  Assessment: ${n.assessment.slice(0, 200)}` : null,
      n.plan ? `  Plan: ${n.plan.slice(0, 200)}` : null,
    ];
    return parts.filter(Boolean).join('\n');
  });
  return `Recent clinical notes (${notes.length}):\n${lines.join('\n')}`;
}

export async function buildTimelineIntelligenceSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  try {
    const { computePatientIntelligence } = await import(
      '@/lib/intelligence/patient'
    );
    const intel = await computePatientIntelligence(patientId, organizationId);
    if (!intel) return null;

    const parts: string[] = [];
    if (intel.summary.length > 0) {
      parts.push(`Summary: ${intel.summary.join(' ')}`);
    }
    if (intel.followUpRisk.score > 0) {
      parts.push(
        `Follow-up risk: ${intel.followUpRisk.score}/100 (${intel.followUpRisk.band})`,
      );
      if (intel.followUpRisk.factors.length > 0) {
        parts.push(`  Factors: ${intel.followUpRisk.factors.join('; ')}`);
      }
    }
    const priority = intel.attentionFactors.filter(
      (f) => f.severity === 'priority' || f.severity === 'urgent',
    );
    if (priority.length > 0) {
      parts.push('Priority signals:');
      for (const f of priority.slice(0, 5)) {
        parts.push(`- ${f.message} [Why: ${f.why.join('; ')}]`);
      }
    }
    if (intel.suggestedQuestions.length > 0) {
      parts.push(
        `Suggested questions: ${intel.suggestedQuestions.slice(0, 3).join(' | ')}`,
      );
    }
    return parts.length > 0
      ? `Timeline Intelligence:\n${parts.join('\n')}`
      : null;
  } catch {
    return null;
  }
}

/** Build a safe patient-portal context (no internal AI flags). */
export async function buildPatientPortalSummary(
  patientId: string,
  organizationId: string,
): Promise<string | null> {
  const p = await db.patient.findFirst({
    where: { id: patientId, organizationId },
  });
  if (!p) return null;

  const appts = await db.appointment.findMany({
    where: { patientId, organizationId, status: { notIn: ['CANCELLED'] } },
    orderBy: { startsAt: 'desc' },
    take: 5,
  });
  const rxs = await db.prescription.findMany({
    where: { patientId, organizationId },
    orderBy: { issuedAt: 'desc' },
    take: 3,
  });
  const notes = await db.clinicalNote.findMany({
    where: { patientId, organizationId, status: 'SIGNED' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const parts: string[] = [
    `Patient: ${p.firstName} ${p.lastName}`,
  ];
  if (appts.length > 0) {
    const upcoming = appts.filter((a) => a.startsAt >= new Date());
    if (upcoming.length > 0) {
      parts.push(
        `Upcoming appointments: ${upcoming.map((a) => `${formatDate(a.startsAt)} (${humanize(a.type)})`).join(', ')}`,
      );
    }
    const last = appts.find((a) => a.status === 'COMPLETED');
    if (last) {
      parts.push(`Last completed visit: ${formatDate(last.startsAt)}`);
    }
  }
  if (rxs.length > 0) {
    const now = new Date();
    parts.push(
      `Prescriptions: ${rxs.map((r) => `${r.type === 'CONTACTS' ? 'CL' : 'Glasses'} Rx, expires ${formatDate(r.expiresAt)}${r.expiresAt < now ? ' (EXPIRED)' : ''}`).join('; ')}`,
    );
  }
  if (notes.length > 0 && notes[0].plan) {
    parts.push(
      `Most recent provider recommendation: ${notes[0].plan.slice(0, 300)}`,
    );
  }
  return parts.join('\n');
}

function humanize(t: string): string {
  return t
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
