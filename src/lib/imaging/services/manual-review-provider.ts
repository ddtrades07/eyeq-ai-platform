import type { ImageType } from '@prisma/client';
import type {
  ImagingProvider,
  ProviderAnalysisInput,
  ProviderAnalysisOutput,
} from './imaging-provider-interface';
import { NO_PROVIDER_MESSAGE } from './config';

export const manualReviewProvider: ImagingProvider = {
  name: 'Manual Provider Review',
  mode: 'manual',

  supportsModality() {
    return true;
  },

  async analyze(): Promise<ProviderAnalysisOutput> {
    return {
      analysisStatus: 'skipped',
      modelName: 'none',
      modelVersion: 'n/a',
      intendedUse: 'Manual provider review only, no automated clinical findings',
      supportedFindings: [],
      possibleFindings: [],
      limitations: [NO_PROVIDER_MESSAGE],
      outOfDistribution: false,
      requiresManualReview: true,
      reviewPriority: 'routine',
      isDevelopmentMock: false,
    };
  },
};

export function createManualProvider(): ImagingProvider {
  return manualReviewProvider;
}
