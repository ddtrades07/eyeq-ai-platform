# Eye Health Library

Patient-friendly education library for EyeQ (demo and live).

## Positioning

- **Eye Health Library**
- Learn about eye conditions, prevention, and care.
- Educational information only. Your provider will confirm what applies to you.

## Routes

| Audience | Path |
|----------|------|
| Patient portal | `/patient/eye-health-library` (also `/portal/eye-health-library` via redirect) |
| Article | `/patient/eye-health-library/[slug]` |
| Provider | `/provider/eye-health-library` |
| Legacy | `/patient/education` → library |

## Content model

Articles live in `src/lib/eye-health/catalog.ts` as EyeQ-authored summaries with source links to public pages (NEI, AOA, CDC). We do not scrape or copy full third-party articles.

Practice overlays (approve / hide) and patient recommendations are stored in Prisma:

- `EyeHealthOrgArticleState`
- `EyeHealthRecommendation`
- `EyeHealthSavedArticle`

## Article sections

Each article includes: summary, what it means, symptoms, risk factors, prevention/maintenance, treatment overview (general), what providers may check, questions to ask, when to contact the office, urgent warning signs, disclaimers, and source links.

## Disclaimers

Shown on every article:

> This information is for education only and is not a diagnosis. Your eye care provider will explain what applies to your specific eyes, exam results, and treatment plan.

Urgent banner when relevant (flashes/floaters, glaucoma acute signs, detachment, etc.).

## Provider recommendations

Providers can recommend from the library article page (attach to portal and/or secure message). Portal wording:

> Your provider shared this article because it may relate to your visit.

Contexts: `PROVIDER_RECOMMENDED`, `RELATED_TO_VISIT`, `DISCUSSION_TOPIC` (for suspected topics: never “you have this”).

AI imaging does not auto-attach diagnosis articles.

## AI education helper

`explainEyeHealthArticle` rewrites the catalog text in simpler words. It does not diagnose, interpret personal symptoms as a condition, or recommend patient-specific treatment.

## Demo seed

Demo reset seeds practice-approved overlays for key slugs and recommendations for Michael Thompson / James Wilson.

## Performance

- Search uses in-memory catalog indexes (title, tags, symptoms, searchTerms).
- List pages load summaries only; full article loads on detail route.
- Org approval states use short-TTL org-scoped cache (no PHI).

## Related docs

- `docs/PATIENT_EDUCATION_POLICY.md`
