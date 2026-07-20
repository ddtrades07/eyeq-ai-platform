import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';

/**
 * Service-role storage client, bypasses RLS to mint signed URLs.
 * Never expose the service-role key to the browser; this file is
 * marked `server-only` and is only imported from server contexts.
 */
function adminClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Cannot issue signed uploads.',
    );
  }
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

export type SignedUpload = {
  bucket: string;
  path: string;
  uploadUrl: string;
  token: string;
  expiresIn: number;
};

/**
 * Generates a one-time signed URL for direct browser uploads.
 * The caller stores the returned `path` on the corresponding `ImagingCase`
 * row. Subsequent reads should go through {@link getSignedDownloadUrl}.
 */
export async function createImagingUploadUrl(args: {
  organizationId: string;
  patientId: string;
  imagingCaseId: string;
  extension: string;
}): Promise<SignedUpload> {
  const bucket = serverEnv.storageBucketImaging;
  const ext = args.extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const path = `${args.organizationId}/${args.patientId}/${args.imagingCaseId}.${ext}`;

  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create upload URL');
  }

  return {
    bucket,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    expiresIn: 60 * 5,
  };
}

/**
 * Returns a short-lived signed URL for fetching an imaging file.
 * Always check the caller is in the owning org BEFORE calling this.
 */
/** Signed upload slot for ambient scribe audio (documents bucket). */
export async function createScribeAudioUploadUrl(args: {
  organizationId: string;
  sessionId: string;
  extension?: string;
}): Promise<SignedUpload> {
  const bucket = serverEnv.storageBucketDocuments;
  const ext = (args.extension ?? 'webm').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'webm';
  const path = `${args.organizationId}/scribe/${args.sessionId}.${ext}`;

  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create scribe upload URL');
  }

  return {
    bucket,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    expiresIn: 60 * 5,
  };
}

export async function getSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresIn = 300,
): Promise<string> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create signed URL');
  }
  return data.signedUrl;
}
