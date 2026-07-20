import { describe, expect, it } from 'vitest';
import { scanForPhi } from '@/lib/ai-gateway/phi-safety-gate';

describe('PHI Safety Gate', () => {
  it('detects SSN patterns', () => {
    const result = scanForPhi('Patient SSN is 123-45-6789');
    expect(result.riskLevel).not.toBe('SAFE');
    expect(result.redactedText).toContain('[REDACTED_SSN]');
  });

  it('detects email addresses', () => {
    const result = scanForPhi('Contact test@example.com');
    expect(result.detections.some((d) => d.fieldType === 'email')).toBe(true);
  });

  it('matches known patient names', () => {
    const result = scanForPhi('Summarize John Smith chart', {
      firstName: 'John',
      lastName: 'Smith',
    });
    expect(result.detections.some((d) => d.fieldType === 'patient_name')).toBe(true);
  });

  it('blocks confirmed PHI when BAA not active', () => {
    const result = scanForPhi('SSN 123-45-6789');
    expect(result.blocked).toBe(true);
  });
});
