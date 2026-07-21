'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight sticky panel: sticks within its section on large screens.
 * No JS scroll hijacking — CSS sticky only; disabled under reduced motion via CSS.
 */
export function StickyPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('lg:sticky lg:top-28 lg:self-start', className)}>{children}</div>
  );
}
