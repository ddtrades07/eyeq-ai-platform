import 'server-only';
import { QualityGrade } from '@prisma/client';
import { IMAGING_SAFETY_DISCLAIMER } from './services/config';
import { qualityGradeLabel } from './services/image-quality-service';
import type { StructuredImagingReview, PossibleFinding } from './types';
import type { DescriptiveImagingReview } from './descriptive-schema';

type CaseWithRelations = {
  analysisMode: string | null;
  aiUrgency: string | null;
  qualityAssessments: Array<{
    grade: import('@prisma/client').QualityGrade;
    overallScore: number;
    focusScore: number | null;
    illuminationScore: number | null;
    contrastScore: number | null;
    fieldOfViewScore: number | null;
    centeringScore: number | null;
    qualityLimitations: string[];
    retakeRecommended: boolean;
  }>;
  analyses: Array<{
    id: string;
    analysisStatus: import('@prisma/client').ImagingAnalysisStatus;
    isDevelopmentMock: boolean;
    rawProviderResponse: unknown;
    findings: Array<{
      findingCode: string | null;
      findingLabel: string;
      evidenceDescription: string | null;
      confidenceCategory: string;
      limitations: string[];
      actionCategory: string | null;
    }>;
  }>;
  patient: {
    hasDiabetes: boolean;
    hasHypertension: boolean;
    hasGlaucomaPersonal: boolean;
    hasGlaucomaFamily: boolean;
  };
};

export function buildStructuredReviewFromDb(
  ic: CaseWithRelations,
): StructuredImagingReview | null {
  const q = ic.qualityAssessments[0];
  const analysis = ic.analyses[0];
  if (!q && !analysis) return null;

  const grade = q?.grade ?? QualityGrade.GRADABLE;
  const classification = q ? qualityGradeLabel(grade) : 'Unknown';

  const quality = {
    classification,
    gradable: grade !== QualityGrade.NOT_GRADABLE,
    score: q?.overallScore ?? 0,
    descriptiveAnalysisAllowed: grade !== QualityGrade.NOT_GRADABLE,
    retakeRecommended: q?.retakeRecommended ?? false,
    focus: (q?.focusScore ?? 0) >= 70 ? 'sharp' as const : (q?.focusScore ?? 0) >= 45 ? 'acceptable' as const : 'poor' as const,
    brightness: (q?.illuminationScore ?? 0) >= 60 ? 'optimal' as const : 'dark' as const,
    contrast: (q?.contrastScore ?? 0) >= 70 ? 'good' as const : (q?.contrastScore ?? 0) >= 45 ? 'fair' as const : 'low' as const,
    centeredAnatomy: (q?.centeringScore ?? 0) >= 50,
    fieldOfView: (q?.fieldOfViewScore ?? 0) >= 65 ? 'full' as const : (q?.fieldOfViewScore ?? 0) >= 40 ? 'partial' as const : 'limited' as const,
    artifacts: [],
    limitingFactors: q?.qualityLimitations ?? [],
    recommendation:
      grade === QualityGrade.NOT_GRADABLE
        ? 'retake-required' as const
        : grade === QualityGrade.GRADABLE_WITH_LIMITATIONS
          ? 'proceed-with-limitations' as const
          : 'proceed' as const,
  };

  let descriptiveReview: DescriptiveImagingReview | null = null;
  if (analysis?.rawProviderResponse && typeof analysis.rawProviderResponse === 'object') {
    descriptiveReview = analysis.rawProviderResponse as unknown as DescriptiveImagingReview;
  }

  const possibleFindings: PossibleFinding[] =
    analysis?.findings.map((f, i) => ({
      id: f.findingCode ?? `f-${i}`,
      finding: f.findingLabel,
      evidence: f.evidenceDescription ? [f.evidenceDescription] : f.limitations,
      confidence: f.confidenceCategory === 'high' ? 'moderate' : f.confidenceCategory === 'moderate' ? 'moderate' : 'low',
      severity: 'mild',
      nextStep: f.actionCategory ?? 'Provider review recommended',
      providerActionNeeded: true,
    })) ?? [];

  const supporting: string[] = [];
  const reducing: string[] = [];
  const missing: string[] = ['Symptoms and exam findings not inferred from imaging alone'];
  if (ic.patient.hasDiabetes) supporting.push('Diabetes documented in chart');
  if (ic.patient.hasHypertension) supporting.push('Hypertension documented in chart');
  if (ic.patient.hasGlaucomaPersonal) supporting.push('Personal glaucoma history documented');

  const mode = ic.analysisMode ?? 'manual';
  const analysisComplete = analysis?.analysisStatus === 'COMPLETE';
  const analysisFailed = analysis?.analysisStatus === 'FAILED';

  const analysisStatusLabel =
    analysisFailed
      ? 'Analysis Failed'
      : analysisComplete
        ? mode === 'descriptive'
          ? 'Descriptive AI Review Complete'
          : 'Validated Clinical Review Complete'
        : mode === 'manual'
          ? 'Manual Review Only'
          : grade === QualityGrade.NOT_GRADABLE
            ? 'Not Gradable'
            : 'Awaiting Analysis';

  return {
    quality,
    typeSpecific: { type: 'OTHER', template: null },
    possibleFindings: analysisComplete ? possibleFindings : [],
    correlation: { supporting, reducing, missingInformation: missing },
    timelineComparisons: [],
    overallUrgency: (ic.aiUrgency as StructuredImagingReview['overallUrgency']) ?? 'routine',
    overallConfidence: possibleFindings.length ? 'moderate' : 'low',
    safetyDisclaimer: IMAGING_SAFETY_DISCLAIMER,
    analysisStatusLabel,
    analysisMode: mode,
    manualReviewOnly: mode === 'manual' || (!analysisComplete && !analysis?.isDevelopmentMock),
    isDevelopmentMock: analysis?.isDevelopmentMock ?? false,
    descriptiveReview,
    analysisId: analysis?.id,
  };
}
