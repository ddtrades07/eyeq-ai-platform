'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const HIDDEN_TRANSFORM: Record<Direction, string> = {
  up: 'translateY(20px)',
  down: 'translateY(-20px)',
  left: 'translateX(20px)',
  right: 'translateX(-20px)',
  none: 'none',
};

/**
 * Visible scroll / mount reveal for marketing pages.
 * SSR + reduced-motion: fully visible (SEO / a11y).
 * Client with motion: after hydration, starts hidden then reveals once in view
 * (hero / above-fold can use animateOnMount for an immediate entrance).
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  blur = false,
  durationMs = 600,
  animateOnMount = false,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms once the element becomes visible. */
  delay?: number;
  direction?: Direction;
  /** Soft blur while hidden (skipped under reduced motion). */
  blur?: boolean;
  durationMs?: number;
  /**
   * When true, reveal on mount without waiting for IntersectionObserver
   * (use for hero / above-the-fold).
   */
  animateOnMount?: boolean;
  /** Animate only the first time the element enters view. */
  once?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  // SSR / first paint: visible. Motion clients flip to hidden after mount.
  const [ready, setReady] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [allowMotion, setAllowMotion] = React.useState(false);

  React.useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAllowMotion(false);
      setVisible(true);
      setReady(true);
      return;
    }

    setAllowMotion(true);
    setVisible(false);
    setReady(true);

    if (animateOnMount) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);

    // Failsafe so content never stays invisible if IO never fires.
    const failSafe = window.setTimeout(() => setVisible(true), 3500);
    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, [animateOnMount, once]);

  const motionActive = ready && allowMotion;
  const shown = !motionActive || visible;

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={
        motionActive
          ? {
              opacity: shown ? 1 : 0,
              transform: shown ? 'none' : HIDDEN_TRANSFORM[direction],
              filter: blur ? (shown ? 'blur(0px)' : 'blur(6px)') : undefined,
              transitionProperty: blur
                ? 'opacity, transform, filter'
                : 'opacity, transform',
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDelay: shown ? `${delay}ms` : '0ms',
              willChange: shown ? undefined : 'opacity, transform',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/** Stagger children with incremental ScrollReveal delays. */
export function ScrollStagger({
  children,
  className,
  baseDelay = 0,
  step = 80,
  blur = false,
  direction = 'up',
  animateOnMount = false,
}: {
  children: React.ReactNode;
  className?: string;
  baseDelay?: number;
  step?: number;
  blur?: boolean;
  direction?: Direction;
  animateOnMount?: boolean;
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <ScrollReveal
          key={i}
          delay={baseDelay + i * step}
          blur={blur}
          direction={direction}
          animateOnMount={animateOnMount}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
