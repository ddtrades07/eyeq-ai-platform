-- CreateEnum
CREATE TYPE "GoogleQuestionReplyStatus" AS ENUM ('UNANSWERED', 'DRAFT', 'PUBLISHED', 'DEMO_PUBLISHED', 'SKIPPED');

-- CreateTable
CREATE TABLE "GoogleBusinessQuestion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "locationId" TEXT,
    "externalQuestionId" TEXT NOT NULL,
    "authorName" TEXT,
    "questionText" TEXT NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL,
    "replyStatus" "GoogleQuestionReplyStatus" NOT NULL DEFAULT 'UNANSWERED',
    "draftReply" TEXT,
    "publishedReply" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleBusinessQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleBusinessQuestion_organizationId_replyStatus_idx" ON "GoogleBusinessQuestion"("organizationId", "replyStatus");

-- CreateIndex
CREATE INDEX "GoogleBusinessQuestion_organizationId_askedAt_idx" ON "GoogleBusinessQuestion"("organizationId", "askedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleBusinessQuestion_connectionId_externalQuestionId_key" ON "GoogleBusinessQuestion"("connectionId", "externalQuestionId");

-- AddForeignKey
ALTER TABLE "GoogleBusinessQuestion" ADD CONSTRAINT "GoogleBusinessQuestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleBusinessQuestion" ADD CONSTRAINT "GoogleBusinessQuestion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleBusinessConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleBusinessQuestion" ADD CONSTRAINT "GoogleBusinessQuestion_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
