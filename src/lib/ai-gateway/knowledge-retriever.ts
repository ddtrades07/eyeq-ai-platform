import 'server-only';
import { db } from '@/lib/db';
import { embedText, cosineSimilarity } from '@/lib/ai/embeddings';
import { serverEnv } from '@/lib/env';

export type KnowledgeChunk = {
  documentId: string;
  title: string;
  content: string;
  category: string;
  score?: number;
};

/**
 * Permission-scoped RAG retrieval. Uses vector similarity when embeddings exist;
 * falls back to keyword matching otherwise.
 */
export async function retrieveKnowledge(args: {
  practiceId: string;
  role: string;
  query: string;
  limit?: number;
}): Promise<KnowledgeChunk[]> {
  const limit = args.limit ?? 5;
  const docs = await db.aiKnowledgeDocument.findMany({
    where: {
      OR: [{ organizationId: args.practiceId }, { organizationId: null }],
      status: 'approved',
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        { OR: [{ effectiveDate: null }, { effectiveDate: { lte: new Date() } }] },
      ],
    },
    include: {
      chunks: { orderBy: { chunkIndex: 'asc' } },
    },
    take: 20,
  });

  const candidates: KnowledgeChunk[] = [];
  for (const doc of docs) {
    if (doc.roleAccess.length && !doc.roleAccess.includes(args.role)) continue;
    for (const chunk of doc.chunks) {
      candidates.push({
        documentId: doc.id,
        title: doc.title,
        content: chunk.content,
        category: doc.category,
      });
    }
  }

  if (serverEnv.openaiApiKey && candidates.length > 0) {
    const queryVector = await embedText(args.query);
    if (queryVector) {
      const scored: KnowledgeChunk[] = [];
      for (const doc of docs) {
        if (doc.roleAccess.length && !doc.roleAccess.includes(args.role)) continue;
        for (const chunk of doc.chunks) {
          const emb = chunk.embedding as number[] | null;
          if (!emb || !Array.isArray(emb)) continue;
          scored.push({
            documentId: doc.id,
            title: doc.title,
            content: chunk.content,
            category: doc.category,
            score: cosineSimilarity(queryVector, emb),
          });
        }
      }
      if (scored.length > 0) {
        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
      }
    }
  }

  const lowerQuery = args.query.toLowerCase();
  const keywordHits = candidates.filter((c) =>
    lowerQuery.split(/\s+/).some((w) => w.length > 3 && c.content.toLowerCase().includes(w)),
  );
  return keywordHits.slice(0, limit);
}
