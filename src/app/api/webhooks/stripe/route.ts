import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { db } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { audit } from '@/lib/audit/log';
import {
  processSaasStripeEvent,
  type StripeEventLike,
} from '@/lib/billing/saas-webhook';

export const dynamic = 'force-dynamic';

const WEBHOOK_TOLERANCE_SEC = 300;

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(',').map((p) => p.trim());
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SEC || age < -WEBHOOK_TOLERANCE_SEC) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  });
}

export async function POST(request: Request) {
  const secret = serverEnv.stripeWebhookSecret;
  if (!secret || !serverEnv.stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET required)' },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  if (!verifyStripeSignature(body, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: StripeEventLike & {
    data?: {
      object?: {
        metadata?: Record<string, string>;
        amount_total?: number;
        id?: string;
        mode?: string;
      };
    };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const eventId = event.id;
  if (!eventId) {
    return NextResponse.json({ error: 'missing event id' }, { status: 400 });
  }

  // Prefer SaaS membership handling (Checkout subscription + lifecycle).
  const saas = await processSaasStripeEvent(event, body);
  if (saas.handled) {
    // Mirror into StripeWebhookEvent for unified ops visibility (idempotent).
    await db.stripeWebhookEvent
      .upsert({
        where: { eventId },
        create: {
          eventId,
          eventType: event.type,
          payloadHash: createHash('sha256').update(body).digest('hex'),
          metadata: { product: 'eyeq_saas', duplicate: saas.duplicate ?? false },
        },
        update: {},
      })
      .catch(() => undefined);
    return NextResponse.json({ received: true, saas: true, duplicate: saas.duplicate ?? false });
  }

  const existing = await db.stripeWebhookEvent.findUnique({ where: { eventId } });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payloadHash = createHash('sha256').update(body).digest('hex');

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const invoiceId = session?.metadata?.invoiceId;
    if (invoiceId) {
      const invoice = await db.patientInvoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const paidAmount = session.amount_total ?? invoice.totalCents - invoice.paidCents;
        const idempotencyKey = `stripe:${eventId}`;

        await db.$transaction(async (tx) => {
          await tx.stripeWebhookEvent.create({
            data: {
              eventId,
              eventType: event.type,
              payloadHash,
              organizationId: invoice.organizationId,
              invoiceId,
              metadata: { sessionId: session.id ?? null },
            },
          });

          const prior = await tx.paymentLedgerEntry.findUnique({
            where: {
              organizationId_idempotencyKey: {
                organizationId: invoice.organizationId,
                idempotencyKey,
              },
            },
          });
          if (prior) return;

          if (invoice.status === 'OPEN') {
            const paidCents = Math.min(invoice.totalCents, invoice.paidCents + paidAmount);
            await tx.patientInvoice.update({
              where: { id: invoiceId },
              data: {
                paidCents,
                status: paidCents >= invoice.totalCents ? 'PAID' : 'OPEN',
              },
            });
          }

          await tx.paymentLedgerEntry.create({
            data: {
              organizationId: invoice.organizationId,
              patientId: invoice.patientId,
              invoiceId,
              type: 'PAYMENT',
              source: 'STRIPE',
              amountCents: paidAmount,
              idempotencyKey,
              externalRef: session.id ?? eventId,
              description: 'Stripe checkout.session.completed',
              metadata: { eventId, eventType: event.type },
            },
          });
        });

        await audit({
          organizationId: invoice.organizationId,
          action: 'UPDATE',
          resourceType: 'PatientInvoice',
          resourceId: invoiceId,
          metadata: { event: 'stripe_checkout_completed', paidAmount, eventId },
        });
      } else {
        await db.stripeWebhookEvent.create({
          data: {
            eventId,
            eventType: event.type,
            payloadHash,
            invoiceId,
            metadata: { note: 'invoice_not_found' },
          },
        });
      }
    } else {
      await db.stripeWebhookEvent.create({
        data: {
          eventId,
          eventType: event.type,
          payloadHash,
          metadata: { note: 'no_invoice_metadata' },
        },
      });
    }
  } else {
    await db.stripeWebhookEvent.create({
      data: {
        eventId,
        eventType: event.type,
        payloadHash,
        metadata: { note: 'ignored_event_type' },
      },
    });
  }

  return NextResponse.json({ received: true });
}
