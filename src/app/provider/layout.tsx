import { Suspense } from 'react';
import { StaffSidebar } from '@/components/layout/staff-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { DemoBanner } from '@/components/demo/demo-banner';
import { RecordingDemoBanner } from '@/components/demo/recording-demo-banner';
import { RecordingModeSync } from '@/components/demo/recording-mode-sync';
import { ControlledPilotBanner } from '@/components/ops/controlled-pilot-banner';
import { StaffDemoGuideLauncher } from '@/components/demo/demo-guide-launcher';
import { CopilotTrigger } from '@/components/copilot/copilot-trigger';
import { CopilotContextFromPath } from '@/components/copilot/copilot-context-from-path';
import { LazyClientShell } from '@/components/layout/lazy-client-shell';
import { MfaRequiredPanel } from '@/components/settings/mfa-required-panel';
import { requireStaffUser } from '@/lib/auth/require';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatFullName } from '@/lib/utils';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { isRecordingMode } from '@/lib/demo/recording-mode';
import { listLocationsForUser, resolveActiveLocationId } from '@/lib/location/server';
import { canViewAllLocations } from '@/lib/location/scope';
import { evaluateStaffMfaGate } from '@/lib/security/mfa';
import { getControlledPilotRestrictions } from '@/lib/production/controlled-pilot';
import { NotificationBell } from '@/components/notifications/notification-bell';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffUser();
  const fullName = formatFullName(user.firstName, user.lastName);
  const inDemo = user.organizationSlug === DEMO_ORG_SLUG;
  const recording = await isRecordingMode();

  const mfaGate = await evaluateStaffMfaGate({
    userId: user.id,
    organizationId: user.organizationId,
    organizationSlug: user.organizationSlug,
    role: user.role,
  });

  const pilotRestrictions = await getControlledPilotRestrictions(user.organizationId);

  const locations =
    user.organizationId
      ? await listLocationsForUser({
          organizationId: user.organizationId,
          userId: user.id,
          role: user.role,
        })
      : [];
  const activeLocationId =
    user.organizationId
      ? await resolveActiveLocationId({
          organizationId: user.organizationId,
          userId: user.id,
          role: user.role,
        })
      : null;

  return (
    <div className="lens-canvas flex min-h-screen">
      <Suspense fallback={null}>
        <RecordingModeSync />
      </Suspense>
      <StaffSidebar
        role={user.role}
        orgName={user.organizationName ?? 'Practice'}
        userName={fullName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {inDemo ? (recording ? <RecordingDemoBanner /> : <DemoBanner />) : null}
        {!inDemo && !recording && pilotRestrictions?.active ? <ControlledPilotBanner /> : null}
        <TopBar
          userName={fullName}
          email={user.email}
          role={user.role}
          roleLabel={ROLE_LABELS[user.role]}
          subtitle={user.organizationName ?? undefined}
          locations={locations}
          activeLocationId={activeLocationId}
          canViewAllLocations={canViewAllLocations(user.role)}
          inDemo={inDemo}
          recordingMode={recording}
          notificationSlot={
            <NotificationBell organizationId={user.organizationId!} role={user.role} />
          }
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 scrollbar-thin">
          {!mfaGate.allowed ? (
            <MfaRequiredPanel
              reason={mfaGate.reason}
              assurance={mfaGate.assurance}
              canManageOrg={user.role === 'OWNER' || user.role === 'ADMIN'}
            />
          ) : (
            children
          )}
        </main>
        <footer className="glass-panel border-t border-border/60 px-6 py-3 text-center text-xs text-muted-foreground space-y-1">
          <p>
            EyeQ AI surfaces review-support signals only. It does not diagnose disease.
            All clinical outputs require provider review and sign-off.
          </p>
          {!recording ? (
            <p className="text-[10px] text-muted-foreground/80">
              Not for clinical use without HIPAA, legal, security, and regulatory review.
            </p>
          ) : null}
        </footer>
      </div>
      {mfaGate.allowed ? (
        <>
          <CopilotContextFromPath />
          {!recording ? <CopilotTrigger /> : null}
          {inDemo && !recording ? <StaffDemoGuideLauncher /> : null}
          <LazyClientShell role={user.role} />
        </>
      ) : null}
    </div>
  );
}
