-- Performance indexes for common list/filter paths.
-- Counts and date-scoped appointment queries; imaging queues; unread messages.

CREATE INDEX IF NOT EXISTS "Appointment_organizationId_locationId_startsAt_idx"
  ON "Appointment"("organizationId", "locationId", "startsAt");

CREATE INDEX IF NOT EXISTS "Appointment_organizationId_status_startsAt_idx"
  ON "Appointment"("organizationId", "status", "startsAt");

CREATE INDEX IF NOT EXISTS "Appointment_patientId_startsAt_idx"
  ON "Appointment"("patientId", "startsAt");

CREATE INDEX IF NOT EXISTS "Encounter_organizationId_locationId_status_idx"
  ON "Encounter"("organizationId", "locationId", "status");

CREATE INDEX IF NOT EXISTS "Encounter_organizationId_status_updatedAt_idx"
  ON "Encounter"("organizationId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "ImagingCase_organizationId_archivedAt_studyStatus_idx"
  ON "ImagingCase"("organizationId", "archivedAt", "studyStatus");

CREATE INDEX IF NOT EXISTS "ImagingCase_organizationId_archivedAt_capturedAt_idx"
  ON "ImagingCase"("organizationId", "archivedAt", "capturedAt");

CREATE INDEX IF NOT EXISTS "ImagingCase_organizationId_locationId_capturedAt_idx"
  ON "ImagingCase"("organizationId", "locationId", "capturedAt");

CREATE INDEX IF NOT EXISTS "Message_threadId_readStatus_idx"
  ON "Message"("threadId", "readStatus");

CREATE INDEX IF NOT EXISTS "Patient_organizationId_archivedAt_idx"
  ON "Patient"("organizationId", "archivedAt");

CREATE INDEX IF NOT EXISTS "ClinicalNote_organizationId_status_updatedAt_idx"
  ON "ClinicalNote"("organizationId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "AmbientScribeSession_organizationId_reviewStatus_archivedAt_idx"
  ON "AmbientScribeSession"("organizationId", "reviewStatus", "archivedAt");
