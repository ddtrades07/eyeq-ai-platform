/**
 * Structured types for the clinical imaging review pipeline.
 *
 * SAFETY: Every type in this file describes "review-support" signals.
 * Nothing here constitutes a diagnosis. All outputs require provider sign-off.
 */

// ── Quality Gate ─────────────────────────────────────────────────────

export interface ImageQualityAssessment {
  /** @deprecated use classification */
  gradable?: boolean;
  classification?: string;
  score: number; // 0–100
  descriptiveAnalysisAllowed?: boolean;
  retakeRecommended?: boolean;
  focus: 'sharp' | 'acceptable' | 'soft' | 'poor';
  brightness: 'optimal' | 'bright' | 'dark' | 'very-dark';
  contrast: 'good' | 'fair' | 'low';
  centeredAnatomy: boolean;
  fieldOfView: 'full' | 'partial' | 'limited';
  artifacts: string[];
  limitingFactors: string[];
  recommendation: 'proceed' | 'proceed-with-limitations' | 'retake-recommended' | 'retake-required';
}

// ── Differential Findings ────────────────────────────────────────────

export type FindingConfidence = 'low' | 'moderate' | 'high';
export type FindingSeverity = 'minimal' | 'mild' | 'moderate' | 'significant';

export interface PossibleFinding {
  id: string;
  finding: string;
  evidence: string[];
  confidence: FindingConfidence;
  severity: FindingSeverity;
  nextStep: string;
  providerActionNeeded: boolean;
}

// ── Multimodal Correlation ───────────────────────────────────────────

export interface CorrelationFactors {
  supporting: string[];
  reducing: string[];
  missingInformation: string[];
}

// ── Timeline Comparison ──────────────────────────────────────────────

export type TrendDirection = 'stable' | 'possibly-worse' | 'improved' | 'inconclusive';

export interface TimelineComparison {
  priorDate: string | null;
  priorFinding: string;
  currentFinding: string;
  trend: TrendDirection;
  reason: string;
}

// ── Type-Specific Templates ──────────────────────────────────────────

export interface FundusReviewTemplate {
  opticDiscAppearance: string;
  cupToDiscConcern: string;
  maculaAppearance: string;
  vesselChanges: string;
  hemorrhageExudateFindings: string;
  peripheralRetinaVisibility: string;
  diabeticRetinopathyLike: string;
  hypertensiveRetinopathyLike: string;
  amdLikeMacularChanges: string;
}

export interface OctReviewTemplate {
  scanQuality: string;
  macularContour: string;
  fluidLikePattern: string;
  rnflTrend: string;
  ganglionCellComplex: string;
  segmentationArtifact: string;
  macularEdemaConcern: string;
  glaucomaProgressionConcern: string;
}

export interface VisualFieldReviewTemplate {
  reliabilityIndices: string;
  fixationLosses: string;
  falsePositives: string;
  falseNegatives: string;
  patternDefectConcern: string;
  glaucomaLikeFieldDefect: string;
  repeatTestRecommendation: string;
}

export interface SlitLampReviewTemplate {
  rednessPattern: string;
  cornealOpacityConcern: string;
  lidMarginConcern: string;
  cataractLensOpacity: string;
  conjunctivalAbnormality: string;
}

export interface TopographyReviewTemplate {
  irregularAstigmatismConcern: string;
  keratoconusScreening: string;
  progressionPlaceholder: string;
  contactLensFittingRelevance: string;
}

export type ImageTypeTemplate =
  | { type: 'FUNDUS'; template: FundusReviewTemplate }
  | { type: 'OCT'; template: OctReviewTemplate }
  | { type: 'VISUAL_FIELD'; template: VisualFieldReviewTemplate }
  | { type: 'SLIT_LAMP'; template: SlitLampReviewTemplate }
  | { type: 'TOPOGRAPHY'; template: TopographyReviewTemplate }
  | { type: 'EXTERNAL_PHOTO'; template: SlitLampReviewTemplate }
  | { type: 'OTHER'; template: null };

// ── Full Structured Review ───────────────────────────────────────────

export interface StructuredImagingReview {
  quality: ImageQualityAssessment;
  typeSpecific: ImageTypeTemplate;
  possibleFindings: PossibleFinding[];
  correlation: CorrelationFactors;
  timelineComparisons: TimelineComparison[];
  overallUrgency: 'routine' | 'review-soon' | 'same-day' | 'urgent-referral';
  overallConfidence: FindingConfidence;
  safetyDisclaimer: string;
  analysisStatusLabel?: string;
  analysisMode?: string;
  manualReviewOnly?: boolean;
  isDevelopmentMock?: boolean;
  descriptiveReview?: import('./descriptive-schema').DescriptiveImagingReview | null;
  analysisId?: string;
}

// ── Provider Verification ────────────────────────────────────────────

export interface ProviderVerification {
  reviewed: boolean;
  agrees: boolean | null;
  providerNote: string | null;
  patientSummaryApproved: string | null;
  followUpPlan: string | null;
  referralNeeded: boolean;
}

// ── Audit Event ──────────────────────────────────────────────────────

export type ImagingAuditEvent =
  | 'IMAGE_UPLOADED'
  | 'AI_REVIEW_GENERATED'
  | 'PROVIDER_REVIEWED'
  | 'PATIENT_SUMMARY_APPROVED'
  | 'REFERRAL_CREATED'
  | 'NOTE_EXPORTED';
