import 'server-only';
import { serverEnv, publicEnv } from '@/lib/env';
import type { PaymentProvider } from '../index';

export const stripePaymentProvider: PaymentProvider = {
  name: 'stripe',

  isConfigured() {
    return Boolean(serverEnv.stripeSecretKey);
  },

  async createPaymentIntent({ amountCents, patientId, metadata }) {
    const key = serverEnv.stripeSecretKey;
    if (!key) return { error: 'Stripe is not configured' };

    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${publicEnv.appUrl}/patient/billing?paid=1`,
      cancel_url: `${publicEnv.appUrl}/patient/billing?cancelled=1`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][price_data][product_data][name]': 'Eye care statement',
      'line_items[0][quantity]': '1',
      'metadata[patientId]': patientId,
    });

    if (metadata?.invoiceId) {
      params.set('metadata[invoiceId]', String(metadata.invoiceId));
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `Stripe ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    return { clientSecret: data.url as string };
  },
};

export function getPaymentProvider(): PaymentProvider {
  return stripePaymentProvider;
}

export function isStripeConfigured(): boolean {
  return stripePaymentProvider.isConfigured();
}
