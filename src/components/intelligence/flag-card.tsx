import { AlertTriangle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { InsightFlag, InsightSeverity } from '@/lib/intelligence/types';

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { badge: 'destructive' | 'warning' | 'info' | 'secondary'; tint: string; icon: typeof Info; label: string }
> = {
  urgent: {
    badge: 'destructive',
    tint: 'border-destructive/50 bg-destructive/[0.04]',
    icon: ShieldAlert,
    label: 'Urgent',
  },
  priority: {
    badge: 'destructive',
    tint: 'border-amber-300/60 bg-amber-50/40',
    icon: AlertTriangle,
    label: 'Priority',
  },
  attention: {
    badge: 'warning',
    tint: 'border-amber-200/60 bg-amber-50/20',
    icon: AlertTriangle,
    label: 'Attention',
  },
  info: {
    badge: 'secondary',
    tint: 'border-border bg-muted/30',
    icon: Info,
    label: 'Info',
  },
};

export function FlagCard({ flag }: { flag: InsightFlag }) {
  const style = SEVERITY_STYLES[flag.severity];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        'rounded-md border p-3 text-sm transition-colors',
        style.tint,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="space-y-0.5">
            <div className="font-medium leading-tight">{flag.message}</div>
            {flag.detail ? (
              <p className="text-xs text-muted-foreground">{flag.detail}</p>
            ) : null}
          </div>
        </div>
        <Badge variant={style.badge}>{style.label}</Badge>
      </div>

      {flag.why.length > 0 ? (
        <div className="mt-3 rounded border bg-background/60 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Why EyeQ flagged this
          </div>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {flag.why.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {flag.suggestion ? (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Suggestion: {flag.suggestion}
        </p>
      ) : null}
    </div>
  );
}

export function FlagList({
  flags,
  emptyMessage = 'No signals in this category.',
}: {
  flags: InsightFlag[];
  emptyMessage?: string;
}) {
  if (flags.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {flags.map((f) => (
        <FlagCard key={f.id} flag={f} />
      ))}
    </div>
  );
}
