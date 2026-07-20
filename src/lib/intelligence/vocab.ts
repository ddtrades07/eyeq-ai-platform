/**
 * Safety vocabulary for Timeline Intelligence outputs.
 *
 * The intelligence layer NEVER asserts a diagnosis or declares disease.
 * It frames observations using deferential language so the final
 * clinical interpretation remains with the supervising provider.
 *
 * Use these helpers (or the constants) anywhere we generate a
 * patient-facing or provider-facing message.
 */

export const SAFE_VOCAB = {
  possible: 'possible',
  suggestive: 'suggestive of',
  reviewRecommended: 'provider review recommended',
  unresolved: 'unresolved concern',
  followUpIndicated: 'follow-up indicated',
} as const;

/** Words that should never appear in our generated messages. */
const FORBIDDEN = [
  /\bdiagnos(ed|is|tic of)\b/gi,
  /\bhas (glaucoma|diabetic retinopathy|amd|macular degeneration|cataracts|keratoconus)\b/gi,
  /\bconfirmed\b/gi,
  /\bdefinitive\b/gi,
];

/**
 * Returns the message unchanged in production. In development, it
 * stderr-warns when forbidden phrasing slips into output, helps catch
 * regressions in the rule engine without breaking the user flow.
 */
export function safeMessage(input: string): string {
  if (process.env.NODE_ENV !== 'production') {
    for (const pattern of FORBIDDEN) {
      if (pattern.test(input)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[intelligence/vocab] forbidden phrasing detected: "${input}"`,
        );
        break;
      }
    }
  }
  return input;
}

/** Wraps a condition mention with deferential framing. */
export function possibleOf(condition: string): string {
  return `${SAFE_VOCAB.possible} ${condition}`;
}

/** Wraps an observation with "suggestive of" framing. */
export function suggestiveOf(condition: string): string {
  return `${SAFE_VOCAB.suggestive} ${condition}`;
}
