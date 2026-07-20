import 'server-only';
import type { AiProviderVendor } from '@prisma/client';
import type { ChatMessage } from '@/lib/ai/provider';
import type { ProviderCompletionResult } from '../types';
import { openaiGatewayProvider } from './openai-provider';
import { anthropicGatewayProvider } from './anthropic-provider';
import { localGatewayProvider } from './local-provider';
import { speechGatewayAdapter } from './speech-adapter';
import { imagingGatewayAdapter } from './imaging-adapter';

export type ProviderInvokeArgs = {
  vendor: AiProviderVendor;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export async function invokeProvider(args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
  switch (args.vendor) {
    case 'OPENAI':
      return openaiGatewayProvider.complete(args);
    case 'ANTHROPIC':
      return anthropicGatewayProvider.complete(args);
    case 'LOCAL':
      return localGatewayProvider.complete(args);
    case 'EXTERNAL_SPEECH':
      return speechGatewayAdapter.complete(args);
    case 'EXTERNAL_IMAGING':
      return imagingGatewayAdapter.complete(args);
    default:
      throw new Error(`No provider adapter for vendor: ${args.vendor}`);
  }
}
