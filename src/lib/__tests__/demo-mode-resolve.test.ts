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
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(true);
  });

  it('defaults off in production NODE_ENV when flags unset', async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(false);
  });

  it('enables when APP_ENV=demo even if NODE_ENV=production', async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
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
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    process.env.APP_ENV = 'staging';
    process.env.DEMO_MODE = 'true';
    const { resolveDemoModeEnabled } = await import('@/lib/env');
    expect(resolveDemoModeEnabled()).toBe(true);
  });
});

describe('publicLiveDemoHref', () => {
  const original = process.env.NEXT_PUBLIC_DEMO_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DEMO_URL;
    else process.env.NEXT_PUBLIC_DEMO_URL = original;
    vi.resetModules();
  });

  it('returns /demo by default', async () => {
    delete process.env.NEXT_PUBLIC_DEMO_URL;
    const { publicLiveDemoHref } = await import('@/lib/demo/public-demo-href');
    expect(publicLiveDemoHref()).toBe('/demo');
  });

  it('points at NEXT_PUBLIC_DEMO_URL/demo when set', async () => {
    process.env.NEXT_PUBLIC_DEMO_URL = 'https://demo.example.com/';
    const { publicLiveDemoHref } = await import('@/lib/demo/public-demo-href');
    expect(publicLiveDemoHref()).toBe('https://demo.example.com/demo');
  });
});
