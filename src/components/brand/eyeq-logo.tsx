import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Use the official circular badge as-is. The cream plate matches landing
 * backgrounds and stays sharp. Do not use the broken processed “mark” crop.
 */
export const EYEQ_LOGO_SRC = '/brand/eyeq-logo-original.png';
export const EYEQ_MARK_SRC = '/brand/eyeq-logo-original.png';
export const EYEQ_ICON_SRC = '/brand/eyeq-logo-original.png';

/** Intrinsic size of the official badge asset. */
const INTRINSIC = { width: 1024, height: 1024 } as const;

const HEIGHT = {
  compact: { base: 'h-8 w-8', sm: null },
  nav: { base: 'h-10 w-10', sm: 'sm:h-11 sm:w-11' },
  md: { base: 'h-11 w-11', sm: 'sm:h-12 sm:w-12' },
  hero: { base: 'h-24 w-24', sm: 'sm:h-28 sm:w-28' },
} as const;

export type EyeQLogoSize = keyof typeof HEIGHT;
export type EyeQLogoVariant = 'full' | 'mark' | 'icon';

export type EyeQLogoProps = {
  size?: EyeQLogoSize;
  compact?: boolean;
  /** Kept for call-site compatibility; all variants use the official badge. */
  variant?: EyeQLogoVariant;
  className?: string;
  priority?: boolean;
};

/**
 * Official EyeQ logo. Always square + object-contain so it never squashes.
 */
export function EyeQLogo({
  size = 'nav',
  compact = false,
  className,
  priority = false,
}: EyeQLogoProps) {
  const sizeKey = compact ? 'compact' : size;
  const box = HEIGHT[sizeKey];

  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-transparent',
        box.base,
        box.sm,
        className,
      )}
    >
      <Image
        src={EYEQ_MARK_SRC}
        alt="EyeQ"
        width={INTRINSIC.width}
        height={INTRINSIC.height}
        priority={priority}
        sizes="96px"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export type BrandMarkProps = EyeQLogoProps & {
  caption?: string;
  captionClassName?: string;
};

export function BrandMark({
  caption,
  captionClassName,
  className,
  ...logoProps
}: BrandMarkProps) {
  if (!caption) {
    return <EyeQLogo className={className} {...logoProps} />;
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5 bg-transparent', className)}>
      <EyeQLogo {...logoProps} />
      <span className={cn('min-w-0 text-xs text-muted-foreground', captionClassName)}>
        {caption}
      </span>
    </span>
  );
}
