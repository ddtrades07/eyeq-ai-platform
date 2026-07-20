'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ClaimStatus, RemittanceSource, RemittanceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { withDemoNotice } from '@/lib/demo/safety-server';

const remittanceLineSchema = z.object({
  claimId: z.string().optional().nullable(),
  cptCode: z.string().max(10).optional(),
  billedCents: z.number().int().min(0).default(0),
  allowedCents: z.number().int().min(0).default(0),
  paidCents: z.number().int().min(0),
  adjustmentCents: z.number().int().min(0).default(0),
  deductibleCents: z.number().int().min(0).default(0),
  coinsuranceCents: z.number().int().min(0).default(0),
  copayCents: z.number().int().min(0).default(0),
  patientRespCents: z.number().int().min(0).default(0),
  denialCode: z.string().max(20).optional(),
  remarkCode: z.string().max(20).optional(),
});

export const createManualRemittance = action({
  schema: z.object({
    payerName: z.string().min(1).max(200),
    checkNumber: z.string().max(100).optional(),
    paymentMethod: z.string().max(50).optional(),
    receivedAt: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
    lines: z.array(remittanceLineSchema).min(1),
  }),
  async handler(input) {
    const user = await assertPermission('era:post');
    if (!user.organizationId) throw new Error('No organization context');

    const totalPaidCents = input.lines.reduce((sum, l) => sum + l.paidCents, 0);

    const remittance = await db.remittanceAdvice.create({
      data: {
        organizationId: user.organizationId,
        source: RemittanceSource.MANUAL_EOB,
        payerName: input.payerName,
        checkNumber: input.checkNumber ?? null,
        paymentMethod: input.paymentMethod ?? 'check',
        totalPaidCents,
        receivedAt: input.receivedAt ?? new Date(),
        status: RemittanceStatus.RECEIVED,
        notes: input.notes ?? null,
        lines: {
          create: input.lines.map((l) => ({
            claimId: l.claimId ?? null,
            cptCode: l.cptCode ?? null,
            billedCents: l.billedCents,
            allowedCents: l.allowedCents,
            paidCents: l.paidCents,
            adjustmentCents: l.adjustmentCents,
            deductibleCents: l.deductibleCents,
            coinsuranceCents: l.coinsuranceCents,
            copayCents: l.copayCents,
            patientRespCents: l.patientRespCents,
            denialCode: l.denialCode ?? null,
            remarkCode: l.remarkCode ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'RemittanceAdvice',
      resourceId: remittance.id,
      metadata: { manual: true, lineCount: input.lines.length, totalPaidCents },
    });

    revalidatePath('/provider/billing/remittances');
    return remittance;
  },
});

export const postRemittance = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('era:post');
    if (!user.organizationId) throw new Error('No organization context');

    const remittance = await db.remittanceAdvice.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!remittance) throw new Error('Remittance not found');
    assertSameOrg(user, remittance);
    if (remittance.status === RemittanceStatus.POSTED) {
      throw new Error('Remittance already posted');
    }

    await db.$transaction(async (tx) => {
      for (const line of remittance.lines) {
        if (!line.claimId) continue;
        const claim = await tx.claim.findUnique({ where: { id: line.claimId } });
        if (!claim || claim.organizationId !== user.organizationId) continue;

        const newStatus =
          line.denialCode && line.paidCents === 0 ? ClaimStatus.REJECTED : ClaimStatus.PAID;

        await tx.claim.update({
          where: { id: line.claimId },
          data: {
            status: newStatus,
            paidAt: line.paidCents > 0 ? new Date() : claim.paidAt,
            notes: [
              claim.notes,
              line.denialCode ? `Denial: ${line.denialCode}` : null,
              line.remarkCode ? `Remark: ${line.remarkCode}` : null,
            ]
              .filter(Boolean)
              .join(' | ') || null,
          },
        });

        if (line.patientRespCents > 0) {
          const existing = await tx.patientInvoice.findFirst({
            where: {
              organizationId: user.organizationId!,
              patientId: claim.patientId,
              status: { in: ['OPEN', 'DRAFT'] },
              description: { contains: 'Patient responsibility' },
            },
          });
          if (!existing) {
            await tx.patientInvoice.create({
              data: {
                organizationId: user.organizationId!,
                patientId: claim.patientId,
                description: `Patient responsibility from remittance ${remittance.id.slice(0, 8)}`,
                totalCents: line.patientRespCents,
                status: 'OPEN',
              },
            });
          }
        }
      }

      await tx.remittanceAdvice.update({
        where: { id },
        data: {
          status: RemittanceStatus.POSTED,
          postedAt: new Date(),
          postedById: user.id,
        },
      });
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'RemittanceAdvice',
      resourceId: id,
      metadata: { posted: true },
    });

    revalidatePath('/provider/billing/remittances');
    revalidatePath('/provider/billing');
    return { posted: true };
  },
});

export const generatePatientStatements = action({
  schema: z.object({
    patientIds: z.array(z.string()).optional(),
    deliveryMethod: z.enum(['PORTAL', 'PAPER', 'EMAIL']).default('PORTAL'),
  }),
  async handler({ patientIds, deliveryMethod }) {
    const user = await assertPermission('statements:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const openInvoices = await db.patientInvoice.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['OPEN', 'DRAFT'] },
        ...(patientIds?.length ? { patientId: { in: patientIds } } : {}),
      },
      select: { patientId: true, totalCents: true, paidCents: true },
    });

    const balanceByPatient = new Map<string, number>();
    for (const inv of openInvoices) {
      const bal = inv.totalCents - inv.paidCents;
      if (bal <= 0) continue;
      balanceByPatient.set(inv.patientId, (balanceByPatient.get(inv.patientId) ?? 0) + bal);
    }

    if (balanceByPatient.size === 0) {
      throw new Error('No outstanding balances to statement');
    }

    const statements = await db.$transaction(
      [...balanceByPatient.entries()].map(([patientId, balanceCents]) =>
        db.patientStatement.create({
          data: {
            organizationId: user.organizationId!,
            patientId,
            balanceCents,
            deliveryMethod,
            deliveryStatus: 'queued',
            status: 'DRAFT',
            createdById: user.id,
          },
        }),
      ),
    );

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'PatientStatement',
      resourceId: 'batch',
      metadata: { count: statements.length, deliveryMethod },
    });

    revalidatePath('/provider/billing/statements');
    return withDemoNotice({ count: statements.length }, user.organizationSlug);
  },
});

export const markStatementSent = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('statements:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const stmt = await db.patientStatement.findUnique({ where: { id } });
    if (!stmt) throw new Error('Statement not found');
    assertSameOrg(user, stmt);

    const updated = await db.patientStatement.update({
      where: { id },
      data: { status: 'SENT', deliveryStatus: 'sent', statementDate: new Date() },
    });

    revalidatePath('/provider/billing/statements');
    return withDemoNotice(updated, user.organizationSlug);
  },
});
