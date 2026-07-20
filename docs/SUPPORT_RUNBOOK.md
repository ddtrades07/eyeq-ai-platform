# Support Runbook

## Provider workflow

Route: `/provider/support`

Staff can:

- Submit a ticket (category, priority, description)
- Mark if PHI may be included
- Optionally link a related patient ID
- View their own tickets

Categories: Login, MFA, Scheduling, Patient chart, Imaging, AI, Messaging, Reminders, Patient portal, Billing, Google Reviews, Migration, Bug, Feature request, Other.

## Admin workflow

Owners/admins can:

- View all org tickets
- Assign to owner/admin users
- Change status
- Add internal notes
- Flag security/PHI concern
- Close with resolution

## Safety

- Prefer non-PHI ticket bodies
- PHI-marked tickets are audited on create/update
- Support status never blocks clinical access

## Schema

- `SupportTicket`
- `SupportTicketNote`
