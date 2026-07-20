import 'server-only';

import { isClearinghouseConfigured } from '@/lib/providers/clearinghouse';
import { serverEnv } from '@/lib/env';

export type ReadinessItem = {
  id: string;
  label: string;
  complete: boolean;
  blocking: boolean;
  href?: string;
  detail?: string;
};

export type OnboardingReadiness = {
  items: ReadinessItem[];
  completedCount: number;
  blockingCount: number;
  readyForGoLive: boolean;
};

export type ReadinessSnapshot = {
  locationCount: number;
  providerCount: number;
  providerWithNpiCount: number;
  staffCount: number;
  patientCount: number;
  hasPrimaryLocation: boolean;
  clearinghouseConfigured: boolean;
  paymentProcessorConfigured: boolean;
  smsConfigured: boolean;
  emailConfigured: boolean;
};

export function evaluateOnboardingReadiness(snapshot: ReadinessSnapshot): OnboardingReadiness {
  const items: ReadinessItem[] = [
    {
      id: 'locations',
      label: 'At least one practice location',
      complete: snapshot.locationCount > 0,
      blocking: true,
      href: '/provider/practice-setup',
    },
    {
      id: 'primary-location',
      label: 'Primary location designated',
      complete: snapshot.hasPrimaryLocation,
      blocking: true,
      href: '/provider/practice-setup',
    },
    {
      id: 'providers',
      label: 'At least one clinical provider',
      complete: snapshot.providerCount > 0,
      blocking: true,
      href: '/provider/team',
    },
    {
      id: 'provider-npi',
      label: 'Provider NPI on file for billing',
      complete: snapshot.providerWithNpiCount > 0,
      blocking: true,
      href: '/provider/team',
      detail: 'Claims require a rendering provider NPI.',
    },
    {
      id: 'staff',
      label: 'Staff accounts invited',
      complete: snapshot.staffCount > 1,
      blocking: false,
      href: '/provider/team',
    },
    {
      id: 'clearinghouse',
      label: 'Clearinghouse configured or manual billing workflow acknowledged',
      complete: snapshot.clearinghouseConfigured,
      blocking: false,
      href: '/provider/ehr-integrations',
      detail: snapshot.clearinghouseConfigured
        ? 'Electronic claim submission available.'
        : 'Use manual external submission until a clearinghouse is configured.',
    },
    {
      id: 'payments',
      label: 'Payment processor configured',
      complete: snapshot.paymentProcessorConfigured,
      blocking: false,
      href: '/provider/settings',
      detail: snapshot.paymentProcessorConfigured
        ? 'Card payments enabled.'
        : 'Cash, check, and external payments still work.',
    },
    {
      id: 'communications',
      label: 'Patient communication vendor configured',
      complete: snapshot.smsConfigured || snapshot.emailConfigured,
      blocking: false,
      href: '/provider/reminders',
    },
  ];

  const completedCount = items.filter((i) => i.complete).length;
  const blockingCount = items.filter((i) => i.blocking && !i.complete).length;

  return {
    items,
    completedCount,
    blockingCount,
    readyForGoLive: blockingCount === 0,
  };
}

export function buildReadinessSnapshot(counts: {
  locationCount: number;
  providerCount: number;
  providerWithNpiCount: number;
  staffCount: number;
  patientCount: number;
  hasPrimaryLocation: boolean;
}): ReadinessSnapshot {
  return {
    ...counts,
    clearinghouseConfigured: isClearinghouseConfigured(),
    paymentProcessorConfigured: Boolean(serverEnv.stripeSecretKey),
    smsConfigured: Boolean(serverEnv.twilioAccountSid && serverEnv.twilioBaaConfirmed),
    emailConfigured: Boolean(serverEnv.sendgridApiKey && serverEnv.sendgridBaaConfirmed),
  };
}
