'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const createSchema = z.object({
  category: z.nativeEnum(SupportTicketCategory),
  priority: z.nativeEnum(SupportTicketPriority).default('NORMAL'),
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(8000),
  mayContainPhi: z.boolean().default(false),
  relatedPatientId: z.string().optional().nullable(),
});

export const createSupportTicket = action({
  schema: createSchema,
  async handler(input) {
    const user = await assertPermission('org:read');
    if (!user.organizationId) throw new Error('No organization context');

    if (input.relatedPatientId) {
      const patient = await db.patient.findFirst({
        where: { id: input.relatedPatientId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!patient) throw new Error('Related patient not found in this organization');
    }

    const ticket = await db.supportTicket.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        category: input.category,
        priority: input.priority,
        subject: input.subject,
        description: input.description,
        mayContainPhi: input.mayContainPhi,
        relatedPatientId: input.relatedPatientId || null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'SupportTicket',
      resourceId: ticket.id,
      metadata: {
        category: ticket.category,
        mayContainPhi: ticket.mayContainPhi,
      },
    });

    revalidatePath('/provider/support');
    return { id: ticket.id };
  },
});

const updateSchema = z.object({
  ticketId: z.string().min(1),
  status: z.nativeEnum(SupportTicketStatus).optional(),
  assignedToId: z.string().optional().nullable(),
  securityConcern: z.boolean().optional(),
  resolution: z.string().max(8000).optional().nullable(),
  internalNote: z.string().max(4000).optional().nullable(),
});

export const updateSupportTicket = action({
  schema: updateSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.supportTicket.findFirst({
      where: { id: input.ticketId, organizationId: user.organizationId },
    });
    if (!existing) throw new Error('Ticket not found');

    const now = new Date();
    const ticket = await db.supportTicket.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        assignedToId: input.assignedToId === undefined ? undefined : input.assignedToId,
        securityConcern: input.securityConcern,
        resolution: input.resolution === undefined ? undefined : input.resolution,
        resolvedAt:
          input.status === 'RESOLVED' || input.status === 'CLOSED' ? now : undefined,
        closedAt: input.status === 'CLOSED' ? now : undefined,
      },
    });

    if (input.internalNote?.trim()) {
      await db.supportTicketNote.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          body: input.internalNote.trim(),
          isInternal: true,
        },
      });
    }

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'SupportTicket',
      resourceId: ticket.id,
      previousStatus: existing.status,
      newStatus: ticket.status,
      metadata: {
        securityConcern: ticket.securityConcern,
      },
    });

    revalidatePath('/provider/support');
    revalidatePath(`/provider/support/${ticket.id}`);
    return { id: ticket.id };
  },
});
