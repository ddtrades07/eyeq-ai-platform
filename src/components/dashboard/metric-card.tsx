import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = 'default',
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: 'default' | 'warning' | 'destructive' | 'success' | 'ai';
}) {
  const accentClass = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
    ai: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  }[accent];

  const card = (
    <GlassCard
      interactive={Boolean(href)}
      className={cn(href && 'focus-within:ring-2 focus-within:ring-ring')}
    >
      <GlassCardContent className="flex items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/40',
            accentClass,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
      </GlassCardContent>
    </GlassCard>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}
