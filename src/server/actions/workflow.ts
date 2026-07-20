'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AppointmentType } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const workflowSchema = z.object({
  appointmentType: z.nativeEnum(AppointmentType),
  name: z.string().min(1).max(120),
  durationMinutes: z.number().int().min(5).max(480),
  pretestSteps: z.array(z.string().max(200)).max(30),
  imagingSteps: z.array(z.string().max(200)).max(20),
  carePathwaySteps: z.array(z.string().max(200)).max(20),
});

export const saveVisitWorkflow = action({
  schema: workflowSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const template = await db.visitWorkflowTemplate.upsert({
      where: {
        organizationId_appointmentType: {
          organizationId: user.organizationId,
          appointmentType: input.appointmentType,
        },
      },
      create: {
        organizationId: user.organizationId,
        appointmentType: input.appointmentType,
        name: input.name,
        durationMinutes: input.durationMinutes,
        pretestSteps: input.pretestSteps,
        imagingSteps: input.imagingSteps,
        carePathwaySteps: input.carePathwaySteps,
      },
      update: {
        name: input.name,
        durationMinutes: input.durationMinutes,
        pretestSteps: input.pretestSteps,
        imagingSteps: input.imagingSteps,
        carePathwaySteps: input.carePathwaySteps,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'VisitWorkflowTemplate',
      resourceId: template.id,
      metadata: { appointmentType: input.appointmentType },
    });

    revalidatePath('/provider/workflow-builder');
    return template;
  },
});
