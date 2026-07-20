import { z } from 'zod';
import { IMAGING_AI_TITLE, IMAGING_SAFETY_DISCLAIMER } from './constants';

const confidenceSchema = z.enum(['low', 'medium', 'high']);

/**
 * Canonical structured response for provider-review image analysis.
 * Never represents a diagnosis.
 */
export const providerReviewImageAnalysisSchema = z.object({
  status: z.literal('review_support').default('review_support'),
  title: z.string().default(IMAGING_AI_TITLE),
  disclaimer: z.string().default(IMAGING_SAFETY_DISCLAIMER),
  imageOverview: z.object({
    imageType: z.string(),
    eye: z.string(),
    imageQuality: z.string(),
    visibleRegion: z.string(),
    limitations: z.array(z.string()).default([]),
  }),
  appearsToSee: z.array(z.string()).default([]),
  possibleObservations: z
    .array(
      z.object({
        observation: z.string(),
        region: z.string(),
        confidence: confidenceSchema,
        whyFlagged: z.string(),
        providerShouldInspect: z.string(),
      }),
    )
    .default([]),
  areasToInspect: z.array(z.string()).default([]),
  priorComparison: z
    .object({
      available: z.boolean(),
      summary: z.string(),
    })
    .default({ available: false, summary: 'No prior image available for comparison.' }),
  suggestedReviewSteps: z.array(z.string()).default([]),
  providerSignoffRequired: z.literal(true).default(true),
});

export type ProviderReviewImageAnalysis = z.infer<typeof providerReviewImageAnalysisSchema>;

/**
 * Legacy descriptive schema (still accepted from stored rawProviderResponse).
 * New analyses should use providerReviewImageAnalysisSchema.
 */
export const descriptiveImagingReviewSchema = z.object({
  analysisStatus: z.enum([
    'completed',
    'failed',
    'manual_review_required',
    'not_gradable',
    'outside_scope',
  ]),
  providerType: z.enum(['general_multimodal', 'validated_clinical']),
  providerName: z.string(),
  modelName: z.string(),
  modelVersion: z.string().optional(),
  modality: z.string(),
  laterality: z.enum(['OD', 'OS', 'OU', 'UNKNOWN']),
  quality: z.object({
    classification: z.enum(['Gradable', 'Gradable With Limitations', 'Not Gradable']),
    score: z.number().nullable(),
    focus: z.string(),
    illumination: z.string(),
    contrast: z.string(),
    fieldOfView: z.string(),
    centering: z.string(),
    artifacts: z.array(z.string()),
    limitations: z.array(z.string()),
    retakeRecommended: z.boolean(),
    descriptiveAnalysisAllowed: z.boolean(),
  }),
  visibleAnatomy: z.array(
    z.object({
      structure: z.string(),
      visibility: z.enum(['clearly_visible', 'partially_visible', 'not_visible']),
      observation: z.string(),
    }),
  ),
  visibleObservations: z.array(
    z.object({
      id: z.string(),
      region: z.string(),
      laterality: z.string(),
      observation: z.string(),
      visualEvidence: z.string(),
      confidence: z.enum(['Low', 'Moderate', 'High', 'low', 'medium', 'high']),
      requiresProviderReview: z.literal(true),
    }),
  ),
  possibleAreasForReview: z.array(
    z.object({
      label: z.string(),
      region: z.string(),
      reason: z.string(),
      confidence: z.enum(['Low', 'Moderate', 'High', 'low', 'medium', 'high']),
      clinicalCorrelationNeeded: z.array(z.string()),
    }),
  ),
  aiNotesForProvider: z.object({
    conciseSummary: z.string(),
    reviewFirst: z.array(z.string()),
    limitations: z.array(z.string()),
    missingInformation: z.array(z.string()),
    suggestedCorrelations: z.array(z.string()),
    questionsForProvider: z.array(z.string()),
  }),
  reviewPriority: z.enum([
    'Routine Review',
    'Review Soon',
    'Same-Day Provider Review',
    'Unable to Determine',
  ]),
  disclaimer: z.string(),
  /** Optional new-format payload when both shapes are stored together */
  providerReviewAnalysis: providerReviewImageAnalysisSchema.optional(),
});

