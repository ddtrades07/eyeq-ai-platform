# Dashboard Design

The provider dashboard is the EyeQ command center.

## Layout

Implemented in:

- `src/server/queries/command-center.ts`
- `src/components/dashboard/command-center.tsx`
- `src/app/provider/dashboard/page.tsx`

## Sections

| Section | Audience | Contents |
|---|---|---|
| Today's practice flow | Clinical + ops | Scheduled, checked in, in exam, ready, completed, walk-ins, late: clickable to patient flow |
| Provider focus | Clinical | Unsigned notes/Rx, imaging review, urgent gaps, messages |
| AI work queue | Clinical | Pre-chart, SOAP/scribe, imaging support, blocked AI: always “draft · review required” |
| Patient experience | Ops | Unread messages, appointment requests, reminder drafts, forms |
| Practice health | Ops / owner | Completed visits, no-shows, care gaps, optical, invoices, reviews |
| Reputation | Reputation roles | Reviews needing reply, AI drafts, unanswered, negative alerts |
| Launch readiness | Owner/Admin only | PHI / pilot / checklist snapshot |

Specialized role dashboards remain for billing, front desk, technician, and optical personas.

## Rules

- Metrics come from live Prisma counts for the active location when scoped
- Zero-count items collapse into empty states inside lists
- AI cards never imply auto-approval or diagnosis
- Launch widget is hidden for non-admin staff
