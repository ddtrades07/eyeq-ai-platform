import type { ImageQualityAssessment } from './types';

/**
 * Evaluates image quality before clinical review.
 *
 * Today: deterministic mock based on image metadata.
 * Future: real model evaluating pixel data, sharpness, exposure, etc.
 *
 * If quality is poor, the review pipeline suppresses clinical findings
 * and recommends retake first.
 */
export function assessImageQuality(args: {
  imageType: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
}): ImageQualityAssessment {
  const { imageType, fileSizeBytes, mimeType } = args;
  const artifacts: string[] = [];
  const limitingFactors: string[] = [];
  let score = 82;

  // Size heuristics, very small files are likely low-res
  if (fileSizeBytes && fileSizeBytes < 50_000) {
    score -= 25;
    limitingFactors.push('File size very small, possible low resolution');
    artifacts.push('Low resolution');
  } else if (fileSizeBytes && fileSizeBytes < 200_000) {
    score -= 10;
    limitingFactors.push('File size below typical clinical quality');
  }

  if (mimeType && !mimeType.startsWith('image/')) {
    score -= 30;
    limitingFactors.push('Non-image file type, unable to assess visual quality');
  }

  // Type-specific expectations
  if (imageType === 'OCT') {
    score += 3; // OCT machines produce consistent scans
  } else if (imageType === 'EXTERNAL_PHOTO') {
    score -= 5; // Higher variability in external photos
    limitingFactors.push('External photos have higher variability in centering and lighting');
  }

  score = Math.max(0, Math.min(100, score));
  const gradable = score >= 40;

  return {
    gradable,
    score,
    focus: score >= 75 ? 'sharp' : score >= 55 ? 'acceptable' : score >= 35 ? 'soft' : 'poor',
    brightness: score >= 60 ? 'optimal' : 'dark',
    contrast: score >= 70 ? 'good' : score >= 45 ? 'fair' : 'low',
    centeredAnatomy: score >= 50,
    fieldOfView: score >= 65 ? 'full' : score >= 40 ? 'partial' : 'limited',
    artifacts,
    limitingFactors,
    recommendation: score >= 60 ? 'proceed' : score >= 35 ? 'retake-recommended' : 'retake-required',
  };
}
