import 'server-only';
import { validateAIOutput } from './response-validator';

export function validateClinicalSafety(args: {
  output: string;
  requestType: string;
  providerReviewRequired: boolean;
}): { approved: boolean; flags: string[]; limitations?: string } {
  const { valid, safetyFlags } = validateAIOutput(args.output);
  const flags = [...safetyFlags];

  if (!args.providerReviewRequired) {
    flags.push('missing_provider_review_flag');
  }

  const clinicalTypes = new Set([
    'CHART_SUMMARY', 'SCRIBE_NOTE_GENERATION', 'IMAGING_ANALYSIS',
    'PATIENT_INSTRUCTIONS', 'REFERRAL_DRAFT',
  ]);

  let limitations: string | undefined;
  if (clinicalTypes.has(args.requestType)) {
    limitations = 'Clinical documentation draft. Provider review required before chart action.';
  }

  return {
    approved: valid && args.providerReviewRequired,
    flags,
    limitations,
  };
}
