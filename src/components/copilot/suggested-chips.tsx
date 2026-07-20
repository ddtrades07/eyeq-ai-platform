'use client';

import type { SuggestedPrompt } from '@/lib/ai/copilot/types';
import { cn } from '@/lib/utils';

interface SuggestedChipsProps {
  prompts: SuggestedPrompt[];
  onSelect: (prompt: string) => void;
  className?: string;
}

export function SuggestedChips({
  prompts,
  onSelect,
  className,
}: SuggestedChipsProps) {
  if (prompts.length === 0) return null;

  const grouped = prompts.reduce<Record<string, SuggestedPrompt[]>>(
    (acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    },
    {},
  );

  return (
    <div className={cn('space-y-3', className)}>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <button
                key={item.prompt}
                type="button"
                onClick={() => onSelect(item.prompt)}
                className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface FollowUpChipsProps {
  followUps: string[];
  onSelect: (prompt: string) => void;
}

export function FollowUpChips({ followUps, onSelect }: FollowUpChipsProps) {
  if (followUps.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {followUps.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onSelect(f)}
          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
        >
          {f}
        </button>
      ))}
    </div>
  );
}
