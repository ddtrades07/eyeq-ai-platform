import { describe, expect, it } from 'vitest';
import {
  DEMO_FEATURE_CARDS,
  DEMO_PRIMARY_ENTRIES,
  DEMO_WALKTHROUGH_STEPS,
} from '@/lib/demo/guide-steps';

describe('Live Demo walkthrough coverage', () => {
  it('has 15 guided steps including Reputation and Eye Health Library', () => {
    expect(DEMO_WALKTHROUGH_STEPS).toHaveLength(15);
    const ids = DEMO_WALKTHROUGH_STEPS.map((s) => s.id);
    expect(ids).toContain('reputation');
    expect(ids).toContain('eye-health-library');
    expect(ids).toContain('ai-image-analysis');
    expect(ids).toContain('secure-messages');
  });

  it('Reputation step links to Google Reviews and is demo-only', () => {
    const step = DEMO_WALKTHROUGH_STEPS.find((s) => s.id === 'reputation');
    expect(step).toBeTruthy();
    expect(step!.href).toBe('/provider/reputation');
    expect(step!.status).toBe('demo-only');
    expect(step!.title.toLowerCase()).toContain('google reviews');
    expect(step!.expectedResult.toLowerCase()).toContain('demo_published');
  });

  it('role cards include estimated time and Google Reviews for owner', () => {
    const owner = DEMO_PRIMARY_ENTRIES.find((e) => e.key === 'owner');
    expect(owner?.estimatedMinutes).toBeGreaterThan(0);
    expect(owner?.description.toLowerCase()).toContain('google reviews');
  });

  it('feature cards call out Google Reviews', () => {
    expect(DEMO_FEATURE_CARDS.some((c) => c.title === 'Google Reviews')).toBe(true);
  });
});
