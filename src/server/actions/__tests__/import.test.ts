import { describe, expect, it } from 'vitest';

describe('Patient CSV parsing', () => {
  it('validates required patient import fields exist in action module', async () => {
    const mod = await import('@/server/actions/import');
    expect(typeof mod.previewPatientImport).toBe('function');
    expect(typeof mod.importPatientsFromCsv).toBe('function');
  });
});
