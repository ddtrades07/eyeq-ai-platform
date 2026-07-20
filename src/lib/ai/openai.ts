import type { AIProvider, ImagingReviewSignals } from './provider';
import { serverEnv } from '@/lib/env';
import { IMAGING_REVIEW_SYSTEM } from './prompts';

/**
 * OpenAI provider, uses the REST API directly (no SDK dependency required).
 * Supports text completions and multimodal imaging review via GPT-4o Vision.
 */
export const openaiProvider: AIProvider = {
  name: 'openai',

  async complete(messages, options) {
    const apiKey = serverEnv.openaiApiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY missing, set AI_PROVIDER=mock or configure the key.');
    }

    const model = serverEnv.openaiModel || 'gpt-4o-mini';
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1500,
    };
    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

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
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },

  async embed(input: string) {
    const apiKey = serverEnv.openaiApiKey;
    if (!apiKey) return null;

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      vector: data.data?.[0]?.embedding ?? [],
      model: 'text-embedding-3-small',
    };
  },

  async reviewImaging({ imageType, patientContext, storageUrl }): Promise<ImagingReviewSignals> {
    const apiKey = serverEnv.openaiApiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY missing.');
    }

    const model = serverEnv.openaiModel || 'gpt-4o';
    const userContent: Array<Record<string, unknown>> = [
      {
        type: 'text',
        text: `Image type: ${imageType}\n${patientContext ? `Patient context: ${patientContext}` : 'No patient context provided.'}\n\nAnalyze this image and respond with the JSON schema from the system prompt.`,
      },
    ];

    if (storageUrl) {
      userContent.push({
        type: 'image_url',
        image_url: { url: storageUrl, detail: 'high' },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          max_tokens: 1500,
          temperature: 0.1,
          messages: [
            { role: 'system', content: IMAGING_REVIEW_SYSTEM },
            { role: 'user', content: userContent },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI imaging review API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI imaging review');
      }

      const parsed = JSON.parse(content);
      const anatomy =
        (Array.isArray(parsed.anatomyVisible) && parsed.anatomyVisible) ||
        (Array.isArray(parsed.anatomyDetected) && parsed.anatomyDetected) ||
        [];
      const observations =
        (Array.isArray(parsed.possibleObservations) && parsed.possibleObservations) ||
        (Array.isArray(parsed.flags) && parsed.flags) ||
        [];
      const confidenceRaw = String(parsed.confidence ?? 'low').toLowerCase();
      const confidence =
        confidenceRaw === 'medium' || confidenceRaw === 'moderate'
          ? 'moderate'
          : confidenceRaw === 'high'
            ? 'high'
            : 'low';
      return {
        quality: parsed.quality ?? 'fair',
        anatomyDetected: anatomy,
        flags: observations,
        urgency: parsed.urgency ?? 'routine',
        confidence,
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        disclaimer:
          'EyeQ AI reviewed this image and generated possible observations for provider review. This is not a diagnosis. The analysis may be incomplete or incorrect and must be confirmed by the provider.',
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },
};
