'use client';

import { Sparkles } from 'lucide-react';

/** Compact demo banner for video recording / sales walkthroughs. */
export function RecordingDemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-200/80 bg-amber-50/90 px-4 py-1.5 text-xs text-amber-950">
      <Sparkles className="h-3.5 w-3.5" />
      <span className="font-semibold tracking-wide">Demo environment</span>
      <span className="hidden text-amber-900/80 sm:inline">
        · Synthetic data · Not a live clinic · AI drafts require provider review
      </span>
    </div>
  );
}
