import type { AIProvider, ImagingReviewSignals } from './provider';
import { serverEnv } from '@/lib/env';
import { IMAGING_REVIEW_SYSTEM } from './prompts';

/**
 * Anthropic provider. REST API (no SDK dependency).
 */
export const anthropicProvider: AIProvider = {
  name: 'anthropic',

  async complete(messages, options) {
    const apiKey = serverEnv.anthropicApiKey;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY missing, set AI_PROVIDER=mock or configure the key.');
    }

    const model = serverEnv.anthropicModel || 'claude-3-5-sonnet-latest';
    const system = messages.find((m) => m.role === 'system')?.content;
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.maxTokens ?? 1500,
      temperature: options?.temperature ?? 0.3,
      messages: chatMessages,
    };
    if (system) body.system = system;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const block = data.content?.[0];
    return block?.type === 'text' ? block.text : '';
  },

  async reviewImaging({ imageType, patientContext }): Promise<ImagingReviewSignals> {
    if (!serverEnv.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY missing.');
    }
    throw new Error(
      `Anthropic imaging review requires vision model wiring (image=${imageType}, ctx=${patientContext?.length ?? 0}, prompt=${IMAGING_REVIEW_SYSTEM.length} chars).`,
    );
  },
};
