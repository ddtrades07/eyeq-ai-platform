'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';

const schema = z.object({
  query: z.string().min(2).max(100),
});

export type GlobalSearchHit = {
  id: string;
  type: 'patient' | 'appointment' | 'encounter' | 'message' | 'optical' | 'invoice';
  title: string;
  subtitle: string;
  href: string;
};

export const searchGlobal = action({
  schema,
  async handler({ query }): Promise<GlobalSearchHit[]> {
    const user = await assertPermission('org:read');
    if (!user.organizationId) throw new Error('No organization context');
    const orgId = user.organizationId;
    const q = query.trim();
    const hits: GlobalSearchHit[] = [];

    if (hasPermission(user.role, 'patients:read')) {
      const patients = await db.patient.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
      });
      for (const p of patients) {
        hits.push({
          id: p.id,
          type: 'patient',
          title: `${p.firstName} ${p.lastName}`,
          subtitle: [p.phone, p.email].filter(Boolean).join(' · ') || 'Patient chart',
          href: `/provider/patients/${p.id}`,
        });
      }
    }

    if (hasPermission(user.role, 'appointments:read')) {
      const appts = await db.appointment.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { startsAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });
      for (const a of appts) {
        hits.push({
          id: a.id,
          type: 'appointment',
          title: `${a.patient.firstName} ${a.patient.lastName} · ${a.type.replace(/_/g, ' ')}`,
          subtitle: a.startsAt.toLocaleString(),
          href: '/provider/appointments',
        });
      }

      const encounters = await db.encounter.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });
      for (const e of encounters) {
        hits.push({
          id: e.id,
          type: 'encounter',
          title: `Encounter · ${e.patient.firstName} ${e.patient.lastName}`,
          subtitle: e.status.replace(/_/g, ' '),
          href: `/provider/encounters/${e.id}/exam`,
        });
      }
    }

    if (hasPermission(user.role, 'messages:read')) {
      const threads = await db.messageThread.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });
      for (const t of threads) {
        hits.push({
          id: t.id,
          type: 'message',
          title: t.subject || 'Message thread',
          subtitle: t.patient
            ? `${t.patient.firstName} ${t.patient.lastName}`
            : 'Secure message',
          href: `/provider/messages/${t.id}`,
        });
      }
    }

    if (hasPermission(user.role, 'optical:read')) {
      const orders = await db.opticalOrder.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { labOrderNumber: { contains: q, mode: 'insensitive' } },
            { trackingNumber: { contains: q, mode: 'insensitive' } },
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });
      for (const o of orders) {
        hits.push({
          id: o.id,
          type: 'optical',
          title: `Optical · ${o.labOrderNumber ?? o.id.slice(0, 8)}`,
          subtitle: `${o.patient.firstName} ${o.patient.lastName} · ${o.status.replace(/_/g, ' ')}`,
          href: `/provider/optical/${o.id}`,
        });
      }
    }

    if (hasPermission(user.role, 'billing:read')) {
      const invoices = await db.patientInvoice.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { patient: { firstName: { contains: q, mode: 'insensitive' } } },
            { patient: { lastName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });
      for (const inv of invoices) {
        hits.push({
          id: inv.id,
          type: 'invoice',
          title: `Invoice · ${inv.description.slice(0, 40)}`,
          subtitle: `${inv.patient.firstName} ${inv.patient.lastName} · ${inv.status}`,
          href: '/provider/billing',
        });
      }
    }

    return hits.slice(0, 24);
  },
});
