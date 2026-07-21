import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ScrollReveal marketing motion', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/marketing/ScrollReveal.tsx'),
    'utf8',
  );
  const landing = readFileSync(
    join(process.cwd(), 'src/components/landing/landing-page.tsx'),
    'utf8',
  );

  it('exports ScrollReveal with reduced-motion and IO behavior', () => {
    expect(source).toMatch(/export function ScrollReveal/);
    expect(source).toMatch(/prefers-reduced-motion/);
    expect(source).toMatch(/IntersectionObserver/);
    expect(source).toMatch(/animateOnMount/);
    expect(source).toMatch(/translateY\(20px\)/);
  });

  it('homepage uses ScrollReveal (not unused FadeIn wrappers only)', () => {
    expect(landing).toMatch(/from '@\/components\/marketing\/ScrollReveal'/);
    expect(landing).toMatch(/<ScrollReveal/);
    expect(landing).not.toMatch(/from '\.\/fade-in'/);
  });
});
