'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopilotStore } from '@/store/copilot';
import { cn } from '@/lib/utils';

/**
 * Floating trigger button for the Ask EyeQ copilot panel.
 * Placed in the bottom-right corner of the layout.
 */
export function CopilotTrigger() {
  const { open, toggle, loading } = useCopilotStore();

  return (
    <Button
      onClick={toggle}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 gap-2 rounded-full px-6 shadow-xl transition-all',
        'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
        'text-white',
        open && 'ring-2 ring-indigo-400 ring-offset-2',
      )}
      aria-label="Ask EyeQ AI"
    >
      <Sparkles className={cn('h-5 w-5', loading && 'animate-pulse')} />
      <span className="font-semibold">Ask EyeQ</span>
    </Button>
  );
}
