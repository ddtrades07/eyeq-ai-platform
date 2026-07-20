-- Controlled pilot ops: backup/monitoring/incident attestation, staff onboarding, pilot mode.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INCIDENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INCIDENT_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PILOT_MODE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_ONBOARDING';

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "controlledPilotEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupLastAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupProvider" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupRetentionDays" INTEGER;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupRestoreTestAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "backupRestoreTestNotes" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "monitoringVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "monitoringProvider" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "incidentResponseReviewedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "incidentResponseNotes" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "staffTrainingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "pilotLaunchNotes" TEXT;

CREATE TABLE IF NOT EXISTS "StaffOnboarding" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteAcceptedAt" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "mfaEnrolledAt" TIMESTAMP(3),
    "roleConfirmedAt" TIMESTAMP(3),
    "locationAccessConfirmedAt" TIMESTAMP(3),
    "permissionsReviewedAt" TIMESTAMP(3),
    "phiNoticeAcceptedAt" TIMESTAMP(3),
    "workflowIntroCompletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffOnboarding_userId_key" ON "StaffOnboarding"("userId");
CREATE INDEX IF NOT EXISTS "StaffOnboarding_organizationId_completedAt_idx" ON "StaffOnboarding"("organizationId", "completedAt");

DO $$ BEGIN
  ALTER TABLE "StaffOnboarding" ADD CONSTRAINT "StaffOnboarding_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "StaffOnboarding" ADD CONSTRAINT "StaffOnboarding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
