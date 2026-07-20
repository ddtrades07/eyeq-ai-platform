import type { ImageType } from '@prisma/client';
import type {
  ImagingProvider,
  ProviderAnalysisInput,
  ProviderAnalysisOutput,
} from './imaging-provider-interface';
import { imagingEnv } from './config';

/**
 * Connects to a configured external validated imaging AI endpoint.
 * API key remains server-side. Response is normalized before persistence.
 */
export const externalValidatedProvider: ImagingProvider = {
  name: 'External Validated Provider',
  mode: 'external',

  supportsModality(modality: ImageType) {
    return modality !== 'OTHER';
  },

  async analyze(input: ProviderAnalysisInput): Promise<ProviderAnalysisOutput> {
    const start = Date.now();
    if (!imagingEnv.externalEndpoint || !imagingEnv.externalApiKey) {
      return {
        analysisStatus: 'failed',
        modelName: 'external',
        modelVersion: 'unknown',
        intendedUse: 'Configured external imaging analysis',
        supportedFindings: input.supportedFindings ?? [],
        possibleFindings: [],
        limitations: ['External imaging provider credentials not configured'],
        outOfDistribution: false,
        requiresManualReview: true,
        reviewPriority: 'routine',
        isDevelopmentMock: false,
        failureReason: 'Missing IMAGING_ANALYSIS_ENDPOINT or IMAGING_ANALYSIS_API_KEY',
        processingTimeMs: Date.now() - start,
      };
    }

    try {
      const res = await fetch(imagingEnv.externalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${imagingEnv.externalApiKey}`,
        },
        body: JSON.stringify({
          imageUrl: input.signedImageUrl,
          storagePath: input.storagePath,
          modality: input.modality,
          laterality: input.laterality,
          patientContext: input.patientContext,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        throw new Error(`External provider HTTP ${res.status}`);
      }

      const raw = (await res.json()) as Record<string, unknown>;
      return normalizeExternalResponse(raw, input, Date.now() - start);
    } catch (err) {
      return {
        analysisStatus: 'failed',
        modelName: 'external',
        modelVersion: 'unknown',
        intendedUse: 'Configured external imaging analysis',
        supportedFindings: [],
        possibleFindings: [],
        limitations: ['External provider request failed, manual review required'],
        outOfDistribution: false,
        requiresManualReview: true,
        reviewPriority: 'review-soon',
        isDevelopmentMock: false,
        failureReason: err instanceof Error ? err.message : 'External provider error',
        processingTimeMs: Date.now() - start,
      };
    }
  },
};

function normalizeExternalResponse(
  raw: Record<string, unknown>,
  input: ProviderAnalysisInput,
  processingTimeMs: number,
): ProviderAnalysisOutput {
  const findings = Array.isArray(raw.possibleFindings)
    ? (raw.possibleFindings as Record<string, unknown>[]).map((f, i) => ({
        findingCode: String(f.findingCode ?? `ext-${i}`),
        findingLabel: String(f.findingLabel ?? f.label ?? 'Finding requiring provider review'),
        evidenceDescription: String(f.evidence ?? f.evidenceDescription ?? ''),
        confidenceCategory: (['low', 'moderate', 'high'].includes(String(f.confidence))
          ? String(f.confidence)
          : 'moderate') as 'low' | 'moderate' | 'high',
        limitations: Array.isArray(f.limitations) ? f.limitations.map(String) : [],
        supportedByModel: true,
      }))
    : [];

  return {
    analysisStatus: 'complete',
    modelName: String(raw.modelName ?? 'external'),
    modelVersion: String(raw.modelVersion ?? 'unknown'),
    intendedUse: String(raw.intendedUse ?? 'Imaging review support per vendor configuration'),
    supportedFindings: Array.isArray(raw.supportedFindings)
      ? raw.supportedFindings.map(String)
      : input.supportedFindings ?? [],
    possibleFindings: findings,
    limitations: Array.isArray(raw.limitations) ? raw.limitations.map(String) : [],
    outOfDistribution: Boolean(raw.outOfDistribution),
    requiresManualReview: true,
    reviewPriority: (raw.reviewPriority as ProviderAnalysisOutput['reviewPriority']) ?? 'review-soon',
    isDevelopmentMock: false,
    rawProviderResponse: raw,
    processingTimeMs,
  };
}
