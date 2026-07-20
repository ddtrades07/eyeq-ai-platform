import { getStaffNotifications } from '@/server/queries/notifications';
import { NotificationBellClient } from '@/components/notifications/notification-bell-client';
import type { Role } from '@prisma/client';

export async function NotificationBell({
  organizationId,
  role,
}: {
  organizationId: string;
  role: Role;
}) {
  const items = await getStaffNotifications(organizationId, role);
  return <NotificationBellClient items={items} />;
}
