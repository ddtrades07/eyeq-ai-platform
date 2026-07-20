export type ClaimValidationSeverity = 'error' | 'warning' | 'info';

export type ClaimValidationIssue = {
  code: string;
  message: string;
  severity: ClaimValidationSeverity;
  field?: string;
};

export type ClaimValidationInput = {
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    insuranceCarrier?: string | null;
    insuranceMemberId?: string | null;
  };
  claim: {
    payerName?: string | null;
    memberId?: string | null;
    totalCents: number;
    lines: {
      cptCode: string;
      chargeCents: number;
      units: number;
      diagnosisCodes: string[];
    }[];
  };
  organization: {
    name: string;
  };
  renderingProviderNpi?: string | null;
};

const CPT_PATTERN = /^\d{5}$/;

/** Deterministic claim validation without AI or external vendors. */
export function validateClaimInput(input: ClaimValidationInput): ClaimValidationIssue[] {
  const issues: ClaimValidationIssue[] = [];

  if (!input.patient.firstName?.trim() || !input.patient.lastName?.trim()) {
    issues.push({
      code: 'PATIENT_NAME',
      message: 'Patient legal name is required for claim submission.',
      severity: 'error',
      field: 'patient',
    });
  }

  if (!input.patient.dateOfBirth) {
    issues.push({
      code: 'PATIENT_DOB',
      message: 'Patient date of birth is required.',
      severity: 'error',
      field: 'patient.dateOfBirth',
    });
  }

  const payer = input.claim.payerName?.trim() || input.patient.insuranceCarrier?.trim();
  if (!payer) {
    issues.push({
      code: 'PAYER_MISSING',
      message: 'Payer name is required. Add insurance on the patient or claim.',
      severity: 'error',
      field: 'payerName',
    });
  }

  const memberId = input.claim.memberId?.trim() || input.patient.insuranceMemberId?.trim();
  if (!memberId) {
    issues.push({
      code: 'MEMBER_ID_MISSING',
      message: 'Insurance member ID is required.',
      severity: 'error',
      field: 'memberId',
    });
  }

  if (!input.renderingProviderNpi?.trim()) {
    issues.push({
      code: 'PROVIDER_NPI',
      message: 'Rendering provider NPI is required. Add NPI on the provider profile.',
      severity: 'error',
      field: 'providerNpi',
    });
  } else if (!/^\d{10}$/.test(input.renderingProviderNpi.replace(/\D/g, ''))) {
    issues.push({
      code: 'PROVIDER_NPI_FORMAT',
      message: 'Rendering provider NPI must be 10 digits.',
      severity: 'error',
      field: 'providerNpi',
    });
  }

  if (input.claim.lines.length === 0) {
    issues.push({
      code: 'NO_LINES',
      message: 'At least one charge line is required.',
      severity: 'error',
      field: 'lines',
    });
  }

  input.claim.lines.forEach((line, index) => {
    if (!CPT_PATTERN.test(line.cptCode.trim())) {
      issues.push({
        code: 'CPT_INVALID',
        message: `Line ${index + 1}: CPT code must be 5 digits.`,
        severity: 'error',
        field: `lines[${index}].cptCode`,
      });
    }
    if (line.chargeCents <= 0) {
      issues.push({
        code: 'CHARGE_INVALID',
        message: `Line ${index + 1}: charge amount must be greater than zero.`,
        severity: 'error',
        field: `lines[${index}].chargeCents`,
      });
    }
    if (line.units < 1) {
      issues.push({
        code: 'UNITS_INVALID',
        message: `Line ${index + 1}: units must be at least 1.`,
        severity: 'error',
        field: `lines[${index}].units`,
      });
    }
    if (line.diagnosisCodes.length === 0) {
      issues.push({
        code: 'DX_MISSING',
        message: `Line ${index + 1}: at least one diagnosis code pointer is required.`,
        severity: 'warning',
        field: `lines[${index}].diagnosisCodes`,
      });
    }
    for (const dx of line.diagnosisCodes) {
      if (!/^[A-Z]\d{2}(\.\d{1,4})?$/i.test(dx.trim())) {
        issues.push({
          code: 'DX_FORMAT',
          message: `Line ${index + 1}: diagnosis "${dx}" may not be valid ICD-10.`,
          severity: 'warning',
          field: `lines[${index}].diagnosisCodes`,
        });
      }
    }
  });

  if (input.claim.totalCents <= 0) {
    issues.push({
      code: 'TOTAL_INVALID',
      message: 'Claim total must be greater than zero.',
      severity: 'error',
      field: 'totalCents',
    });
  }

  if (!input.organization.name?.trim()) {
    issues.push({
      code: 'ORG_NAME',
      message: 'Practice legal name is required on the organization profile.',
      severity: 'warning',
      field: 'organization',
    });
  }

  return issues;
}

export function hasBlockingClaimErrors(issues: ClaimValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
