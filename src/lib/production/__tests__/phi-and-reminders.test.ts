import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('AI PHI BAA gates', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('blocks PHI AI runtime in production without BAA-ready openai', async () => {
    process.env.APP_ENV = 'production';
    process.env.DEMO_MODE = 'false';
    process.env.FEATURE_DEMO_MODE = 'false';
    process.env.AI_ALLOW_PHI = 'true';
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODE = 'openai';
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_BAA_CONFIRMED = 'false';
    process.env.AI_BAA_CONFIRMED = 'false';

    const { resolveAiRuntimeState } = await import('@/lib/ai');
    expect(resolveAiRuntimeState().status).toBe('disabled');
  });

  it('allows openai runtime when key present in non-prod', async () => {
    process.env.APP_ENV = 'development';
    process.env.DEMO_MODE = 'false';
    process.env.AI_MODE = 'openai';
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.AI_ALLOW_PHI = 'false';

    const { resolveAiRuntimeState } = await import('@/lib/ai');
    expect(resolveAiRuntimeState().status).toBe('openai');
  });
});

describe('reminder send gate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    process.env.TWILIO_BAA_CONFIRMED = 'false';
    process.env.APP_ENV = 'production';
    process.env.DEMO_MODE = 'false';
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('reports SMS vendor not configured', async () => {
    const { getChannelVendorState, reminderUiState } = await import(
      '@/lib/reminders/send-gate'
    );
    const state = getChannelVendorState('SMS');
    expect(state.configured).toBe(false);
    const ui = reminderUiState({ campaignStatus: 'APPROVED', channel: 'SMS' });
    expect(ui.label.toLowerCase()).toContain('vendor');
  });

  it('blocks SMS when consent missing or opted out; portal stays available', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM_NUMBER = '+15555550100';
    process.env.TWILIO_BAA_CONFIRMED = 'true';

    const findUnique = vi.fn();
    vi.doMock('@/lib/db', () => ({
      db: {
        communicationPreference: { findUnique },
      },
    }));

    const { evaluateReminderSend } = await import('@/lib/reminders/send-gate');

    findUnique.mockResolvedValueOnce(null);
    const missing = await evaluateReminderSend({
      organizationId: 'org1',
      channel: 'SMS',
      patientId: 'p1',
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe('BLOCKED_CONSENT');

    findUnique.mockResolvedValueOnce({
      smsOptIn: false,
      emailOptIn: false,
      portalOptIn: true,
      optOutAt: null,
    });
    const noConsent = await evaluateReminderSend({
      organizationId: 'org1',
      channel: 'SMS',
      patientId: 'p1',
    });
    expect(noConsent.ok).toBe(false);
    if (!noConsent.ok) expect(noConsent.status).toBe('BLOCKED_CONSENT');

    findUnique.mockResolvedValueOnce({
      smsOptIn: true,
      emailOptIn: true,
      portalOptIn: true,
      optOutAt: new Date(),
    });
    const optedOut = await evaluateReminderSend({
      organizationId: 'org1',
      channel: 'SMS',
      patientId: 'p1',
    });
    expect(optedOut.ok).toBe(false);
    if (!optedOut.ok) expect(optedOut.status).toBe('OPT_OUT');

    findUnique.mockResolvedValueOnce({
      smsOptIn: false,
      emailOptIn: false,
      portalOptIn: true,
      optOutAt: new Date(),
    });
    const portal = await evaluateReminderSend({
      organizationId: 'org1',
      channel: 'PORTAL',
      patientId: 'p1',
    });
    expect(portal.ok).toBe(true);
  });
});

describe('phi readiness evaluate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
    vi.resetModules();
  });

  it('marks demo environment as demo_only overall', async () => {
    process.env.APP_ENV = 'demo';
    process.env.DEMO_MODE = 'true';
    const { evaluatePhiReadiness } = await import('@/lib/production/phi-readiness');
    const report = await evaluatePhiReadiness(null);
    expect(report.overall).toBe('demo_only');
    expect(report.canEnableLivePhi).toBe(false);
  });
});
