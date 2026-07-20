import 'server-only';
import type { AiRequestType, AiProviderVendor } from '@prisma/client';
import { serverEnv } from '@/lib/env';
import type { ModelRouteDecision } from './types';

const DEFAULT_ROUTES: Record<AiRequestType, ModelRouteDecision> = {
  ASSISTANT_CHAT: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  CHART_SUMMARY: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  SCRIBE_NOTE_GENERATION: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  SCRIBE_TRANSCRIPTION: { vendor: 'EXTERNAL_SPEECH', model: 'default' },
  IMAGING_ANALYSIS: { vendor: 'EXTERNAL_IMAGING', model: 'default' },
  PATIENT_INSTRUCTIONS: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  REFERRAL_DRAFT: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  REVIEW_REPLY_DRAFT: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  PLATFORM_HELP: { vendor: 'OPENAI', model: serverEnv.openaiModel },
  EMBEDDING: { vendor: 'OPENAI', model: serverEnv.embeddingModel },
  KNOWLEDGE_RETRIEVAL: { vendor: 'LOCAL', model: 'internal' },
};

function resolveLlmVendor(): AiProviderVendor {
  const provider = serverEnv.aiProvider;
  if (provider === 'anthropic') return 'ANTHROPIC';
  if (provider === 'openai') return 'OPENAI';
  if (provider === 'local') return 'LOCAL';
  return 'NONE';
}

function resolveLlmModel(vendor: AiProviderVendor): string {
  if (vendor === 'ANTHROPIC') return serverEnv.anthropicModel;
  if (vendor === 'OPENAI') return serverEnv.openaiModel;
  return 'none';
}

/**
 * Configurable model router. Env-driven today; per-practice DB routes in Phase 6+.
 */
export function routeModel(requestType: AiRequestType): ModelRouteDecision {
  const base = { ...DEFAULT_ROUTES[requestType] };
  const llmTypes: AiRequestType[] = [
    'ASSISTANT_CHAT', 'CHART_SUMMARY', 'SCRIBE_NOTE_GENERATION',
    'PATIENT_INSTRUCTIONS', 'REFERRAL_DRAFT', 'REVIEW_REPLY_DRAFT', 'PLATFORM_HELP',
  ];

  if (llmTypes.includes(requestType)) {
    const vendor = resolveLlmVendor();
    base.vendor = vendor;
    base.model = resolveLlmModel(vendor);
    const fallbackVendor = serverEnv.aiFallbackProvider === 'anthropic' ? 'ANTHROPIC'
      : serverEnv.aiFallbackProvider === 'openai' ? 'OPENAI' : undefined;
    if (fallbackVendor && fallbackVendor !== vendor) {
      base.fallbackVendor = fallbackVendor;
      base.fallbackModel = fallbackVendor === 'ANTHROPIC'
        ? serverEnv.anthropicModel
        : serverEnv.openaiModel;
    }
  }

  if (requestType === 'SCRIBE_TRANSCRIPTION') {
    base.vendor = serverEnv.transcriptionProvider ? 'EXTERNAL_SPEECH' : 'NONE';
  }

  if (requestType === 'IMAGING_ANALYSIS') {
    base.vendor = serverEnv.imagingAiProvider ? 'EXTERNAL_IMAGING' : 'NONE';
  }

  return base;
}

export function isProviderConfigured(vendor: AiProviderVendor): boolean {
  switch (vendor) {
    case 'OPENAI':
      return Boolean(serverEnv.openaiApiKey) && serverEnv.aiProvider !== 'mock';
    case 'ANTHROPIC':
      return Boolean(serverEnv.anthropicApiKey) && serverEnv.aiProvider !== 'mock';
    case 'EXTERNAL_SPEECH':
      return Boolean(serverEnv.transcriptionApiKey);
    case 'EXTERNAL_IMAGING':
      return Boolean(serverEnv.imagingAiApiKey) || serverEnv.imagingAnalysisMode !== 'manual';
    case 'LOCAL':
      return true;
    case 'NONE':
      return false;
    default:
      return false;
  }
}
