'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { getPaymentProvider, isStripeConfigured } from '@/lib/providers/payments/stripe';
import { audit } from '@/lib/audit/log';
import { isDemoTenant, withDemoNotice } from '@/lib/demo/safety-server';

export const createInvoiceCheckout = action({
  schema: z.object({ invoiceId: z.string() }),
  async handler({ invoiceId }) {
    const user = await assertPermission('portal:self');
    if (!user.organizationId) throw new Error('No organization context');

    const invoice = await db.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { patient: true },
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.patient.userId !== user.id) {
      throw new Error('You can only pay your own invoices');
    }
    assertSameOrg(user, invoice);
    if (invoice.status !== 'OPEN') {
      throw new Error('This invoice is not open for payment');
    }

    const balance = invoice.totalCents - invoice.paidCents;
    if (balance <= 0) {
      throw new Error('Nothing due on this invoice');
    }
    if (!isStripeConfigured()) {
      throw new Error('Online payments are not configured for this practice');
    }

    const provider = getPaymentProvider();
    const result = await provider.createPaymentIntent({
      amountCents: balance,
      patientId: invoice.patientId,
      metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
    });

    if (result.error || !result.clientSecret) {
      throw new Error(result.error ?? 'Could not start checkout');
    }

    await audit({
      organizationId: invoice.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientInvoice',
      resourceId: invoiceId,
      metadata: { event: 'checkout_started' },
    });

    return { checkoutUrl: result.clientSecret };
  },
});

/** Demo-only portal payment when Stripe is not configured. */
export const recordDemoPortalPayment = action({
  schema: z.object({ invoiceId: z.string() }),
  async handler({ invoiceId }) {
    const user = await assertPermission('portal:self');
    if (!user.organizationId) throw new Error('No organization context');
    if (!isDemoTenant(user.organizationSlug)) {
      throw new Error('Demo payments are only available in the demo environment.');
    }

    const invoice = await db.patientInvoice.findUnique({
      where: { id: invoiceId },
      include: { patient: true },
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.patient.userId !== user.id) {
      throw new Error('You can only pay your own invoices');
    }
    assertSameOrg(user, invoice);
    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new Error('This invoice is not open for payment');
    }

    const balance = invoice.totalCents - invoice.paidCents;
    if (balance <= 0) {
      throw new Error('Nothing due on this invoice');
    }

    const updated = await db.patientInvoice.update({
      where: { id: invoiceId },
      data: {
        paidCents: invoice.totalCents,
        status: InvoiceStatus.PAID,
      },
    });

    await audit({
      organizationId: invoice.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientInvoice',
      resourceId: invoiceId,
      metadata: { event: 'demo_portal_payment', amountCents: balance },
    });

    revalidatePath('/patient/billing');
    return withDemoNotice({ invoiceId: updated.id }, user.organizationSlug);
  },
});
