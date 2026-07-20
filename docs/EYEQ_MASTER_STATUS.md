# EyeQ AI — Master Feature Status

**Date:** July 6, 2026  
**Legend:** Production ready = safe for pilot with real PHI *after* checklist + BAAs. "Uses real data" = persists to Postgres, not hardcoded UI mock.

| Feature | Current status | Production ready | Uses real data | Vendor required | BAA required | Regulatory review required | Tests passing | Remaining work | Priority |
|---------|----------------|:----------------:|:--------------:|:---------------:|:------------:|:--------------------------:|:-------------:|----------------|----------|
| Staff authentication (Supabase) | Live | ⚠️ With BAA | Yes | Supabase | Yes | No | No | MFA, password reset pages | P0 |
| Patient authentication / portal login | Live | ⚠️ With BAA | Yes | Supabase | Yes | No | No | Link patient user reliably | P1 |
| RBAC (13 roles) | Live | ✅ | Yes | — | No | No | ✅ Partial | API route parity | P0 |
| Multi-tenant org isolation | Live | ⚠️ App-layer | Yes | — | No | No | ✅ Partial | Supabase RLS | P0 |
| Demo mode | Env-gated | ❌ PHI envs | Yes (demo org) | Supabase | Yes | No | No | Disable in prod verify | P0 |
| Provider dashboard / Brain | Live | ✅ | Yes | — | No | No | No | Performance tuning | P2 |
| Appointments CRUD | Live | ✅ | Yes | — | No | No | No | — | — |
| Scheduling calendar | Live | ✅ | Yes | — | No | No | No | Realtime board | P3 |
| Encounters workflow | Live (R1) | ⚠️ Pilot | Yes | — | No | No | No | UI polish, permissions | P1 |
| Staff tasks | Live (R1) | ⚠️ Pilot | Yes | — | No | No | No | Dedicated RBAC permission | P2 |
| Patient registry / search | Live | ✅ | Yes | — | No | No | No | — | — |
| Patient chart (multi-tab) | Live | ✅ | Yes | — | No | No | No | Reduce duplicate fetches | P2 |
| Clinical notes (SOAP) | Live | ✅ | Yes | — | No | No | No | Amendment workflow QA | P2 |
| Note sign-off | Live | ✅ | Yes | — | No | No | No | — | — |
| Prescriptions (glasses/CL) | Live | ⚠️ Pilot | Yes | — | No | No | No | eRx integration | P3 |
| Pre-charting | Live | ✅ | Yes | — | No | No | No | AI summary via gateway | P2 |
| Imaging upload | Live | ⚠️ With storage BAA | Yes | Supabase Storage | Yes | No | No | Bucket policy audit | P0 |
| Imaging quality assessment | Live | ✅ | Yes | — | No | No | ✅ | Consolidate duplicate module | P2 |
| Imaging AI analysis | Config-dependent | ⚠️ With AI BAA | Yes | OpenAI / external | Yes | Yes (if diagnostic claims) | ✅ Partial | Clinical validation harness | P1 |
| Provider imaging review | Live | ✅ | Yes | — | No | Yes (workflow) | No | — | — |
| Imaging compare / timeline | Live | ✅ | Yes | — | No | No | No | — | — |
| Care gaps / recall queue | Live | ✅ | Yes | — | No | No | No | Auto-generation rules expand | P2 |
| Internal + portal messaging | Live | ✅ | Yes | — | No | No | No | Real-time delivery | P3 |
| SMS reminders | UI + DB only | ❌ | Yes (campaigns) | Twilio (planned) | Yes | No | No | Implement adapter + send | P1 |
| Email reminders | UI + DB only | ❌ | Yes (templates) | SendGrid (planned) | Yes | No | No | Implement adapter | P1 |
| Patient portal home | Live | ⚠️ With BAA | Yes | — | Yes | No | No | — | P1 |
| Patient appointments view | Live | ⚠️ Pilot | Yes | — | No | No | No | Online booking confirm | P2 |
| Patient prescriptions view | Live | ⚠️ Pilot | Yes | — | No | No | No | — | — |
| Patient forms / intake | Live | ⚠️ Pilot | Yes | — | No | No | No | E-sign vendor | P3 |
| Patient education center | Live | ✅ | Yes (content) | — | No | Yes (content) | No | Clinical review of content | P2 |
| Patient billing view | Display only | ❌ | Yes (invoices) | — | No | No | No | Payments (Stripe) | P2 |
| Staff billing / invoices | Display only | ❌ | Yes | — | No | No | No | Invoice CRUD, claims | P1 |
| Insurance claims | Not implemented | ❌ | No | Clearinghouse | Yes | Yes | No | Full R3 scope | P1 |
| Payment processing | Not implemented | ❌ | No | Stripe | Yes | No | No | R3 | P2 |
| Inventory management | Live | ⚠️ Pilot | Yes | — | No | No | No | Lab order integration | P3 |
| Financial reports | Live | ⚠️ Owner only | Yes | — | No | No | No | Location breakdown | P2 |
| Admin insights | Live | ⚠️ Owner only | Yes | — | No | No | No | — | — |
| Audit log (DB) | Live | ⚠️ With retention policy | Yes | — | No | No | No | External sink, immutability | P1 |
| Team invite / roles | Live | ✅ | Yes | Supabase | Yes | No | No | — | — |
| Practice setup | Live | ⚠️ Pilot | Yes | — | No | No | No | Onboarding flow | P0 |
| Multi-location | Schema + partial UI | ⚠️ Pilot | Yes | — | No | No | No | Per-location reporting | P2 |
| Disease documentation templates | Live | ✅ | Yes | — | No | No | No | — | — |
| Timeline intelligence | Live | ✅ | Yes | — | No | No | No | — | — |
| Workflow builder | UI prototype | ❌ | Partial | — | No | No | No | Execution engine or hide | P3 |
| EHR integration center | Placeholder | ❌ | Yes (config rows) | Per vendor | Yes + DUA | Yes | No | One real connector (R4) | P1 |
| Ambient scribe sessions | Live (manual) | ❌ ASR | Yes | ASR vendor | Yes | Yes | No | STT adapter R2 | P1 |
| Ask EyeQ / AI copilot | Live (gateway) | ⚠️ With AI BAA | Yes | OpenAI/Anthropic | Yes | Yes | ❌ PHI test harness | Rate limits, full gateway migration | P0 |
| AI settings / routing | Live | ⚠️ Admin | Yes | — | No | No | No | Org-level UI polish | P2 |
| AI emergency shutdown | Env flag | ✅ | N/A | — | No | No | No | Runbook | P2 |
| PHI safety gate | Live | ✅ | N/A | — | No | No | ❌ | Fix vitest; add NER | P0 |
| Installation readiness page | Checklist UI | ❌ | No | — | No | No | No | Tie to real checks | P3 |
| i18n / translations | Partial | ❌ | Yes (overrides) | — | No | Yes | No | Clinical translation QA | P3 |
| REST API (patients/appts) | Thin | ⚠️ Pilot | Yes | — | No | No | No | Permission hardening | P1 |
| REST API (imaging) | Partial | ⚠️ Pilot | Yes | — | No | No | No | Permission checks | P1 |
| Health check API | Live | ✅ | N/A | — | No | No | No | — | — |
| Legacy route redirects | Live | ✅ | N/A | — | No | No | No | Deprecate when safe | P3 |
| Marketing landing | Live | ✅ | N/A | — | No | No | No | Accurate feature claims | P1 |
| Contact form | Live | ✅ | Partial | — | No | No | No | Spam protection | P3 |
| Command palette | Live | ✅ | N/A | — | No | No | No | — | — |
| Copilots role tabs page | Live | ⚠️ | Partial | AI vendor | Yes | Yes | No | Merge with Ask EyeQ | P3 |
| Model registry (imaging) | Schema + admin | ❌ | Yes | External AI | Yes | Yes | No | Validated model slot | P2 |
| Knowledge base / RAG | Scaffold | ❌ | Partial | OpenAI embed | Yes | No | No | pgvector R4 | P2 |
| Communication preferences | Live | ⚠️ Pilot | Yes | — | No | No | No | TCPA consent flows | P1 |
| Document storage | Live | ⚠️ With BAA | Yes | Supabase | Yes | No | No | — | P1 |
| Launch / role router | Live | ✅ | Yes | — | No | No | No | — | — |
| Access denied page | Live | ✅ | N/A | — | No | No | No | — | — |
| Sign-out API | Live | ✅ | N/A | — | No | No | No | — | — |

**Test summary (July 6, 2026):** 11 tests passing in 3 files; PHI safety gate suite blocked by Vitest `server-only` resolution.

---

## Priority key

| Priority | Meaning |
|----------|---------|
| P0 | Blocks PHI pilot or security sign-off |
| P1 | Required for credible v1 sales |
| P2 | Important; can follow first pilot |
| P3 | Nice-to-have / future release |

---

*Update this table at the end of each release. Cross-reference `EYEQ_IMPLEMENTATION_ROADMAP.md`.*
