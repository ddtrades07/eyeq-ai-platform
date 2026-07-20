# Patient Education Policy

## Allowed content

- Plain-language education about eye conditions, prevention, maintenance, and general treatment categories
- Questions patients can ask their provider
- When to contact the office and urgent warning signs
- Links to reputable public sources (NEI, AOA, CDC/NIH, and similarly reliable organizations)
- Practice-approved EyeQ-authored summaries

## Prohibited content

- Claiming the patient has a diagnosis
- Replacing provider advice
- Prescribing a specific medication, dose, or regimen for that patient
- “You need treatment” / “This will cure it” / “You should not see a doctor”
- Emergency triage beyond safe escalation language
- Scraped or copied copyrighted full articles
- Unreviewed AI-generated medical content as final truth
- Auto-attaching education from AI imaging findings without provider approval

## Source policy

- Write original EyeQ summaries
- Cite public source landing pages; do not paste copyrighted body text
- Prefer NEI, AOA, CDC/NIH, and properly licensed partner materials
- Track `sourceLinks` on each article

## Review workflow

1. Catalog default: `provider_reviewed` demo drafts (labeled demo content)
2. Practice staff with `templates:manage` mark `PROVIDER_REVIEWED` or `PRACTICE_APPROVED`
3. Practices may `HIDDEN` / `ARCHIVED` articles for their org
4. Record `lastReviewedAt` and reviewer on org state

## AI education rules

Allowed: simplify article language, summarize key points, suggest questions, help find articles.

Not allowed: diagnose, finalize symptom interpretation, patient-specific treatment, override provider plan, use PHI unless AI_ALLOW_PHI + BAA + auth + readiness pass.

Public/non-PHI: library text only.

Portal mode closing line:

> I can help explain this article. For your personal diagnosis or treatment plan, please follow your provider’s instructions or message the office.

## Patient disclaimer

Required on every article (see `EYE_HEALTH_DISCLAIMER` in catalog).

## Provider approval process

Only roles with `templates:manage` (typically OWNER/ADMIN) can approve or hide. Recommendations require `messages:send` (or equivalent messaging permission) and are audited. Recommendations are scoped to organization + patient.
