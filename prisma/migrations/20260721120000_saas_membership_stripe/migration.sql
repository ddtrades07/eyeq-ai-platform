-- SaaS membership / Stripe subscription fields + billing event ledger

ALTER TYPE "SaasBillingStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

ALTER TABLE "OrgSubscription"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
  ADD COLUMN IF NOT EXISTS "pendingPlan" "SaasPlan",
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3);

-- Migrate default for new rows conceptually: existing MANUAL rows stay MANUAL.
-- New orgs start as INACTIVE via application code.

CREATE INDEX IF NOT EXISTS "OrgSubscription_stripeCustomerId_idx" ON "OrgSubscription"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "OrgSubscription_stripeSubscriptionId_idx" ON "OrgSubscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "OrgSubscription_billingStatus_idx" ON "OrgSubscription"("billingStatus");

CREATE TABLE IF NOT EXISTS "SaasBillingEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "subscriptionId" TEXT,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'stripe',
  "payloadHash" TEXT,
  "metadata" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SaasBillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SaasBillingEvent_stripeEventId_key" ON "SaasBillingEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "SaasBillingEvent_organizationId_processedAt_idx" ON "SaasBillingEvent"("organizationId", "processedAt");
CREATE INDEX IF NOT EXISTS "SaasBillingEvent_eventType_processedAt_idx" ON "SaasBillingEvent"("eventType", "processedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SaasBillingEvent_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "SaasBillingEvent"
      ADD CONSTRAINT "SaasBillingEvent_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "OrgSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
