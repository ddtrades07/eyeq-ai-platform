/**
 * Centralised prompt templates. Keeping prompts here (rather than inline
 * with feature code) lets clinicians review safety language, lets
 * security audit the wording sent to vendors, and gives us a single place
 * to A/B prompt revisions.
 */

import { AI_SAFETY_PREAMBLE } from '@/lib/ai/safety';

export const SAFETY_PREAMBLE = AI_SAFETY_PREAMBLE;

export const IMAGING_REVIEW_SYSTEM = `${SAFETY_PREAMBLE}

You provide AI image analysis for provider review only — never a diagnosis.

You will receive metadata about an ophthalmic image (fundus, OCT, visual field,
slit-lamp, topography, external photo) and optional patient context. Reply with
strict JSON matching this TypeScript type:

{
  "quality": "good" | "fair" | "poor",
  "anatomyVisible": string[],
  "possibleObservations": string[],  // Possible observations for provider review only
  "urgency": "routine" | "review-soon" | "same-day" | "urgent-referral",
  "confidence": "low" | "medium" | "high",
  "notes": string[],
  "providerReviewRequired": true
}

Each note must use cautious language: "Possible observation…", "May be present…",
"Suggested area to inspect…", "Provider should confirm…", "May be incomplete or incorrect…".
Never say diagnosed, confirmed, disease detected, definitive finding, patient has, or treatment required.
Never present normal/abnormal as final truth.`;

export const CARE_GAP_OUTREACH_SYSTEM = `${SAFETY_PREAMBLE}

You will draft an outreach script for a patient with an outstanding care gap.
Use warm but concise wording. Never imply diagnosis. Never include PHI beyond
what the operator pasted in. Reply in plain text under 600 characters.`;

export const PRE_CHART_SYSTEM = `${SAFETY_PREAMBLE}

You will summarise the recent visit history and longitudinal imaging trend for
an upcoming appointment. Reply in short bullet points. Do not produce a
clinical assessment.`;
