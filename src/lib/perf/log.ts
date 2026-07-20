import 'server-only';

type PerfMeta = {
  route: string;
  organizationId?: string | null;
  role?: string | null;
  success?: boolean;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Lightweight performance timing. Never logs PHI (names, note bodies, messages, imaging).
 */
export async function withPerfLog<T>(ctx: PerfMeta, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  let success = true;
  try {
    return await fn();
  } catch (err) {
    success = false;
    throw err;
  } finally {
    const durationMs = Date.now() - started;
    const slow = durationMs >= 800;
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        type: 'perf',
        route: ctx.route,
        durationMs,
        slow,
        success,
        organizationId: ctx.organizationId ?? undefined,
        role: ctx.role ?? undefined,
        meta: ctx.meta,
        ts: new Date().toISOString(),
      }),
    );
  }
}
