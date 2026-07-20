-- Eye Health Library tables

CREATE TYPE "EyeHealthOrgReviewStatus" AS ENUM ('DRAFT', 'PROVIDER_REVIEWED', 'PRACTICE_APPROVED', 'ARCHIVED', 'HIDDEN');
CREATE TYPE "EyeHealthRecommendationContext" AS ENUM ('PROVIDER_RECOMMENDED', 'RELATED_TO_VISIT', 'DISCUSSION_TOPIC');

CREATE TABLE "EyeHealthOrgArticleState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reviewStatus" "EyeHealthOrgReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EyeHealthOrgArticleState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EyeHealthRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "recommendedById" TEXT NOT NULL,
    "encounterId" TEXT,
    "appointmentId" TEXT,
    "context" "EyeHealthRecommendationContext" NOT NULL DEFAULT 'PROVIDER_RECOMMENDED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EyeHealthRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EyeHealthSavedArticle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EyeHealthSavedArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EyeHealthOrgArticleState_organizationId_slug_key" ON "EyeHealthOrgArticleState"("organizationId", "slug");
CREATE INDEX "EyeHealthOrgArticleState_organizationId_reviewStatus_idx" ON "EyeHealthOrgArticleState"("organizationId", "reviewStatus");
CREATE INDEX "EyeHealthOrgArticleState_organizationId_hidden_idx" ON "EyeHealthOrgArticleState"("organizationId", "hidden");

CREATE INDEX "EyeHealthRecommendation_organizationId_patientId_createdAt_idx" ON "EyeHealthRecommendation"("organizationId", "patientId", "createdAt");
CREATE INDEX "EyeHealthRecommendation_organizationId_slug_idx" ON "EyeHealthRecommendation"("organizationId", "slug");
CREATE INDEX "EyeHealthRecommendation_patientId_slug_idx" ON "EyeHealthRecommendation"("patientId", "slug");

CREATE UNIQUE INDEX "EyeHealthSavedArticle_patientId_slug_key" ON "EyeHealthSavedArticle"("patientId", "slug");
CREATE INDEX "EyeHealthSavedArticle_organizationId_userId_idx" ON "EyeHealthSavedArticle"("organizationId", "userId");

ALTER TABLE "EyeHealthOrgArticleState" ADD CONSTRAINT "EyeHealthOrgArticleState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EyeHealthOrgArticleState" ADD CONSTRAINT "EyeHealthOrgArticleState_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EyeHealthRecommendation" ADD CONSTRAINT "EyeHealthRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EyeHealthRecommendation" ADD CONSTRAINT "EyeHealthRecommendation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EyeHealthRecommendation" ADD CONSTRAINT "EyeHealthRecommendation_recommendedById_fkey" FOREIGN KEY ("recommendedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EyeHealthSavedArticle" ADD CONSTRAINT "EyeHealthSavedArticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EyeHealthSavedArticle" ADD CONSTRAINT "EyeHealthSavedArticle_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EyeHealthSavedArticle" ADD CONSTRAINT "EyeHealthSavedArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
