'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progressive fade / lift / blur-to-clear. SSR stays visible; motion enhances after mount.
 * Respects prefers-reduced-motion.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  blur = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Soft blur-to-clear on reveal (disabled under reduced motion). */
  blur?: boolean;
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

  const shown = !enhance || visible;

  return (
    <div
      ref={ref}
      className={cn(
        enhance &&
          'transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        blur && enhance && !shown ? 'blur-sm' : blur && enhance ? 'blur-0' : undefined,
        className,
      )}
      style={enhance && shown ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Stagger children with incremental FadeIn delays. */
export function Stagger({
  children,
  className,
  baseDelay = 0,
  step = 70,
  blur = false,
}: {
  children: React.ReactNode;
  className?: string;
  baseDelay?: number;
  step?: number;
  blur?: boolean;
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <FadeIn key={i} delay={baseDelay + i * step} blur={blur}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
