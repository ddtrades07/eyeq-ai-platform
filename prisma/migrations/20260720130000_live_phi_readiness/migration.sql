-- Live PHI production readiness: MFA policy, vendor BAA tracking, audit hardening.

-- AuditAction expansions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_ENROLL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_DISABLE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_CHALLENGE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MFA_BYPASS_ATTEMPT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECURITY_POLICY';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VENDOR_CONFIG';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PHI_MODE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REMINDER_SEND';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCESS_DENIED';

ALTER TYPE "ReminderCampaignStatus" ADD VALUE IF NOT EXISTS 'BLOCKED_VENDOR';
ALTER TYPE "ReminderCampaignStatus" ADD VALUE IF NOT EXISTS 'BLOCKED_BAA';

ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'BLOCKED_VENDOR';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'BLOCKED_BAA';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'BLOCKED_CONSENT';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'DEMO_SENT';

DO $$ BEGIN
  CREATE TYPE "VendorKind" AS ENUM ('OPENAI', 'TWILIO', 'SENDGRID', 'STRIPE', 'GOOGLE_BUSINESS', 'STORAGE', 'DEEPGRAM', 'CLEARINGHOUSE', 'EHR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VendorReadinessStatus" AS ENUM ('NOT_CONFIGURED', 'DEMO_ONLY', 'CONFIGURED_PRODUCTION', 'BAA_REQUIRED', 'BAA_COMPLETE', 'PERMISSION_ERROR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "mfaRequiredForStaff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "livePhiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "rlsVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "auditVerifiedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaLastVerifiedAt" TIMESTAMP(3);

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "previousStatus" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newStatus" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE TABLE IF NOT EXISTS "VendorReadiness" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendor" "VendorKind" NOT NULL,
    "status" "VendorReadinessStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "baaCompletedAt" TIMESTAMP(3),
    "baaCompletedById" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastError" TEXT,
    "notes" TEXT,
    "configHint" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorReadiness_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorReadiness_organizationId_vendor_key" ON "VendorReadiness"("organizationId", "vendor");
CREATE INDEX IF NOT EXISTS "VendorReadiness_organizationId_status_idx" ON "VendorReadiness"("organizationId", "status");

DO $$ BEGIN
  ALTER TABLE "VendorReadiness" ADD CONSTRAINT "VendorReadiness_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
