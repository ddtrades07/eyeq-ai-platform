import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { CommandCenterDashboard } from '@/components/dashboard/command-center';
import { DemoPitchTour } from '@/components/demo/demo-pitch-tour';
import {
  BillingDashboard,
  FrontDeskDashboard,
  OpticalDashboard,
  TechnicianDashboard,
} from '@/components/dashboard/roles';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { getDashboardPersona } from '@/lib/navigation/staff-nav';
import { resolveActiveLocationId } from '@/lib/location/server';
import { getCommandCenterData } from '@/server/queries/command-center';
import { getDashboardStats, getAiReviewQueue } from '@/server/queries/dashboard';
import { listAppointments } from '@/server/queries/appointments';
import {
  getBillingDashboardMetrics,
  getFrontDeskDashboardMetrics,
  getOpticalDashboardMetrics,
  getTechnicianDashboardMetrics,
} from '@/server/queries/role-dashboard';
import { timeOfDayGreeting } from '@/components/dashboard/roles/shared';
import { db } from '@/lib/db';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requirePermission('org:read');
  if (!user.organizationId) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });
  const canSeeBilling = hasPermission(user.role, 'billing:read');
  const inDemo = user.organizationSlug === DEMO_ORG_SLUG;
  const persona = getDashboardPersona(user.role);
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const useCommandCenter = [
    'owner',
    'admin',
    'optometrist',
    'manager',
    'scribe',
  ].includes(persona);

  if (useCommandCenter) {
    const data = await getCommandCenterData(user.organizationId, locationId, {
      includeLaunch: isAdmin,
    });
    return (
      <div className="space-y-2">
        <CopilotContextSetter page="dashboard" />
        <CommandCenterDashboard
          greeting={timeOfDayGreeting(user.firstName)}
          description="Your practice command center — flow, clinical work, AI drafts, and patient experience."
          data={data}
          showPitchTour={inDemo}
          pitchSlot={inDemo ? <DemoPitchTour organizationId={user.organizationId} /> : null}
        />
      </div>
    );
  }

  const [stats, todays, aiQueue, billingIssues] = await Promise.all([
    getDashboardStats(user.organizationId, locationId),
    listAppointments({
      organizationId: user.organizationId,
      locationId,
      from: start,
      to: end,
      take: 12,
    }),
    getAiReviewQueue(user.organizationId),
    canSeeBilling
      ? db.patientInvoice.count({
          where: {
            organizationId: user.organizationId,
            status: 'OPEN',
            dueDate: { lt: new Date() },
          },
        })
      : Promise.resolve(0),
  ]);

  const base = {
    user,
    organizationId: user.organizationId,
    stats,
    aiQueue,
    todays,
    billingIssues,
    showPitchTour: inDemo,
  };

  return (
    <div className="space-y-8">
      <CopilotContextSetter page="dashboard" />
      {persona === 'billing' ? (
        <BillingDashboard
          {...base}
          metrics={await getBillingDashboardMetrics(user.organizationId)}
        />
      ) : persona === 'frontdesk' ? (
        <FrontDeskDashboard
          {...base}
          metrics={await getFrontDeskDashboardMetrics(user.organizationId, locationId)}
        />
      ) : persona === 'technician' ? (
        <TechnicianDashboard
          {...base}
          metrics={await getTechnicianDashboardMetrics(user.organizationId, locationId)}
        />
      ) : persona === 'optical' ? (
        <OpticalDashboard
          {...base}
          metrics={await getOpticalDashboardMetrics(user.organizationId, locationId)}
        />
      ) : (
        <CommandCenterDashboard
          greeting={timeOfDayGreeting(user.firstName)}
          description="Your practice command center."
          data={await getCommandCenterData(user.organizationId, locationId, {
            includeLaunch: isAdmin,
          })}
        />
      )}
    </div>
  );
}
