import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMAGING = process.env.SUPABASE_STORAGE_BUCKET_IMAGING || 'imaging';
const DOCS = process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'documents';

if (!URL || !SVC) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function ensureBucket(name, opts) {
  const { data: existing } = await admin.storage.getBucket(name);
  if (existing) {
    console.log(`bucket "${name}" already exists`);
    return;
  }
  const { error } = await admin.storage.createBucket(name, {
    public: false,
    fileSizeLimit: opts.fileSizeLimit,
    allowedMimeTypes: opts.allowedMimeTypes,
  });
  if (error) {
    console.error(`failed to create bucket "${name}":`, error.message);
    process.exit(2);
  }
  console.log(`created bucket "${name}"`);
}

await ensureBucket(IMAGING, {
  fileSizeLimit: '50MB',
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/tiff',
    'image/bmp',
    'application/dicom',
    'application/octet-stream',
  ],
});

await ensureBucket(DOCS, {
  fileSizeLimit: '25MB',
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/csv',
  ],
});

console.log('storage ready.');
