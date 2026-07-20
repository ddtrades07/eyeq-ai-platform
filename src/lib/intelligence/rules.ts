import { differenceInCalendarDays, differenceInMonths, differenceInYears } from 'date-fns';
import type {
  Appointment,
  CareGap,
  ClinicalNote,
  ImagingCase,
  Message,
  MessageThread,
  Patient,
  Prescription,
} from '@prisma/client';
import type { InsightFlag, InsightSeverity } from './types';
import { safeMessage } from './vocab';

/**
 * The intelligence rule engine.
 *
 * Each rule is a pure function over a `PatientContext` that returns
 * zero or more InsightFlags. Adding a new signal = adding a new rule
 * function and wiring it into `runAllRules`. The engine is deterministic
 *, given identical input, it always emits identical output.
 */

export interface PatientContext {
  patient: Patient;
  appointments: (Appointment & {
    provider?: { user?: { firstName: string | null; lastName: string | null } | null } | null;
  })[];
  imaging: ImagingCase[];
  notes: ClinicalNote[];
  prescriptions: Prescription[];
  careGaps: CareGap[];
  threads: (MessageThread & { messages: Message[] })[];
  now: Date;
}

type Rule = (ctx: PatientContext) => InsightFlag[];

let counter = 0;
function flagId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

function flag(input: Omit<InsightFlag, 'id'> & { idPrefix: string }): InsightFlag {
  const { idPrefix, ...rest } = input;
  return {
    id: flagId(idPrefix),
    ...rest,
    message: safeMessage(rest.message),
    detail: rest.detail ? safeMessage(rest.detail) : undefined,
  };
}

// ---------- Helper accessors ----------

function lastDilatedAt(notes: ClinicalNote[]): Date | undefined {
  const sorted = [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const hit = sorted.find((n) => {
    const text = `${n.subjective ?? ''} ${n.objective ?? ''} ${n.plan ?? ''}`;
    return /dilat(ed|ion)/i.test(text);
  });
  return hit?.createdAt;
}

function chiefComplaintWord(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits: string[] = [];
  const checks: [RegExp, string][] = [
    [/\bdry(\s)?eye(s)?\b/, 'dry eye'],
    [/\bblur(red|ry)?\b/, 'blurred vision'],
    [/\bredness|red eye(s)?\b/, 'redness'],
    [/\bitch(y|ing)\b/, 'itching'],
    [/\bheadache(s)?\b/, 'headache'],
    [/\bfloater(s)?\b/, 'floaters'],
    [/\bglare|halo(s)?\b/, 'glare / halos'],
    [/\btear(ing|y)\b/, 'tearing'],
    [/\bpain\b/, 'eye pain'],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(lower)) hits.push(label);
  }
  return hits;
}

// ---------- Individual rules ----------

const ruleMissedGlaucomaFollowUp: Rule = (ctx) => {
  const out: InsightFlag[] = [];
  const glaucomaApps = ctx.appointments.filter(
    (a) => a.type === 'GLAUCOMA_FOLLOWUP',
  );
  const noShows = glaucomaApps.filter((a) => a.status === 'NO_SHOW' || a.status === 'CANCELLED');
  if (noShows.length >= 1) {
    out.push(
      flag({
        idPrefix: 'glaucoma-followup',
        category: 'follow_up',
        severity: noShows.length >= 2 ? 'priority' : 'attention',
        message: `Patient has missed ${noShows.length} glaucoma follow-up${noShows.length > 1 ? 's' : ''}.`,
        why: [
          ...noShows.map(
            (a) =>
              `${a.status === 'NO_SHOW' ? 'No-show' : 'Cancellation'} on ${a.startsAt.toDateString()} for glaucoma follow-up.`,
          ),
          ctx.patient.hasGlaucomaPersonal
            ? 'Patient has glaucoma flagged on chart.'
            : 'Glaucoma follow-up appointment type used.',
        ],
        observedAt: noShows[0]?.startsAt,
        suggestion: 'Follow-up indicated, recommend rescheduling and recall outreach.',
      }),
    );
  }
  return out;
};

