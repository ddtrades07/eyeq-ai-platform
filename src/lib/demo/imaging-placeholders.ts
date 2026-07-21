import type { ImageType } from '@prisma/client';

/** Prefix stored on demo imaging rows: no Supabase object required for pitch. */
export const DEMO_IMAGING_PATH_PREFIX = 'demo://';

const TYPE_TO_ASSET: Partial<Record<ImageType, string>> = {
  OCT: '/demo-imaging/oct.svg',
  FUNDUS: '/demo-imaging/fundus.svg',
  SLIT_LAMP: '/demo-imaging/slit-lamp.svg',
  EXTERNAL_PHOTO: '/demo-imaging/external.svg',
  OPTOS: '/demo-imaging/fundus.svg',
  VISUAL_FIELD: '/demo-imaging/visual-field.svg',
  TOPOGRAPHY: '/demo-imaging/topography.svg',
};

export function isDemoImagingPath(storagePath: string | null | undefined): boolean {
  return Boolean(storagePath?.startsWith(DEMO_IMAGING_PATH_PREFIX));
}

export function demoImagingStoragePath(imageType: ImageType): string {
  return `${DEMO_IMAGING_PATH_PREFIX}${imageType.toLowerCase()}`;
}

/** Public SVG used in the imaging viewer during demo mode pitches. */
export function resolveDemoImagingUrl(
  storagePath: string | null | undefined,
  imageType: ImageType,
): string | null {
  if (!isDemoImagingPath(storagePath)) return null;
  const key = storagePath!.slice(DEMO_IMAGING_PATH_PREFIX.length);
  if (key) {
    const byKey = `/demo-imaging/${key.replace(/_/g, '-')}.svg`;
    if (key.includes('.')) return byKey;
    const mapped = TYPE_TO_ASSET[imageType];
    if (mapped) return mapped;
    return byKey;
  }
  return TYPE_TO_ASSET[imageType] ?? '/demo-imaging/default.svg';
}
