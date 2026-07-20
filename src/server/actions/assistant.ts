'use server';

import { z } from 'zod';
import { AssistantContextType } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { requireUser, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

/**
 * Persists one completed user/assistant exchange. Creates the conversation
 * on first save and returns its id so the client can keep appending.
 */
export const saveAssistantExchange = action({
  schema: z.object({
    conversationId: z.string().nullable().optional(),
    contextType: z.nativeEnum(AssistantContextType).default('PLATFORM'),
    patientId: z.string().nullable().optional(),
    appointmentId: z.string().nullable().optional(),
    userText: z.string().min(1).max(8000),
    assistantText: z.string().min(1).max(32000),
  }),
  async handler(input) {
    const user = await requireUser();
    if (!user.organizationId) throw new Error('No organization context');

    if (input.patientId) {
      const patient = await db.patient.findUnique({ where: { id: input.patientId } });
      if (!patient) throw new Error('Patient not found');
      assertSameOrg(user, patient);
    }

    let conversationId = input.conversationId ?? null;
    if (conversationId) {
      const existing = await db.aiAssistantConversation.findUnique({
        where: { id: conversationId },
      });
      if (!existing || existing.userId !== user.id) conversationId = null;
    }

    if (!conversationId) {
      const title = input.userText.length > 60
        ? `${input.userText.slice(0, 57)}...`
        : input.userText;
      const conversation = await db.aiAssistantConversation.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          patientId: input.patientId ?? null,
          appointmentId: input.appointmentId ?? null,
          title,
          contextType: input.contextType,
        },
      });
      conversationId = conversation.id;
    } else {
      await db.aiAssistantConversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
          patientId: input.patientId ?? undefined,
          contextType: input.contextType,
        },
      });
    }

    await db.aiAssistantMessage.createMany({
      data: [
        {
          conversationId,
          role: 'user',
          text: input.userText,
          contextType: input.contextType,
        },
        {
          conversationId,
          role: 'assistant',
          text: input.assistantText,
          contextType: input.contextType,
        },
      ],
    });

    if (input.patientId) {
      await audit({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'READ',
        resourceType: 'AiAssistantConversation',
        resourceId: conversationId,
        metadata: {
          event: 'assistant_accessed_patient_context',
          patientId: input.patientId,
          contextType: input.contextType,
        },
      });
    }

    return { conversationId };
  },
});

export const listAssistantConversations = action({
  schema: z.object({}).optional(),
  async handler() {
    const user = await requireUser();
    if (!user.organizationId) throw new Error('No organization context');

    const conversations = await db.aiAssistantConversation.findMany({
      where: { userId: user.id, organizationId: user.organizationId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        contextType: true,
        patientId: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      contextType: c.contextType,
      patientId: c.patientId,
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    }));
  },
});

export const getAssistantConversation = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await requireUser();
    if (!user.organizationId) throw new Error('No organization context');

    const conversation = await db.aiAssistantConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } },
    });
    if (!conversation || conversation.userId !== user.id) {
      throw new Error('Conversation not found');
    }

    return {
      id: conversation.id,
      title: conversation.title,
      contextType: conversation.contextType,
      patientId: conversation.patientId,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },
});

export const archiveAssistantConversation = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await requireUser();
    const conversation = await db.aiAssistantConversation.findUnique({ where: { id } });
    if (!conversation || conversation.userId !== user.id) {
      throw new Error('Conversation not found');
    }
    await db.aiAssistantConversation.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { ok: true };
  },
});
