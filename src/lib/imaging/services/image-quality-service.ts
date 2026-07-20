import type { ImageType } from '@prisma/client';
import { QualityGrade } from '@prisma/client';
import type { QualityAssessmentResult } from './imaging-provider-interface';

/**
 * Modality-specific quality gate. Runs before any clinical analysis.
 * Uses metadata heuristics until pixel-level models are integrated.
 */
export function assessModalityQuality(args: {
  modality: ImageType;
  fileSizeBytes: number | null;
  mimeType: string | null;
  pageCount?: number | null;
}): QualityAssessmentResult {
  const { modality, fileSizeBytes, mimeType, pageCount } = args;
  const limitations: string[] = [];
  let overall = 78;
  let focus = 75;
  let illumination = 75;
  let contrast = 75;
  let fov = 70;
  let centering = 72;
  let artifact = 85;

  const isPdf = mimeType === 'application/pdf';
  const isImage = Boolean(mimeType?.startsWith('image/'));

  if (!isImage && !isPdf) {
    limitations.push('Unsupported or unknown file type for automated quality assessment');
    overall -= 40;
    artifact -= 30;
  }

  if (fileSizeBytes && fileSizeBytes < 30_000) {
    limitations.push('File size very small, possible low resolution');
    overall -= 25;
    focus -= 20;
  } else if (fileSizeBytes && fileSizeBytes < 120_000) {
    limitations.push('File size below typical clinical quality');
    overall -= 10;
    focus -= 8;
  }

  switch (modality) {
    case 'FUNDUS':
      if (!isImage) limitations.push('Fundus quality assessment expects an image file');
      fov -= fileSizeBytes && fileSizeBytes < 100_000 ? 15 : 0;
      if (fov < 55) limitations.push('Field of view may be insufficient for disc/macula assessment');
      break;
    case 'OCT':
      if (isPdf) {
        limitations.push('OCT PDF report uploaded, scan signal strength may not be assessable from report alone');
        overall -= 5;
      }
      break;
    case 'VISUAL_FIELD':
      if (isPdf || isImage) {
        limitations.push('Visual field reliability indices require readable report content, provider to verify');
      }
      break;
    case 'SLIT_LAMP':
    case 'EXTERNAL_PHOTO':
      illumination -= 10;
      limitations.push('External/slit-lamp images have higher variability in glare and exposure');
      break;
    case 'TOPOGRAPHY':
      if (pageCount && pageCount > 1) limitations.push('Multi-page topography report, verify map completeness');
      break;
    case 'OTHER':
    default:
      limitations.push('Modality marked Other/Unknown, automated analysis scope is limited');
      overall -= 15;
      break;
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  overall = clamp(overall);
  focus = clamp(focus);
  illumination = clamp(illumination);
  contrast = clamp(contrast);
  fov = clamp(fov);
  centering = clamp(centering);
  artifact = clamp(artifact);

  let grade: QualityGrade;
  if (overall < 45 || (!isImage && !isPdf)) {
    grade = QualityGrade.NOT_GRADABLE;
  } else if (overall < 70 || limitations.length >= 3) {
    grade = QualityGrade.GRADABLE_WITH_LIMITATIONS;
  } else {
    grade = QualityGrade.GRADABLE;
  }

  const gradable = grade !== QualityGrade.NOT_GRADABLE;
  const retakeRecommended = grade === QualityGrade.NOT_GRADABLE || overall < 50;

  return {
    grade,
    overallScore: overall,
    focusScore: focus,
    illuminationScore: illumination,
    contrastScore: contrast,
    fieldOfViewScore: fov,
    centeringScore: centering,
    artifactScore: artifact,
    qualityLimitations: limitations,
    retakeRecommended,
    gradable,
  };
}

export function qualityGradeLabel(grade: QualityGrade): string {
  switch (grade) {
    case QualityGrade.GRADABLE:
      return 'Gradable';
    case QualityGrade.GRADABLE_WITH_LIMITATIONS:
      return 'Gradable With Limitations';
    case QualityGrade.NOT_GRADABLE:
      return 'Not Gradable';
    default:
      return 'Unknown';
  }
}
