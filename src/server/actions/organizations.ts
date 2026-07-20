'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ConnectedEhrVendor, PracticeMode, SupportedLocale } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  primaryColor: z.string().max(20).optional().nullable(),
  practiceMode: z.nativeEnum(PracticeMode).optional(),
  connectedEhr: z.nativeEnum(ConnectedEhrVendor).optional(),
  timezone: z.string().max(60).optional(),
  defaultLocale: z.nativeEnum(SupportedLocale).optional(),
});

export const updateOrganization = action({
  schema: updateOrgSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const org = await db.organization.update({
      where: { id: user.organizationId },
      data: input,
    });

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Organization',
      resourceId: org.id,
    });

    revalidatePath('/provider/settings');
    return org;
  },
});

const locationFields = {
  name: z.string().min(2).max(120),
  shortName: z.string().min(1).max(40),
  addressLine1: z.string().max(160).optional().nullable(),
  addressLine2: z.string().max(160).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  region: z.string().max(40).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  rooms: z.coerce.number().int().min(1).max(50).default(1),
  isPrimary: z.coerce.boolean().optional(),
};

const createLocationSchema = z.object(locationFields);

export const createLocation = action({
  schema: createLocationSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    // If this is set primary, demote any existing primary first.
    if (input.isPrimary) {
      await db.location.updateMany({
        where: { organizationId: user.organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const loc = await db.location.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        shortName: input.shortName,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        region: input.region ?? null,
        postalCode: input.postalCode ?? null,
        phone: input.phone ?? null,
        rooms: input.rooms,
        isPrimary: input.isPrimary ?? false,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Location',
      resourceId: loc.id,
    });

    revalidatePath('/provider/practice-setup');
    revalidatePath('/provider/settings');
    return loc;
  },
});

const updateLocationSchema = z.object({
  id: z.string(),
  ...locationFields,
});

export const updateLocation = action({
  schema: updateLocationSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.location.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Location not found');
    assertSameOrg(user, existing);

    if (input.isPrimary) {
      await db.location.updateMany({
        where: {
          organizationId: user.organizationId,
          isPrimary: true,
          NOT: { id: input.id },
        },
        data: { isPrimary: false },
      });
    }

    const loc = await db.location.update({
      where: { id: input.id },
      data: {
        name: input.name,
        shortName: input.shortName,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        region: input.region ?? null,
        postalCode: input.postalCode ?? null,
        phone: input.phone ?? null,
        rooms: input.rooms,
        isPrimary: input.isPrimary ?? existing.isPrimary,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Location',
      resourceId: loc.id,
    });

    revalidatePath('/provider/practice-setup');
    revalidatePath('/provider/settings');
    return loc;
  },
});

export const setLocationActive = action({
  schema: z.object({ id: z.string(), active: z.coerce.boolean() }),
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.location.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Location not found');
    assertSameOrg(user, existing);

    const loc = await db.location.update({
      where: { id: input.id },
      data: { active: input.active },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Location',
      resourceId: loc.id,
      metadata: { active: input.active },
    });

    revalidatePath('/provider/practice-setup');
    revalidatePath('/provider/settings');
    return loc;
  },
});
