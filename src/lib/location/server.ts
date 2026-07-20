import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { Role } from '@prisma/client';
import { LOCATION_COOKIE, canViewAllLocations, type LocationOption } from './scope';

export async function getActiveLocationId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(LOCATION_COOKIE)?.value;
  if (!v || v === 'all') return null;
  return v;
}

async function listLocationsForUserImpl(
  organizationId: string,
  userId: string,
  role: Role,
): Promise<LocationOption[]> {
  const all = await db.location.findMany({
    where: { organizationId, active: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, shortName: true },
  });

  if (canViewAllLocations(role)) return all;

  const access = await db.userLocationAccess.findMany({
    where: { userId, location: { organizationId, active: true } },
    select: { location: { select: { id: true, name: true, shortName: true } } },
  });

  if (access.length > 0) {
    return access.map((a) => a.location);
  }

  const provider = await db.provider.findUnique({
    where: { userId },
    select: { locations: { select: { id: true, name: true, shortName: true } } },
  });
  if (provider?.locations.length) return provider.locations;

  return [];
}

const listLocationsCached = cache(listLocationsForUserImpl);

/**
 * Locations the user may access.
 * Deduped per request via React.cache on primitive args.
 */
export async function listLocationsForUser(args: {
  organizationId: string;
  userId: string;
  role: Role;
}): Promise<LocationOption[]> {
  return listLocationsCached(args.organizationId, args.userId, args.role);
}

async function resolveActiveLocationIdImpl(
  organizationId: string,
  userId: string,
  role: Role,
): Promise<string | null> {
  const raw = await getActiveLocationId();
  const allowed = await listLocationsCached(organizationId, userId, role);

  if (!raw) {
    if (canViewAllLocations(role)) return null;
    return allowed.length === 1 ? allowed[0].id : null;
  }

  if (allowed.some((l) => l.id === raw)) return raw;
  return allowed.length === 1 ? allowed[0].id : null;
}

const resolveActiveLocationCached = cache(resolveActiveLocationIdImpl);

/**
 * Validates cookie location belongs to the user's allowed set.
 * Deduped per request via React.cache.
 */
export async function resolveActiveLocationId(args: {
  organizationId: string;
  userId: string;
  role: Role;
}): Promise<string | null> {
  return resolveActiveLocationCached(args.organizationId, args.userId, args.role);
}
