import type { ImageType } from '@prisma/client';
import type { QualityGrade } from '@prisma/client';

export interface ProviderAnalysisInput {
  storagePath: string;
  signedImageUrl?: string | null;
  modality: ImageType;
  laterality?: string;
  patientContext?: string;
  organizationId: string;
  modelName?: string;
  modelVersion?: string;
  supportedFindings?: string[];
}

export interface NormalizedFinding {
  findingCode?: string;
  findingLabel: string;
  anatomicalLocation?: string;
  laterality?: string;
  evidenceDescription?: string;
  confidenceCategory: 'low' | 'moderate' | 'high' | 'insufficient';
  probability?: number;
  severityCategory?: string;
  actionCategory?: string;
  limitations: string[];
  supportedByModel: boolean;
}

export interface ProviderAnalysisOutput {
  analysisStatus: 'complete' | 'failed' | 'skipped';
  modelName: string;
  modelVersion: string;
  intendedUse: string;
  supportedFindings: string[];
  possibleFindings: NormalizedFinding[];
  limitations: string[];
  outOfDistribution: boolean;
  requiresManualReview: boolean;
  reviewPriority: 'routine' | 'review-soon' | 'same-day' | 'urgent-referral';
  isDevelopmentMock: boolean;
  failureReason?: string;
  rawProviderResponse?: Record<string, unknown>;
  processingTimeMs?: number;
}

export interface ImagingProvider {
  readonly name: string;
  readonly mode: 'manual' | 'descriptive' | 'external' | 'custom' | 'development-mock';
  supportsModality(modality: ImageType): boolean;
  analyze(input: ProviderAnalysisInput): Promise<ProviderAnalysisOutput>;
}

export interface QualityAssessmentResult {
  grade: QualityGrade;
  overallScore: number;
  focusScore: number;
  illuminationScore: number;
  contrastScore: number;
  fieldOfViewScore: number;
  centeringScore: number;
  artifactScore: number;
  qualityLimitations: string[];
  retakeRecommended: boolean;
  gradable: boolean;
}
