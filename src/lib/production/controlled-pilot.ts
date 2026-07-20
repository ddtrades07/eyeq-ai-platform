import 'server-only';

import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { db } from '@/lib/db';

/**
 * Controlled live pilot restrictions — org-scoped, fail-closed for risky automation.
 * Demo mode is separate; this only applies when controlledPilotEnabled is true.
 */
export type ControlledPilotRestrictions = {
  active: boolean;
  allowAutoSendAiMessages: false;
  allowAutoSignNotes: false;
  allowFakeVendorPublish: false;
  allowUnverifiedReminders: false;
  allowUnverifiedImports: false;
  bannerLabel: 'Controlled Live Pilot';
};

export async function getControlledPilotRestrictions(
  organizationId: string | null | undefined,
): Promise<ControlledPilotRestrictions | null> {
  if (!organizationId) return null;
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { controlledPilotEnabled: true, slug: true },
  });
  if (!org?.controlledPilotEnabled || org.slug === DEMO_ORG_SLUG) return null;
  return {
    active: true,
    allowAutoSendAiMessages: false,
    allowAutoSignNotes: false,
    allowFakeVendorPublish: false,
    allowUnverifiedReminders: false,
    allowUnverifiedImports: false,
    bannerLabel: 'Controlled Live Pilot',
  };
}

export function assertPilotAllowsImport(args: {
  controlledPilot: boolean;
  dryRun: boolean;
  confirmedAfterDryRun: boolean;
}) {
  if (!args.controlledPilot) return;
  if (args.dryRun) return;
  if (!args.confirmedAfterDryRun) {
    throw new Error(
      'Controlled pilot: run a dry-run first, then confirm before importing patients (CSV migration only — not full EHR conversion).',
    );
  }
}
