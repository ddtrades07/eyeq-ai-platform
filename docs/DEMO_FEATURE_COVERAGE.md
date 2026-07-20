# Demo Feature Coverage

Maps Live Demo surfaces to readiness for public optometrist demos (synthetic data only).

| Feature | Intro `/demo` | Walkthrough | Sidebar | Dashboard | Seed | Honesty |
|---------|---------------|-------------|---------|-----------|------|---------|
| Dashboard / command center | Yes | Step 1 | Yes | Yes | Yes | Demo banner |
| Schedule / patient flow | Yes | Step 2 | Yes | Flow cards | Yes | Synthetic |
| Patient chart | Yes | Step 3 | Yes | Next patient | Yes | Synthetic |
| Encounter / SOAP | Yes | Step 4 | Yes | Unsigned notes | Yes | No auto-sign |
| Rx (glasses + CL) | Yes | Step 5 | Via chart | Unsigned Rx | Yes | Portal approved only |
| Imaging | Yes | Step 6 | Yes | Imaging queue | Yes | Provider review |
| AI Image Analysis | Yes | Step 7 | Via imaging | AI queue | Yes | Provider-review only |
| Eye Health Library | Yes | Step 8 | Yes | — | Yes | Practice-approved |
| Patient portal | Yes | Step 9 | Patient nav | — | Yes | No live PHI |
| Secure messages | Yes | Step 10 | Yes | Messages card | Yes | Org-scoped |
| Google Reviews / Reputation | Yes | Step 11 | Reputation section | Reputation card | Yes | DEMO_PUBLISHED |
| Optical / inventory | Yes | Step 12 | Yes | Practice health | Yes | Synthetic |
| Billing drafts | Yes | Step 13 | Yes | Invoices | Yes | No fake payer success |
| PHI / vendor readiness | Yes | Step 14 | Settings | Launch (owner) | N/A | Fail-closed |
| Audit / support | Yes | Step 15 | Yes | — | Ticket seeded | Demo ticket |

## Reputation detail

Owner / Admin / Manager see sidebar section **Reputation**:

- Google Reviews → `/provider/reputation`
- Google Questions → `/provider/reputation/questions`
- Reply Drafts → `/provider/reputation/drafts`
- Review Analytics → `/provider/reputation/analytics`

Provider / staff without `reputation:read` see a locked panel (not a hard crash) if they open the URL.

Demo seed includes: 5-star needing thank-you, 3-star neutral, 1-star escalation, one DRAFT awaiting approval, one DEMO_PUBLISHED, plus questions (appointments, insurance, CL exams, one answered demo).

## Honesty rules

- Synthetic demo data only; no live PHI
- Clinical AI is provider-review only (no diagnosis claims)
- Google replies in demo are DEMO_PUBLISHED only (not live Google posts)
- Billing / RCM: drafts only, not a full replacement claim
- Demo org cannot enable controlled pilot with live PHI
