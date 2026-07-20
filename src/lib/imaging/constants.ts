/** Client-safe imaging constants (no server-only imports). */

export const IMAGING_AI_TITLE = 'AI Image Analysis for Provider Review';

export const IMAGING_SAFETY_DISCLAIMER =
  'EyeQ AI reviewed this image and generated possible observations for provider review. This is not a diagnosis. The analysis may be incomplete or incorrect and must be confirmed by the provider.';

export const MANUAL_REVIEW_MESSAGE =
  'Manual review only. No validated imaging-analysis provider is configured. EyeQ AI has not generated image observations.';

/** @deprecated use MANUAL_REVIEW_MESSAGE */
export const NO_PROVIDER_MESSAGE = MANUAL_REVIEW_MESSAGE;

export const DESCRIPTIVE_DISCLOSURE =
  'This analysis uses a general multimodal image model for provider-review support only. It is not a validated ophthalmic diagnostic system and must not be treated as a diagnosis.';

export const PROVIDER_REVIEW_REQUIRED_BADGE = 'Provider review required';
export const NOT_A_DIAGNOSIS_BADGE = 'Not a diagnosis';

export type FindingsAnalysisState =
  | 'manual'
  | 'awaiting'
  | 'not_gradable'
  | 'failed'
  | 'completed'
  | 'completed-empty';
