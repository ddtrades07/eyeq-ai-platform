import type { ImageType } from '@prisma/client';
import type {
  ImagingProvider,
  ProviderAnalysisInput,
  ProviderAnalysisOutput,
} from './imaging-provider-interface';

/**
 * Development-only mock provider. Never enabled in production unless IMAGING_DEV_MOCK=true.
 * Outputs are labeled and must not be confused with validated analysis.
 */
export const developmentMockProvider: ImagingProvider = {
  name: 'Development Mock Analysis',
  mode: 'development-mock',

  supportsModality(modality: ImageType) {
    return modality !== 'OTHER';
  },

  async analyze(input: ProviderAnalysisInput): Promise<ProviderAnalysisOutput> {
    return {
      analysisStatus: 'complete',
      modelName: 'EyeQ Dev Mock',
      modelVersion: '0.0.0-dev',
      intendedUse: 'Development testing only, not clinically validated',
      supportedFindings: ['dev-quality-check', 'dev-pattern-placeholder'],
      possibleFindings: [
        {
          findingCode: 'dev-review-001',
          findingLabel: 'Possible feature requiring provider review (development mock)',
          evidenceDescription: `Modality ${input.modality} processed by development mock, not from a validated model`,
          confidenceCategory: 'low',
          limitations: [
            'Development mock output',
            'Do not use for clinical decisions',
            'Replace with validated provider before production PHI',
          ],
          supportedByModel: true,
          actionCategory: 'provider-review-recommended',
        },
      ],
      limitations: [
        'This is development mock analysis only',
        'Not FDA-cleared or clinically validated',
      ],
      outOfDistribution: false,
      requiresManualReview: true,
      reviewPriority: 'routine',
      isDevelopmentMock: true,
      rawProviderResponse: { mock: true, modality: input.modality },
      processingTimeMs: 50,
    };
  },
};
