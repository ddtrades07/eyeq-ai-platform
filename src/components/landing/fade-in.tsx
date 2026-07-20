'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progressive fade-in. Content stays visible on SSR and if hydration fails.
 * Animation only activates for below-the-fold sections after mount.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [enhance, setEnhance] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const inView = el.getBoundingClientRect().top < window.innerHeight - 40;
    if (inView) {
      setVisible(true);
      return;
    }

    // Below fold: hide then reveal on scroll (only after mount so SSR stays visible)
    setVisible(false);
    setEnhance(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);

    const failSafe = window.setTimeout(() => setVisible(true), 2000);
    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        enhance && 'transition-all duration-700 ease-out motion-reduce:transition-none',
        !enhance || visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      style={enhance && visible ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
