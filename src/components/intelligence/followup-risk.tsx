import { cn } from '@/lib/utils';
import type { PatientIntelligence } from '@/lib/intelligence/types';

const BAND_STYLES: Record<
  PatientIntelligence['followUpRisk']['band'],
  { label: string; bar: string; chip: string }
> = {
  low: {
    label: 'Low',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  moderate: {
    label: 'Moderate',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  elevated: {
    label: 'Elevated',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  high: {
    label: 'High',
    bar: 'bg-destructive',
    chip: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function FollowUpRiskCard({ risk }: { risk: PatientIntelligence['followUpRisk'] }) {
  const style = BAND_STYLES[risk.band];
  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-up risk
          </div>
          <div className="text-2xl font-semibold tabular-nums">{risk.score}</div>
        </div>
        <span
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs font-medium',
            style.chip,
          )}
        >
          {style.label}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', style.bar)}
          style={{ width: `${risk.score}%` }}
        />
      </div>

      {risk.factors.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {risk.factors.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No specific follow-up risk drivers identified.
        </p>
      )}

      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Heuristic score · provider review recommended
      </p>
    </div>
  );
}
