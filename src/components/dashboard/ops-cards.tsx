import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card';
import { StatusChip } from '@/components/ui/status-chip';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AttentionCard({
  title,
  children,
  href,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <GlassCard tone="strong">
      <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <GlassCardTitle>{title}</GlassCardTitle>
        {href ? (
          <Link href={href} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View all
          </Link>
        ) : null}
      </GlassCardHeader>
      <GlassCardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </GlassCardContent>
    </GlassCard>
  );
}

export function AttentionRow({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  if (count <= 0) return null;
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-border/70 bg-white/65 px-3 py-2.5 text-sm transition-colors duration-lens hover:border-primary/30 hover:bg-white/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <span>{label}</span>
      <StatusChip tone="warning">{count}</StatusChip>
    </Link>
  );
}

export function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'glass-card glass-card-interactive flex items-center gap-2 px-3 py-2.5 text-sm font-medium',
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

export function QueueCard({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: Array<{
    id: string;
    label: string;
    meta: string;
    waitingMinutes?: number;
    href: string;
    stage: string;
  }>;
}) {
  return (
    <GlassCard tone="strong">
      <GlassCardHeader>
        <GlassCardTitle>{title}</GlassCardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </GlassCardHeader>
      <GlassCardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-white/60 px-3 py-4 text-sm text-muted-foreground dark:bg-white/[0.04]">
            No patients currently in this queue.
          </p>
        ) : (
          items.map((item) => {
            const overdue = (item.waitingMinutes ?? 0) >= 20;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors duration-lens',
                  overdue
                    ? 'border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-border/70 bg-white/65 dark:bg-white/[0.04]',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={overdue ? 'warning' : 'aqua'}>{item.stage}</StatusChip>
                  {typeof item.waitingMinutes === 'number' ? (
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        overdue ? 'font-semibold text-amber-800 dark:text-amber-200' : 'text-muted-foreground',
                      )}
                    >
                      {item.waitingMinutes}m
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
