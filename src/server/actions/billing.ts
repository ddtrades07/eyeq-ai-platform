'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { InvoiceStatus, ClaimStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import {
  hasBlockingClaimErrors,
  validateClaimInput,
} from '@/lib/billing/claim-validation';
import { getClearinghouseProvider } from '@/lib/providers/clearinghouse';
import { simulatedIntegrationBlockedReason } from '@/lib/production/mode';
import { withDemoNotice } from '@/lib/demo/safety-server';

const invoiceSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional().nullable(),
  description: z.string().min(1).max(500),
  totalCents: z.number().int().positive(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const createPatientInvoice = action({
  schema: invoiceSchema,
  async handler(input) {
    const user = await assertPermission('billing:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const invoice = await db.patientInvoice.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        description: input.description,
        totalCents: input.totalCents,
        dueDate: input.dueDate ?? null,
        status: InvoiceStatus.OPEN,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'PatientInvoice',
      resourceId: invoice.id,
    });

    revalidatePath('/provider/billing');
    revalidatePath(`/provider/patients/${input.patientId}`);
    return invoice;
  },
});

export const voidPatientInvoice = action({
  schema: z.object({ id: z.string(), reason: z.string().max(500).optional() }),
  async handler({ id, reason }) {
    const user = await assertPermission('billing:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const invoice = await db.patientInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    assertSameOrg(user, invoice);

    const updated = await db.patientInvoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientInvoice',
      resourceId: id,
      metadata: { void: true, reason },
    });

    revalidatePath('/provider/billing');
    return updated;
  },
});

export const recordInvoicePayment = action({
  schema: z.object({
    id: z.string(),
    amountCents: z.number().int().positive(),
  }),
  async handler({ id, amountCents }) {
    const user = await assertPermission('billing:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const invoice = await db.patientInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    assertSameOrg(user, invoice);

    const paidCents = Math.min(invoice.totalCents, invoice.paidCents + amountCents);
    const status = paidCents >= invoice.totalCents ? InvoiceStatus.PAID : invoice.status;

    const updated = await db.patientInvoice.update({
      where: { id },
      data: { paidCents, status },
    });

    revalidatePath('/provider/billing');
    revalidatePath(`/provider/patients/${invoice.patientId}`);
    return withDemoNotice(updated, user.organizationSlug);
  },
});

const claimSchema = z.object({
  patientId: z.string(),
  invoiceId: z.string().optional().nullable(),
  payerName: z.string().max(200).optional(),
  memberId: z.string().max(100).optional(),
  lines: z.array(
    z.object({
      cptCode: z.string().min(4).max(10),
      modifier: z.string().max(10).optional(),
      description: z.string().max(500).optional(),
      chargeCents: z.number().int().positive(),
      units: z.number().int().positive().default(1),
      diagnosisCodes: z.array(z.string()).default([]),
    }),
  ).min(1),
});

export const createClaim = action({
  schema: claimSchema,
  async handler(input) {
    const user = await assertPermission('claims:create');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const totalCents = input.lines.reduce((sum, l) => sum + l.chargeCents * l.units, 0);

    const claim = await db.claim.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        invoiceId: input.invoiceId ?? null,
        payerName: input.payerName ?? patient.insuranceCarrier,
        memberId: input.memberId ?? patient.insuranceMemberId,
        totalCents,
        status: ClaimStatus.DRAFT,
        lines: {
          create: input.lines.map((l) => ({
            cptCode: l.cptCode,
            modifier: l.modifier ?? null,
            description: l.description ?? null,
            chargeCents: l.chargeCents,
            units: l.units,
            diagnosisCodes: l.diagnosisCodes,
          })),
        },
      },
      include: { lines: true },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Claim',
      resourceId: claim.id,
    });

    revalidatePath('/provider/billing');
    return claim;
  },
});

async function loadClaimForValidation(claimId: string, organizationId: string) {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: {
      lines: true,
      patient: true,
      organization: { select: { name: true } },
    },
  });
  if (!claim) throw new Error('Claim not found');
  if (claim.organizationId !== organizationId) throw new Error('Cross-tenant access denied');

  const provider = await db.provider.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: { npi: true },
  });

  return { claim, providerNpi: provider?.npi ?? null };
}

