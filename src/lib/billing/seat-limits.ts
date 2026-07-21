import 'server-only';

import { db } from '@/lib/db';
import { assertExpansionAllowed } from '@/lib/billing/subscription-access';

export async function assertProviderSeatAvailable(organizationId: string): Promise<void> {
  await assertExpansionAllowed(organizationId);

  const sub = await db.orgSubscription.findUnique({ where: { organizationId } });
  const limit = sub?.providerSeatLimit ?? 5;
  const used = await db.user.count({
    where: {
      organizationId,
      isActive: true,
      role: {
        notIn: ['PATIENT'],
      },
    },
  });
  if (used >= limit) {
    throw new Error(
      `Provider/staff seat limit reached (${used}/${limit}). Upgrade your plan to invite more team members.`,
    );
  }
}

export async function assertLocationSeatAvailable(organizationId: string): Promise<void> {
  await assertExpansionAllowed(organizationId);

  const sub = await db.orgSubscription.findUnique({ where: { organizationId } });
  const limit = sub?.locationSeatLimit ?? 2;
  const used = await db.location.count({
    where: { organizationId, active: true },
  });
  if (used >= limit) {
    throw new Error(
      `Location limit reached (${used}/${limit}). Upgrade your plan to add more locations.`,
    );
  }
}
