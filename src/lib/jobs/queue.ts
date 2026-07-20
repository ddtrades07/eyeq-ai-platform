import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { BackgroundJobStatus } from '@prisma/client';

export type JobType =
  | 'generate-pre-chart'
  | 'summarize-imaging'
  | 'generate-instructions'
  | 'summarize-day'
  | 'rank-recalls'
  | 'send-reminder-campaign'
  | 'ehr-sync'
  | 'embed-knowledge-document';

export async function enqueueBackgroundJob(args: {
  type: JobType;
  organizationId: string;
  patientId?: string;
  createdById?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: Date;
}) {
  return db.backgroundJob.create({
    data: {
      organizationId: args.organizationId,
      type: args.type,
      patientId: args.patientId ?? null,
      createdById: args.createdById ?? null,
      payload: (args.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      scheduledFor: args.scheduledFor ?? null,
      status: 'QUEUED',
    },
  });
}

export async function claimNextJobs(limit = 5) {
  const now = new Date();
  const queued = await db.backgroundJob.findMany({
    where: {
      status: 'QUEUED',
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const claimed = [];
  for (const job of queued) {
    const updated = await db.backgroundJob.updateMany({
      where: { id: job.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', startedAt: now, attempts: { increment: 1 } },
    });
    if (updated.count === 1) {
      claimed.push(await db.backgroundJob.findUniqueOrThrow({ where: { id: job.id } }));
    }
  }
  return claimed;
}

export async function completeJob(
  id: string,
  result: Record<string, unknown> | null,
  errorMessage?: string,
) {
  const status: BackgroundJobStatus = errorMessage ? 'FAILED' : 'COMPLETED';
  return db.backgroundJob.update({
    where: { id },
    data: {
      status,
      result: (result ?? undefined) as Prisma.InputJsonValue | undefined,
      errorMessage: errorMessage ?? null,
      completedAt: new Date(),
    },
  });
}

export async function listBackgroundJobs(organizationId: string, take = 50) {
  return db.backgroundJob.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
