import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';
import type { TodayInsight } from '@/lib/intelligence/types';

const SEVERITY_BADGE: Record<
  TodayInsight['reasons'][number]['severity'],
  'destructive' | 'warning' | 'info' | 'secondary'
> = {
  urgent: 'destructive',
  priority: 'destructive',
  attention: 'warning',
  info: 'secondary',
};

export function TodayInsightsCard({ insights }: { insights: TodayInsight[] }) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Why this patient matters
          today
        </CardTitle>
        <Link
          href="/provider/timeline-intelligence"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open Timeline Intelligence <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {insights.map((i) => (
            <li
              key={i.patientId}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
            >
              <div className="space-y-1">
                <Link
                  href={`/provider/timeline-intelligence/${i.patientId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {i.patientName}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatTime(i.startsAt)} · {i.appointmentType}
                </div>
              </div>
              <div className="flex max-w-md flex-col items-start gap-1.5 md:items-end">
                {i.reasons.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-xs">
                    <Badge
                      variant={SEVERITY_BADGE[r.severity]}
                      className="shrink-0"
                    >
                      {r.severity}
                    </Badge>
                    <span className="leading-snug text-muted-foreground">
                      {r.message}
                    </span>
                  </div>
                ))}
                {i.reasons.length > 3 ? (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    +{i.reasons.length - 3} more signal{i.reasons.length - 3 > 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Heuristic signals, provider review recommended. Never asserts a
          diagnosis.
        </p>
      </CardContent>
    </Card>
  );
}