const ruleNoDilationOver2Years: Rule = (ctx) => {
  const last = lastDilatedAt(ctx.notes);
  if (!last) {
    if (ctx.appointments.some((a) => a.status === 'COMPLETED')) {
      return [
        flag({
          idPrefix: 'no-dilation',
          category: 'pretest',
          severity: 'attention',
          message: 'No documented dilation in chart history.',
          why: ['No dilation language found in any clinical note for this patient.'],
          suggestion: 'Consider whether dilation is indicated at the next comprehensive exam.',
        }),
      ];
    }
    return [];
  }
  const months = differenceInMonths(ctx.now, last);
  if (months >= 24) {
    return [
      flag({
        idPrefix: 'no-dilation',
        category: 'pretest',
        severity: 'attention',
        message: `No dilation completed in over ${Math.floor(months / 12)} year${months >= 36 ? 's' : ''}.`,
        why: [
          `Most recent dilation documented ${last.toDateString()}.`,
          ctx.patient.hasDiabetes ? 'Diabetic patient, dilation is part of routine surveillance.' : 'Routine surveillance interval exceeded.',
        ],
        observedAt: last,
        suggestion: 'Provider review recommended, consider dilation at next visit.',
      }),
    ];
  }
  return [];
};

const ruleRepeatedSymptoms: Rule = (ctx) => {
  const symptomVisits: Record<string, Date[]> = {};
  for (const n of ctx.notes) {
    const words = chiefComplaintWord(n.chiefComplaint);
    for (const w of words) {
      (symptomVisits[w] ??= []).push(n.createdAt);
    }
  }
  const out: InsightFlag[] = [];
  for (const [symptom, dates] of Object.entries(symptomVisits)) {
    if (dates.length >= 2) {
      out.push(
        flag({
          idPrefix: `repeat-${symptom.replace(/\s+/g, '-')}`,
          category: 'symptom',
          severity: dates.length >= 4 ? 'priority' : 'attention',
          message: `Repeated ${symptom} symptoms documented across ${dates.length} visits.`,
          why: dates
            .sort((a, b) => b.getTime() - a.getTime())
            .slice(0, 5)
            .map((d) => `Mentioned at visit on ${d.toDateString()}.`),
          observedAt: dates.sort((a, b) => b.getTime() - a.getTime())[0],
          suggestion: 'Unresolved concern, consider revisiting prior plan or additional workup.',
        }),
      );
    }
  }
  return out;
};

const ruleImagingProgression: Rule = (ctx) => {
  const out: InsightFlag[] = [];
  const byType = new Map<string, ImagingCase[]>();
  for (const c of ctx.imaging) {
    const list = byType.get(c.imageType) ?? [];
    list.push(c);
    byType.set(c.imageType, list);
  }
  for (const [type, cases] of byType) {
    if (cases.length < 2) continue;
    const sorted = [...cases].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    const flags = sorted.flatMap((c) => c.aiFlags ?? []);
    const recent = sorted[sorted.length - 1];
    const prior = sorted[sorted.length - 2];
    if ((recent.aiFlags?.length ?? 0) > (prior.aiFlags?.length ?? 0)) {
      out.push(
        flag({
          idPrefix: `imaging-progression-${type}`,
          category: 'imaging',
          severity: 'attention',
          message: `Possible progression concern compared with prior ${type.replace('_', ' ').toLowerCase()} imaging.`,
          why: [
            `Prior ${type} on ${prior.capturedAt.toDateString()} flagged ${prior.aiFlags?.length ?? 0} items.`,
            `Latest ${type} on ${recent.capturedAt.toDateString()} flagged ${recent.aiFlags?.length ?? 0} items: ${(recent.aiFlags ?? []).slice(0, 4).join(', ') || 'see review'}.`,
            ...(flags.length > 0 ? [`Cumulative AI-flagged signals across ${cases.length} ${type} studies.`] : []),
          ],
          observedAt: recent.capturedAt,
          suggestion: 'Provider review recommended, compare side-by-side at next encounter.',
        }),
      );
    }
  }
  return out;
};

