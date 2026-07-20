import 'server-only';
import type { ImageType } from '@prisma/client';
import { isDemoImagingPath, resolveDemoImagingUrl } from '@/lib/demo/imaging-placeholders';
import { getSignedDownloadUrl } from '@/lib/storage/upload';

/** Resolves a public demo asset or a signed Supabase URL for an imaging study. */
export async function resolveImagingStorageUrl(
  storagePath: string | null | undefined,
  imageType: ImageType,
  bucket: string,
): Promise<string | null> {
  if (!storagePath || storagePath === 'pending') return null;
  if (isDemoImagingPath(storagePath)) {
    return resolveDemoImagingUrl(storagePath, imageType);
  }
  try {
    return await getSignedDownloadUrl(bucket, storagePath, 60 * 10);
  } catch {
    return null;
  }
}
