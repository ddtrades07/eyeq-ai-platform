# Team invites

## Roles

Invite flow: `/provider/team`, `/provider/settings/team`, `/onboarding/team` via `inviteTeamMember`.

Typical roles: Optometrist / MD, Practice Manager, Front Desk, Billing, Technician, Admin, Optical, Scribe. Only OWNER can invite another OWNER.

## Fields

Email, name, role, optional credentials/NPI for providers. Temporary password or Supabase magic invite.

## Limits

`assertProviderSeatAvailable` enforces:

1. Subscription expansion allowed (active / pilot / grace)
2. Staff count &lt; `providerSeatLimit`

## Status tracking

`StaffOnboarding`: invite accepted, MFA, location access, PHI notice, workflow intro: see `/provider/settings/staff-onboarding`.

## Audit

`CREATE` on `User` with metadata `{ role, channel }`: no PHI in audit metadata beyond role/email as required for account provisioning.