export const validateClaim = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('claims:create');
    if (!user.organizationId) throw new Error('No organization context');

    const { claim, providerNpi } = await loadClaimForValidation(id, user.organizationId);
    const issues = validateClaimInput({
      patient: claim.patient,
      claim,
      organization: claim.organization,
      renderingProviderNpi: providerNpi,
    });

    return {
      issues,
      canSubmit: !hasBlockingClaimErrors(issues),
      clearinghouseConfigured: Boolean(getClearinghouseProvider()?.isConfigured()),
    };
  },
});

export const submitClaim = action({
  schema: z.object({ id: z.string(), overrideReason: z.string().max(500).optional() }),
  async handler({ id, overrideReason }) {
    const user = await assertPermission('claims:submit');
    if (!user.organizationId) throw new Error('No organization context');

    const { claim, providerNpi } = await loadClaimForValidation(id, user.organizationId);
    assertSameOrg(user, claim);
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new Error('Only draft claims can be submitted');
    }

    const issues = validateClaimInput({
      patient: claim.patient,
      claim,
      organization: claim.organization,
      renderingProviderNpi: providerNpi,
    });
    if (hasBlockingClaimErrors(issues) && !overrideReason?.trim()) {
      throw new Error('Claim has blocking validation errors. Fix errors or document an override.');
    }

    const clearinghouse = getClearinghouseProvider();
    if (!clearinghouse?.isConfigured()) {
      throw new Error(
        `${simulatedIntegrationBlockedReason('CLAIMS')} Use "Record external submission" for claims submitted outside EyeQ.`,
      );
    }

    const result = await clearinghouse.submitClaim(id);
    if (!result.accepted) {
      throw new Error(result.errors?.join('; ') ?? 'Claim submission failed');
    }

    const updated = await db.claim.update({
      where: { id },
      data: {
        status: ClaimStatus.SUBMITTED,
        externalId: result.externalId ?? null,
        submittedAt: new Date(),
        notes: [overrideReason, result.errors?.join('; ')].filter(Boolean).join(' | ') || null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Claim',
      resourceId: id,
      metadata: {
        submitted: true,
        externalId: result.externalId,
        adapter: clearinghouse.name,
        overrideReason,
        validationIssues: issues.length,
      },
    });

    revalidatePath('/provider/billing');
    return withDemoNotice(updated, user.organizationSlug);
  },
});

/** Record a claim submitted through an external clearinghouse or payer portal. */
export const recordManualClaimSubmission = action({
  schema: z.object({
    id: z.string(),
    externalReference: z.string().min(1).max(200),
    notes: z.string().max(1000).optional(),
  }),
  async handler({ id, externalReference, notes }) {
    const user = await assertPermission('claims:submit');
    if (!user.organizationId) throw new Error('No organization context');

    const { claim, providerNpi } = await loadClaimForValidation(id, user.organizationId);
    assertSameOrg(user, claim);
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new Error('Only draft claims can be marked as submitted');
    }

    const issues = validateClaimInput({
      patient: claim.patient,
      claim,
      organization: claim.organization,
      renderingProviderNpi: providerNpi,
    });
    if (hasBlockingClaimErrors(issues)) {
      throw new Error('Resolve blocking validation errors before recording submission.');
    }

    const updated = await db.claim.update({
      where: { id },
      data: {
        status: ClaimStatus.SUBMITTED,
        externalId: externalReference,
        submittedAt: new Date(),
        notes: notes ?? 'Submitted externally (manual workflow)',
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Claim',
      resourceId: id,
      metadata: { manualSubmission: true, externalReference },
    });

    revalidatePath('/provider/billing');
    return withDemoNotice(updated, user.organizationSlug);
  },
});

export const recordStaffPayment = action({
  schema: z.object({
    id: z.string(),
    amountCents: z.number().int().positive(),
    method: z.enum(['CASH', 'CHECK', 'EXTERNAL', 'CARD_TERMINAL']),
    reference: z.string().max(200).optional(),
  }),
  async handler({ id, amountCents, method, reference }) {
    const user = await assertPermission('billing:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const invoice = await db.patientInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    assertSameOrg(user, invoice);

    const paidCents = Math.min(invoice.totalCents, invoice.paidCents + amountCents);
    const status = paidCents >= invoice.totalCents ? InvoiceStatus.PAID : invoice.status;

    const updated = await db.patientInvoice.update({
      where: { id },
      data: { paidCents, status },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientInvoice',
      resourceId: id,
      metadata: { payment: true, amountCents, method, reference },
    });

    revalidatePath('/provider/billing');
    revalidatePath(`/provider/patients/${invoice.patientId}`);
    return withDemoNotice(updated, user.organizationSlug);
  },
});
