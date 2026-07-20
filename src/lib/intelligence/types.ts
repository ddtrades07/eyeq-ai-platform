/**
 * Timeline Intelligence, types
 *
 * The intelligence layer is intentionally deterministic and explainable.
 * Every flag carries the inputs that produced it (`why`) so the UI can
 * show a "Why EyeQ Flagged This" panel rather than a black box.
 *
 * Clinical safety contract (see `vocab.ts`):
 *   - We never assert a diagnosis.
 *   - We use "possible", "suggestive", "follow-up indicated",
 *     "unresolved concern", "provider review recommended".
 */

export type InsightSeverity = 'info' | 'attention' | 'priority' | 'urgent';

export type InsightCategory =
  | 'follow_up'
  | 'compliance'
  | 'imaging'
  | 'medication'
  | 'communication'
  | 'symptom'
  | 'lifestyle'
  | 'risk_factor'
  | 'optical'
  | 'care_gap'
  | 'pretest';

/** A single explainable signal about one patient. */
export interface InsightFlag {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  /** Headline message, already phrased with safe vocabulary. */
  message: string;
  /** Optional longer body, multi-sentence narrative. */
  detail?: string;
  /**
   * Plain-English reasons that triggered this flag. Every bullet should
   * point at concrete data the user can verify (dates, counts, values).
   */
  why: string[];
  /** When the supporting evidence was last observed. */
  observedAt?: Date;
  /** Suggested next action, wording is provider-deferential. */
  suggestion?: string;
}

/** One row on the longitudinal timeline. */
export interface TimelineEvent {
  id: string;
  at: Date;
  kind:
    | 'appointment'
    | 'imaging'
    | 'note'
    | 'prescription'
    | 'care_gap'
    | 'message'
    | 'recommendation';
  title: string;
  detail?: string;
  /** Optional href to drill into the source record. */
  href?: string;
  /** Visual hint for the timeline UI. */
  tone?: 'neutral' | 'positive' | 'warning' | 'destructive';
}

/** Bucketed view used by the attention graph. */
export interface AttentionDistribution {
  category: InsightCategory;
  count: number;
  weight: number;
}

/** All intelligence we know about one patient at this moment. */
export interface PatientIntelligence {
  patientId: string;
  generatedAt: Date;

  summary: string[];
  attentionFactors: InsightFlag[];
  complianceInsights: InsightFlag[];
  followUpRisk: {
    score: number;
    band: 'low' | 'moderate' | 'elevated' | 'high';
    factors: string[];
  };
  imagingProgressionNotes: InsightFlag[];
  providerAttentionAreas: InsightFlag[];
  suggestedQuestions: string[];

  clinicalMemory: {
    unresolvedIssues: InsightFlag[];
    priorRecommendations: InsightFlag[];
    repeatedComplaints: InsightFlag[];
    deferredTesting: InsightFlag[];
    imagingReviewNotes: InsightFlag[];
    lifestyleConsiderations: InsightFlag[];
    communicationPreferences: InsightFlag[];
  };

  attentionDistribution: AttentionDistribution[];
  timeline: TimelineEvent[];
}

/** Lightweight reasons surfaced on the dashboard for *today's* visits. */
export interface TodayInsight {
  patientId: string;
  patientName: string;
  appointmentId: string;
  startsAt: Date;
  appointmentType: string;
  reasons: InsightFlag[];
  topReason?: string;
}

/** Aggregated practice intelligence used by the analytics tab. */
export interface PracticeIntelligence {
  generatedAt: Date;
  fallingThroughCracks: {
    patientId: string;
    patientName: string;
    why: string[];
    severity: InsightSeverity;
  }[];
  noShowPatterns: {
    patientId: string;
    patientName: string;
    noShowCount: number;
    rate: number;
    lastNoShowAt?: Date;
  }[];
  imagingReviewDelays: {
    imagingCaseId: string;
    patientName: string;
    capturedAt: Date;
    waitingDays: number;
    imageType: string;
  }[];
  recallLeakage: {
    type: string;
    overdueCount: number;
    sample: { patientId: string; patientName: string }[];
  }[];
  followUpCompletion: {
    completed: number;
    missed: number;
    upcoming: number;
    rate: number;
  };
}