const ruleDeclinedImaging: Rule = (ctx) => {
  const declined = ctx.notes.filter((n) => {
    const text = `${n.plan ?? ''} ${n.assessment ?? ''} ${n.subjective ?? ''}`.toLowerCase();
    return /(declined|refused|deferred).*(imaging|oct|fundus|photo|vf|visual field)/i.test(text);
  });
  if (declined.length === 0) return [];
  return [
    flag({
      idPrefix: 'declined-imaging',
      category: 'imaging',
      severity: 'attention',
      message: 'Patient previously declined imaging.',
      why: declined
        .slice(0, 3)
        .map((n) => `Note on ${n.createdAt.toDateString()} indicates imaging declined or deferred.`),
      observedAt: declined[0].createdAt,
      suggestion: 'Consider re-offering, explain rationale and document outcome.',
    }),
  ];
};

const ruleRxRepeatedlyExpires: Rule = (ctx) => {
  const out: InsightFlag[] = [];
  const groups = { CONTACTS: [] as Prescription[], GLASSES: [] as Prescription[] };
  for (const rx of ctx.prescriptions) groups[rx.type].push(rx);
  for (const [type, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
    let gapCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const lapsedDays = differenceInCalendarDays(sorted[i].issuedAt, sorted[i - 1].expiresAt);
      if (lapsedDays > 14) gapCount += 1;
    }
    if (gapCount >= 1 && type === 'CONTACTS') {
      out.push(
        flag({
          idPrefix: 'cl-rx-lapse',
          category: 'medication',
          severity: 'attention',
          message: 'Contact lens prescription repeatedly expires before renewal.',
          why: [
            `${gapCount} lapse${gapCount > 1 ? 's' : ''} between Rx renewals.`,
            `Most recent CL Rx issued ${sorted[sorted.length - 1].issuedAt.toDateString()}.`,
          ],
          suggestion: 'Follow-up indicated, proactive recall before next expiration.',
        }),
      );
    }
  }
  // Currently expired
  for (const rx of ctx.prescriptions) {
    if (rx.expiresAt < ctx.now) {
      out.push(
        flag({
          idPrefix: `rx-expired-${rx.id}`,
          category: 'medication',
          severity: 'info',
          message: `${rx.type === 'CONTACTS' ? 'Contact lens' : 'Glasses'} prescription expired on ${rx.expiresAt.toDateString()}.`,
          why: [`Rx issued ${rx.issuedAt.toDateString()}, expired ${rx.expiresAt.toDateString()}.`],
          observedAt: rx.expiresAt,
          suggestion: 'Follow-up indicated, recall for renewal exam.',
        }),
      );
      break;
    }
  }
  return out;
};

const ruleOpenCareGaps: Rule = (ctx) => {
  return ctx.careGaps
    .filter((g) => g.status === 'DUE' || g.status === 'OVERDUE')
    .map((g) =>
      flag({
        idPrefix: `caregap-${g.id}`,
        category: 'care_gap',
        severity: g.status === 'OVERDUE' ? 'priority' : 'attention',
        message: `Open care gap: ${g.type.replace(/_/g, ' ').toLowerCase()}.`,
        why: [
          `Care gap status: ${g.status}.`,
          g.dueDate ? `Due ${g.dueDate.toDateString()}.` : 'No due date set.',
          g.reason ?? 'No reason provided.',
        ],
        observedAt: g.dueDate ?? g.createdAt,
        suggestion: g.suggestedAction ?? 'Follow-up indicated.',
      }),
    );
};

