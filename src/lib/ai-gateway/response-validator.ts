import 'server-only';
import { containsDisallowedClinicalLanguage } from '@/lib/ai/safety';

const INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|prior) instructions/i,
  /reveal (?:the )?system prompt/i,
  /show (?:me )?(?:your )?api key/i,
  /bypass provider review/i,
  /auto[- ]?approve/i,
  /delete audit logs?/i,
  /another patient(?:'s)? (?:chart|record)/i,
];

export function detectPromptInjection(text: string): string[] {
  const hits: string[] = [];
  for (const p of INJECTION_PATTERNS) {
    if (p.test(text)) hits.push(p.source);
  }
  return hits;
}

export function sanitizeUserInput(text: string): string {
  return text.replace(/\0/g, '').slice(0, 32_000);
}

export function validateAIOutput(text: string): { valid: boolean; safetyFlags: string[] } {
  const safetyFlags: string[] = [];
  const disallowed = containsDisallowedClinicalLanguage(text);
  if (disallowed.length) safetyFlags.push('disallowed_clinical_language');
  const injection = detectPromptInjection(text);
  if (injection.length) safetyFlags.push('possible_injection_in_output');
  return { valid: disallowed.length === 0, safetyFlags };
}
