import { describe, expect, it } from 'vitest';
import {
  hasBlockingClaimErrors,
  validateClaimInput,
} from '@/lib/billing/claim-validation';

const basePatient = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: new Date('1980-01-15'),
  insuranceCarrier: 'VSP',
  insuranceMemberId: 'MEM123',
};

const baseOrg = { name: 'EyeQ Vision Center' };

describe('claim validation', () => {
  it('passes a well-formed claim', () => {
    const issues = validateClaimInput({
      patient: basePatient,
      organization: baseOrg,
      renderingProviderNpi: '1234567890',
      claim: {
        payerName: 'VSP',
        memberId: 'MEM123',
        totalCents: 15000,
        lines: [
          {
            cptCode: '92014',
            chargeCents: 15000,
            units: 1,
            diagnosisCodes: ['H52.13'],
          },
        ],
      },
    });
    expect(hasBlockingClaimErrors(issues)).toBe(false);
  });

  it('flags missing payer and member id', () => {
    const issues = validateClaimInput({
      patient: { ...basePatient, insuranceCarrier: null, insuranceMemberId: null },
      organization: baseOrg,
      renderingProviderNpi: '1234567890',
      claim: {
        payerName: null,
        memberId: null,
        totalCents: 10000,
        lines: [
          { cptCode: '92004', chargeCents: 10000, units: 1, diagnosisCodes: [] },
        ],
      },
    });
    expect(issues.some((i) => i.code === 'PAYER_MISSING')).toBe(true);
    expect(issues.some((i) => i.code === 'MEMBER_ID_MISSING')).toBe(true);
    expect(hasBlockingClaimErrors(issues)).toBe(true);
  });

  it('flags invalid CPT codes', () => {
    const issues = validateClaimInput({
      patient: basePatient,
      organization: baseOrg,
      renderingProviderNpi: '1234567890',
      claim: {
        payerName: 'VSP',
        memberId: 'MEM123',
        totalCents: 5000,
        lines: [{ cptCode: 'ABC', chargeCents: 5000, units: 1, diagnosisCodes: ['H52.13'] }],
      },
    });
    expect(issues.some((i) => i.code === 'CPT_INVALID')).toBe(true);
  });
});