const ruleRiskFactors: Rule = (ctx) => {
  const out: InsightFlag[] = [];
  if (ctx.patient.hasGlaucomaFamily && !ctx.patient.hasGlaucomaPersonal) {
    out.push(
      flag({
        idPrefix: 'risk-glaucoma-family',
        category: 'risk_factor',
        severity: 'info',
        message: 'Family history of glaucoma documented.',
        why: ['Patient chart flag: hasGlaucomaFamily = true.'],
        suggestion: 'Consider routine OCT / VF surveillance per practice protocol.',
      }),
    );
  }
  if (ctx.patient.hasDiabetes) {
    const lastDiabeticExam = [...ctx.appointments]
      .filter((a) => a.type === 'DIABETIC_EYE_EXAM' && a.status === 'COMPLETED')
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
    const months = lastDiabeticExam
      ? differenceInMonths(ctx.now, lastDiabeticExam.startsAt)
      : null;
    out.push(
      flag({
        idPrefix: 'risk-dm',
        category: 'risk_factor',
        severity: months !== null && months > 12 ? 'attention' : 'info',
        message: months !== null && months > 12
          ? 'Diabetic patient overdue for annual diabetic eye exam.'
          : 'Diabetic patient, annual diabetic eye exam recommended.',
        why: [
          'Patient chart flag: hasDiabetes = true.',
          lastDiabeticExam
            ? `Last diabetic eye exam ${lastDiabeticExam.startsAt.toDateString()}.`
            : 'No completed diabetic eye exam on file.',
        ],
        suggestion: 'Follow-up indicated per ADA / AAO interval.',
      }),
    );
  }
  if (ctx.patient.isSmoker) {
    out.push(
      flag({
        idPrefix: 'risk-smoker',
        category: 'lifestyle',
        severity: 'info',
        message: 'Smoking documented as lifestyle factor.',
        why: ['Patient chart flag: isSmoker = true.'],
        suggestion: 'Counsel on macular health risk; document discussion.',
      }),
    );
  }
  return out;
};

const ruleNoShowPattern: Rule = (ctx) => {
  const noShows = ctx.appointments.filter((a) => a.status === 'NO_SHOW');
  if (noShows.length < 2) return [];
  return [
    flag({
      idPrefix: 'no-show-pattern',
      category: 'compliance',
      severity: noShows.length >= 3 ? 'priority' : 'attention',
      message: `Pattern of ${noShows.length} no-shows on record.`,
      why: noShows
        .slice(0, 4)
        .map((a) => `No-show on ${a.startsAt.toDateString()} for ${a.type.replace(/_/g, ' ').toLowerCase()}.`),
      observedAt: noShows[0].startsAt,
      suggestion: 'Consider confirmation outreach and personalized recall channel.',
    }),
  ];
};

const ruleAnnualExamOverdue: Rule = (ctx) => {
  const last = [...ctx.appointments]
    .filter(
      (a) =>
        a.status === 'COMPLETED' &&
        (a.type === 'COMPREHENSIVE_EYE_EXAM' || a.type === 'DIABETIC_EYE_EXAM'),
    )
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
  if (!last) return [];
  const months = differenceInMonths(ctx.now, last.startsAt);
  if (months < 13) return [];
  return [
    flag({
      idPrefix: 'annual-overdue',
      category: 'follow_up',
      severity: months > 18 ? 'priority' : 'attention',
      message: `Annual comprehensive exam overdue (last completed ${months} months ago).`,
      why: [
        `Most recent comprehensive / diabetic exam on ${last.startsAt.toDateString()}.`,
        'Routine interval is 12 months for most adults.',
      ],
      observedAt: last.startsAt,
      suggestion: 'Recall outreach indicated.',
    }),
  ];
};

