import 'server-only';
import { db } from '@/lib/db';
import type { ImageType } from '@prisma/client';
import {
  ImagingAnalysisStatus,
  ImagingAuditAction,
  ImagingLaterality,
  ImagingStudyStatus,
  QualityGrade,
  type Prisma,
} from '@prisma/client';
import { getSignedDownloadUrl } from '@/lib/storage/upload';
import { serverEnv } from '@/lib/env';
import { assessModalityQuality, qualityGradeLabel } from './image-quality-service';
import { getImagingAnalysisMode, hasValidatedImagingProvider, IMAGING_SAFETY_DISCLAIMER, NO_PROVIDER_MESSAGE } from './config';
import { manualReviewProvider } from './manual-review-provider';
import { externalValidatedProvider } from './external-validated-provider';
import { developmentMockProvider } from './development-mock-provider';
import { descriptiveAiProvider } from './descriptive-ai-provider';
import type { ImagingProvider } from './imaging-provider-interface';
import { logImagingAudit } from './audit-service';
import type { StructuredImagingReview, PossibleFinding, CorrelationFactors, ImageTypeTemplate } from '../types';
import type { DescriptiveImagingReview } from '../descriptive-schema';

function selectProvider(): ImagingProvider {
  const mode = getImagingAnalysisMode();
  if (mode === 'development-mock') return developmentMockProvider;
  if (mode === 'external' && hasValidatedImagingProvider()) return externalValidatedProvider;
  if (mode === 'descriptive') return descriptiveAiProvider;
  return manualReviewProvider;
}

function buildPatientContext(patient: {
  dateOfBirth: Date;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasGlaucomaPersonal: boolean;
  hasGlaucomaFamily: boolean;
  isSmoker: boolean;
}): string {
  const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 86400000));
  const conditions: string[] = [];
  if (patient.hasDiabetes) conditions.push('diabetes documented');
  if (patient.hasHypertension) conditions.push('hypertension documented');
  if (patient.hasGlaucomaPersonal) conditions.push('personal glaucoma history');
  if (patient.hasGlaucomaFamily) conditions.push('family glaucoma history');
  if (patient.isSmoker) conditions.push('smoking history');
  return `Age ${age}. ${conditions.length ? conditions.join('; ') : 'No documented systemic risk flags in chart.'}`;
}

function buildChartCorrelation(patient: {
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasGlaucomaPersonal: boolean;
  hasGlaucomaFamily: boolean;
  isSmoker: boolean;
  dateOfBirth: Date;
}): CorrelationFactors {
  const supporting: string[] = [];
  const reducing: string[] = [];
  const missing: string[] = ['IOP history not included in imaging review context'];

  if (patient.hasDiabetes) supporting.push('Diabetes documented, may increase relevance of retinal review');
  if (patient.hasHypertension) supporting.push('Hypertension documented, vascular correlation may apply');
  if (patient.hasGlaucomaPersonal) supporting.push('Personal glaucoma history, correlate with disc/OCT/VF if available');
  if (patient.hasGlaucomaFamily) supporting.push('Family glaucoma history documented');
  if (patient.isSmoker) supporting.push('Smoking history documented');

  const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 86400000));
  if (age < 40 && !patient.hasDiabetes) reducing.push('Younger age with no documented diabetes');

  missing.push('Symptoms and exam findings not inferred from imaging alone');
  if (patient.hasDiabetes) missing.push('Most recent HbA1c not available in imaging context');

  return { supporting, reducing, missingInformation: missing };
}

/**
 * Full imaging pipeline: quality gate → provider analysis → persist → structured review output.
 */
