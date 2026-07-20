import 'server-only';
import type { ProviderCompletionResult } from './types';
import type { ProviderInvokeArgs } from './providers/adapter';
import { invokeProvider } from './providers/adapter';
import { serverEnv } from '@/lib/env';

export async function invokeWithRetry(
  args: ProviderInvokeArgs,
  maxRetries = serverEnv.aiMaxRetries,
): Promise<ProviderCompletionResult> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await invokeProvider(args);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
      }
    }
  }
  throw lastError ?? new Error('Provider invocation failed');
}

export async function invokeWithFallback(
  primary: ProviderInvokeArgs,
  fallback?: ProviderInvokeArgs,
): Promise<ProviderCompletionResult> {
  try {
    return await invokeWithRetry(primary);
  } catch (primaryErr) {
    if (!fallback) throw primaryErr;
    try {
      const result = await invokeWithRetry(fallback, 0);
      return { ...result, text: result.text };
    } catch {
      throw primaryErr;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
