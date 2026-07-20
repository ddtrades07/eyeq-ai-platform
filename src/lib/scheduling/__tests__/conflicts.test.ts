import { describe, expect, it } from 'vitest';
import {
  formatConflictMessage,
  intervalsOverlap,
} from '@/lib/scheduling/conflicts';

describe('scheduling conflicts', () => {
  it('detects overlapping intervals', () => {
    const aStart = new Date('2026-07-07T09:00:00');
    const aEnd = new Date('2026-07-07T09:30:00');
    const bStart = new Date('2026-07-07T09:15:00');
    const bEnd = new Date('2026-07-07T09:45:00');
    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it('does not flag adjacent non-overlapping intervals', () => {
    const aStart = new Date('2026-07-07T09:00:00');
    const aEnd = new Date('2026-07-07T09:30:00');
    const bStart = new Date('2026-07-07T09:30:00');
    const bEnd = new Date('2026-07-07T10:00:00');
    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it('formats conflict messages', () => {
    const msg = formatConflictMessage([
      {
        appointmentId: 'a1',
        startsAt: new Date('2026-07-07T09:00:00'),
        endsAt: new Date('2026-07-07T09:30:00'),
        patientId: 'p1',
        type: 'COMPREHENSIVE_EYE_EXAM',
      },
    ]);
    expect(msg).toContain('Scheduling conflict');
  });
});
