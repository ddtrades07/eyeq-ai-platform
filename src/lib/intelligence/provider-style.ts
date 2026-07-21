import 'server-only';
import { db } from '@/lib/db';

/**
 * Provider Personalization (placeholder)
 * -------------------------------------------------------
 * Eventually this will learn each provider's documentation style ,
 * preferred wording, common templates, follow-up intervals, etc. ,
 * and feed it into scribe and template defaults so the EHR feels like
 * it was built around how *this* provider already works.
 *
 * For now we just produce a deterministic, transparent summary based
 * on the provider's actual chart history, so the UI can show real
 * signal without an external model.
 *
 * Safety: this layer never produces a diagnosis or clinical decision ,
 * it only describes style preferences (verbosity, common phrases,
 * preferred follow-up intervals).
 */

export interface ProviderStyleSnapshot {
  providerUserId: string;
  generatedAt: Date;
  notesSampleSize: number;
  averageAssessmentLength: number;
  averagePlanLength: number;
  preferredPhrases: string[];
  commonChiefComplaints: string[];
  typicalFollowUpDays: number | null;
  notes: string[];
}

const STOP = new Set([
  'the', 'and', 'a', 'an', 'of', 'to', 'in', 'on', 'with', 'for', 'at', 'as',
  'is', 'was', 'were', 'be', 'are', 'patient', 'pt', 'rx', 'left', 'right',
  'will', 'no', 'or', 'eye', 'eyes', 'visit', 'today', 'plan', 'assessment',
]);

function topNGrams(texts: string[], n: number, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ');
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([gram]) => gram);
}

export async function computeProviderStyle(
  providerUserId: string,
  organizationId: string,
): Promise<ProviderStyleSnapshot> {
  const notes = await db.clinicalNote.findMany({
    where: { authorId: providerUserId, organizationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const assessments = notes.map((n) => n.assessment ?? '').filter(Boolean);
  const plans = notes.map((n) => n.plan ?? '').filter(Boolean);
  const chiefs = notes.map((n) => n.chiefComplaint ?? '').filter(Boolean);

  const avg = (arr: string[]) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((s, t) => s + t.length, 0) / arr.length);

  // Look at "follow-up in N weeks/months/days" patterns in plans.
  const fuDays: number[] = [];
  for (const p of plans) {
    const m = p.toLowerCase().match(/follow[\s-]?up\s+in\s+(\d+)\s+(day|week|month|year)s?/);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2];
      const days =
        unit === 'day' ? n : unit === 'week' ? n * 7 : unit === 'month' ? n * 30 : n * 365;
      fuDays.push(days);
    }
  }
  const typicalFollowUpDays =
    fuDays.length === 0
      ? null
      : Math.round(fuDays.reduce((a, b) => a + b, 0) / fuDays.length);

  const preferredPhrases = topNGrams([...assessments, ...plans], 2, 8);
  const commonChiefComplaints = topNGrams(chiefs, 2, 6);

  const summaryNotes: string[] = [];
  if (notes.length === 0) {
    summaryNotes.push('No clinical notes authored yet, style memory will build over time.');
  } else {
    summaryNotes.push(`${notes.length} notes analyzed for documentation style.`);
    if (typicalFollowUpDays) {
      summaryNotes.push(`Typical follow-up interval: ~${typicalFollowUpDays} days.`);
    }
  }

  return {
    providerUserId,
    generatedAt: new Date(),
    notesSampleSize: notes.length,
    averageAssessmentLength: avg(assessments),
    averagePlanLength: avg(plans),
    preferredPhrases,
    commonChiefComplaints,
    typicalFollowUpDays,
    notes: summaryNotes,
  };
}
