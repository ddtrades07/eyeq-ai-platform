import { db } from '@/lib/db';
import { isGoogleBusinessConfigured } from '@/lib/providers/google-business';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';

export async function loadReputationContext(organizationId: string, organizationSlug: string | null) {
  const connections = await db.googleBusinessConnection.findMany({
    where: { organizationId },
    select: {
      id: true,
      demoMode: true,
      placeName: true,
      lastSyncedAt: true,
      location: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const demoMode =
    organizationSlug === DEMO_ORG_SLUG || connections.some((c) => c.demoMode);
  const liveConfigured = isGoogleBusinessConfigured() && connections.some((c) => !c.demoMode);

  let connectedLabel = 'Not configured';
  if (demoMode && !liveConfigured) {
    connectedLabel = 'Demo mode · synthetic data';
  } else if (liveConfigured) {
    connectedLabel = 'Connected · live Google';
  } else if (connections.length) {
    connectedLabel = 'Connected (setup incomplete)';
  }

  return {
    connections,
    demoMode,
    liveConfigured,
    connectedLabel,
    configured: demoMode || liveConfigured || connections.length > 0,
  };
}
