import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Full transparent lockup (icon + wordmark + taglines). */
export const EYEQ_LOGO_SRC = '/brand/eyeq-logo.png';
/** Nav-compact horizontal mark (icon + EYE Q, no cream plate / taglines). */
export const EYEQ_MARK_SRC = '/brand/eyeq-mark.png';
/** Eye-only mark for collapsed chrome. */
export const EYEQ_ICON_SRC = '/brand/eyeq-icon.png';

const INTRINSIC = {
  /** Transparent full badge crop */
  full: { width: 606, height: 672 },
  /** Horizontal eye + wordmark */
  mark: { width: 1524, height: 324 },
  /** Eye glyph only */
  icon: { width: 548, height: 324 },
} as const;

const SIZE_CLASS = {
  /** Collapsed sidebar / mobile drawer (icon glyph) */
  compact: 'h-8 max-h-8 w-auto',
  /** Landing + app headers */
  nav: 'h-9 max-h-9 w-auto sm:h-10 sm:max-h-10',
  /** Auth header / expanded emphasis */
  md: 'h-10 max-h-10 w-auto sm:h-11 sm:max-h-11',
  /** Marketing hero */
  hero: 'h-24 max-h-24 w-auto sm:h-28 sm:max-h-28',
} as const;

const SRC: Record<keyof typeof INTRINSIC, string> = {
  full: EYEQ_LOGO_SRC,
  mark: EYEQ_MARK_SRC,
  icon: EYEQ_ICON_SRC,
};

export type EyeQLogoSize = keyof typeof SIZE_CLASS;
export type EyeQLogoVariant = keyof typeof INTRINSIC;

export type EyeQLogoProps = {
  /** Preset height; width stays auto (object-contain). */
  size?: EyeQLogoSize;
  /** Prefer icon-only asset at compact chrome sizes. */
  compact?: boolean;
  /**
   * `mark` = horizontal eye + EYE Q (default for chrome).
   * `icon` = eye glyph only (collapsed sidebar).
   * `full` = stacked lockup with taglines (hero / OG).
   */
  variant?: EyeQLogoVariant;
  className?: string;
  priority?: boolean;
};

/**
 * Official EyeQ brand mark on a transparent background (cream plate + shadow removed).
 * Do not duplicate “EyeQ” / tagline text beside the image.
 */
export function EyeQLogo({
  size = 'nav',
  compact = false,
  variant,
  className,
  priority = false,
}: EyeQLogoProps) {
  const sizeKey = compact ? 'compact' : size;
  const resolvedVariant: EyeQLogoVariant =
    variant ?? (compact ? 'icon' : sizeKey === 'hero' ? 'full' : 'mark');
  const intrinsic = INTRINSIC[resolvedVariant];

  return (
    <Image
      src={SRC[resolvedVariant]}
      alt="EyeQ"
      width={intrinsic.width}
      height={intrinsic.height}
      priority={priority}
      sizes={
        resolvedVariant === 'icon'
          ? '40px'
          : resolvedVariant === 'full'
            ? '(max-width: 640px) 96px, 128px'
            : '(max-width: 640px) 140px, 180px'
      }
      className={cn(
        'bg-transparent object-contain shadow-none drop-shadow-none',
        SIZE_CLASS[sizeKey],
        className,
      )}
    />
  );
}

export type BrandMarkProps = EyeQLogoProps & {
  /** Optional contextual label beside the mark (not brand name/tagline). */
  caption?: string;
  captionClassName?: string;
};

/** Logo plus an optional short context caption (e.g. “Patient portal”). */
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
