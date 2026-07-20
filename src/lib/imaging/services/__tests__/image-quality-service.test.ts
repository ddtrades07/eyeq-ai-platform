import { describe, expect, it } from 'vitest';
import { QualityGrade } from '@prisma/client';
import { assessModalityQuality, qualityGradeLabel } from '../image-quality-service';

describe('assessModalityQuality', () => {
  it('marks tiny non-image files as not gradable', () => {
    const r = assessModalityQuality({
      modality: 'FUNDUS',
      fileSizeBytes: 5000,
      mimeType: 'text/plain',
    });
    expect(r.gradable).toBe(false);
    expect(r.grade).toBe(QualityGrade.NOT_GRADABLE);
  });

  it('allows typical fundus JPEG through quality gate', () => {
    const r = assessModalityQuality({
      modality: 'FUNDUS',
      fileSizeBytes: 800_000,
      mimeType: 'image/jpeg',
    });
    expect(r.gradable).toBe(true);
    expect(r.overallScore).toBeGreaterThanOrEqual(35);
  });

  it('does not assign not-gradable to valid OCT PDF without dropping below threshold alone', () => {
    const r = assessModalityQuality({
      modality: 'OCT',
      fileSizeBytes: 400_000,
      mimeType: 'application/pdf',
    });
    expect(r.qualityLimitations.some((l) => l.includes('PDF'))).toBe(true);
  });
});

describe('qualityGradeLabel', () => {
  it('returns human labels', () => {
    expect(qualityGradeLabel(QualityGrade.NOT_GRADABLE)).toBe('Not Gradable');
  });
});
