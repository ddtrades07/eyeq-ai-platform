'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CareGapStatus, CareGapType, Role } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const createSchema = z.object({
  patientId: z.string(),
  type: z.nativeEnum(CareGapType),
  priority: z.coerce.number().int().min(0).max(3).default(2),
  dueDate: z.coerce.date().optional().nullable(),
  reason: z.string().max(400).optional().nullable(),
  suggestedAction: z.string().max(400).optional().nullable(),
  assignedRole: z.nativeEnum(Role).optional().nullable(),
});

export const createCareGap = action({
  schema: createSchema,
  async handler(input) {
    const user = await assertPermission('caregaps:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const gap = await db.careGap.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        type: input.type,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        reason: input.reason ?? null,
        suggestedAction: input.suggestedAction ?? null,
        assignedRole: input.assignedRole ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'CareGap',
      resourceId: gap.id,
    });

    revalidatePath('/provider/care-gaps');
    return gap;
  },
});

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(CareGapStatus),
});

export const setCareGapStatus = action({
  schema: updateStatusSchema,
  async handler({ id, status }) {
    const user = await assertPermission('caregaps:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const gap = await db.careGap.findUnique({ where: { id } });
    if (!gap) throw new Error('Care gap not found');
    assertSameOrg(user, gap);

    const updated = await db.careGap.update({
      where: { id },
      data: {
        status,
        lastContactedAt:
          status === CareGapStatus.CONTACTED ? new Date() : gap.lastContactedAt,
        resolvedAt:
          status === CareGapStatus.BOOKED || status === CareGapStatus.DISMISSED
            ? new Date()
            : null,
        resolvedById:
          status === CareGapStatus.BOOKED || status === CareGapStatus.DISMISSED
            ? user.id
            : null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'CareGap',
      resourceId: id,
      metadata: { status },
    });

    revalidatePath('/provider/care-gaps');
    return updated;
  },
});

/**
 * Best-effort job that scans for overdue items and seeds CareGap rows.
 * Idempotent, uses (patientId, type) as the de-duplication key.
 * Real production deployments should run this on a scheduled CRON
 * (e.g. Supabase cron, Vercel Cron, or a worker), exposing it as an
 * action lets us trigger it from settings during early development.
 */
export const recomputeCareGaps = action({
  schema: z.object({}).optional(),
  async handler() {
    const user = await assertPermission('caregaps:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const patients = await db.patient.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      include: {
        appointments: {
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
    });

    let createdCount = 0;
    for (const p of patients) {
      const lastVisit = p.appointments[0]?.startsAt ?? null;
      if (!lastVisit || lastVisit < oneYearAgo) {
        const existing = await db.careGap.findFirst({
          where: {
            organizationId: user.organizationId,
            patientId: p.id,
            type: CareGapType.ANNUAL_EXAM_OVERDUE,
            status: { in: [CareGapStatus.DUE, CareGapStatus.OVERDUE, CareGapStatus.CONTACTED] },
          },
        });
        if (!existing) {
          await db.careGap.create({
            data: {
              organizationId: user.organizationId,
              patientId: p.id,
              type: CareGapType.ANNUAL_EXAM_OVERDUE,
              status: CareGapStatus.OVERDUE,
              priority: 2,
              dueDate: new Date(),
              suggestedAction: 'Outreach to schedule an annual exam.',
              assignedRole: Role.FRONT_DESK,
            },
          });
          createdCount++;
        }
      }
    }

    revalidatePath('/provider/care-gaps');
    return { created: createdCount };
  },
});
