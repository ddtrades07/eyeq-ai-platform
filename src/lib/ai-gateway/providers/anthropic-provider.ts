import 'server-only';
import { serverEnv } from '@/lib/env';
import type { ProviderInvokeArgs } from './adapter';
import type { ProviderCompletionResult } from '../types';

export const anthropicGatewayProvider = {
  async complete(args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
    const apiKey = serverEnv.anthropicApiKey;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const model = args.model || serverEnv.anthropicModel;
    const system = args.messages.find((m) => m.role === 'system')?.content ?? '';
    const chatMessages = args.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.aiRequestTimeoutMs);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: args.maxTokens ?? 1500,
          temperature: args.temperature ?? 0.3,
          system,
          messages: chatMessages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = (data.content ?? [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n');

      return {
        text,
        model,
        vendor: 'ANTHROPIC',
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },
};
