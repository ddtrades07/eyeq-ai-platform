'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MessageChannel, MessageDirection, MessageReadStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const startThreadSchema = z.object({
  patientId: z.string().optional().nullable(),
  subject: z.string().min(1).max(200),
  category: z.enum(['general', 'clinical', 'scheduling', 'billing', 'rx']).default('general'),
  body: z.string().min(1).max(4000),
  isInternal: z.boolean().default(false),
});

export const startThread = action({
  schema: startThreadSchema,
  async handler(input) {
    const user = await assertPermission(input.isInternal ? 'messages:internal' : 'messages:send');
    if (!user.organizationId) throw new Error('No organization context');

    if (input.patientId) {
      const p = await db.patient.findUnique({ where: { id: input.patientId } });
      if (!p) throw new Error('Patient not found');
      assertSameOrg(user, p);
    }

    const thread = await db.messageThread.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId ?? null,
        subject: input.subject,
        category: input.category,
        isInternal: input.isInternal,
        messages: {
          create: {
            senderId: user.id,
            senderRoleAtSend: user.role,
            channel: input.isInternal ? MessageChannel.INTERNAL_NOTE : MessageChannel.PORTAL,
            direction: MessageDirection.OUTBOUND,
            body: input.body,
          },
        },
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'MessageThread',
      resourceId: thread.id,
    });

    revalidatePath('/provider/messages');
    return thread;
  },
});

const replySchema = z.object({
  threadId: z.string(),
  body: z.string().min(1).max(4000),
});

export const replyThread = action({
  schema: replySchema,
  async handler({ threadId, body }) {
    const user = await assertPermission('messages:send');
    if (!user.organizationId) throw new Error('No organization context');

    const thread = await db.messageThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error('Thread not found');
    assertSameOrg(user, thread);

    const message = await db.message.create({
      data: {
        threadId,
        senderId: user.id,
        senderRoleAtSend: user.role,
        channel: thread.isInternal ? MessageChannel.INTERNAL_NOTE : MessageChannel.PORTAL,
        direction: user.role === 'PATIENT' ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
        body,
      },
    });

    await db.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    revalidatePath('/provider/messages');
    revalidatePath('/patient/messages');
    return message;
  },
});

export const markThreadRead = action({
  schema: z.object({ threadId: z.string() }),
  async handler({ threadId }) {
    const user = await assertPermission('messages:read');
    if (!user.organizationId) throw new Error('No organization context');

    const thread = await db.messageThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error('Thread not found');
    assertSameOrg(user, thread);

    await db.message.updateMany({
      where: {
        threadId,
        readStatus: MessageReadStatus.UNREAD,
        NOT: { senderId: user.id },
      },
      data: { readStatus: MessageReadStatus.READ, readAt: new Date() },
    });

    revalidatePath('/provider/messages');
    revalidatePath('/patient/messages');
    return { ok: true };
  },
});
