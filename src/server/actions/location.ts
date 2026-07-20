'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireStaffUser } from '@/lib/auth/require';
import { LOCATION_COOKIE } from '@/lib/location/scope';
import { listLocationsForUser } from '@/lib/location/server';

export async function setActiveLocation(locationId: string | 'all') {
  const user = await requireStaffUser();
  if (!user.organizationId) throw new Error('No organization');

  const store = await cookies();

  if (locationId === 'all') {
    store.set(LOCATION_COOKIE, 'all', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  } else {
    const allowed = await listLocationsForUser({
      organizationId: user.organizationId,
      userId: user.id,
      role: user.role,
    });
    if (!allowed.some((l) => l.id === locationId)) {
      throw new Error('You do not have access to this location');
    }
    store.set(LOCATION_COOKIE, locationId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  revalidatePath('/', 'layout');
}

export async function getLocationsForSwitcher() {
  const user = await requireStaffUser();
  if (!user.organizationId) return { locations: [], canViewAll: false };

  const locations = await listLocationsForUser({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  return {
    locations,
    canViewAll: user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'MANAGER',
  };
}
