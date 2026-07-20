import { describe, expect, it } from 'vitest';
import { EXAM_SECTIONS } from '@/lib/exam/sections';

describe('Exam section catalog', () => {
  it('defines 47 optometry exam sections', () => {
    expect(EXAM_SECTIONS).toHaveLength(47);
  });

  it('has unique section keys', () => {
    const keys = EXAM_SECTIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
