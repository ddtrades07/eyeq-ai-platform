# EyeQ AI Readiness

**Date:** July 20, 2026

## Production-ready (with keys + BAA)

| Capability | Requirements |
|------------|--------------|
| Ask EyeQ / clinical drafts via gateway | `AI_MODE=openai`, `OPENAI_API_KEY`, BAA confirmed, `AI_ALLOW_PHI=true` only when intentional |
| Provider review gates | `AI_REQUIRE_PROVIDER_REVIEW=true` (default) |
| Audit of AI requests | Gateway request tables + audit log |

## Demo-only

| Capability | Behavior |
|------------|----------|
| `AI_PROVIDER=mock` / demo mode | Labeled **Demo mock — not a clinical AI provider** |
| Seeded Ask EyeQ answers | Deterministic, non-diagnostic |

## Partially operational

| Capability | Gap |
|------------|-----|
| Ambient scribe | Sessions + approve path work; live STT needs Deepgram |
| Pre-chart AI drafts | Draft lifecycle improving; must stay draft until provider accepts |
| Imaging AI | Gated; without vendor → manual review only message |

## Requires vendor keys

- OpenAI (production AI)
- Deepgram or equivalent (live speech)
- Validated imaging AI vendor or OpenAI vision config

## Requires BAA / HIPAA setup

- OpenAI (PHI)
- Transcription vendor (PHI audio)
- Imaging AI vendor (PHI images)
- Supabase storage

## Safety rules (enforced by policy + product)

1. No diagnosis as final truth  
2. No autonomous treatment orders  
3. No auto-signed notes  
4. No auto-sent patient messages from AI  
5. Minimum necessary PHI  
6. Provider review required before chart persistence  
7. Audit logs required  
8. All AI calls via backend routes only — never expose API keys in the frontend  
9. Public website AI must not accept PHI  

## Runtime states (`resolveAiRuntimeState`)

| Status | Meaning |
|--------|---------|
| `openai` | Configured live OpenAI |
| `demo_mock` | Explicit demo/mock — labeled |
| `disabled` | Not configured — do not fake success |

## Future roadmap

- Structured AI draft lifecycle UI everywhere (generated → reviewed → accepted/rejected)
- Stronger PHI redaction + retention controls
- Org-scoped admin AI analytics (no cross-tenant aggregates)
