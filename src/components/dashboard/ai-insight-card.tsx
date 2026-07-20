import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { StatusChip } from '@/components/ui/status-chip';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AiInsightItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  count?: number;
};

export function AIInsightCard({
  items,
  className,
}: {
  items: AiInsightItem[];
  className?: string;
}) {
  const visible = items.filter((i) => (i.count === undefined ? true : i.count > 0));

  return (
    <GlassCard tone="ai" className={cn('overflow-hidden', className)}>
      <GlassCardHeader className="relative">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/15 blur-2xl"
          aria-hidden
        />
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <GlassCardTitle>EyeQ AI</GlassCardTitle>
            <GlassCardDescription className="mt-1">
              Provider review required. These are support signals, not diagnoses.
            </GlassCardDescription>
          </div>
        </div>
        <StatusChip tone="ai" className="mt-3 w-fit">
          Review required
        </StatusChip>
      </GlassCardHeader>
      <GlassCardContent className="space-y-2">
        {visible.length === 0 ? (
          <p className="rounded-lg border border-violet-200/40 bg-white/50 px-3 py-4 text-sm text-muted-foreground dark:bg-white/5">
            No AI items awaiting review right now.
          </p>
        ) : (
          visible.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200/40 bg-white/60 px-3 py-2.5 dark:bg-white/5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                  {typeof item.count === 'number' ? (
                    <span className="ml-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                      {item.count}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'h-8')}
                >
                  Review
                </Link>
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'h-8')}
                >
                  Open
                </Link>
              </div>
            </div>
          ))
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/provider/tasks" className={cn(buttonVariants({ size: 'sm' }), 'h-8')}>
            Open review queue
          </Link>
          <Link
            href="/provider/copilots"
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'h-8')}
          >
            Ask EyeQ
          </Link>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
