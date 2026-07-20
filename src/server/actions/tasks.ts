'use server';

import { z } from 'zod';
import { StaffTaskPriority } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

export const createStaffTask = action({
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    patientId: z.string().optional(),
    encounterId: z.string().optional(),
    appointmentId: z.string().optional(),
    assignedToId: z.string().optional(),
    priority: z.nativeEnum(StaffTaskPriority).optional(),
    dueAt: z.string().optional(),
  }),
  async handler(input) {
    const user = await assertPermission('tasks:manage');
    if (!user.organizationId) throw new Error('No organization');

    if (input.patientId) {
      const patient = await db.patient.findFirst({
        where: { id: input.patientId, organizationId: user.organizationId },
      });
      if (!patient) throw new Error('Patient not found');
    }

    const task = await db.staffTask.create({
      data: {
        organizationId: user.organizationId,
        title: input.title,
        description: input.description,
        patientId: input.patientId,
        encounterId: input.encounterId,
        appointmentId: input.appointmentId,
        assignedToId: input.assignedToId ?? user.id,
        priority: input.priority ?? 'NORMAL',
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        createdById: user.id,
        status: 'OPEN',
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'StaffTask',
      resourceId: task.id,
    });

    revalidatePath('/provider/tasks');
    return task;
  },
});

export const completeStaffTask = action({
  schema: z.object({ taskId: z.string().min(1) }),
  async handler({ taskId }) {
    const user = await assertPermission('tasks:manage');
    const task = await db.staffTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');
    assertSameOrg(user, task);

    const updated = await db.staffTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'StaffTask',
      resourceId: taskId,
      metadata: { status: 'COMPLETED' },
    });

    revalidatePath('/provider/tasks');
    return updated;
  },
});
