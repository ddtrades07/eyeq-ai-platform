'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { enqueueBackgroundJob } from '@/lib/jobs/queue';

function chunkText(text: string, maxLen = 1200): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if ((current + p).length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

export const createKnowledgeDocument = action({
  schema: z.object({
    title: z.string().min(1).max(200),
    category: z.string().min(1).max(80),
    content: z.string().min(10).max(100_000),
    roleAccess: z.array(z.string()).default([]),
    approve: z.boolean().default(false),
  }),
  async handler(input) {
    const user = await assertPermission('ai:configure');
    if (!user.organizationId) throw new Error('No organization context');

    const chunks = chunkText(input.content);
    const doc = await db.aiKnowledgeDocument.create({
      data: {
        organizationId: user.organizationId,
        title: input.title,
        category: input.category,
        status: input.approve ? 'approved' : 'draft',
        roleAccess: input.roleAccess,
        approvedById: input.approve ? user.id : null,
        uploadedById: user.id,
        chunks: {
          create: chunks.map((content, chunkIndex) => ({
            chunkIndex,
            content,
            tokenCount: Math.ceil(content.length / 4),
          })),
        },
      },
    });

    await enqueueBackgroundJob({
      type: 'embed-knowledge-document',
      organizationId: user.organizationId,
      createdById: user.id,
      payload: { documentId: doc.id },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'AiKnowledgeDocument',
      resourceId: doc.id,
    });

    revalidatePath('/provider/settings/ai');
    return doc;
  },
});