const ruleUnreadInbound: Rule = (ctx) => {
  let unread = 0;
  let lastAt: Date | undefined;
  for (const t of ctx.threads) {
    for (const m of t.messages) {
      if (m.direction === 'INBOUND' && m.readStatus !== 'READ') {
        unread += 1;
        if (!lastAt || m.createdAt > lastAt) lastAt = m.createdAt;
      }
    }
  }
  if (unread === 0) return [];
  return [
    flag({
      idPrefix: 'unread-inbound',
      category: 'communication',
      severity: unread >= 3 ? 'priority' : 'attention',
      message: `${unread} unread inbound message${unread > 1 ? 's' : ''} from this patient.`,
      why: [
        lastAt ? `Most recent inbound on ${lastAt.toDateString()}.` : 'Inbound messages without a read status.',
      ],
      observedAt: lastAt,
      suggestion: 'Triage in the messages queue.',
    }),
  ];
};

const ruleDeferredTesting: Rule = (ctx) => {
  const deferred = ctx.notes.filter((n) => {
    const text = `${n.plan ?? ''} ${n.assessment ?? ''}`.toLowerCase();
    return /defer(red)?\s+(oct|vf|visual field|gonio|pachymetry|imaging|topography)/i.test(text);
  });
  if (deferred.length === 0) return [];
  return [
    flag({
      idPrefix: 'deferred-testing',
      category: 'pretest',
      severity: 'attention',
      message: 'Prior plan deferred clinical testing.',
      why: deferred.slice(0, 3).map((n) => `Plan on ${n.createdAt.toDateString()} mentions deferred testing.`),
      observedAt: deferred[0].createdAt,
      suggestion: 'Provider review recommended, confirm whether testing is still indicated.',
    }),
  ];
};

const rulePriorRecommendations: Rule = (ctx) => {
  const out: InsightFlag[] = [];
  // Each signed note's plan acts as a "prior recommendation".
  const signedWithPlan = ctx.notes
    .filter((n) => n.status === 'SIGNED' && n.plan && n.plan.length > 0)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  for (const n of signedWithPlan) {
    out.push(
      flag({
        idPrefix: `prior-rec-${n.id}`,
        category: 'follow_up',
        severity: 'info',
        message: `Prior recommendation from ${n.createdAt.toDateString()}.`,
        detail: n.plan ?? undefined,
        why: [`Signed clinical note on ${n.createdAt.toDateString()}.`],
        observedAt: n.createdAt,
      }),
    );
  }
  return out;
};

const ruleCommunicationPreference: Rule = (ctx) => {
  const channels: Record<string, number> = {};
  for (const t of ctx.threads) {
    for (const m of t.messages) {
      channels[m.channel] = (channels[m.channel] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return [];
  return [
    flag({
      idPrefix: 'comm-pref',
      category: 'communication',
      severity: 'info',
      message: `Most-used channel: ${top[0].toLowerCase()}.`,
      why: sorted.slice(0, 3).map(([ch, n]) => `${ch}: ${n} message${n > 1 ? 's' : ''}.`),
      suggestion: `Prefer ${top[0].toLowerCase()} for outreach unless patient indicates otherwise.`,
    }),
  ];
};

// ---------- Public entry point ----------

export const ALL_RULES: Rule[] = [
  ruleMissedGlaucomaFollowUp,
  ruleNoDilationOver2Years,
  ruleRepeatedSymptoms,
  ruleImagingProgression,
  ruleDeclinedImaging,
  ruleRxRepeatedlyExpires,
  ruleOpenCareGaps,
  ruleRiskFactors,
  ruleNoShowPattern,
  ruleAnnualExamOverdue,
  ruleUnreadInbound,
  ruleDeferredTesting,
  rulePriorRecommendations,
  ruleCommunicationPreference,
];

export function runAllRules(ctx: PatientContext): InsightFlag[] {
  return ALL_RULES.flatMap((r) => r(ctx));
}

// Severity ordering helper for sorting.
const SEV_ORDER: Record<InsightSeverity, number> = {
  urgent: 0,
  priority: 1,
  attention: 2,
  info: 3,
};

export function bySeverity(a: InsightFlag, b: InsightFlag): number {
  return SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
}

export function ageInYears(dob: Date, now: Date): number {
  return differenceInYears(now, dob);
}
