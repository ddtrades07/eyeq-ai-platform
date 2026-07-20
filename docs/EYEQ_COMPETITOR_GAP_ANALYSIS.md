# EyeQ AI — Competitor Gap Analysis

**Date:** July 6, 2026  
**Compared to:** RevolutionEHR, Eyefinity (OfficeMate), Compulink Advantage, Crystal PM  
**EyeQ positioning:** Layer 1 AI augmentation on top of (or beside) incumbent EHRs — not a full replacement EHR on day one

---

## Market context

Incumbent optometry EHR/practice management systems (PMS) are **deep in billing, inventory, optical dispensing, and regulatory compliance**, with decades of vendor-specific workflows. EyeQ AI today is a **modern workflow shell + AI layer** with strong scheduling, imaging review structure, and recall logic—but **thin on revenue cycle, optical lab integrations, and certified interoperability**.

---

## Capability matrix (high level)

| Capability | RevolutionEHR | Eyefinity | Compulink | Crystal PM | **EyeQ AI (today)** |
|------------|:-------------:|:---------:|:---------:|:----------:|:-------------------:|
| Certified optometry EHR | ✅ | ✅ | ✅ | ✅ | ❌ (native mode is pilot-grade) |
| Insurance billing / claims | ✅ | ✅ | ✅ | ✅ | ❌ (invoice display only) |
| ERA / payment posting | ✅ | ✅ | ✅ | ✅ | ❌ |
| eRx / pharmacy network | ✅ | Partial | ✅ | Partial | ❌ (interface only) |
| Optical lab / frame catalog | ✅ | ✅ | ✅ | ✅ | ⚠️ Inventory only |
| Scheduling / recall | ✅ | ✅ | ✅ | ✅ | ✅ Strong |
| Patient portal | ✅ | ✅ | ✅ | ✅ | ✅ Core flows |
| Document imaging / DICOM | ✅ | ✅ | ✅ | Partial | ⚠️ Supabase storage, structured review |
| Multi-location reporting | ✅ | ✅ | ✅ | ✅ | ⚠️ Schema ready; reports org-level |
| AI documentation / scribe | ⚠️ Add-ons | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ⚠️ Manual/demo scribe |
| AI imaging triage | ❌ | ❌ | ❌ | ❌ | ✅ Structured pipeline + optional Vision |
| Care gap / recall intelligence | ⚠️ Basic recall | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic | ✅ Rule engine + gaps queue |
| Timeline / clinical memory UI | ❌ | ❌ | ❌ | ❌ | ✅ Explainable rules |
| EHR API / FHIR | ⚠️ Partner | ⚠️ Partner | ⚠️ Partner | ⚠️ Limited | ⚠️ Placeholder connectors |
| HIPAA BAA (vendor) | ✅ | ✅ | ✅ | ✅ | ⚠️ Customer must execute with stack vendors |

Legend: ✅ Production | ⚠️ Partial / prototype | ❌ Not present

---

## What EyeQ has that incumbents lack (differentiators)

### 1. Layer 1 AI architecture

- **Central AI Gateway** with PHI safety gate, tenant isolation, model routing, usage tracking, and blocked-request audit trail
- **Non-diagnostic framing** baked into prompts, UI disclaimers, and clinical safety validator
- **Structured imaging review pipeline**: quality grade → analysis → provider sign-off → patient summary approval
- **Timeline Intelligence**: rule-based, explainable insights across visits (not a black-box diagnosis)

### 2. Modern UX stack

- Next.js 15 App Router, responsive staff + patient split
- Command palette, copilot context, lazy-loaded client shell
- Disease documentation templates as **provider-controlled scaffolds** (not auto-generated final notes)

### 3. Recall / retention focus

- `CareGap` types aligned to optometry (diabetic follow-up, CL Rx expiry, imaging review overdue, etc.)
- Reminder template + campaign model (ready for vendor wiring)

### 4. Multi-tenant SaaS foundation

- Org-scoped data model, RBAC with 13 roles, audit log, location access table
- Demo mode isolated to `eyeq-demo` slug (when enabled)

---

## Gaps vs incumbents (must close for "EHR replacement" narrative)

