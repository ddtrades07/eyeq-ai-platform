/** Client-safe feature flags (NEXT_PUBLIC_* only). */
export function isMockAiMode(): boolean {
  const p = process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'mock';
  return !p || p === 'mock';
}
