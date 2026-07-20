'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  InventoryActivityType,
  InventoryCategory,
  InventoryStatus,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

function resolveStatus(qty: number, reorderAt: number): InventoryStatus {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= reorderAt) return 'LOW_STOCK';
  return 'ACTIVE';
}

const createSchema = z.object({
  category: z.nativeEnum(InventoryCategory),
  name: z.string().min(1).max(120),
  brand: z.string().max(80).optional().nullable(),
  sku: z.string().max(80).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  vendor: z.string().max(120).optional().nullable(),
  costCents: z.coerce.number().int().min(0).max(10_000_000).default(0),
  retailCents: z.coerce.number().int().min(0).max(10_000_000).default(0),
  quantityOnHand: z.coerce.number().int().min(0).max(1_000_000).default(0),
  reorderAt: z.coerce.number().int().min(0).max(1_000_000).default(0),
  reorderQuantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
  locationId: z.string().optional().nullable(),
});

export const createInventoryItem = action({
  schema: createSchema,
  async handler(input) {
    const user = await assertPermission('inventory:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const item = await db.inventoryItem.create({
      data: {
        organizationId: user.organizationId,
        locationId: input.locationId ?? null,
        category: input.category,
        name: input.name,
        brand: input.brand ?? null,
        sku: input.sku || null,
        description: input.description ?? null,
        vendor: input.vendor ?? null,
        costCents: input.costCents,
        retailCents: input.retailCents,
        quantityOnHand: input.quantityOnHand,
        reorderAt: input.reorderAt,
        reorderQuantity: input.reorderQuantity,
        status: resolveStatus(input.quantityOnHand, input.reorderAt),
      },
    });

    if (input.quantityOnHand > 0) {
      await db.inventoryActivity.create({
        data: {
          organizationId: user.organizationId,
          itemId: item.id,
          type: InventoryActivityType.RECEIVED,
          quantityDelta: input.quantityOnHand,
          reason: 'Initial stocking',
          performedById: user.id,
        },
      });
    }

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'InventoryItem',
      resourceId: item.id,
    });

    revalidatePath('/provider/inventory');
    return item;
  },
});

const adjustSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(InventoryActivityType),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  reason: z.string().max(300).optional().nullable(),
});

export const adjustInventory = action({
  schema: adjustSchema,
  async handler({ id, type, quantity, reason }) {
    const user = await assertPermission('inventory:adjust');
    if (!user.organizationId) throw new Error('No organization context');

    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new Error('Inventory item not found');
    assertSameOrg(user, item);

    const positiveTypes: InventoryActivityType[] = ['RECEIVED', 'RETURNED'];
    const negativeTypes: InventoryActivityType[] = ['SOLD', 'DAMAGED', 'TRANSFERRED'];

    const delta = positiveTypes.includes(type)
      ? quantity
      : negativeTypes.includes(type)
        ? -quantity
        : 0;

    const nextQty =
      type === 'COUNTED' || type === 'ADJUSTED'
        ? quantity
        : Math.max(0, item.quantityOnHand + delta);

    const updated = await db.inventoryItem.update({
      where: { id },
      data: {
        quantityOnHand: nextQty,
        status: resolveStatus(nextQty, item.reorderAt),
      },
    });

    await db.inventoryActivity.create({
      data: {
        organizationId: user.organizationId,
        itemId: id,
        type,
        quantityDelta: type === 'COUNTED' || type === 'ADJUSTED' ? nextQty - item.quantityOnHand : delta,
        reason: reason ?? null,
        performedById: user.id,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'InventoryItem',
      resourceId: id,
      metadata: { type, quantity, nextQty },
    });

    revalidatePath('/provider/inventory');
    return updated;
  },
});

export const archiveInventoryItem = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('inventory:manage');
    if (!user.organizationId) throw new Error('No organization context');
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new Error('Inventory item not found');
    assertSameOrg(user, item);
    const updated = await db.inventoryItem.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'DISCONTINUED' },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'DELETE',
      resourceType: 'InventoryItem',
      resourceId: id,
    });
    revalidatePath('/provider/inventory');
    return updated;
  },
});