| Gap | Incumbent strength | EyeQ gap | Priority |
|-----|-------------------|----------|----------|
| **Claims / CMS-1500 / 837** | Core revenue | No clearinghouse integration | P0 for billing story |
| **Fee schedules / coding** | Built-in CPT/ICD helpers | Template suggestions only | P0 |
| **Optical POS / lab orders** | Frame/lens workflow end-to-end | Inventory without lab hooks | P1 |
| **Device integrations** | Autorefractor, OCT, VF imports | Manual upload + imaging pipeline | P1 |
| **Regulatory certifications** | ONC-style optometry compliance | Not certified | P0 for hospital-adjacent |
| **Statement / patient payments** | Integrated | No Stripe/portal pay | P1 |
| **SMS/email recall at scale** | Twilio/partner bundled | Stub providers | P1 |
| **Reporting for accountants** | Mature | Snapshot reports, owner-only | P2 |
| **Training / support org** | Vendor staff | Self-serve docs | Ongoing |

---

## Layer 1 AI positioning (recommended GTM)

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Practice operations (incumbent EHR/PMS)          │
│  RevolutionEHR · Eyefinity · Compulink · Crystal PM         │
└──────────────────────────▲──────────────────────────────────┘
                           │ FHIR / HL7 / CSV (future)
┌──────────────────────────┴──────────────────────────────────┐
│  Layer 2 — EyeQ workflow shell (optional native mode)       │
│  Scheduling · Chart · Imaging review · Gaps · Portal · Tasks  │
└──────────────────────────▲──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│  Layer 1 — EyeQ AI (differentiation)                        │
│  Ask EyeQ · Imaging triage · Timeline intelligence · Scribe │
│  PHI-safe gateway · Provider sign-off on all AI output        │
└─────────────────────────────────────────────────────────────┘
```

**Pitch (accurate today):**

> "EyeQ AI is an AI-native clinical workflow layer for optometry—imaging review support, recall intelligence, and documentation assistance—that connects to your existing EHR or runs in native pilot mode. It does not replace your billing engine yet."

**Do not pitch:**

> "Replace RevolutionEHR in 30 days" or "AI diagnoses glaucoma"

---

## Competitor-specific notes

### RevolutionEHR

- **Strength:** Dominant cloud optometry EHR; strong billing + optical; large user base.
- **EyeQ angle:** Sell as **AI overlay** for imaging triage and recall leakage; integrate via CSV/API when connector ships.
- **Gap:** Revolution's embedded workflows (exam templates, billing) are more complete than EyeQ native charting.

### Eyefinity (OfficeMate)

- **Strength:** Deep optical retail + insurance; long-installed base.
- **EyeQ angle:** Modern portal + AI imaging review for practices considering cloud adjunct tools.
- **Gap:** Eyefinity's financial modules and lab integrations exceed EyeQ inventory.

### Compulink Advantage

- **Strength:** Comprehensive ophthalmology/optometry; strong device integration heritage.
- **EyeQ angle:** Timeline intelligence and structured imaging review for multi-specialty groups.
- **Gap:** Compulink device ingest and hospital connectivity.

### Crystal PM

- **Strength:** Popular independent optometry PM; simpler footprint.
- **EyeQ angle:** Care gaps + patient portal modernization without full rip-and-replace.
- **Gap:** Crystal's mature billing statements and payment workflows.

---

## Integration strategy vs competition

| Mode | EyeQ `PracticeMode` | When to use |
|------|---------------------|-------------|
| **Connected EHR** | `CONNECTED_EHR` | Default for sales — AI + portal beside incumbent |
| **Native EHR** | `NATIVE_EHR` | Single-location pilots willing to accept gaps |

Supported vendor enum includes RevolutionEHR, Eyefinity, Crystal PM, Compulink — all **placeholder connectors** today.

---

## 12-month competitive milestones (suggested)

1. **One live connector** (RevolutionEHR or Eyefinity read-only patient/appointment sync)
2. **Twilio + SendGrid** recall sends with opt-in tracking
3. **Stripe patient pay** on open invoices
4. **HIPAA-eligible ASR** for ambient scribe (BAA'd vendor)
5. **Imaging device import** (at least fundus/OCT file drop + DICOM metadata)
6. **Pilot case study** with measured recall booking lift (not diagnostic accuracy claims)

---

*EyeQ should compete on AI workflow quality and speed-to-value, not on legacy billing depth—until Release 3+ closes the revenue cycle gap.*
