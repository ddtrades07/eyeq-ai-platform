import 'server-only';

import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { isDemoAppEnvironment, isProductionApp } from '@/lib/production/mode';
import { serverEnv } from '@/lib/env';
import { db } from '@/lib/db';
import type { ReadinessState } from '@/lib/production/phi-readiness';

export type PilotLaunchStatus =
  | 'not_ready'
  | 'internal_demo_only'
  | 'controlled_pilot_ready'
  | 'live_production_ready';

export type PilotChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  requiredForPilot: boolean;
};

export async function evaluatePilotLaunch(organizationId: string): Promise<{
  status: PilotLaunchStatus;
  items: PilotChecklistItem[];
  controlledPilotEnabled: boolean;
  livePhiEnabled: boolean;
}> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      mfaRequiredForStaff: true,
      livePhiEnabled: true,
      controlledPilotEnabled: true,
      rlsVerifiedAt: true,
      auditVerifiedAt: true,
      backupRestoreTestAt: true,
      backupStatus: true,
      monitoringVerifiedAt: true,
      incidentResponseReviewedAt: true,
      staffTrainingCompletedAt: true,
      _count: {
        select: {
          locations: { where: { active: true } },
          providers: true,
        },
      },
      users: {
        where: { isActive: true, role: { not: 'PATIENT' } },
        select: {
          role: true,
          mfaEnrolledAt: true,
          staffOnboarding: { select: { completedAt: true } },
        },
      },
      vendorReadiness: {
        where: { vendor: 'OPENAI' },
        select: { vendor: true, baaCompletedAt: true },
      },
    },
  });

  if (!org) {
    return {
      status: 'not_ready',
      items: [],
      controlledPilotEnabled: false,
      livePhiEnabled: false,
    };
  }

  const staff = org.users;
  const owners = staff.filter((u) => u.role === 'OWNER' || u.role === 'ADMIN');
  const mfaEnrolledCount = staff.filter((u) => u.mfaEnrolledAt).length;
  const onboardingDone = staff.filter((u) => u.staffOnboarding?.completedAt).length;
  const openaiBaa = org.vendorReadiness.some((v) => v.baaCompletedAt);
  const isDemoOrg = org.slug === DEMO_ORG_SLUG || isDemoAppEnvironment();
  const locationsCount = org._count.locations;
  const providersCount = org._count.providers;

  const items: PilotChecklistItem[] = [
    { id: 'practice', label: 'Practice created', done: true, requiredForPilot: true },
    {
      id: 'owner',
      label: 'Owner/admin account present',
      done: owners.length > 0,
      requiredForPilot: true,
    },
    {
      id: 'staff',
      label: 'Staff invited (active staff users)',
      done: staff.length >= 2,
      requiredForPilot: true,
    },
    {
      id: 'mfa_required',
      label: 'MFA required for staff',
      done: org.mfaRequiredForStaff,
      requiredForPilot: true,
    },
    {
      id: 'mfa_enrolled',
      label: 'Clinical staff MFA enrolled',
      done: org.mfaRequiredForStaff ? mfaEnrolledCount >= Math.min(staff.length, 1) : false,
      requiredForPilot: true,
    },
    {
      id: 'locations',
      label: 'Locations configured',
      done: locationsCount > 0,
      requiredForPilot: true,
    },
    {
      id: 'providers',
      label: 'Providers configured',
      done: providersCount > 0,
      requiredForPilot: true,
    },
    {
      id: 'demo_off',
      label: 'Demo mode off for this practice',
      done: !isDemoOrg && !serverEnv.demoModeEnabled,
      requiredForPilot: true,
    },
    {
      id: 'live_phi',
      label: 'livePhiEnabled on',
      done: org.livePhiEnabled,
      requiredForPilot: true,
    },
    {
      id: 'controlled_pilot',
      label: 'Controlled pilot mode enabled',
      done: org.controlledPilotEnabled,
      requiredForPilot: true,
    },
    {
      id: 'baa',
      label: 'Critical BAAs marked (OpenAI at minimum if AI used)',
      done: openaiBaa || !serverEnv.aiAllowPhi,
      requiredForPilot: true,
    },
    {
      id: 'rls',
      label: 'RLS verified',
      done: Boolean(org.rlsVerifiedAt),
      requiredForPilot: true,
    },
    {
      id: 'audit',
      label: 'Audit logging verified',
      done: Boolean(org.auditVerifiedAt),
      requiredForPilot: true,
    },
    {
      id: 'backup',
      label: 'Backup readiness verified (restore test)',
      done: Boolean(org.backupRestoreTestAt) && org.backupStatus === 'verified',
      requiredForPilot: true,
    },
    {
      id: 'monitoring',
      label: 'Monitoring verified',
      done: Boolean(org.monitoringVerifiedAt),
      requiredForPilot: true,
    },
    {
      id: 'incident',
      label: 'Incident response reviewed',
      done: Boolean(org.incidentResponseReviewedAt),
      requiredForPilot: true,
    },
    {
      id: 'training',
      label: 'Staff training completed',
      done: Boolean(org.staffTrainingCompletedAt),
      requiredForPilot: true,
    },
    {
      id: 'onboarding',
      label: 'Staff onboarding checklists in progress',
      done: onboardingDone > 0 || staff.length === 0,
      requiredForPilot: false,
    },
  ];

  const requiredMissing = items.filter((i) => i.requiredForPilot && !i.done);

  let status: PilotLaunchStatus = 'not_ready';
  if (isDemoOrg || serverEnv.demoModeEnabled) {
    status = 'internal_demo_only';
  } else if (
    requiredMissing.length === 0 &&
    org.controlledPilotEnabled &&
    org.livePhiEnabled &&
    isProductionApp()
  ) {
    status = 'live_production_ready';
  } else if (
    org.controlledPilotEnabled &&
    org.livePhiEnabled &&
    org.rlsVerifiedAt &&
    org.mfaRequiredForStaff &&
    requiredMissing.filter((i) =>
      ['backup', 'monitoring', 'incident', 'training'].includes(i.id),
    ).length === 0
  ) {
    status = 'controlled_pilot_ready';
  } else if (!isDemoOrg && locationsCount > 0) {
    status = 'not_ready';
  }

  // Softer controlled pilot ready when most ops items done even if env not production yet
  if (
    status === 'not_ready' &&
    !isDemoOrg &&
    org.controlledPilotEnabled &&
    org.livePhiEnabled &&
    org.rlsVerifiedAt &&
    org.mfaRequiredForStaff &&
    org.backupRestoreTestAt &&
    org.monitoringVerifiedAt &&
    org.incidentResponseReviewedAt
  ) {
    status = 'controlled_pilot_ready';
  }

  return {
    status,
    items,
    controlledPilotEnabled: org.controlledPilotEnabled,
    livePhiEnabled: org.livePhiEnabled,
  };
}

export function pilotStatusLabel(status: PilotLaunchStatus): string {
  switch (status) {
    case 'internal_demo_only':
      return 'Internal demo only';
    case 'controlled_pilot_ready':
      return 'Controlled pilot ready';
    case 'live_production_ready':
      return 'Live production ready';
    default:
      return 'Not ready';
  }
}

export function pilotStatusToReadiness(status: PilotLaunchStatus): ReadinessState {
  if (status === 'live_production_ready' || status === 'controlled_pilot_ready') return 'ready';
  if (status === 'internal_demo_only') return 'demo_only';
  return 'needs_configuration';
}
