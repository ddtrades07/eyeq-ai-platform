import Link from 'next/link';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Pill,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import type { TimelineEvent } from '@/lib/intelligence/types';

const ICONS = {
  appointment: CalendarDays,
  imaging: ImageIcon,
  note: FileText,
  prescription: Pill,
  care_gap: ClipboardList,
  message: MessageSquare,
  recommendation: Sparkles,
} as const;

const TONE_DOT: Record<NonNullable<TimelineEvent['tone']>, string> = {
  neutral: 'bg-muted-foreground/40',
  positive: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-destructive',
};

export function LongitudinalTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        No history yet. As this patient is seen, every encounter will land on
        this timeline.
      </p>
    );
  }

  // Group by year for an annual axis.
  const groups = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    const y = e.at.getFullYear();
    const list = groups.get(y) ?? [];
    list.push(e);
    groups.set(y, list);
  }
  const years = Array.from(groups.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {years.map((year) => (
        <div key={year} className="relative pl-6">
          <div className="absolute left-0 top-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {year}
          </div>
          <div className="absolute left-[7px] top-5 h-full w-px bg-border" />
          <ul className="space-y-3 pt-5">
            {(groups.get(year) ?? []).map((e) => {
              const Icon = ICONS[e.kind];
              const tone = e.tone ?? 'neutral';
              const dot = TONE_DOT[tone];
              const inner = (
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                      dot,
                    )}
                  />
                  <div className="flex-1 rounded-md border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {e.title}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(e.at)}
                      </span>
                    </div>
                    {e.detail ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
              return (
                <li key={e.id}>
                  {e.href ? (
                    <Link href={e.href} className="block hover:opacity-90">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
