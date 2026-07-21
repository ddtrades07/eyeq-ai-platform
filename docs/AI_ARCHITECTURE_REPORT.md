# EyeQ AI Platform. Architecture Audit & Implementation Report

**Date:** July 6, 2026  
**Scope:** Production-ready AI gateway foundation (Phases 1-2 partial, scaffolding for 3-7)

---

## 1. Existing AI Architecture (Pre-Implementation)

| Area | Location | Behavior |
|------|----------|----------|
| Copilot orchestrator | `src/lib/ai/copilot/orchestrator.ts` | Direct `getAIProvider().complete()`: no gateway |
| Provider abstraction | `src/lib/ai/provider.ts`, `openai.ts`, `mock.ts`, `anthropic.ts` | Env-driven; Anthropic stub; mock default |
| Copilot API | `src/app/api/copilot/stream/route.ts` | Simulated streaming; **360-line `generateFallbackResponse()`** with templated clinical answers |
| Imaging (legacy) | `src/lib/ai/imaging.ts` | General LLM imaging review |
| Imaging (structured) | `src/lib/imaging/services/*` | Separate pipeline with validated providers |
| Ambient scribe | `src/server/actions/scribe.ts` | Regex/heuristic transcript parsing: **no STT vendor** |
| Assistant persistence | `src/server/actions/assistant.ts` | DB only |
| Safety rules | `src/lib/ai/safety.ts` | `containsDisallowedClinicalLanguage()` **defined but unused** |
| Audit | `src/lib/audit/log.ts` | Generic `AI_INVOCATION`: not per-request gateway logs |

**Security positive:** All vendor API keys are server-side (`serverEnv`). No browser-direct AI calls found.

---

## 2. Mock Features Found

| Feature | Risk | Resolution |
|---------|------|------------|
| `AI_PROVIDER=mock` default | Fake clinical answers in dev | Gateway blocks mock when `AI_HIPAA_MODE=true` |
| `generateFallbackResponse()` | Templated SOAP/summaries bypassing providers | **Removed**: safe empty/error states |
| Scribe `injectMockTranscript()` | Demo transcript injection | Unchanged UI hook; note generation still heuristic |
| `development-mock-provider.ts` | Fake imaging findings | Retained for dev only behind `IMAGING_DEV_MOCK` |
| Mock keyword copilot (`mock.ts`) | Static responses | Bypassed when gateway requires real provider |
| Simulated streaming | UX only | Retained (chunks complete response; not token streaming) |

---

## 3. Security & PHI Risks (Addressed / Remaining)

### Addressed in this implementation
- Centralized **AI Gateway** (`src/lib/ai-gateway/gateway.ts`)
- Mandatory **PHI Safety Gate** (regex + known-patient matching)
- **Authorization** (`ai:use`, `ai:clinical`, `ai:configure`, `ai:approve`)
- **Tenant isolation** (membership + patient scope)
- **Audit logging** per gateway request
- **Prompt injection** pattern detection
- **Clinical output validation** (disallowed language)
- **Redacted logging** for prompts
- **Emergency shutdown** (`AI_EMERGENCY_SHUTDOWN`)

### Remaining
- NER / DICOM metadata / image PHI classifiers (layers 3-7 in spec)
- Per-practice cost limit enforcement (env vars exist; enforcement not wired)
- Secondary AI PHI review
- Malware scanning on attachments
- Full job queues (BullMQ / SQS)
- API route granular RBAC on `/api/patients`, etc.
- Embedding vector search (pgvector)
- True token streaming

---

## 4. Database Changes

### New tables (Prisma)
- `AiGatewayRequest`, `AiGatewayResponse`
- `AiProviderConfig`, `AiModelRoute`
- `AiUsageRecord`
- `PhiDetectionEvent`, `BlockedAiRequest`
- `AiKnowledgeDocument`, `AiKnowledgeChunk`

### Still needed (future phases)
- `ai_conversations` / `ai_messages` (partially covered by `AiAssistant*`)
- `ai_prompt_templates`, `ai_prompt_versions`
- `ai_model_registry` (exists as `ModelRegistry`: not wired to gateway)
- `ai_cost_events`, `ai_feedback`, `ai_failures`, `ai_evaluations`
- `scribe_audio_files`, `scribe_transcript_versions`, `ai_generated_notes`
- `imaging_studies`, `imaging_ai_jobs` (partially covered by existing imaging models)

