import 'server-only';

import { ReminderChannel } from '@prisma/client';
import { serverEnv } from '@/lib/env';
import { isDemoAppEnvironment, isProductionApp } from '@/lib/production/mode';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { db } from '@/lib/db';

export type ReminderSendGate =
  | { ok: true; mode: 'live' | 'demo' }
  | {
      ok: false;
      status: 'BLOCKED_VENDOR' | 'BLOCKED_BAA' | 'BLOCKED_CONSENT' | 'OPT_OUT';
      reason: string;
    };

export function getChannelVendorState(channel: ReminderChannel): {
  configured: boolean;
  baaComplete: boolean;
  label: string;
} {
  if (channel === 'SMS') {
    return {
      configured: Boolean(
        serverEnv.twilioAccountSid && serverEnv.twilioAuthToken && serverEnv.twilioFromNumber,
      ),
      baaComplete: serverEnv.twilioBaaConfirmed,
      label: 'Twilio',
    };
  }
  if (channel === 'EMAIL') {
    return {
      configured: Boolean(serverEnv.sendgridApiKey && serverEnv.sendgridFromEmail),
      baaComplete: serverEnv.sendgridBaaConfirmed,
      label: 'SendGrid',
    };
  }
  // PORTAL / CALL — portal is always available; call is not automated.
  return { configured: true, baaComplete: true, label: channel };
}

export async function evaluateReminderSend(args: {
  organizationId: string;
  organizationSlug?: string | null;
  channel: ReminderChannel;
  patientId?: string | null;
}): Promise<ReminderSendGate> {
  const vendor = getChannelVendorState(args.channel);
  const isDemoOrg = args.organizationSlug === DEMO_ORG_SLUG || isDemoAppEnvironment();

  if (args.channel === 'SMS' || args.channel === 'EMAIL') {
    if (!vendor.configured) {
      if (isDemoOrg && !isProductionApp()) {
        return { ok: true, mode: 'demo' };
      }
      return {
        ok: false,
        status: 'BLOCKED_VENDOR',
        reason: `Sending disabled — ${vendor.label} is not configured`,
      };
    }
    if (!vendor.baaComplete) {
      if (isDemoOrg && !isProductionApp()) {
        return { ok: true, mode: 'demo' };
      }
      return {
        ok: false,
        status: 'BLOCKED_BAA',
        reason: `Sending disabled — ${vendor.label} BAA is incomplete`,
      };
    }
  }

  if (args.patientId) {
    const pref = await db.communicationPreference.findUnique({
      where: { patientId: args.patientId },
    });

    // Portal stays available even when SMS/email are disabled or opted out.
    if (args.channel === 'PORTAL') {
      if (pref && pref.portalOptIn === false) {
        return {
          ok: false,
          status: 'BLOCKED_CONSENT',
          reason: 'Patient has disabled portal messaging',
        };
      }
      return {
        ok: true,
        mode: isDemoOrg && (!vendor.configured || !vendor.baaComplete) ? 'demo' : 'live',
      };
    }

    if (args.channel === 'SMS' || args.channel === 'EMAIL') {
      if (pref?.optOutAt) {
        return {
          ok: false,
          status: 'OPT_OUT',
          reason: 'Patient has opted out of SMS/email reminders',
        };
      }
      // Fail closed: missing preference record means no explicit consent.
      if (args.channel === 'SMS' && (!pref || !pref.smsOptIn)) {
        return {
          ok: false,
          status: 'BLOCKED_CONSENT',
          reason: 'Patient has not consented to SMS',
        };
      }
      if (args.channel === 'EMAIL' && (!pref || !pref.emailOptIn)) {
        return {
          ok: false,
          status: 'BLOCKED_CONSENT',
          reason: 'Patient has not consented to email',
        };
      }
    }
  }

  return { ok: true, mode: isDemoOrg && (!vendor.configured || !vendor.baaComplete) ? 'demo' : 'live' };
}

export function reminderUiState(args: {
  campaignStatus: string;
  channel: ReminderChannel;
}): { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } {
  const vendor = getChannelVendorState(args.channel);
  if (args.campaignStatus === 'DRAFT' || args.campaignStatus === 'PENDING_APPROVAL') {
    return { label: 'Draft only', tone: 'muted' };
  }
  if (args.campaignStatus === 'BLOCKED_VENDOR' || (!vendor.configured && (args.channel === 'SMS' || args.channel === 'EMAIL'))) {
    return { label: 'Sending disabled — vendor not configured', tone: 'bad' };
  }
  if (args.campaignStatus === 'BLOCKED_BAA' || (vendor.configured && !vendor.baaComplete && (args.channel === 'SMS' || args.channel === 'EMAIL'))) {
    return { label: 'Sending disabled — BAA incomplete', tone: 'bad' };
  }
  if (args.campaignStatus === 'COMPLETED') return { label: 'Sent', tone: 'ok' };
  if (args.campaignStatus === 'APPROVED' || args.campaignStatus === 'SCHEDULED') {
    return { label: 'Ready to send', tone: 'ok' };
  }
  if (args.campaignStatus === 'SENDING') return { label: 'Sending…', tone: 'warn' };
  return { label: args.campaignStatus, tone: 'muted' };
}
