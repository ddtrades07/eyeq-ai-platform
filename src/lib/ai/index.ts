import { serverEnv } from '@/lib/env';
import { isProductionApp } from '@/lib/production/mode';
import { mockAIProvider } from './mock';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import type { AIProvider, AIProviderName } from './provider';

export type AiRuntimeState =
  | { status: 'openai'; provider: AIProvider; label: string }
  | { status: 'demo_mock'; provider: AIProvider; label: string }
  | { status: 'disabled'; provider: null; label: string };

/**
 * Resolve production-safe AI runtime state.
 * - production + PHI: OpenAI only
 * - demo mode: labeled mock allowed
 * - otherwise unconfigured → disabled (no silent fake clinical AI)
 */
export function resolveAiRuntimeState(): AiRuntimeState {
  const mode = (serverEnv.aiMode || serverEnv.aiProvider || 'mock').toLowerCase();

  if (isProductionApp() && serverEnv.aiAllowPhi) {
    if (mode !== 'openai' || !serverEnv.openaiApiKey) {
      return {
        status: 'disabled',
        provider: null,
        label: 'Not configured — production PHI AI requires AI_MODE=openai and OPENAI_API_KEY',
      };
    }
    return { status: 'openai', provider: openaiProvider, label: 'OpenAI (production)' };
  }

  if (mode === 'openai' && serverEnv.openaiApiKey) {
    return { status: 'openai', provider: openaiProvider, label: 'OpenAI' };
  }

  if (mode === 'anthropic' && serverEnv.anthropicApiKey && !isProductionApp()) {
    return {
      status: 'demo_mock',
      provider: anthropicProvider,
      label: 'Anthropic (non-production only)',
    };
  }

  if (serverEnv.demoModeEnabled || mode === 'mock' || mode === 'demo') {
    return {
      status: 'demo_mock',
      provider: mockAIProvider,
      label: 'Demo mock — not a clinical AI provider',
    };
  }

  return {
    status: 'disabled',
    provider: null,
    label: 'AI not configured',
  };
}

/**
 * Resolve the active AI provider for this deployment.
 * Prefer resolveAiRuntimeState() when you need honest configured labels.
 */
export function getAIProvider(): AIProvider {
  const state = resolveAiRuntimeState();
  if (state.provider) return state.provider;

  // Fail closed to mock only in explicit demo; otherwise return mock that
  // callers should still treat as non-clinical via resolveAiRuntimeState.
  if (serverEnv.demoModeEnabled) return mockAIProvider;

  // Disabled: still return mock for type stability, but status is disabled
  // — feature UIs must check resolveAiRuntimeState().
  return mockAIProvider;
}

export type { AIProvider, AIProviderName, ImagingReviewSignals, ChatMessage, CompletionOptions } from './provider';

export type VectorMatch = {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
};

export interface VectorSearchProvider {
  upsert(records: { id: string; vector: number[]; metadata: Record<string, unknown> }[]): Promise<void>;
  query(vector: number[], topK: number): Promise<VectorMatch[]>;
}

export function getVectorSearchProvider(): VectorSearchProvider | null {
  return null;
}

export type MultimodalImagingProvider = {
  analyze(args: {
    imageUrl: string;
    imageType: string;
    patientContext?: string;
  }): Promise<null>;
};

export function getMultimodalImagingProvider(): MultimodalImagingProvider | null {
  return null;
}
