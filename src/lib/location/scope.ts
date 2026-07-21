import type { Prisma } from '@prisma/client';
import type { Role } from '@prisma/client';

export const LOCATION_COOKIE = 'eyeq-active-location';

/** Roles that may view aggregated data across all locations. */
export function canViewAllLocations(role: Role): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

export type LocationOption = {
  id: string;
  name: string;
  shortName: string;
};

/**
 * Prisma filter fragment for appointment.locationId when a location is active.
 * When locationId is null/undefined, returns no filter (all locations) ,
 * only safe for roles that passed canViewAllLocations.
 */
export function appointmentLocationFilter(
  locationId: string | null | undefined,
): Pick<Prisma.AppointmentWhereInput, 'locationId'> | Record<string, never> {
  if (!locationId) return {};
  return { locationId };
}

/**
 * Fail-closed location filter for scoped staff.
 * - Explicit locationId → filter to that location
 * - Null + all-location role → no filter
 * - Null + scoped role with allowed IDs → IN (allowed)
 * - Null + scoped role with empty allowed → impossible filter (no rows)
 */
export function scopedLocationFilter(args: {
  locationId: string | null | undefined;
  role: Role;
  allowedLocationIds: string[];
}): Pick<Prisma.AppointmentWhereInput, 'locationId'> {
  if (args.locationId) return { locationId: args.locationId };
  if (canViewAllLocations(args.role)) return {};
  if (args.allowedLocationIds.length === 0) {
    return { locationId: '__no_location_access__' };
  }
  return { locationId: { in: args.allowedLocationIds } };
}

/**
 * Inventory items are location-scoped when locationId is set on the row.
 */
export function inventoryLocationFilter(
  locationId: string | null | undefined,
): Pick<Prisma.InventoryItemWhereInput, 'locationId'> | Record<string, never> {
  if (!locationId) return {};
  return { locationId };
}
