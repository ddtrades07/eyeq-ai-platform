'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Search } from 'lucide-react';

export function AskEyeQBar() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac'));
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }),
        );
      }}
      aria-label="Search or ask EyeQ"
      className="glass-ask relative hidden h-9 w-full max-w-xs items-center gap-2 overflow-hidden rounded-xl px-3 text-sm text-muted-foreground transition duration-lens sm:flex"
    >
      <span
        className="pointer-events-none absolute -right-4 -top-5 h-16 w-16 rounded-full bg-violet-400/20 blur-xl"
        aria-hidden
      />
      <Search className="relative h-3.5 w-3.5 shrink-0" />
      <span className="relative flex-1 text-left text-xs">Search or ask EyeQ…</span>
      <kbd className="relative rounded-md border border-border/70 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm dark:bg-white/10">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
      <span className="relative flex items-center gap-0.5 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
        <Sparkles className="h-3 w-3" />
        AI
      </span>
    </button>
  );
}
