/**
 * Background AI jobs — durable DB-backed queue.
 * @see src/lib/jobs/queue.ts and src/lib/jobs/processor.ts
 */

export type { JobType } from '@/lib/jobs/queue';
export {
  enqueueBackgroundJob as enqueueJob,
  listBackgroundJobs as listJobs,
} from '@/lib/jobs/queue';

import { listBackgroundJobs } from '@/lib/jobs/queue';

/** @deprecated Use listBackgroundJobs from queue module */
export async function getJob(id: string) {
  const { db } = await import('@/lib/db');
  return db.backgroundJob.findUnique({ where: { id } });
}

export async function seedPrecomputedSummaries(_organizationId: string): Promise<void> {
  // Precomputed summaries now generated via background jobs when configured.
}

export function getPrecomputedSummary(_key: string): null {
  return null;
}

export function setPrecomputedSummary(_key: string, _content: string): void {
  // No-op; use background jobs.
}

export { listBackgroundJobs };
