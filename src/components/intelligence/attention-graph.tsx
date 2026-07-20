import { cn } from '@/lib/utils';
import type { AttentionDistribution, InsightCategory } from '@/lib/intelligence/types';

const LABELS: Record<InsightCategory, string> = {
  follow_up: 'Follow-up',
  compliance: 'Compliance',
  imaging: 'Imaging',
  medication: 'Rx',
  communication: 'Communication',
  symptom: 'Symptoms',
  lifestyle: 'Lifestyle',
  risk_factor: 'Risk factors',
  optical: 'Optical',
  care_gap: 'Care gaps',
  pretest: 'Pretest',
};

const TONE: Record<InsightCategory, string> = {
  follow_up: 'bg-rose-500/70',
  compliance: 'bg-amber-500/70',
  imaging: 'bg-sky-500/70',
  medication: 'bg-violet-500/70',
  communication: 'bg-emerald-500/70',
  symptom: 'bg-pink-500/70',
  lifestyle: 'bg-stone-400/70',
  risk_factor: 'bg-indigo-500/70',
  optical: 'bg-teal-500/70',
  care_gap: 'bg-orange-500/70',
  pretest: 'bg-cyan-500/70',
};

export function AttentionGraph({ data }: { data: AttentionDistribution[] }) {
  if (data.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        No clinical attention signals at this time.
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.weight));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.category} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{LABELS[d.category]}</span>
            <span className="tabular-nums text-muted-foreground">
              {d.count} {d.count === 1 ? 'signal' : 'signals'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', TONE[d.category])}
              style={{ width: `${(d.weight / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
