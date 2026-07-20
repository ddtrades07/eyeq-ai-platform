import 'server-only';
import { serverEnv } from '@/lib/env';
import type { ProviderInvokeArgs } from './adapter';
import type { ProviderCompletionResult } from '../types';

export const openaiGatewayProvider = {
  async complete(args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
    const apiKey = serverEnv.openaiApiKey;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const model = args.model || serverEnv.openaiModel;
    const body: Record<string, unknown> = {
      model,
      messages: args.messages,
      temperature: args.temperature ?? 0.3,
      max_tokens: args.maxTokens ?? 1500,
    };
    if (args.jsonMode) body.response_format = { type: 'json_object' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.aiRequestTimeoutMs);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const usage = data.usage;
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        model,
        vendor: 'OPENAI',
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        costCents: estimateOpenAiCost(model, usage?.prompt_tokens, usage?.completion_tokens),
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },
};

function estimateOpenAiCost(model: string, input?: number, output?: number): number | undefined {
  if (!input && !output) return undefined;
  const inTok = input ?? 0;
  const outTok = output ?? 0;
  const rates: Record<string, { in: number; out: number }> = {
    'gpt-4o-mini': { in: 0.015, out: 0.06 },
    'gpt-4o': { in: 0.25, out: 1.0 },
  };
  const rate = rates[model] ?? rates['gpt-4o-mini'];
  return Math.ceil((inTok * rate.in + outTok * rate.out) / 1000);
}
