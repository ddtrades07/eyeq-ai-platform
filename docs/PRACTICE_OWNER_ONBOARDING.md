# Practice owner onboarding

## Happy path

1. **Pricing** → choose Practice/Growth (or Contact for Pilot/Enterprise)
2. **`/signup/practice`** → create owner + org (subscription starts `INACTIVE`)
3. **`/onboarding/practice`** → Stripe Checkout (webhook activates)
4. **`/onboarding/team`** → invite staff (seat limits apply)
5. **`/onboarding/locations`** → confirm / add locations
6. **`/onboarding/patients`** → portal invites (patients free; no PHI in email)
7. **PHI readiness** → `/provider/settings/phi-readiness` before live PHI

## Checklist after payment

- [ ] Subscription status ACTIVE (Billing settings)
- [ ] Team invited (roles + MFA onboarding)
- [ ] Locations within plan limits
- [ ] Patient portal invite path shared
- [ ] PHI readiness / BAAs / pilot gates as required

## Demo

Live Demo (`/demo`) bypasses payment. Do not use demo orgs for live PHI.
