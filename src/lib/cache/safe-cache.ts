import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * Safe, short-lived server caches for non-PHI aggregate data.
 *
 * Rules:
 * - Never cache patient-identifiable content here
 * - Always include organizationId (and location/role) in the key
 * - Short TTLs only: dashboard counts / notification badges
 * - Do not use for clinical note bodies, messages, imaging blobs
 */

const DASHBOARD_TTL_SECONDS = 20;
const NOTIFICATION_TTL_SECONDS = 15;
const ORG_SETTINGS_TTL_SECONDS = 60;
const PILOT_LAUNCH_TTL_SECONDS = 30;

export function cachedDashboardCounts<T>(
  organizationId: string,
  locationKey: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(loader, ['dashboard-counts', organizationId, locationKey], {
    revalidate: DASHBOARD_TTL_SECONDS,
    tags: [`org:${organizationId}:dashboard`],
  });
  return cached();
}

export function cachedNotifications<T>(
  organizationId: string,
  role: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(loader, ['staff-notifications', organizationId, role], {
    revalidate: NOTIFICATION_TTL_SECONDS,
    tags: [`org:${organizationId}:notifications`],
  });
  return cached();
}

export function cachedOrgDisplaySettings<T>(
  organizationId: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(loader, ['org-display', organizationId], {
    revalidate: ORG_SETTINGS_TTL_SECONDS,
    tags: [`org:${organizationId}:settings`],
  });
  return cached();
}

/** Practice Eye Health Library visibility overlays (no article PHI). */
export function cachedEyeHealthOrgStates<T>(
  organizationId: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(loader, ['eye-health-org-states', organizationId], {
    revalidate: ORG_SETTINGS_TTL_SECONDS,
    tags: [`org:${organizationId}:settings`, `org:${organizationId}:eye-health`],
  });
  return cached();
}

/** Admin launch checklist summary only (no PHI). Org-scoped. */
export function cachedPilotLaunchSummary<T>(
  organizationId: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(loader, ['pilot-launch-summary', organizationId], {
    revalidate: PILOT_LAUNCH_TTL_SECONDS,
    tags: [`org:${organizationId}:dashboard`, `org:${organizationId}:settings`],
  });
  return cached();
}
