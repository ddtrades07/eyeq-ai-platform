# EyeQ AI — HIPAA Technical Safeguards Mapping

**Date:** July 6, 2026

> **Important:** This document maps EyeQ AI **technical controls** to HIPAA Security Rule safeguard categories for **planning and gap analysis only**. EyeQ AI is **not HIPAA compliant by default**. Achieving compliance requires organizational policies, BAAs, workforce training, risk analysis, and operational procedures beyond software features.

---

## How to read this document

| Column | Meaning |
|--------|---------|
| **Safeguard (HIPAA)** | Administrative / Physical / Technical category from 45 CFR §164.312 |
| **EyeQ capability** | What the platform implements today |
| **Gap** | What the customer or vendor must still provide |
| **Status** | Implemented · Partial · Not implemented · Organizational |

---

## Administrative safeguards (§164.308) — organizational

These are **primarily customer responsibilities**. EyeQ provides features that support them.

| Requirement | EyeQ support | Gap | Status |
|-------------|--------------|-----|--------|
| Security management process | Risk register docs; audit log | Formal customer risk analysis | Organizational |
| Assigned security responsibility | — | Designate security officer | Organizational |
| Workforce training | UI disclaimers on AI | Training program | Organizational |
| Information access management | RBAC | Periodic access reviews | Partial |
| Security incident procedures | Audit log; stderr alerts | Incident response plan | Organizational |
| Contingency plan | Depends on host (Vercel/Supabase SLAs) | BCP/DR testing | Organizational |
| Evaluation | — | Periodic technical evaluations | Organizational |
| BAA with subcontractors | Documented subprocessor list | Execute BAAs with Supabase, AI vendors, etc. | Organizational |

---

## Physical safeguards (§164.310) — host-dependent

EyeQ is cloud-hosted; physical controls are delegated to infrastructure providers.

| Requirement | EyeQ / host | Gap | Status |
|-------------|-------------|-----|--------|
| Facility access controls | Supabase / Vercel / AWS physical security | Verify vendor SOC 2 reports | Host-dependent |
| Workstation use | — | Customer workstation policy | Organizational |
| Device and media controls | No local PHI storage by design | Secure staff devices | Organizational |

---

## Technical safeguards (§164.312) — platform mapping

### Access control (§164.312(a)(1))

| Standard | EyeQ implementation | Gap | Status |
|----------|---------------------|-----|--------|
| Unique user identification | Supabase user ID + Prisma `User` | — | Implemented |
| Emergency access procedure | `AI_EMERGENCY_SHUTDOWN`; break-glass not built | Customer runbook | Partial |
| Automatic logoff | Supabase session expiry | Configurable idle timeout | Partial |
| Encryption and decryption | TLS in transit; host encryption at rest | Verify Supabase settings | Partial |

### Audit controls (§164.312(b))

| Standard | EyeQ implementation | Gap | Status |
|----------|---------------------|-----|--------|
| Record and examine activity | `AuditLog`, AI gateway audit tables | Immutable external archive | Partial |
| PHI access logging | Audit on CREATE/UPDATE/READ actions (where instrumented) | Complete READ coverage | Partial |

### Integrity (§164.312(c)(1))

| Standard | EyeQ implementation | Gap | Status |
|----------|---------------------|-----|--------|
| Mechanism to authenticate ePHI | DB constraints; signed note status | Tamper-evident audit chain | Partial |
| Clinical note amendments | `amendedFromId`, `AMENDED` status | Legal record policy | Partial |

### Person or entity authentication (§164.312(d))

| Standard | EyeQ implementation | Gap | Status |
|----------|---------------------|-----|--------|
| Verify identity | Supabase Auth | MFA | Partial |

### Transmission security (§164.312(e)(1))

| Standard | EyeQ implementation | Gap | Status |
|----------|---------------------|-----|--------|
| Integrity controls | HTTPS | Certificate pinning N/A for web | Implemented |
| Encryption | TLS 1.2+ (host) | — | Implemented |

---

## EyeQ-specific PHI controls

| Control | Description | Status |
|---------|-------------|--------|
| **PHI safety gate** | Blocks/redacts PHI in AI requests unless BAA flags set | Implemented |
| **Server-only AI keys** | No LLM keys in browser | Implemented |
| **Tenant isolation** | `organizationId` + `assertSameOrg` | Partial (no RLS) |
| **Minimum necessary (AI)** | Role-based AI authorization | Partial |
| **Provider sign-off** | Imaging + notes require provider before patient visibility | Implemented |
| **Demo isolation** | Separate demo tenant; env-gated | Implemented |
| **Communication opt-in** | `CommunicationPreference` model | Partial (enforcement on send pending) |
| **Scribe consent flag** | `consentRecorded` on session | Partial (process) |
| **De-identification for AI eval** | Not automated | Not implemented |

---

## Subprocessor / BAA checklist

Before processing PHI in production, customers should execute BAAs with:

| Subprocessor | PHI touch | Required for |
|--------------|-----------|--------------|
| Supabase (Auth, DB, Storage) | Yes | Core platform |
| Vercel (if used) | Metadata / logs | Hosting |
| OpenAI / Anthropic | If AI on PHI | Ask EyeQ, imaging Vision, scribe |
| Twilio / email vendor | If messages contain PHI | Recall campaigns |
| Stripe | Payment metadata | Patient pay (R3) |
| Transcription vendor | Audio + transcript | Ambient scribe (R2) |

Set EyeQ env flags (`AI_BAA_CONFIRMED`, `OPENAI_BAA_CONFIRMED`, etc.) **only after** legal execution.

---

## Gap summary (technical)

| Priority | Gap |
|----------|-----|
| P0 | PostgreSQL RLS policies |
| P0 | MFA for staff |
| P0 | Supabase storage bucket private + policy audit |
| P1 | External immutable audit archive |
| P1 | Session idle timeout configuration |
| P1 | Complete API permission parity |
| P2 | Break-glass emergency access logging |
| P2 | Automated de-identification pipeline for AI eval |

---

## Customer responsibilities (non-software)

- Complete HIPAA risk analysis
- Policies: privacy, security, breach notification
- Workforce training and sanctions
- Business associate agreements
- Physical security of devices accessing EyeQ
- Accuracy of clinical content and AI review workflows
- State optometry board / medical record retention rules

---

## Disclaimer

**EyeQ AI does not provide HIPAA compliance out of the box.** This mapping is a technical aid for customers and implementers working with qualified compliance counsel. No statement in this document constitutes legal advice or a certification of compliance.

---

*Related: `SECURITY_ARCHITECTURE.md`, `EYEQ_SECURITY_RISK_REGISTER.md`, `PRODUCTION_READINESS_CHECKLIST.md`*
