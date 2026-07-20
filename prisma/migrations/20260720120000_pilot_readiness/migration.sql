-- Pilot readiness: walk-ins, Rx sign-off, payment ledger, appointment requests,
-- Google demo-publish integrity, guardian proxy schema planning.

-- AlterEnum AppointmentType
ALTER TYPE "AppointmentType" ADD VALUE IF NOT EXISTS 'WALK_IN';

-- AlterEnum GoogleReviewReplyStatus
ALTER TYPE "GoogleReviewReplyStatus" ADD VALUE IF NOT EXISTS 'DEMO_PUBLISHED';

-- CreateEnum PaymentLedgerEntryType
DO $$ BEGIN
  CREATE TYPE "PaymentLedgerEntryType" AS ENUM ('CHARGE', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'WRITE_OFF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum PaymentLedgerSource
DO $$ BEGIN
  CREATE TYPE "PaymentLedgerSource" AS ENUM ('MANUAL', 'STRIPE', 'DEMO', 'REMITTANCE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum AppointmentRequestStatus
DO $$ BEGIN
  CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CONVERTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum PrescriptionStatus
DO $$ BEGIN
  CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable Prescription
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "signedById" TEXT;

-- Backfill existing prescriptions as ACTIVE (they were already issued)
UPDATE "Prescription" SET "status" = 'ACTIVE' WHERE "archivedAt" IS NULL AND "signedAt" IS NULL;
UPDATE "Prescription" SET "status" = 'ARCHIVED' WHERE "archivedAt" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_signedById_fkey"
    FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Payment ledger
CREATE TABLE IF NOT EXISTS "PaymentLedgerEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT,
    "invoiceId" TEXT,
    "type" "PaymentLedgerEntryType" NOT NULL,
    "source" "PaymentLedgerSource" NOT NULL DEFAULT 'MANUAL',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "idempotencyKey" TEXT,
    "externalRef" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLedgerEntry_organizationId_idempotencyKey_key"
  ON "PaymentLedgerEntry"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_organizationId_createdAt_idx"
  ON "PaymentLedgerEntry"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_invoiceId_idx" ON "PaymentLedgerEntry"("invoiceId");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_patientId_idx" ON "PaymentLedgerEntry"("patientId");
CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_externalRef_idx" ON "PaymentLedgerEntry"("externalRef");

DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "PatientInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT,
    "metadata" JSONB,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeWebhookEvent_eventId_key" ON "StripeWebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_eventType_processedAt_idx"
  ON "StripeWebhookEvent"("eventType", "processedAt");

DO $$ BEGIN
  ALTER TABLE "StripeWebhookEvent" ADD CONSTRAINT "StripeWebhookEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Appointment requests
CREATE TABLE IF NOT EXISTS "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT,
    "locationId" TEXT,
    "preferredType" "AppointmentType" NOT NULL DEFAULT 'COMPREHENSIVE_EYE_EXAM',
    "preferredStartsAt" TIMESTAMP(3),
    "preferredEndsAt" TIMESTAMP(3),
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "requesterPhone" TEXT,
    "notes" TEXT,
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentRequest_appointmentId_key" ON "AppointmentRequest"("appointmentId");
CREATE INDEX IF NOT EXISTS "AppointmentRequest_organizationId_status_idx"
  ON "AppointmentRequest"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "AppointmentRequest_patientId_idx" ON "AppointmentRequest"("patientId");

DO $$ BEGIN
  ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_handledById_fkey"
    FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Guardian / proxy access (schema only — UI not enabled)
CREATE TABLE IF NOT EXISTS "PatientProxyAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'read',
    "expiresAt" TIMESTAMP(3),
    "consentRecordId" TEXT,
    "consentNotes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientProxyAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PatientProxyAccess_patientId_guardianUserId_key"
  ON "PatientProxyAccess"("patientId", "guardianUserId");
CREATE INDEX IF NOT EXISTS "PatientProxyAccess_organizationId_idx" ON "PatientProxyAccess"("organizationId");
CREATE INDEX IF NOT EXISTS "PatientProxyAccess_guardianUserId_idx" ON "PatientProxyAccess"("guardianUserId");

DO $$ BEGIN
  ALTER TABLE "PatientProxyAccess" ADD CONSTRAINT "PatientProxyAccess_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PatientProxyAccess" ADD CONSTRAINT "PatientProxyAccess_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PatientProxyAccess" ADD CONSTRAINT "PatientProxyAccess_guardianUserId_fkey"
    FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
