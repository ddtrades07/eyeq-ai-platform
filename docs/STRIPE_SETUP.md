# Stripe setup (EyeQ SaaS + patient payments)

## Dashboard checklist

1. Create Products/Prices for **Practice** and **Growth** (and optionally Pilot/Enterprise).
2. Copy Price IDs into env:
   - `STRIPE_PRICE_PRACTICE`
   - `STRIPE_PRICE_GROWTH`
   - `STRIPE_PRICE_PILOT` / `STRIPE_PRICE_ENTERPRISE` if used
3. API keys: `STRIPE_SECRET_KEY` (prefer restricted key), never expose to the browser.
4. Webhook endpoint: `https://<your-host>/api/webhooks/stripe`
5. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Signing secret → `STRIPE_WEBHOOK_SECRET`
7. Enable **Customer Portal** (subscription cancel/update payment method)
8. Configure payment methods in Dashboard (do **not** hardcode `payment_method_types` in API calls)

## Metadata rules

Allowed: `organizationId`, `plan`, `product=eyeq_saas`  
Forbidden: patient names, DOB, diagnoses, chart ids as clinical content, any PHI

## Local testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Dual use

Same webhook route handles:

- **SaaS membership** (`product=eyeq_saas` / subscription mode)
- **Patient invoice Checkout** (`metadata.invoiceId`)

Idempotency: `SaasBillingEvent.stripeEventId` + `StripeWebhookEvent.eventId` + payment ledger keys.
