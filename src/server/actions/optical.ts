'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  OpticalOrderStatus,
  OpticalOrderType,
  OpticalItemKind,
  type Prisma,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const orderItemSchema = z.object({
  kind: z.nativeEnum(OpticalItemKind),
  description: z.string().min(1).max(500),
  inventoryItemId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().min(0),
});

const VALID_TRANSITIONS: Record<OpticalOrderStatus, OpticalOrderStatus[]> = {
  QUOTE: ['ORDERED', 'CANCELLED'],
  ORDERED: ['AT_LAB', 'CANCELLED'],
  AT_LAB: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['RECEIVED'],
  RECEIVED: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['READY_FOR_PICKUP', 'REMAKE'],
  READY_FOR_PICKUP: ['DISPENSED'],
  DISPENSED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
  REMAKE: ['AT_LAB'],
};

export const createOpticalQuote = action({
  schema: z.object({
    patientId: z.string(),
    locationId: z.string().optional().nullable(),
    prescriptionId: z.string().optional().nullable(),
    type: z.nativeEnum(OpticalOrderType).default(OpticalOrderType.SPECTACLES),
    labId: z.string().optional().nullable(),
    measurements: z.record(z.string(), z.unknown()).optional(),
    insuranceAllowanceCents: z.number().int().min(0).default(0),
    discountCents: z.number().int().min(0).default(0),
    depositCents: z.number().int().min(0).default(0),
    notes: z.string().max(2000).optional(),
    items: z.array(orderItemSchema).min(1),
  }),
  async handler(input) {
    const user = await assertPermission('optical:sell');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const subtotalCents = input.items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    );
    const patientRespCents = Math.max(
      0,
      subtotalCents - input.insuranceAllowanceCents - input.discountCents,
    );
    const balanceCents = Math.max(0, patientRespCents - input.depositCents);

    const order = await db.opticalOrder.create({
      data: {
        organizationId: user.organizationId,
        locationId: input.locationId ?? null,
        patientId: input.patientId,
        prescriptionId: input.prescriptionId ?? null,
        type: input.type,
        status: OpticalOrderStatus.QUOTE,
        labId: input.labId ?? null,
        measurements: input.measurements
          ? (input.measurements as Prisma.InputJsonValue)
          : undefined,
        subtotalCents,
        insuranceAllowanceCents: input.insuranceAllowanceCents,
        discountCents: input.discountCents,
        patientRespCents,
        depositCents: input.depositCents,
        balanceCents,
        notes: input.notes ?? null,
        createdById: user.id,
        items: {
          create: input.items.map((i) => ({
            kind: i.kind,
            description: i.description,
            inventoryItemId: i.inventoryItemId ?? null,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
        },
        statusEvents: {
          create: { status: OpticalOrderStatus.QUOTE, performedById: user.id },
        },
      },
      include: { items: true },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'OpticalOrder',
      resourceId: order.id,
    });

    revalidatePath('/provider/optical');
    revalidatePath(`/provider/patients/${input.patientId}`);
    return order;
  },
});

export const advanceOpticalOrder = action({
  schema: z.object({
    orderId: z.string(),
    status: z.nativeEnum(OpticalOrderStatus),
    note: z.string().max(500).optional(),
    trackingNumber: z.string().max(200).optional(),
    labOrderNumber: z.string().max(200).optional(),
    remakeReason: z.string().max(500).optional(),
  }),
  async handler({ orderId, status, note, trackingNumber, labOrderNumber, remakeReason }) {
    const user = await assertPermission('optical:order');
    if (!user.organizationId) throw new Error('No organization context');

    const order = await db.opticalOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Optical order not found');
    assertSameOrg(user, order);

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status) && order.status !== status) {
      throw new Error(`Cannot move from ${order.status} to ${status}`);
    }

    const now = new Date();
    const data: Record<string, unknown> = { status };
    if (status === OpticalOrderStatus.ORDERED) data.orderedAt = now;
    if (status === OpticalOrderStatus.RECEIVED) data.receivedAt = now;
    if (status === OpticalOrderStatus.DISPENSED) data.dispensedAt = now;
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (labOrderNumber) data.labOrderNumber = labOrderNumber;
    if (remakeReason) data.remakeReason = remakeReason;

    await db.$transaction(async (tx) => {
      await tx.opticalOrder.update({ where: { id: orderId }, data });
      await tx.opticalOrderStatusEvent.create({
        data: { orderId, status, note: note ?? null, performedById: user.id },
      });

      if (status === OpticalOrderStatus.ORDERED) {
        for (const item of order.items) {
          if (!item.inventoryItemId) continue;
          const inv = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
          if (!inv || inv.organizationId !== user.organizationId) continue;
          const newQty = Math.max(0, inv.quantityOnHand - item.quantity);
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { quantityOnHand: newQty },
          });
          await tx.inventoryActivity.create({
            data: {
              organizationId: user.organizationId!,
              itemId: inv.id,
              type: 'SOLD',
              quantityDelta: -item.quantity,
              reason: `Optical order ${orderId}`,
              performedById: user.id,
            },
          });
        }
      }
    });

    revalidatePath('/provider/optical');
    revalidatePath(`/provider/optical/${orderId}`);
    return { status };
  },
});

