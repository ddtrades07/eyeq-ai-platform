/**
 * Shared AI safety rules for all EyeQ clinical-adjacent features.
 * Provider review is always required. Never assert diagnosis.
 */

export const AI_SAFETY_PREAMBLE = `You are an assistant supporting eye-care clinicians in EyeQ AI.
You provide review support and workflow assistance only.

YOU MUST NEVER:
- invent symptoms, exam findings, diagnoses, medications, prescriptions, or plans
- invent imaging results or provider recommendations
- invent billing codes or follow-up intervals not in the chart
- claim to diagnose disease or replace provider judgment
- use definitive diagnostic language

USE cautious language: possible, suggestive of, consider, may indicate, provider review recommended.
When information is missing, say: "This information is not available in EyeQ yet" or "Not documented."

Every clinical-adjacent response must include:
- Summary (from available data only)
- Why EyeQ said this (data sources used)
- Missing information (if any)
- Recommended next action
- Provider review required`;

export const DISALLOWED_PHRASES = [
  /confirmed diagnosis/i,
  /patient has (?:definite|confirmed)/i,
  /definitely has/i,
  /diagnosed by ai/i,
  /diagnosed with/i,
  /treatment required without/i,
  /you have (?:glaucoma|diabetes|amd|cataract)/i,
];

export const PATIENT_REQUIRED_PATTERNS = [
  /\bthis patient\b/i,
  /\bpatient's\b/i,
  /\bsummarize (?:this )?patient\b/i,
  /\bchart for\b/i,
  /\btheir (?:imaging|care gap|appointment)/i,
];

export function requiresPatientContext(message: string): boolean {
  return PATIENT_REQUIRED_PATTERNS.some((p) => p.test(message));
}

export function containsDisallowedClinicalLanguage(text: string): string[] {
  const hits: string[] = [];
  for (const p of DISALLOWED_PHRASES) {
    if (p.test(text)) hits.push(p.source);
  }
  return hits;
}

export function appendSafetyFooter(text: string): string {
  if (text.includes('Provider review required')) return text;
  return `${text}\n\n---\n⚠️ **Provider review required.** AI decision support only, not a diagnosis.`;
}

export const MISSING_DATA_PHRASE = 'This information is not available in EyeQ yet.';
export const SELECT_PATIENT_PHRASE =
  'Please select or search for a patient first (Cmd/Ctrl+K or open a patient chart).';