RLS enabled in `prisma/rls.sql` for all new tables.

---

## 5. Implementation Phases

| Phase | Status | Notes |
|-------|--------|-------|
| **1** Gateway, auth, PHI, audit | ✅ Core complete | |
| **2** LLM adapters, router, assistant | ✅ Wired | Copilot → gateway |
| **3** RAG + embeddings | 🔶 Scaffold | Keyword retrieval on chunks; no embeddings yet |
| **4** Ambient scribe STT | ❌ Blocked | Needs transcription vendor + BAA |
| **5** Imaging gateway integration | 🔶 Partial | Existing orchestrator separate; adapter stubs |
| **6** Queues, failover, cost controls | 🔶 Partial | Retry/fallback in gateway; no DLQ |
| **7** Evaluation + pilot rollout | ❌ Not started | |

---

## 6. Recommended Next Deployment Step

1. Run `npx prisma db push` and `prisma db execute --file prisma/rls.sql`
2. Set production env:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=...
   OPENAI_BAA_CONFIRMED=true
   AI_BAA_CONFIRMED=true
   AI_ALLOW_PHI=true
   AI_HIPAA_MODE=true
   ```
3. Pilot with **non-PHI** platform-help queries first
4. Execute legal BAA review before `AI_ALLOW_PHI=true`
5. Connect transcription vendor before enabling ambient scribe in production

---

## 7. Compliance Boundaries

- This architecture **does not alone make EyeQ HIPAA compliant**
- EyeQ is **not FDA cleared**
- All clinical AI output is **preliminary** until provider review
- General-purpose LLMs must **not** replace validated imaging diagnostic models

---

## 8. Files Created

```
src/lib/ai-gateway/
  gateway.ts, types.ts, index.ts
  authorization.ts, tenant-isolation.ts
  phi-safety-gate.ts, model-router.ts
  prompt-guard.ts, prompt-builder.ts
  response-validator.ts, clinical-safety-validator.ts
  audit-logger.ts, usage-tracker.ts, retry-manager.ts
  knowledge-retriever.ts
  providers/adapter.ts, openai-provider.ts, anthropic-provider.ts
  providers/local-provider.ts, speech-adapter.ts, imaging-adapter.ts

src/app/provider/settings/ai/page.tsx
src/app/api/admin/ai/status/route.ts
docs/AI_ARCHITECTURE_REPORT.md
```

## 9. Files Changed

```
prisma/schema.prisma
prisma/rls.sql
src/lib/env.ts
src/lib/auth/rbac.ts
src/lib/ai/copilot/orchestrator.ts
src/app/api/copilot/stream/route.ts
src/app/provider/settings/page.tsx
```

---

## 10. Environment Variables Required

See `src/lib/env.ts` for full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `openai` \| `anthropic` \| `mock` |
| `AI_HIPAA_MODE` | Block mock; enable redaction |
| `AI_BAA_CONFIRMED` | Practice-level BAA gate |
| `AI_ALLOW_PHI` | Allow confirmed PHI transmission |
| `AI_EMERGENCY_SHUTDOWN` | Disable external AI |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | LLM credentials |
| `TRANSCRIPTION_*` | Ambient scribe (Phase 4) |
| `IMAGING_AI_*` | Specialized imaging vendor |

---

## 11. Feature Status

| Feature | Status |
|---------|--------|
| AI Assistant (configured LLM) | ✅ Functional with OpenAI/Anthropic |
| AI Assistant (no provider) | ⚠️ Safe empty state |
| PHI Safety Gate | ✅ Functional (regex + patient match) |
| AI Control Center UI | ✅ Read-only monitoring |
| RAG knowledge base | 🔶 Schema + keyword retrieval |
| Ambient scribe STT | ❌ Vendor not connected |
| Imaging AI via gateway | ❌ Use existing imaging orchestrator |
| Job queues | ❌ Not implemented |
| Evaluation suite | ❌ Not implemented |

---

## 12. Vendors Needing Contracts / BAAs

- OpenAI (LLM + embeddings)
- Anthropic (LLM fallback)
- Speech-to-text vendor (Deepgram, AWS Transcribe Medical, etc.)
- Specialized imaging AI vendor
- Error monitoring (if PHI in logs)
