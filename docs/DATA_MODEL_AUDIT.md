# EyeQ AI. Data Model Audit

**Date:** July 14, 2026  
**Source of truth:** `prisma/schema.prisma`  
**Migrations:** None committed (`prisma/migrations` missing). Live DB currently reconciled via `prisma db push`.

## Decision: Appointment ↔ Encounter

**Decision: keep a formal relationship.**

| Rule | Implementation today |
|------|----------------------|
| Appointment = scheduled time | `Appointment` |
| Encounter = clinical visit record | `Encounter` with `appointmentId @unique` (1:1) |
| Sync | `syncEncounterForAppointment()` on create / status / cancel |
| List joining | `listAppointments` loads encounters in a side query (stale-client workaround; relation exists in current client) |

**Gaps to fix before calling this production-complete:**

1. Support **walk-in encounters** (`appointmentId` optional, or synthetic appointment).
2. Call sync on **reschedule/update**.
3. Add **appointment status history** (actor, timestamp, reason): currently single `status` field only.
4. Prefer Prisma `include: { encounter }` once generate/restart hygiene is reliable.
5. Restore or replace removed stale-Prisma-client guard in long-lived `next` processes.

Historical Jul 2026 failure (`include: { encounter }` validation error) was a **stale generated client**, not missing schema relation. Relation exists at `Appointment.encounter` / `Encounter.appointmentId`.

## Multi-tenant foundations

| Model | Org scoped | Location scoped | Notes |
|-------|------------|-----------------|-------|
| Organization / Location / User / Provider | Yes | Location yes | Good base |
| UserLocationAccess | Yes | Yes | Fail-open if empty for staff |
| OrganizationMembership | Yes | No | Role on membership often unused vs `User.role` |
| Patient | Yes | No (org-wide) | By design for chart master |
| Appointment / Encounter / Imaging / Notes / Rx / Gaps / Messages | Yes | Partial | Location filters inconsistent |
| Claims / remittances / statements / optical / inventory | Yes | Partial | Optical metrics ignore location in places |
| GoogleBusinessConnection / GoogleReview | Yes | Optional | Demo seeded |
| BackgroundJob | Yes |: | |
| AuditLog | Yes |: | |

## Present vs required (Phase 2 summary)

### Organizations and access

| Required concept | Status |
|------------------|--------|
| Organization, Location, User, Provider, Role, Permission (app), User-location access | Present |
| Department, Room entity, Diagnostic device registry | Missing (room is string on appointment) |
| Provider schedule / recurring availability / holidays | Missing |
| Login session / security event models | Missing (Auth in Supabase) |
| Dedicated Staff vs Provider split | Partial via Role + Provider |
| Read-only auditor role | Missing as named role (use ADMIN+`audit:read` approximately) |

### Patient information

| Required | Status |
|----------|--------|
| Demographics, contacts | Present |
| Preferred name, guardian/dependent, responsible party | Missing / partial |
| Structured insurance policies | Missing (free-text carrier/member fields) |
| Consents, privacy acknowledgments | Partial (comms prefs; recording consent on scribe) |
| Structured allergies/meds/problems/surgical/family Hx | Partial / JSON-ish clinical notes & exam chart sections |
| Documents, referrals, outside providers, alerts, pharmacy | Documents present; others missing or thin |

### Scheduling and encounters

| Required | Status |
|----------|--------|
| Appointment types/statuses | Enum present; not full requested state machine |
| Status history | Missing |
| Encounter + ExamChart | Present |
| Check-in record, waitlist, recall entity, cancel/no-show record | Partial (flags/status/care gaps) |
| Tasks | StaffTask present |
| Clinical note + addendum relation | Present (`amendedFromId`); status not fully used |
| Note lock/unlock history | Missing |

### Clinical optometry

| Required | Status |
|----------|--------|
| Structured exam sections | ExamChart sections model present |
| Templates | DiseaseTemplate + VisitWorkflowTemplate |
| Full refraction / CL trial / dry-eye specialty tables | Mostly section JSON, not normalized specialty tables |

### Prescriptions

| Required | Status |
|----------|--------|
| Glasses / CL structured fields | Present on Prescription |
| Medication eRx | Missing |
| Release tracking / portal deliverability flags | Partial |

### Billing / optical / devices

| Required | Status |
|----------|--------|
| Claim / ClaimLine | Present |
| RemittanceAdvice / Lines | Present |
| PatientStatement | Present (thin) |
| Payment / allocation / refund ledger | **Missing** |
| OpticalOrder / Lab / status events | Present |
| Frame catalog attributes, PO, vendor invoices | Missing / inventory generic |
| Device registry + study matching queue | Missing |

## Dangerous defaults / integrity

| Issue | Risk |
|-------|------|
| FHIR/migration inventing DOB `1980-01-01` / “Unknown Patient” | False chart identity |
| Google publish success without external post | False public record |
| Remittance last-line claim status | Incorrect paid/rejected |
| Inventory negative clamp to zero | Silent oversell |
| FinancialReport model unused | Docs overstate snapshots |

## Migration / RLS actions

1. Baseline `prisma migrate` from current schema; stop using push for shared environments.  
2. Extend `prisma/rls.sql` for all post-StaffTask tables.  
3. Document that RLS is defense-in-depth only while Prisma uses table owner.  
4. Add payment ledger before treating billing as production accounting.

## Appointment-Encounter diagram

```text
Organization
  └── Location?
        └── Appointment 1────────1 Encounter?
              │                    └── ExamChart?
              ├── ImagingCase*
              ├── ClinicalNote*
              └── AmbientScribeSession*
```

Walk-ins require schema change: optional `appointmentId` or always create a zero-slot appointment row.
