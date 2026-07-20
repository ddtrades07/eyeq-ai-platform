import 'server-only';
import { serverEnv } from '@/lib/env';
import type { ProviderInvokeArgs } from './adapter';
import type { ProviderCompletionResult } from '../types';

export const speechGatewayAdapter = {
  async complete(_args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
    if (!serverEnv.transcriptionApiKey) {
      throw new Error(
        'Speech transcription is not configured. Set TRANSCRIPTION_PROVIDER and TRANSCRIPTION_API_KEY.',
      );
    }
    throw new Error(
      'Speech transcription adapter is not yet connected to an approved vendor. Audio must be processed through the scribe pipeline.',
    );
  },
};
