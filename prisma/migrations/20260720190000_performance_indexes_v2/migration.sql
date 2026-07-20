-- Additional performance indexes (Jul 2026 pass 2)
-- Safe additive indexes only. No PHI behavior changes.

CREATE INDEX IF NOT EXISTS "MessageThread_organizationId_closedAt_updatedAt_idx"
  ON "MessageThread" ("organizationId", "closedAt", "updatedAt");

CREATE INDEX IF NOT EXISTS "Appointment_organizationId_providerId_startsAt_idx"
  ON "Appointment" ("organizationId", "providerId", "startsAt");

CREATE INDEX IF NOT EXISTS "GoogleReview_organizationId_replyStatus_reviewedAt_idx"
  ON "GoogleReview" ("organizationId", "replyStatus", "reviewedAt");

CREATE INDEX IF NOT EXISTS "ClinicalNote_patientId_createdAt_idx"
  ON "ClinicalNote" ("patientId", "createdAt");

CREATE INDEX IF NOT EXISTS "ImagingCase_patientId_capturedAt_idx"
  ON "ImagingCase" ("patientId", "capturedAt");

CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_status_createdAt_idx"
  ON "SupportTicket" ("organizationId", "status", "createdAt");
