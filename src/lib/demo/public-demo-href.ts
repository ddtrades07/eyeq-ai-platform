/**
 * Public Live Demo entry URL for marketing CTAs.
 * Uses NEXT_PUBLIC_DEMO_URL when the marketing host is separate from the demo app;
 * otherwise `/demo` on the current host.
 */
export function publicLiveDemoHref(): string {
  const base = (process.env.NEXT_PUBLIC_DEMO_URL ?? '').replace(/\/$/, '');
  if (base) return `${base}/demo`;
  return '/demo';
}
