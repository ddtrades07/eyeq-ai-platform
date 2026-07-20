import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('production mode guards', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('blocks simulated claims in production without demo flag', async () => {
    process.env.APP_ENV = 'production';
    process.env.DEMO_MODE = 'false';
    process.env.FEATURE_DEMO_MODE = 'false';
    process.env.ALLOW_SIMULATED_CLAIMS = 'false';
    process.env.CLEARINGHOUSE_ENABLED = 'true';

    const { isSimulatedClaimsAllowed } = await import('@/lib/production/mode');
    expect(isSimulatedClaimsAllowed()).toBe(false);
  });

  it('allows simulated claims only when explicitly enabled in non-production demo', async () => {
    process.env.APP_ENV = 'demo';
    process.env.DEMO_MODE = 'true';
    process.env.ALLOW_SIMULATED_CLAIMS = 'true';

    const { isSimulatedClaimsAllowed } = await import('@/lib/production/mode');
    expect(isSimulatedClaimsAllowed()).toBe(true);
  });
});
