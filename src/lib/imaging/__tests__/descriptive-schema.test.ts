import { describe, expect, it } from 'vitest';
import {
  descriptiveImagingReviewSchema,
  providerReviewImageAnalysisSchema,
  providerReviewToDescriptive,
} from '../descriptive-schema';
import {
  IMAGING_AI_TITLE,
  IMAGING_SAFETY_DISCLAIMER,
  MANUAL_REVIEW_MESSAGE,
} from '../constants';

describe('providerReviewImageAnalysisSchema', () => {
  it('rejects incomplete diagnosis-style payloads', () => {
    const result = providerReviewImageAnalysisSchema.safeParse({ status: 'review_support' });
    expect(result.success).toBe(false);
  });

  it('accepts canonical provider-review analysis shape', () => {
    const result = providerReviewImageAnalysisSchema.safeParse({
      status: 'review_support',
      title: IMAGING_AI_TITLE,
      disclaimer: IMAGING_SAFETY_DISCLAIMER,
      imageOverview: {
        imageType: 'FUNDUS',
        eye: 'OD',
        imageQuality: 'Gradable with limitations',
        visibleRegion: 'Posterior pole',
        limitations: ['Mild blur near edges'],
      },
      appearsToSee: [
        'The optic nerve appears visible with possible cupping features.',
        'No obvious hemorrhage is apparent in the visible field, but provider review is required.',
      ],
      possibleObservations: [
        {
          observation: 'Possible optic nerve cupping',
          region: 'Optic disc',
          confidence: 'medium',
          whyFlagged: 'Cup-to-disc appearance may look enlarged in this image',
          providerShouldInspect:
            'Confirm cup-to-disc ratio, rim appearance, asymmetry, IOP, OCT/RNFL, and clinical history',
        },
      ],
      areasToInspect: ['optic nerve', 'macula', 'vessels'],
      priorComparison: {
        available: false,
        summary: 'No prior image available for comparison.',
      },
      suggestedReviewSteps: [
        'compare with prior imaging',
        'review OCT/RNFL if available',
        'document provider interpretation',
      ],
      providerSignoffRequired: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('review_support');
      expect(result.data.providerSignoffRequired).toBe(true);
      expect(result.data.disclaimer.toLowerCase()).toContain('not a diagnosis');
    }
  });

  it('maps provider-review analysis into descriptive persistence shape', () => {
    const analysis = providerReviewImageAnalysisSchema.parse({
      status: 'review_support',
      title: IMAGING_AI_TITLE,
      disclaimer: IMAGING_SAFETY_DISCLAIMER,
      imageOverview: {
        imageType: 'FUNDUS',
        eye: 'OS',
        imageQuality: 'Fair',
        visibleRegion: 'Posterior pole',
        limitations: ['Lighting uneven'],
      },
      appearsToSee: ['Macular region appears viewable.'],
      possibleObservations: [
        {
          observation: 'Possible vessel caliber change',
          region: 'Arcades',
          confidence: 'low',
          whyFlagged: 'Vessel appearance may vary with image quality',
          providerShouldInspect: 'Compare vessel caliber clinically and with priors',
        },
      ],
      areasToInspect: ['vessels'],
      priorComparison: { available: false, summary: 'No prior image available for comparison.' },
      suggestedReviewSteps: ['document provider interpretation'],
      providerSignoffRequired: true,
    });

    const descriptive = providerReviewToDescriptive(analysis, {
      modelName: 'gpt-4o',
      modality: 'FUNDUS',
      laterality: 'OS',
    });

    expect(descriptive.disclaimer.toLowerCase()).toContain('not a diagnosis');
    expect(descriptive.visibleObservations[0]?.requiresProviderReview).toBe(true);
    expect(descriptive.providerReviewAnalysis?.status).toBe('review_support');
  });
});

describe('descriptiveImagingReviewSchema (legacy)', () => {
  it('still accepts stored legacy descriptive reviews', () => {
    const result = descriptiveImagingReviewSchema.safeParse({
      analysisStatus: 'completed',
      providerType: 'general_multimodal',
      providerName: 'OpenAI Vision',
      modelName: 'gpt-4o',
      modality: 'FUNDUS',
      laterality: 'OD',
      quality: {
        classification: 'Gradable With Limitations',
        score: 53,
        focus: 'acceptable',
        illumination: 'adequate',
        contrast: 'fair',
        fieldOfView: 'partial',
        centering: 'acceptable',
        artifacts: [],
        limitations: ['Partial field of view'],
        retakeRecommended: false,
        descriptiveAnalysisAllowed: true,
      },
      visibleAnatomy: [],
      visibleObservations: [],
      possibleAreasForReview: [],
      aiNotesForProvider: {
        conciseSummary: 'Limited field, provider review required.',
        reviewFirst: ['Confirm disc and macula on examination'],
        limitations: ['Partial field of view'],
        missingInformation: ['IOP not in imaging context'],
        suggestedCorrelations: [],
        questionsForProvider: [],
      },
      reviewPriority: 'Routine Review',
      disclaimer: IMAGING_SAFETY_DISCLAIMER,
    });
    expect(result.success).toBe(true);
  });
});

describe('imaging safety copy', () => {
  it('manual review message does not invent findings', () => {
    expect(MANUAL_REVIEW_MESSAGE.toLowerCase()).toContain('manual review only');
    expect(MANUAL_REVIEW_MESSAGE.toLowerCase()).toContain('has not generated');
    expect(MANUAL_REVIEW_MESSAGE.toLowerCase()).not.toContain('disease detected');
  });

  it('title is provider-review framed', () => {
    expect(IMAGING_AI_TITLE).toBe('AI Image Analysis for Provider Review');
  });
});
