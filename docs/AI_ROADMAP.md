# AI roadmap

EyeQ AI is built so today's safe-by-default UI can flip on real AI integrations without code-level rewrites once vendor risk + clinical validation are in place.

## What ships today (mock)

- `AIProvider` interface with `complete / embed? / reviewImaging` methods.
- `mockAIProvider` returns deterministic, cautious imaging-review signals.
- All AI signals are stored on `ImagingCase` with provenance (`aiProvider` field).
- All AI invocations write `AuditLog` rows with `AI_INVOCATION` action.
- Prompts are centralised in `src/lib/ai/prompts.ts` and start with a safety preamble.
- A platform-level `SafetyDisclaimer` component is rendered alongside any AI output.

## Phase 1 — pre-charting + outreach scripts

- Use `getAIProvider().complete(...)` to summarise recent visits, imaging trends, and risk flags.
- Use the same provider to draft care-gap outreach scripts (`CARE_GAP_OUTREACH_SYSTEM`).
- No PHI leaves the platform without explicit operator action; we surface drafts in-app and require staff approval before any send.
- Audit every invocation.

## Phase 2 — provider review-support for imaging

- Flip `AI_PROVIDER=openai|anthropic` and implement the SDK call inside the corresponding `reviewImaging`.
- Confirm BAA + region.
- Continue producing the same `ImagingReviewSignals` shape; the UI is already consuming it.

## Phase 3 — vector search & longitudinal context

- Provision `pgvector` on the EyeQ Postgres (or a managed vector DB).
- Implement `getVectorSearchProvider()` to upsert clinical-note embeddings keyed by `(organizationId, patientId, noteId)`.
- Use vector recall to power patient-context retrieval for pre-charting.

## Phase 4 — true multimodal imaging

- Implement `getMultimodalImagingProvider()` — accepts a signed image URL + patient context, returns structured findings + (eventually) annotated overlays.
- Stand up an evaluation harness against historical sign-offs before exposing this to clinicians.

## Safety rails — always-on

- The platform never produces diagnostic language. Prompt templates explicitly forbid it.
- Every AI output is surfaced as "review support". Provider sign-off is required before content reaches the patient portal.
- Cross-tenant isolation is enforced at the action layer; the AI service never has direct access to PHI from another organization.
