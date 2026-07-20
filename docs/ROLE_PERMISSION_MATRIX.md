# EyeQ AI — Role Permission Matrix

**Date:** July 6, 2026  
**Source of truth:** `src/lib/auth/rbac.ts` — `PERMISSIONS` and `ROLE_PERMISSIONS`

**Legend:** ✅ = granted · — = denied

---

## Roles

| Role | Label | Scope |
|------|-------|-------|
| OWNER | Owner | Full practice control |
| ADMIN | Admin | Operations; limited clinical write |
| MANAGER | Practice Manager | Scheduling, gaps, inventory read/adjust |
| OPTOMETRIST | Optometrist | Clinical care + AI clinical |
| MD | Physician | Same as optometrist |
| RESIDENT | Resident | Chart write; no sign-off |
| TECHNICIAN | Technician | Pretest, imaging upload |
| FRONT_DESK | Front Desk | Scheduling, registration, forms |
| OPTICAL | Optical Staff | Rx read, inventory |
| SCRIBE | Scribe | Notes write, scribe, AI clinical |
| BILLING | Billing | Billing only |
| PATIENT | Patient | Portal self |

---

## Organization & admin

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| org:manage | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| org:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| users:manage | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| audit:read | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| finance:read | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| i18n:manage | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

---

## Appointments

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| appointments:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| appointments:create | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — |
| appointments:update | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| appointments:delete | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| appointments:status | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | — | — |

---

## Patients

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| patients:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| patients:create | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — |
| patients:update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| patients:delete | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| portal:self | — | — | — | — | — | — | — | — | — | — | — | ✅ |

---

## Clinical notes

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| notes:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| notes:write | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| notes:sign | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — |

---

## Imaging

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| imaging:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| imaging:upload | ✅ | — | — | — | — | — | ✅ | — | — | — | — | — |
| imaging:review | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — |

---

## Prescriptions

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| rx:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | — |
| rx:write | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — |

---

## Care gaps

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| caregaps:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| caregaps:manage | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — |

---

## Messaging

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| messages:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| messages:send | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | — |
| messages:internal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |

---

## Templates & EHR

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| templates:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| templates:manage | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| ehr:read | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| ehr:manage | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

---

## Inventory

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| inventory:read | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — | — | — |
| inventory:adjust | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | — | — | — |
| inventory:manage | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — | — |

---

## Billing & forms

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| billing:read | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| billing:manage | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| forms:manage | ✅ | ✅ | — | — | — | — | — | ✅ | — | — | — | — |

---

## AI & scribe

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| scribe:use | ✅ | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — |
| ai:use | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ |
| ai:clinical | ✅ | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — |
| ai:configure | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| ai:approve | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — |

> **Note:** `canApproveAIOutput()` requires `notes:sign` OR `imaging:review` — so ADMIN cannot approve clinical AI output despite `ai:configure`.

---

## Reminders

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| reminders:read | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| reminders:manage | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — |
| reminders:approve | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

---

## Intelligence

| Permission | OWNER | ADMIN | MANAGER | OPT | MD | RES | TECH | FD | OPTICAL | SCRIBE | BILL | PAT |
|------------|:-----:|:-----:|:-------:|:---:|:--:|:---:|:----:|:--:|:-------:|:------:|:----:|:---:|
| intelligence:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| intelligence:practice | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — |

---

## Page → permission mapping (staff)

| Route | Required permission |
|-------|---------------------|
| `/provider/dashboard` | `org:read` |
| `/provider/appointments`, `/provider/scheduling` | `appointments:read` |
| `/provider/patients`, `/provider/patients/[id]` | `patients:read` |
| `/provider/pre-charting` | `notes:read` |
| `/provider/imaging*` | `imaging:read` |
| `/provider/care-gaps` | `caregaps:read` |
| `/provider/messages` | `messages:read` |
| `/provider/team` | `users:manage` |
| `/provider/billing` | `billing:read` |
| `/provider/audit-logs` | `audit:read` |
| `/provider/financial-reports`, `/provider/admin-insights` | `finance:read` |
| `/provider/settings/ai` | `ai:configure` |
| `/provider/ambient-scribe*` | `scribe:use` |
| `/provider/timeline-intelligence*` | `intelligence:read` |
| `/provider/reminders` | `reminders:read` |
| `/provider/ehr-integrations*` | `ehr:read` |
| `/provider/workflow-builder`, `/provider/practice-setup` | `org:manage` |
| `/provider/tasks` | `org:read` ⚠️ (should be dedicated task permission) |

---

## Known RBAC gaps

| Gap | Recommendation |
|-----|----------------|
| Staff tasks use `org:read` | Add `tasks:read`, `tasks:manage` in R1 |
| API routes lack permission parity | Mirror page guards on `/api/*` |
| Patient `ai:use` | Gateway must restrict to non-clinical help only |
| ADMIN lacks clinical write | Intentional separation of duties |

---

## Helper functions

| Function | Rule |
|----------|------|
| `hasPermission(role, permission)` | Single check |
| `canAccessPatient(user, patient)` | Staff + same org |
| `canApproveAIOutput(role)` | `notes:sign` OR `imaging:review` |
| `canViewBilling(role)` | `billing:read` |
| `canManageTeam(role)` | `users:manage` |
| `canAccessAuditLogs(role)` | `audit:read` |
| `isStaffRole(role)` | All except PATIENT |

---

*Regenerate this matrix when editing `ROLE_PERMISSIONS` in `rbac.ts`.*
