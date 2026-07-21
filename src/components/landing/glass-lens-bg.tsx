'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Subtle glass-lens animated background for the hero.
 * CSS-only; disabled under prefers-reduced-motion. Lazy-mounted after idle.
 */
export function GlassLensBg({ className }: { className?: string }) {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const start = () => setActive(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(start, 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(91,138,138,0.14),transparent)]" />
      {active ? (
        <>
          <div className="landing-lens landing-lens-a" />
          <div className="landing-lens landing-lens-b" />
          <div className="landing-lens landing-lens-c" />
        </>
      ) : null}
    </div>
  );
}
