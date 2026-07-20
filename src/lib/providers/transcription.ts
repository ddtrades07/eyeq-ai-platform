import 'server-only';
import { serverEnv } from '@/lib/env';
import { deepgramTranscriptionProvider } from './transcription/deepgram';
import type { TranscriptionProvider } from './index';

const unconfigured: TranscriptionProvider = {
  name: 'none',
  isConfigured: () => false,
  async transcribe() {
    throw new Error(
      'Transcription is not configured. Set TRANSCRIPTION_PROVIDER and TRANSCRIPTION_API_KEY. See docs/TRANSCRIPTION_PROVIDER_SETUP.md.',
    );
  },
};

export function getTranscriptionProvider(): TranscriptionProvider {
  if (!serverEnv.transcriptionApiKey || !serverEnv.transcriptionProvider) {
    return unconfigured;
  }
  if (serverEnv.transcriptionProvider === 'deepgram') {
    return deepgramTranscriptionProvider;
  }
  return unconfigured;
}

export function isTranscriptionAvailable(): boolean {
  return getTranscriptionProvider().isConfigured();
}
