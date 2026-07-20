import { describe, expect, it } from 'vitest';
import {
  buildSurvivingPatch,
  computeMergeFieldConflicts,
} from '@/lib/patients/merge';

describe('patient merge helpers', () => {
  const surviving = {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-15'),
    email: 'jane@example.com',
    phone: '5551112222',
  };

  const merged = {
    firstName: 'Janet',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-15'),
    email: 'jane.doe@example.com',
    phone: '5551112222',
  };

  it('detects field conflicts', () => {
    const conflicts = computeMergeFieldConflicts(surviving, merged);
    expect(conflicts.find((c) => c.field === 'firstName')?.conflict).toBe(true);
    expect(conflicts.find((c) => c.field === 'phone')?.conflict).toBe(false);
  });

  it('builds patch from merged selections', () => {
    const patch = buildSurvivingPatch(merged, { firstName: 'merged', email: 'merged' });
    expect(patch.firstName).toBe('Janet');
    expect(patch.email).toBe('jane.doe@example.com');
  });
});
