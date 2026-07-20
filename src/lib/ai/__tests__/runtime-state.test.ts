import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('AI runtime configured states', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('labels demo mock when DEMO_MODE is on', async () => {
    process.env.APP_ENV = 'demo';
    process.env.DEMO_MODE = 'true';
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_ALLOW_PHI = 'false';

    const { resolveAiRuntimeState } = await import('@/lib/ai');
    const state = resolveAiRuntimeState();
    expect(state.status).toBe('demo_mock');
    expect(state.label.toLowerCase()).toContain('demo');
  });

  it('disables production PHI AI without openai key', async () => {
    process.env.APP_ENV = 'production';
    process.env.DEMO_MODE = 'false';
    process.env.FEATURE_DEMO_MODE = 'false';
    process.env.AI_ALLOW_PHI = 'true';
    process.env.AI_PROVIDER = 'mock';
    delete process.env.OPENAI_API_KEY;

    const { resolveAiRuntimeState } = await import('@/lib/ai');
    const state = resolveAiRuntimeState();
    expect(state.status).toBe('disabled');
  });

  it('enables openai when key and mode are set', async () => {
    process.env.APP_ENV = 'development';
    process.env.DEMO_MODE = 'false';
    process.env.AI_MODE = 'openai';
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';

    const { resolveAiRuntimeState } = await import('@/lib/ai');
    const state = resolveAiRuntimeState();
    expect(state.status).toBe('openai');
  });
});
