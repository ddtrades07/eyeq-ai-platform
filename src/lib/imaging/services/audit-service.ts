import 'server-only';
import { db } from '@/lib/db';
import type { ImagingAuditAction, Prisma } from '@prisma/client';

export async function logImagingAudit(args: {
  organizationId: string;
  locationId?: string | null;
  patientId?: string | null;
  imagingCaseId?: string | null;
  userId?: string | null;
  action: ImagingAuditAction;
  details?: Record<string, unknown>;
  requestId?: string;
}) {
  await db.imagingAuditEvent.create({
    data: {
      organizationId: args.organizationId,
      locationId: args.locationId ?? undefined,
      patientId: args.patientId ?? undefined,
      imagingCaseId: args.imagingCaseId ?? undefined,
      userId: args.userId ?? undefined,
      action: args.action,
      details: (args.details ?? undefined) as Prisma.InputJsonValue | undefined,
      requestId: args.requestId ?? crypto.randomUUID(),
    },
  });
}