export async function runImagingOrchestrator(args: {
  imagingCaseId: string;
  organizationId: string;
  userId?: string;
}): Promise<StructuredImagingReview & {
  analysisMode: string;
  isDevelopmentMock: boolean;
  manualReviewOnly: boolean;
  analysisStatusLabel: string;
  descriptiveReview?: DescriptiveImagingReview | null;
  analysisId?: string;
}> {
  const ic = await db.imagingCase.findFirst({
    where: { id: args.imagingCaseId, organizationId: args.organizationId },
    include: { patient: true, assets: { where: { isOriginal: true }, take: 1 } },
  });
  if (!ic) throw new Error('Imaging study not found');

  await db.imagingCase.update({
    where: { id: ic.id },
    data: { studyStatus: ImagingStudyStatus.QUALITY_CHECKING },
  });

  await logImagingAudit({
    organizationId: args.organizationId,
    locationId: ic.locationId,
    patientId: ic.patientId,
    imagingCaseId: ic.id,
    userId: args.userId,
    action: ImagingAuditAction.QUALITY_CHECKED,
    details: { phase: 'started' },
  });

  const modality = (ic.confirmedModality ?? ic.imageType) as ImageType;
  const asset = ic.assets[0];
  const qualityResult = assessModalityQuality({
    modality,
    fileSizeBytes: ic.fileSizeBytes,
    mimeType: ic.mimeType,
    pageCount: asset?.pageCount,
  });

  await db.imageQualityAssessment.create({
    data: {
      imagingCaseId: ic.id,
      imagingAssetId: asset?.id,
      grade: qualityResult.grade,
      overallScore: qualityResult.overallScore,
      focusScore: qualityResult.focusScore,
      illuminationScore: qualityResult.illuminationScore,
      contrastScore: qualityResult.contrastScore,
      fieldOfViewScore: qualityResult.fieldOfViewScore,
      centeringScore: qualityResult.centeringScore,
      artifactScore: qualityResult.artifactScore,
      qualityLimitations: qualityResult.qualityLimitations,
      retakeRecommended: qualityResult.retakeRecommended,
    },
  });

  const qualityForUi = {
    classification: qualityGradeLabel(qualityResult.grade),
    gradable: qualityResult.gradable,
    score: qualityResult.overallScore,
    descriptiveAnalysisAllowed: qualityResult.gradable,
    focus: qualityResult.focusScore >= 70 ? 'sharp' as const : qualityResult.focusScore >= 45 ? 'acceptable' as const : 'poor' as const,
    brightness: qualityResult.illuminationScore >= 60 ? 'optimal' as const : 'dark' as const,
    contrast: qualityResult.contrastScore >= 70 ? 'good' as const : qualityResult.contrastScore >= 45 ? 'fair' as const : 'low' as const,
    centeredAnatomy: qualityResult.centeringScore >= 50,
    fieldOfView: qualityResult.fieldOfViewScore >= 65 ? 'full' as const : qualityResult.fieldOfViewScore >= 40 ? 'partial' as const : 'limited' as const,
    artifacts: qualityResult.qualityLimitations.filter((l) => l.toLowerCase().includes('artifact') || l.toLowerCase().includes('glare')),
    limitingFactors: qualityResult.qualityLimitations,
    retakeRecommended: qualityResult.retakeRecommended,
    recommendation: qualityResult.retakeRecommended
      ? qualityResult.grade === QualityGrade.NOT_GRADABLE
        ? 'retake-required' as const
        : 'retake-recommended' as const
      : qualityResult.grade === QualityGrade.GRADABLE_WITH_LIMITATIONS
        ? 'proceed-with-limitations' as const
        : 'proceed' as const,
  };

  const mode = getImagingAnalysisMode();
  const provider = selectProvider();
  const manualReviewOnly = mode === 'manual';

  if (!qualityResult.gradable) {
    await db.imagingCase.update({
      where: { id: ic.id },
      data: {
        studyStatus: ImagingStudyStatus.NOT_GRADABLE,
        status: 'AWAITING_AI',
        aiNotes: [
          `Quality: ${qualityGradeLabel(qualityResult.grade)} (${qualityResult.overallScore}/100)`,
          'Automated clinical analysis stopped, image not gradable.',
          ...qualityResult.qualityLimitations,
        ],
        analysisMode: mode,
      },
    });

    await db.imagingAnalysis.create({
      data: {
        imagingCaseId: ic.id,
        analysisProvider: provider.name,
        analysisStatus: ImagingAnalysisStatus.SKIPPED_NOT_GRADABLE,
        requiresManualReview: true,
        failureReason: 'Image quality not gradable',
      },
    });

    await logImagingAudit({
      organizationId: args.organizationId,
      imagingCaseId: ic.id,
      userId: args.userId,
      action: ImagingAuditAction.MANUAL_REVIEW_ONLY,
      details: { reason: 'not_gradable' },
    });

    return {
      quality: qualityForUi,
      typeSpecific: { type: 'OTHER', template: null } as ImageTypeTemplate,
      possibleFindings: [],
      correlation: buildChartCorrelation(ic.patient),
      timelineComparisons: [],
      overallUrgency: 'routine',
      overallConfidence: 'low',
      safetyDisclaimer: IMAGING_SAFETY_DISCLAIMER,
      analysisMode: mode,
      isDevelopmentMock: false,
      manualReviewOnly: true,
      analysisStatusLabel: 'Not Gradable',
      descriptiveReview: null,
    };
  }

  const correlation = buildChartCorrelation(ic.patient);

  await db.imagingCase.update({
    where: { id: ic.id },
    data: { studyStatus: ImagingStudyStatus.ANALYZING },
  });

  let signedUrl: string | null = null;
  if (ic.storagePath && ic.storagePath !== 'pending' && ic.mimeType?.startsWith('image/')) {
    try {
      signedUrl = await getSignedDownloadUrl(serverEnv.storageBucketImaging, ic.storagePath, 600);
    } catch {
      signedUrl = null;
    }
  }

  const analysisRecord = await db.imagingAnalysis.create({
    data: {
      imagingCaseId: ic.id,
      analysisProvider: provider.name,
      analysisStatus: ImagingAnalysisStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  const providerOutput = await provider.analyze({
    storagePath: ic.storagePath,
    signedImageUrl: signedUrl,
    modality,
    laterality: ic.laterality,
    patientContext: buildPatientContext(ic.patient),
    organizationId: args.organizationId,
  });

  const findings: PossibleFinding[] = providerOutput.possibleFindings.map((f, i) => ({
    id: f.findingCode ?? `finding-${i}`,
    finding: f.findingLabel,
    evidence: f.evidenceDescription ? [f.evidenceDescription] : f.limitations,
    confidence: f.confidenceCategory === 'high' ? 'moderate' : f.confidenceCategory === 'moderate' ? 'moderate' : 'low',
    severity: 'mild',
    nextStep: f.actionCategory ?? 'Provider review recommended',
    providerActionNeeded: true,
  }));

  const analysisStatus =
    providerOutput.analysisStatus === 'complete'
      ? ImagingAnalysisStatus.COMPLETE
      : providerOutput.analysisStatus === 'failed'
        ? ImagingAnalysisStatus.FAILED
        : ImagingAnalysisStatus.SKIPPED_MANUAL;

  await db.imagingAnalysis.update({
    where: { id: analysisRecord.id },
    data: {
      analysisStatus,
      modelName: providerOutput.modelName,
      modelVersion: providerOutput.modelVersion,
      supportedIntendedUse: providerOutput.intendedUse,
      completedAt: providerOutput.analysisStatus !== 'failed' ? new Date() : undefined,
      failedAt: providerOutput.analysisStatus === 'failed' ? new Date() : undefined,
      failureReason: providerOutput.failureReason,
      processingTimeMs: providerOutput.processingTimeMs,
      outOfDistribution: providerOutput.outOfDistribution,
      requiresManualReview: providerOutput.requiresManualReview,
      isDevelopmentMock: providerOutput.isDevelopmentMock,
      rawProviderResponse: (providerOutput.rawProviderResponse ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  for (const f of providerOutput.possibleFindings) {
    await db.imagingFinding.create({
      data: {
        imagingAnalysisId: analysisRecord.id,
        findingCode: f.findingCode,
        findingLabel: f.findingLabel,
        anatomicalLocation: f.anatomicalLocation,
        laterality: f.laterality as ImagingLaterality | undefined,
        evidenceDescription: f.evidenceDescription,
        confidenceCategory: f.confidenceCategory,
        probability: f.probability,
        severityCategory: f.severityCategory,
        actionCategory: f.actionCategory,
        limitations: f.limitations,
        supportedByModel: f.supportedByModel,
      },
    });
  }

  const aiNotes: string[] = [
    `Quality: ${qualityGradeLabel(qualityResult.grade)} (${qualityResult.overallScore}/100)`,
    `Analysis mode: ${mode}`,
  ];

  let descriptiveReview: DescriptiveImagingReview | null = null;
  if (providerOutput.rawProviderResponse && mode === 'descriptive') {
    descriptiveReview = providerOutput.rawProviderResponse as unknown as DescriptiveImagingReview;
    if (descriptiveReview?.aiNotesForProvider?.conciseSummary) {
      aiNotes.push(descriptiveReview.aiNotesForProvider.conciseSummary);
    }
  }

  if (providerOutput.isDevelopmentMock) {
    aiNotes.push('⚠ Development Mock Analysis, not clinically validated');
  } else if (providerOutput.analysisStatus === 'failed') {
    aiNotes.push(`Analysis failed: ${providerOutput.failureReason ?? 'unknown error'}`);
    aiNotes.push('Routed to manual provider review, no automated findings generated.');
  } else if (providerOutput.analysisStatus === 'skipped' && mode === 'manual') {
    aiNotes.push(NO_PROVIDER_MESSAGE);
  } else if (providerOutput.analysisStatus === 'complete') {
    aiNotes.push(...findings.map((f) => `${f.finding} [${f.confidence}]`));
  }

  const studyStatus =
    providerOutput.analysisStatus === 'failed'
      ? ImagingStudyStatus.ANALYSIS_FAILED
      : findings.length > 0
        ? ImagingStudyStatus.AWAITING_PROVIDER_REVIEW
        : ImagingStudyStatus.AWAITING_PROVIDER_REVIEW;

  await db.imagingCase.update({
    where: { id: ic.id },
    data: {
      studyStatus,
      status: findings.length > 0 && providerOutput.analysisStatus === 'complete' ? 'AI_REVIEWED' : 'AWAITING_AI',
      aiQuality: qualityResult.overallScore >= 60 ? 'good' : qualityResult.overallScore >= 35 ? 'fair' : 'poor',
      aiFlags: findings.map((f) => f.finding),
      aiUrgency: providerOutput.reviewPriority,
      aiConfidence: findings.length ? 'moderate' : 'low',
      aiNotes,
      aiInvokedAt: new Date(),
      aiProvider: providerOutput.modelName,
      analysisMode: mode,
      confirmedModality: modality,
    },
  });

  await logImagingAudit({
    organizationId: args.organizationId,
    imagingCaseId: ic.id,
    userId: args.userId,
    action:
      providerOutput.analysisStatus === 'failed'
        ? ImagingAuditAction.ANALYSIS_FAILED
        : ImagingAuditAction.ANALYSIS_COMPLETED,
    details: { mode, findingCount: findings.length },
  });

  const priorCases = await db.imagingCase.findMany({
    where: {
      patientId: ic.patientId,
      organizationId: args.organizationId,
      imageType: ic.imageType,
      id: { not: ic.id },
      archivedAt: null,
    },
    orderBy: { capturedAt: 'desc' },
    take: 2,
  });

  const timelineComparisons =
    priorCases.length === 0
      ? [{
          priorDate: null,
          priorFinding: 'No prior imaging of this modality on file.',
          currentFinding: 'Current study, baseline for comparison.',
          trend: 'inconclusive' as const,
          reason: 'First comparable study. No longitudinal comparison is available.',
        }]
      : priorCases.map((p) => ({
          priorDate: p.capturedAt.toISOString().slice(0, 10),
          priorFinding: p.providerNote ?? (p.aiNotes[0] ?? 'Prior study on file'),
          currentFinding: 'Current study available for side-by-side review',
          trend: 'inconclusive' as const,
          reason: 'Automated trend comparison inconclusive, provider confirmation required.',
        }));

  const analysisStatusLabel =
    providerOutput.analysisStatus === 'failed'
      ? 'Analysis Failed'
      : providerOutput.analysisStatus === 'complete'
        ? mode === 'descriptive'
          ? 'Descriptive AI Review Complete'
          : 'Validated Clinical Review Complete'
        : providerOutput.analysisStatus === 'skipped' && mode === 'manual'
          ? 'Manual Review Only'
          : 'Awaiting Analysis';

  return {
    quality: qualityForUi,
    typeSpecific: { type: 'OTHER', template: null } as ImageTypeTemplate,
    possibleFindings: providerOutput.analysisStatus === 'complete' ? findings : [],
    correlation,
    timelineComparisons,
    overallUrgency: providerOutput.reviewPriority,
    overallConfidence: findings.length ? 'moderate' : 'low',
    safetyDisclaimer: IMAGING_SAFETY_DISCLAIMER,
    analysisMode: mode,
    isDevelopmentMock: providerOutput.isDevelopmentMock,
    manualReviewOnly: mode === 'manual' || (providerOutput.analysisStatus !== 'complete' && !providerOutput.isDevelopmentMock),
    analysisStatusLabel,
    descriptiveReview,
    analysisId: analysisRecord.id,
  };
}