export type DescriptiveImagingReview = z.infer<typeof descriptiveImagingReviewSchema>;

function titleCaseConfidence(c: string): 'Low' | 'Moderate' | 'High' {
  const n = c.toLowerCase();
  if (n === 'high') return 'High';
  if (n === 'medium' || n === 'moderate') return 'Moderate';
  return 'Low';
}

/** Map canonical provider-review analysis into the legacy descriptive shape used by persistence/UI adapters. */
export function providerReviewToDescriptive(
  analysis: ProviderReviewImageAnalysis,
  meta: {
    modelName: string;
    modality: string;
    laterality: 'OD' | 'OS' | 'OU' | 'UNKNOWN';
    modelVersion?: string;
  },
): DescriptiveImagingReview {
  const qualityLower = analysis.imageOverview.imageQuality.toLowerCase();
  const notGradable =
    qualityLower.includes('not gradable') ||
    qualityLower.includes('ungradable') ||
    qualityLower.includes('insufficient');
  const limited =
    analysis.imageOverview.limitations.length > 0 ||
    qualityLower.includes('limitation') ||
    qualityLower.includes('fair') ||
    qualityLower.includes('poor');

  return {
    analysisStatus: notGradable ? 'not_gradable' : 'completed',
    providerType: 'general_multimodal',
    providerName: 'OpenAI Vision',
    modelName: meta.modelName,
    modelVersion: meta.modelVersion,
    modality: meta.modality || analysis.imageOverview.imageType,
    laterality: meta.laterality,
    quality: {
      classification: notGradable
        ? 'Not Gradable'
        : limited
          ? 'Gradable With Limitations'
          : 'Gradable',
      score: null,
      focus: analysis.imageOverview.imageQuality || 'unknown',
      illumination: 'see limitations',
      contrast: 'see limitations',
      fieldOfView: analysis.imageOverview.visibleRegion || 'unknown',
      centering: 'see limitations',
      artifacts: [],
      limitations: analysis.imageOverview.limitations,
      retakeRecommended: notGradable || qualityLower.includes('poor'),
      descriptiveAnalysisAllowed: !notGradable,
    },
    visibleAnatomy: [],
    visibleObservations: analysis.possibleObservations.map((o, i) => ({
      id: `obs-${i + 1}`,
      region: o.region,
      laterality: meta.laterality,
      observation: o.observation,
      visualEvidence: o.whyFlagged,
      confidence: titleCaseConfidence(o.confidence),
      requiresProviderReview: true as const,
    })),
    possibleAreasForReview: analysis.possibleObservations.map((o) => ({
      label: o.observation,
      region: o.region,
      reason: o.whyFlagged,
      confidence: titleCaseConfidence(o.confidence),
      clinicalCorrelationNeeded: [o.providerShouldInspect],
    })),
    aiNotesForProvider: {
      conciseSummary: analysis.appearsToSee.slice(0, 3).join(' ') || analysis.disclaimer,
      reviewFirst: analysis.areasToInspect.slice(0, 6),
      limitations: analysis.imageOverview.limitations,
      missingInformation: analysis.priorComparison.available
        ? []
        : ['No prior image available for comparison.'],
      suggestedCorrelations: analysis.suggestedReviewSteps,
      questionsForProvider: analysis.possibleObservations.map(
        (o) => `Confirm: ${o.observation} (${o.region})`,
      ),
    },
    reviewPriority: notGradable ? 'Unable to Determine' : 'Routine Review',
    disclaimer: analysis.disclaimer || IMAGING_SAFETY_DISCLAIMER,
    providerReviewAnalysis: analysis,
  };
}

export function parseProviderReviewAnalysis(raw: unknown): ProviderReviewImageAnalysis | null {
  const direct = providerReviewImageAnalysisSchema.safeParse(raw);
  if (direct.success) return direct.data;

  // Accept wrapped payloads
  if (raw && typeof raw === 'object' && 'providerReviewAnalysis' in raw) {
    const nested = providerReviewImageAnalysisSchema.safeParse(
      (raw as { providerReviewAnalysis: unknown }).providerReviewAnalysis,
    );
    if (nested.success) return nested.data;
  }
  return null;
}
