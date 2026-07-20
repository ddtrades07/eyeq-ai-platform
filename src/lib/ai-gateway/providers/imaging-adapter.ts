import 'server-only';
import { serverEnv } from '@/lib/env';
import type { ProviderInvokeArgs } from './adapter';
import type { ProviderCompletionResult } from '../types';

export const imagingGatewayAdapter = {
  async complete(_args: ProviderInvokeArgs): Promise<ProviderCompletionResult> {
    if (!serverEnv.imagingAiApiKey && serverEnv.imagingAnalysisMode === 'manual') {
      throw new Error(
        'Automated imaging review is unavailable. Upload and store scans; provider manual review is required.',
      );
    }
    throw new Error(
      'Imaging analysis must be routed through the imaging orchestrator, not the LLM gateway.',
    );
  },
};
