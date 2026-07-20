import { ArrowUp, ArrowDown, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CorrelationFactors, TimelineComparison } from '@/lib/imaging/types';

export function CorrelationCard({ factors }: { factors: CorrelationFactors }) {
  const hasAny =
    factors.supporting.length > 0 ||
    factors.reducing.length > 0 ||
    factors.missingInformation.length > 0;

  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Correlation Factors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {factors.supporting.length > 0 && (
          <FactorGroup
            label="Chart factors supporting concern"
            items={factors.supporting}
            icon={<ArrowUp className="h-3.5 w-3.5 text-amber-600" />}
            className="border-l-amber-400 bg-amber-50/50"
          />
        )}
        {factors.reducing.length > 0 && (
          <FactorGroup
            label="Chart factors reducing concern"
            items={factors.reducing}
            icon={<ArrowDown className="h-3.5 w-3.5 text-emerald-600" />}
            className="border-l-emerald-400 bg-emerald-50/50"
          />
        )}
        {factors.missingInformation.length > 0 && (
          <FactorGroup
            label="Missing information needed"
            items={factors.missingInformation}
            icon={<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />}
            className="border-l-gray-300 bg-gray-50/50"
          />
        )}
      </CardContent>
    </Card>
  );
}

function FactorGroup({
  label, items, icon, className,
}: {
  label: string;
  items: string[];
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className={`rounded-lg border-l-4 p-2.5 ${className}`}>
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
        {icon} {label}
      </div>
      <ul className="ml-5 list-disc space-y-0.5 text-muted-foreground">
        {items.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  );
}

// ── Timeline Comparison ──────────────────────────────────────────────

const TREND_STYLES = {
  stable: { label: 'Stable', class: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'possibly-worse': { label: 'Possibly worse', class: 'text-red-700 bg-red-50 border-red-200' },
  improved: { label: 'Improved', class: 'text-blue-700 bg-blue-50 border-blue-200' },
  inconclusive: { label: 'Inconclusive', class: 'text-gray-700 bg-gray-50 border-gray-200' },
} as const;

export function TimelineComparisonCard({ comparisons }: { comparisons: TimelineComparison[] }) {
  if (comparisons.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Imaging Timeline Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {comparisons.map((c, i) => {
          const style = TREND_STYLES[c.trend];
          return (
            <div key={i} className="rounded-lg border p-3 text-xs">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold">
                  {c.priorDate ? `Prior: ${c.priorDate}` : 'No prior study'}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.class}`}>
                  {style.label}
                </span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Prior:</strong> {c.priorFinding}</p>
                <p><strong>Current:</strong> {c.currentFinding}</p>
                <p className="text-foreground">{c.reason}</p>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground">
          Provider review recommended for all trend assessments.
        </p>
      </CardContent>
    </Card>
  );
}
