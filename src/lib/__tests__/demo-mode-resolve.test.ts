import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('resolveDemoModeEnabled', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
    delete process.env.DEMO_MODE;
    delete process.env.FEATURE_DEMO_MODE;
    delete process.env.APP_ENV;
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('defaults on in development when flags unset', async () => {
    process.env.NODE_ENV = 'development';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(true);
  });

  it('defaults off in production NODE_ENV when flags unset', async () => {
    process.env.NODE_ENV = 'production';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(false);
  });

  it('enables when APP_ENV=demo even if NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'demo';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(true);
  });

  it('respects explicit DEMO_MODE=false over APP_ENV=demo', async () => {
    process.env.APP_ENV = 'demo';
    process.env.DEMO_MODE = 'false';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(false);
  });

  it('respects explicit DEMO_MODE=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'staging';
    process.env.DEMO_MODE = 'true';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(true);
  });
});
