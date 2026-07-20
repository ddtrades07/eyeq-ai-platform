import 'server-only';
import type { PhiRiskLevel } from '@prisma/client';
import type { PHIScanResult } from './types';
import { serverEnv } from '@/lib/env';

const PHI_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'ssn_compact', pattern: /\b\d{9}\b/g },
  { type: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'mrn', pattern: /\b(?:MRN|mrn|medical record)[#:\s]*[A-Z0-9-]{4,}\b/gi },
  { type: 'insurance_id', pattern: /\b(?:member|policy|subscriber)[#:\s]*[A-Z0-9-]{6,}\b/gi },
  { type: 'dob', pattern: /\b(?:DOB|date of birth)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi },
  { type: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: 'url_with_query', pattern: /https?:\/\/[^\s]+\?[^\s]+/gi },
];

export type KnownPatientIdentifiers = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  mrn?: string;
  phone?: string;
  email?: string;
};

/**
 * Mandatory PHI Safety Gate. Cannot be bypassed.
 * Layered: known patient matching → regex patterns → (future NER/classifier).
 */
export function scanForPhi(
  text: string,
  knownPatient?: KnownPatientIdentifiers,
): PHIScanResult {
  const detections: PHIScanResult['detections'] = [];
  let workingText = text;
  let highestRisk: PhiRiskLevel = 'SAFE';

  if (knownPatient) {
    const nameHits = matchKnownPatient(text, knownPatient);
    if (nameHits > 0) {
      detections.push({ fieldType: 'patient_name', method: 'known_patient_match', count: nameHits });
      highestRisk = escalateRisk(highestRisk, 'CONFIRMED_PHI');
    }
    if (knownPatient.mrn && text.toLowerCase().includes(knownPatient.mrn.toLowerCase())) {
      detections.push({ fieldType: 'mrn', method: 'known_patient_match', count: 1 });
      highestRisk = escalateRisk(highestRisk, 'CONFIRMED_PHI');
    }
  }

  for (const { type, pattern } of PHI_PATTERNS) {
    const matches = text.match(pattern);
    if (matches?.length) {
      detections.push({ fieldType: type, method: 'regex', count: matches.length });
      highestRisk = escalateRisk(highestRisk, type === 'ssn' || type === 'ssn_compact' ? 'CONFIRMED_PHI' : 'POSSIBLE_PHI');
      workingText = workingText.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }
  }

  const baaActive = serverEnv.aiBaaConfirmed;
  const allowPhi = serverEnv.aiAllowPhi && baaActive;
  const hipaaMode = serverEnv.aiHipaaMode;

  let blocked = false;
  let userMessage: string | undefined;

  if (highestRisk === 'CONFIRMED_PHI' && !allowPhi) {
    blocked = true;
    userMessage =
      'This request contains protected health information and cannot be sent until an approved AI vendor and BAA are configured.';
    highestRisk = 'BLOCKED';
  } else if (highestRisk === 'POSSIBLE_PHI' && hipaaMode) {
    userMessage = 'EyeQ detected sensitive information and removed it before sending this request.';
  }

  return {
    riskLevel: highestRisk,
    detections,
    redactedText: workingText !== text ? workingText : undefined,
    blocked,
    userMessage,
  };
}

function matchKnownPatient(text: string, patient: KnownPatientIdentifiers): number {
  let hits = 0;
  const lower = text.toLowerCase();
  if (patient.firstName && patient.firstName.length > 2 && lower.includes(patient.firstName.toLowerCase())) hits++;
  if (patient.lastName && patient.lastName.length > 2 && lower.includes(patient.lastName.toLowerCase())) hits++;
  if (patient.firstName && patient.lastName) {
    const full = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    if (lower.includes(full)) hits++;
  }
  return hits;
}

function escalateRisk(current: PhiRiskLevel, next: PhiRiskLevel): PhiRiskLevel {
  const order: PhiRiskLevel[] = ['SAFE', 'POSSIBLE_PHI', 'CONFIRMED_PHI', 'RESTRICTED', 'BLOCKED'];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

export function redactForLogging(text: string): string {
  return scanForPhi(text).redactedText ?? text;
}
