'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

const exportScopeSchema = z.object({
  scope: z.enum(['patients', 'appointments', 'claims', 'invoices']),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const exportPracticeData = action({
  schema: exportScopeSchema,
  async handler({ scope, dateFrom, dateTo }) {
    const user = await assertPermission('export:manage');
    if (!user.organizationId) throw new Error('No organization context');

    let csv = '';
    let filename = `eyeq-export-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    let recordCount = 0;

    if (scope === 'patients') {
      const patients = await db.patient.findMany({
        where: { organizationId: user.organizationId, archivedAt: null },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      csv = toCsv(
        ['id', 'externalId', 'firstName', 'lastName', 'dateOfBirth', 'email', 'phone', 'insuranceCarrier', 'insuranceMemberId'],
        patients.map((p) => [
          p.id,
          p.externalId,
          p.firstName,
          p.lastName,
          p.dateOfBirth.toISOString().slice(0, 10),
          p.email,
          p.phone,
          p.insuranceCarrier,
          p.insuranceMemberId,
        ]),
      );
      recordCount = patients.length;
    }

    if (scope === 'appointments') {
      const appointments = await db.appointment.findMany({
        where: {
          organizationId: user.organizationId,
          ...(dateFrom || dateTo
            ? {
                startsAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { startsAt: 'desc' },
        take: 10000,
      });
      csv = toCsv(
        ['id', 'patientId', 'providerId', 'locationId', 'type', 'status', 'startsAt', 'durationMinutes'],
        appointments.map((a) => [
          a.id,
          a.patientId,
          a.providerId,
          a.locationId,
          a.type,
          a.status,
          a.startsAt.toISOString(),
          a.durationMinutes,
        ]),
      );
      recordCount = appointments.length;
    }

    if (scope === 'claims') {
      const claims = await db.claim.findMany({
        where: {
          organizationId: user.organizationId,
          ...(dateFrom || dateTo
            ? {
                createdAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      csv = toCsv(
        ['id', 'patientId', 'status', 'payerName', 'memberId', 'totalCents', 'externalId', 'submittedAt', 'createdAt'],
        claims.map((c) => [
          c.id,
          c.patientId,
          c.status,
          c.payerName,
          c.memberId,
          c.totalCents,
          c.externalId,
          c.submittedAt?.toISOString() ?? '',
          c.createdAt.toISOString(),
        ]),
      );
      recordCount = claims.length;
    }

    if (scope === 'invoices') {
      const invoices = await db.patientInvoice.findMany({
        where: {
          organizationId: user.organizationId,
          ...(dateFrom || dateTo
            ? {
                issuedAt: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { issuedAt: 'desc' },
        take: 10000,
      });
      csv = toCsv(
        ['id', 'patientId', 'status', 'description', 'totalCents', 'paidCents', 'issuedAt', 'dueDate'],
        invoices.map((i) => [
          i.id,
          i.patientId,
          i.status,
          i.description,
          i.totalCents,
          i.paidCents,
          i.issuedAt.toISOString(),
          i.dueDate?.toISOString() ?? '',
        ]),
      );
      recordCount = invoices.length;
    }

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'EXPORT',
      resourceType: 'DataExport',
      resourceId: scope,
      metadata: { scope, recordCount, dateFrom, dateTo },
    });

    return { csv, filename, recordCount };
  },
});
