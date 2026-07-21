import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('marketing AI safety + Live Demo free', () => {
  const landing = readFileSync(
    join(process.cwd(), 'src/components/landing/landing-page.tsx'),
    'utf8',
  );
  const pricing = readFileSync(join(process.cwd(), 'src/app/pricing/page.tsx'), 'utf8');

  it('keeps AI safety copy on the homepage', () => {
    expect(landing).toMatch(/Drafts only/i);
    expect(landing).toMatch(/Not a diagnosis/i);
    expect(landing).toMatch(/PHI readiness/i);
    expect(landing).toMatch(/provider review/i);
  });

  it('keeps Live Demo free / no payment messaging', () => {
    expect(landing).toMatch(/Live Demo is free/i);
    expect(landing).toMatch(/no payment/i);
    expect(pricing).toMatch(/Live Demo is free/i);
    expect(pricing).toMatch(/Patients never pay/i);
  });
});
