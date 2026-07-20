import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { openaiProvider } from '@/lib/ai/openai';
import { serverEnv } from '@/lib/env';

export async function embedText(text: string): Promise<number[] | null> {
  if (!openaiProvider.embed) return null;
  const result = await openaiProvider.embed(text);
  return result?.vector ?? null;
}

export async function embedKnowledgeDocument(documentId: string): Promise<Record<string, unknown>> {
  const doc = await db.aiKnowledgeDocument.findUnique({
    where: { id: documentId },
    include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
  });
  if (!doc) throw new Error('Knowledge document not found');
  if (!serverEnv.openaiApiKey) {
    throw new Error('OPENAI_API_KEY required for embeddings');
  }

  let embedded = 0;
  for (const chunk of doc.chunks) {
    const vector = await embedText(chunk.content);
    if (vector) {
      await db.aiKnowledgeChunk.update({
        where: { id: chunk.id },
        data: { embedding: vector },
      });
      embedded++;
    }
  }

  return { documentId, chunksEmbedded: embedded };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
