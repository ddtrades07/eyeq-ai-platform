# Patient portal invites

## Policy

- **Patients do not pay** for EyeQ. The practice subscription covers portal access.
- Invite / reminder emails must **not include PHI** (no diagnoses, medications, DOB, chart details).
- Prefer generic copy: practice name + portal link + “sign in to view information your provider shares.”

## Paths

- Self-signup: `/signup-patient` with practice slug
- Staff creates patient record then shares login / portal link
- Onboarding guide: `/onboarding/patients`

## Scoping

Patient accounts are org-scoped (`organizationId` + `Patient` row). Portal routes require patient role + membership.