export const dispenseOpticalOrder = action({
  schema: z.object({
    orderId: z.string(),
    paymentCents: z.number().int().min(0).optional(),
  }),
  async handler({ orderId, paymentCents }) {
    const user = await assertPermission('optical:dispense');
    if (!user.organizationId) throw new Error('No organization context');

    const order = await db.opticalOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Optical order not found');
    assertSameOrg(user, order);

    if (
      order.status !== OpticalOrderStatus.READY_FOR_PICKUP &&
      order.status !== OpticalOrderStatus.QUALITY_CHECK
    ) {
      throw new Error('Order must be ready for pickup before dispense');
    }

    const paid = paymentCents ?? order.balanceCents;
    const newBalance = Math.max(0, order.balanceCents - paid);

    await db.$transaction(async (tx) => {
      await tx.opticalOrder.update({
        where: { id: orderId },
        data: {
          status: OpticalOrderStatus.DISPENSED,
          dispensedAt: new Date(),
          balanceCents: newBalance,
          depositCents: order.depositCents + paid,
        },
      });
      await tx.opticalOrderStatusEvent.create({
        data: {
          orderId,
          status: OpticalOrderStatus.DISPENSED,
          note: paid > 0 ? `Collected $${(paid / 100).toFixed(2)}` : null,
          performedById: user.id,
        },
      });
      if (paid > 0) {
        await tx.patientInvoice.create({
          data: {
            organizationId: user.organizationId!,
            patientId: order.patientId,
            description: `Optical order ${orderId.slice(0, 8)} dispense payment`,
            totalCents: paid,
            paidCents: paid,
            status: 'PAID',
          },
        });
      }
    });

    revalidatePath('/provider/optical');
    revalidatePath('/provider/billing');
    return { dispensed: true, balanceCents: newBalance };
  },
});

export const upsertOpticalLab = action({
  schema: z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(200),
    accountNumber: z.string().max(100).optional(),
    turnaroundDays: z.number().int().min(1).max(90).optional(),
    shippingMethod: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
  }),
  async handler(input) {
    const user = await assertPermission('optical:manage');
    if (!user.organizationId) throw new Error('No organization context');

    if (input.id) {
      const existing = await db.opticalLab.findUnique({ where: { id: input.id } });
      if (!existing) throw new Error('Lab not found');
      assertSameOrg(user, existing);
      return db.opticalLab.update({
        where: { id: input.id },
        data: {
          name: input.name,
          accountNumber: input.accountNumber ?? null,
          turnaroundDays: input.turnaroundDays ?? null,
          shippingMethod: input.shippingMethod ?? null,
          phone: input.phone ?? null,
        },
      });
    }

    return db.opticalLab.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        accountNumber: input.accountNumber ?? null,
        turnaroundDays: input.turnaroundDays ?? null,
        shippingMethod: input.shippingMethod ?? null,
        phone: input.phone ?? null,
      },
    });
  },
});
