'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, type ComponentProps } from 'react';

/**
 * A Link that prefetches the destination route on hover/focus,
 * making navigation feel instant. Uses Next.js router.prefetch.
 */
export function PrefetchLink(props: ComponentProps<typeof Link>) {
  const router = useRouter();
  const href = typeof props.href === 'string' ? props.href : props.href.pathname ?? '';

  const handleMouseEnter = useCallback(() => {
    if (href) router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      {...props}
      onMouseEnter={(e) => {
        handleMouseEnter();
        props.onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        handleMouseEnter();
        props.onFocus?.(e);
      }}
    />
  );
}
