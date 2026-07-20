import 'server-only';
import { serverEnv } from '@/lib/env';
import type { TranscriptionProvider, TranscriptionResult } from '../index';

export const deepgramTranscriptionProvider: TranscriptionProvider = {
  name: 'deepgram',

  isConfigured() {
    return Boolean(serverEnv.transcriptionApiKey) && serverEnv.transcriptionProvider === 'deepgram';
  },

  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    const apiKey = serverEnv.transcriptionApiKey;
    if (!apiKey) throw new Error('TRANSCRIPTION_API_KEY not configured');

    const res = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2-medical&punctuate=true&diarize=true&utterances=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: audioUrl }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Deepgram API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const utterances = data.results?.utterances ?? [];
    const segments = utterances.map((u: { speaker: number; start: number; end: number; transcript: string; confidence?: number }) => ({
      speaker: u.speaker === 0 ? 'PROVIDER' : u.speaker === 1 ? 'PATIENT' : 'OTHER',
      startMs: Math.round(u.start * 1000),
      endMs: Math.round(u.end * 1000),
      text: u.transcript,
      confidence: u.confidence,
    }));

    const uncertainWords: string[] = [];
    for (const word of data.results?.channels?.[0]?.alternatives?.[0]?.words ?? []) {
      if (word.confidence < 0.7) uncertainWords.push(word.word);
    }

    return {
      text: data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '',
      segments,
      uncertainWords,
    };
  },
};
