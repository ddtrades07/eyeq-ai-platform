-- Optional pgvector setup for Supabase / Postgres 14+
-- Run manually after enabling the extension in your project:
--   CREATE EXTENSION IF NOT EXISTS vector;
--
-- Prisma stores embeddings in AiKnowledgeChunk.embedding (JSON) for portability.
-- To migrate to native pgvector later, add a column and backfill:
--
-- ALTER TABLE "AiKnowledgeChunk" ADD COLUMN IF NOT EXISTS embedding_vec vector(1536);
-- UPDATE "AiKnowledgeChunk" SET embedding_vec = embedding::text::vector
--   WHERE embedding IS NOT NULL AND embedding_vec IS NULL;
--
-- CREATE INDEX IF NOT EXISTS ai_knowledge_chunk_embedding_idx
--   ON "AiKnowledgeChunk" USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100);

CREATE EXTENSION IF NOT EXISTS vector;
