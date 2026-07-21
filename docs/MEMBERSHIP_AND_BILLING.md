# Membership and billing

## Model

Practice **owners** pay for an **organization** subscription. **Patients never pay** for EyeQ access.

Existing Prisma model: `OrgSubscription` (extended with Stripe ids + grace period). Lifecycle ledger: `SaasBillingEvent`. Patient statement payments continue to use `StripeWebhookEvent` + `PaymentLedgerEntry`.

## Plans

Editable catalog: `src/lib/billing/saas-plans.ts`

| Plan | Checkout | Notes |
| --- | --- | --- |
| Pilot | Contact / manual | Approved via `controlledPilotEnabled` + `billingStatus=MANUAL` |
| Practice | Stripe Checkout | Default self-serve |
| Growth | Stripe Checkout | Higher seats / usage |
| Enterprise | Contact | Custom |

## Activation (fail-closed for payment status)

1. Owner signs up at `/signup/practice` → org + `OrgSubscription` (`INACTIVE`)
2. Selects plan → Stripe Checkout Session (`mode: subscription`)
3. **Only signed webhooks** set `ACTIVE` / `TRIALING` / `PAST_DUE` / `CANCELLED`
4. Frontend `?checkout=success` is informational only

Webhook handler: `POST /api/webhooks/stripe` → `processSaasStripeEvent`

Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`

## Gating

`evaluateSubscriptionAccess` in `src/lib/billing/subscription-access.ts`:

- Demo org / DEMO_MODE demo slug: free
- ACTIVE / TRIALING / approved MANUAL pilot: full
- PAST_DUE: clinical access kept; expansion blocked after grace (`BILLING_GRACE_PERIOD_DAYS`)
- INACTIVE / CANCELLED: warn; block new invites & locations; **do not delete clinical records**

Seat checks: `assertProviderSeatAvailable` / `assertLocationSeatAvailable`

## PHI

Stripe metadata / descriptions: `organizationId`, `plan`, `product=eyeq_saas` only — **never PHI**.

## Owner surfaces

- `/pricing`, `/onboarding/practice`
- `/provider/settings/billing`, `/provider/settings/subscription`
- Billing Portal via `openBillingPortal`
