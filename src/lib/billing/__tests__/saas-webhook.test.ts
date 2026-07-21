import { describe, expect, it, vi, beforeEach } from 'vitest';

const findUniqueEvent = vi.fn();
const createEvent = vi.fn();
const upsertSub = vi.fn();
const updateSub = vi.fn();
const findUniqueSub = vi.fn();
const findFirstSub = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    saasBillingEvent: {
      findUnique: (...args: unknown[]) => findUniqueEvent(...args),
      create: (...args: unknown[]) => createEvent(...args),
    },
    orgSubscription: {
      upsert: (...args: unknown[]) => upsertSub(...args),
      update: (...args: unknown[]) => updateSub(...args),
      findUnique: (...args: unknown[]) => findUniqueSub(...args),
      findFirst: (...args: unknown[]) => findFirstSub(...args),
    },
  },
}));

vi.mock('@/lib/audit/log', () => ({
  audit: vi.fn(async () => undefined),
}));

describe('saas webhook idempotency', () => {
  beforeEach(() => {
    vi.resetModules();
    findUniqueEvent.mockReset();
    createEvent.mockReset();
    upsertSub.mockReset();
    updateSub.mockReset();
  });

  it('returns duplicate when stripeEventId already recorded', async () => {
    findUniqueEvent.mockResolvedValue({ id: 'evt_row' });
    const { processSaasStripeEvent } = await import('@/lib/billing/saas-webhook');
    const result = await processSaasStripeEvent(
      {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            mode: 'subscription',
            metadata: { product: 'eyeq_saas', organizationId: 'org_1', plan: 'PRACTICE' },
            client_reference_id: 'org_1',
          },
        },
      },
      '{"id":"evt_123"}',
    );
    expect(result).toEqual({ handled: true, duplicate: true });
    expect(upsertSub).not.toHaveBeenCalled();
  });

  it('activates subscription on saas checkout.session.completed once', async () => {
    findUniqueEvent.mockResolvedValue(null);
    createEvent.mockResolvedValue({ id: 'new' });
    upsertSub.mockResolvedValue({
      id: 'sub_1',
      organizationId: 'org_1',
      activatedAt: null,
    });
    updateSub.mockResolvedValue({ id: 'sub_1', organizationId: 'org_1' });

    const { processSaasStripeEvent } = await import('@/lib/billing/saas-webhook');
    const result = await processSaasStripeEvent(
      {
        id: 'evt_new',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_new',
            mode: 'subscription',
            customer: 'cus_1',
            subscription: 'sub_stripe',
            metadata: { product: 'eyeq_saas', organizationId: 'org_1', plan: 'PRACTICE' },
            client_reference_id: 'org_1',
          },
        },
      },
      '{"id":"evt_new"}',
    );

    expect(result.handled).toBe(true);
    expect(result.duplicate).toBeFalsy();
    expect(upsertSub).toHaveBeenCalled();
    expect(updateSub).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ billingStatus: 'ACTIVE' }),
      }),
    );
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeEventId: 'evt_new' }),
      }),
    );
  });
});
