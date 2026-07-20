/**
 * Provider-agnostic AI interface. The platform must always be able to
 * swap providers without touching feature code. Concrete providers live
 * alongside this file (openai.ts, anthropic.ts, mock.ts).
 *
 * IMPORTANT SAFETY POSTURE:
 * - Imaging review is "AI image analysis for provider review" only. We never claim
 *   disease diagnosis. Outputs are possible observations, not conclusions.
 * - All AI invocations should be audit-logged via `audit()`.
 */

export type AIProviderName = 'mock' | 'openai' | 'anthropic';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export type EmbeddingResult = {
  vector: number[];
  model: string;
};

export type ImagingReviewSignals = {
  quality: 'good' | 'fair' | 'poor';
  anatomyDetected: string[];
  flags: string[];
  urgency: 'routine' | 'review-soon' | 'same-day' | 'urgent-referral';
  confidence: 'low' | 'moderate' | 'high';
  notes: string[];
  /**
   * Optional disclaimer surfaced in UI. Providers may return their own
   * cautionary language; clients always render the platform-level
   * disclaimer regardless.
   */
  disclaimer: string;
};

export interface AIProvider {
  readonly name: AIProviderName;

  /** Standard chat completion (text in, text out). */
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<string>;

  /**
   * Embeddings. Returns null when the provider doesn't support this
   * capability (e.g. when the AI feature is mocked).
   */
  embed?(input: string): Promise<EmbeddingResult | null>;

  /**
   * Imaging review. Always returns "review-support" signals.
   * The platform never asserts diagnoses; this is meant to surface
   * findings a clinician should double-check.
   */
  reviewImaging(args: {
    imageType: string;
    patientContext?: string;
    storageUrl?: string;
  }): Promise<ImagingReviewSignals>;
}
