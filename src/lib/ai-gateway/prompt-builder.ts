import 'server-only';
import { AI_SAFETY_PREAMBLE } from '@/lib/ai/safety';
import type { KnowledgeChunk } from './knowledge-retriever';

export function buildPrompt(args: {
  systemPrompt?: string;
  enrichedContext?: string;
  knowledgeChunks?: KnowledgeChunk[];
}): string {
  const parts: string[] = [args.systemPrompt ?? AI_SAFETY_PREAMBLE];

  if (args.enrichedContext) {
    parts.push('\n--- CONTEXT ---');
    parts.push(args.enrichedContext);
    parts.push('--- END CONTEXT ---');
  }

  if (args.knowledgeChunks?.length) {
    parts.push('\n--- APPROVED KNOWLEDGE ---');
    for (const chunk of args.knowledgeChunks) {
      parts.push(`[${chunk.category}] ${chunk.title}:\n${chunk.content}`);
    }
    parts.push('--- END KNOWLEDGE ---');
    parts.push(
      'If approved knowledge does not contain enough information, say you do not have enough approved information rather than inventing an answer.',
    );
  }

  return parts.join('\n');
}
