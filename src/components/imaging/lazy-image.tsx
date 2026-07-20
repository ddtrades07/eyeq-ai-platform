'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lazy-loading image component for imaging studies.
 * Uses IntersectionObserver to defer loading until the image
 * scrolls into view. Shows a styled placeholder until loaded.
 */
export function LazyImage({
  src,
  alt,
  className,
  aspectRatio = 'aspect-[4/3]',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspectRatio?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        aspectRatio,
        className,
      )}
    >
      {(!src || error) ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
        </div>
      ) : inView ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-6 w-6 animate-pulse rounded-full bg-muted-foreground/20" />
        </div>
      )}
    </div>
  );
}
