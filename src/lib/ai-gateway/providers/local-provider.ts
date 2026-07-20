import 'server-only';
import type { ProviderInvokeArgs } from './adapter';
import type { ProviderCompletionResult } from '../types';

/** Deterministic local rules engine — no external API calls. */
export const localGatewayProvider = {
  async complete(args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
    const lastUser = [...args.messages].reverse().find((m) => m.role === 'user');
    return {
      text: lastUser
        ? 'Local rules engine: no external model configured. Configure an approved LLM provider in AI settings.'
        : 'No input provided.',
      model: 'local-rules',
      vendor: 'LOCAL',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  },
};
