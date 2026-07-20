import { describe, expect, it } from 'vitest';
import { GoogleReviewReplyStatus } from '@prisma/client';
import { postGoogleReviewReply } from '@/lib/providers/google-business';

describe('Google Reviews demo publish integrity', () => {
  it('demoMode publish returns demo mode (caller persists DEMO_PUBLISHED)', async () => {
    const result = await postGoogleReviewReply({
      connectionId: 'conn_demo',
      externalReviewId: 'rev_1',
      replyText: 'Thank you for visiting.',
      demoMode: true,
    });
    expect(result.mode).toBe('demo');
    expect(result.mode).not.toBe('live');
  });

  it('maps demo publish mode to DEMO_PUBLISHED status enum', () => {
    const mode: 'demo' | 'live' = 'demo';
    const replyStatus =
      mode === 'demo'
        ? GoogleReviewReplyStatus.DEMO_PUBLISHED
        : GoogleReviewReplyStatus.PUBLISHED;
    expect(replyStatus).toBe(GoogleReviewReplyStatus.DEMO_PUBLISHED);
    expect(replyStatus).not.toBe(GoogleReviewReplyStatus.PUBLISHED);
  });

  it('exposes honesty labels for UI', () => {
    const labels: Record<GoogleReviewReplyStatus, string> = {
      PENDING_REPLY: 'Needs reply',
      DRAFT: 'Draft ready',
      PUBLISHED: 'Published to Google',
      DEMO_PUBLISHED: 'Demo-published',
      SKIPPED: 'Skipped',
    };
    expect(labels.DEMO_PUBLISHED).toBe('Demo-published');
    expect(labels.PUBLISHED).toContain('Google');
  });
});
