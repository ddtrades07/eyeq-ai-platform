import 'server-only';

import {
  ClinicalNoteStatus,
  type Role,
} from '@prisma/client';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/auth/rbac';
import { cachedNotifications } from '@/lib/cache/safe-cache';

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: 'default' | 'warning' | 'danger';
};

async function loadStaffNotifications(
  organizationId: string,
  role: Role,
): Promise<AppNotification[]> {
  const items: AppNotification[] = [];
  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  const [
    unsignedNotes,
    imagingAwaiting,
    appointmentRequests,
    unreadMessages,
    reviewsPending,
    failedReminders,
    incompleteOnboarding,
    openTickets,
  ] = await Promise.all([
    hasPermission(role, 'notes:sign')
      ? db.clinicalNote.count({
          where: {
            organizationId,
            status: { in: [ClinicalNoteStatus.DRAFT, ClinicalNoteStatus.AWAITING_SIGNOFF] },
          },
        })
      : 0,
    hasPermission(role, 'imaging:review')
      ? db.imagingCase.count({
          where: {
            organizationId,
            archivedAt: null,
            studyStatus: { in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE'] },
          },
        })
      : 0,
    hasPermission(role, 'appointments:read')
      ? db.appointmentRequest.count({ where: { organizationId, status: 'PENDING' } })
      : 0,
    hasPermission(role, 'messages:read')
      ? db.message.count({
          where: { readStatus: 'UNREAD', thread: { organizationId } },
        })
      : 0,
    hasPermission(role, 'reputation:read')
      ? db.googleReview.count({
          where: {
            organizationId,
            replyStatus: { in: ['PENDING_REPLY', 'DRAFT'] },
          },
        })
      : 0,
    hasPermission(role, 'reminders:read')
      ? db.reminderCampaign.count({
          where: {
            organizationId,
            status: { in: ['BLOCKED_VENDOR', 'BLOCKED_BAA'] },
          },
        })
      : 0,
    isAdmin
      ? db.staffOnboarding.count({
          where: { organizationId, completedAt: null },
        })
      : 0,
    hasPermission(role, 'org:read')
      ? db.supportTicket.count({
          where: {
            organizationId,
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER'] },
          },
        })
      : 0,
  ]);

  if (unsignedNotes > 0) {
    items.push({
      id: 'unsigned-notes',
      title: `${unsignedNotes} unsigned note${unsignedNotes === 1 ? '' : 's'}`,
      detail: 'Draft or awaiting sign-off',
      href: '/provider/tasks',
      tone: 'warning',
    });
  }
  if (imagingAwaiting > 0) {
    items.push({
      id: 'imaging',
      title: `${imagingAwaiting} imaging case${imagingAwaiting === 1 ? '' : 's'} awaiting review`,
      detail: 'Provider review required',
      href: '/provider/imaging',
      tone: 'warning',
    });
  }
  if (appointmentRequests > 0) {
    items.push({
      id: 'appt-requests',
      title: `${appointmentRequests} appointment request${appointmentRequests === 1 ? '' : 's'}`,
      detail: 'Awaiting staff conversion',
      href: '/provider/appointment-requests',
      tone: 'default',
    });
  }
  if (unreadMessages > 0) {
    items.push({
      id: 'messages',
      title: `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`,
      detail: 'Patient or staff threads',
      href: '/provider/messages',
      tone: 'default',
    });
  }
  if (reviewsPending > 0) {
    items.push({
      id: 'reviews',
      title: `${reviewsPending} Google review${reviewsPending === 1 ? '' : 's'} need approval`,
      detail: 'Approve before publish',
      href: '/provider/reputation',
      tone: 'default',
    });
  }
  if (failedReminders > 0) {
    items.push({
      id: 'reminders',
      title: `${failedReminders} reminder campaign${failedReminders === 1 ? '' : 's'} failed`,
      detail: 'Check vendor configuration',
      href: '/provider/reminders',
      tone: 'danger',
    });
  }
  if (incompleteOnboarding > 0) {
    items.push({
      id: 'onboarding',
      title: `${incompleteOnboarding} staff onboarding incomplete`,
      detail: 'Invite, MFA, or workflow steps pending',
      href: '/provider/settings/staff-onboarding',
      tone: 'warning',
    });
  }
  if (openTickets > 0) {
    items.push({
      id: 'support',
      title: `${openTickets} open support ticket${openTickets === 1 ? '' : 's'}`,
      detail: 'Practice support queue',
      href: '/provider/support',
      tone: 'default',
    });
  }

  if (isAdmin) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { livePhiEnabled: true },
    });
    if (org && !org.livePhiEnabled) {
      items.push({
        id: 'phi-readiness',
        title: 'Live PHI remains fail-closed',
        detail: 'Review PHI readiness before enabling live PHI',
        href: '/provider/settings/phi-readiness',
        tone: 'warning',
      });
    }
  }

  return items.slice(0, 12);
}

/** Short-lived cache of lightweight notification DTOs (counts/titles only — no PHI bodies). */
export async function getStaffNotifications(
  organizationId: string,
  role: Role,
): Promise<AppNotification[]> {
  return cachedNotifications(organizationId, role, () =>
    loadStaffNotifications(organizationId, role),
  );
}
