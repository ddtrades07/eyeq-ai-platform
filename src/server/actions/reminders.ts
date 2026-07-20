'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  ReminderCampaignStatus,
  ReminderChannel,
  ReminderType,
  SupportedLocale,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const templateSchema = z.object({
  type: z.nativeEnum(ReminderType),
  channel: z.nativeEnum(ReminderChannel),
  locale: z.nativeEnum(SupportedLocale).default('EN'),
  name: z.string().min(1).max(120),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(2000),
});

export const createReminderTemplate = action({
  schema: templateSchema,
  async handler(input) {
    const user = await assertPermission('reminders:manage');
    if (!user.organizationId) throw new Error('No organization context');
    const template = await db.reminderTemplate.create({
      data: {
        organizationId: user.organizationId,
        type: input.type,
        channel: input.channel,
        locale: input.locale,
        name: input.name,
        subject: input.subject ?? null,
        body: input.body,
        variables: extractVars(input.body),
      },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'ReminderTemplate',
      resourceId: template.id,
    });
    revalidatePath('/provider/reminders');
    return template;
  },
});

const campaignSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.nativeEnum(ReminderType),
  channel: z.nativeEnum(ReminderChannel),
  templateId: z.string().optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const createReminderCampaign = action({
  schema: campaignSchema,
  async handler(input) {
    const user = await assertPermission('reminders:manage');
    if (!user.organizationId) throw new Error('No organization context');
    const campaign = await db.reminderCampaign.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        type: input.type,
        channel: input.channel,
        templateId: input.templateId || null,
        scheduledFor: input.scheduledFor ?? null,
        notes: input.notes ?? null,
        status: ReminderCampaignStatus.DRAFT,
      },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'ReminderCampaign',
      resourceId: campaign.id,
    });
    revalidatePath('/provider/reminders');
    return campaign;
  },
});

export const setCampaignStatus = action({
  schema: z.object({
    id: z.string(),
    status: z.nativeEnum(ReminderCampaignStatus),
  }),
  async handler({ id, status }) {
    const user = await assertPermission('reminders:manage');
    if (!user.organizationId) throw new Error('No organization context');
    const campaign = await db.reminderCampaign.findUnique({ where: { id } });
    if (!campaign) throw new Error('Campaign not found');
    assertSameOrg(user, campaign);

    if (status === 'APPROVED' || status === 'SCHEDULED' || status === 'SENDING' || status === 'COMPLETED') {
      const approverUser = await assertPermission('reminders:approve');
      const updated = await db.reminderCampaign.update({
        where: { id },
        data: {
          status,
          approvedById: approverUser.id,
          approvedAt: new Date(),
        },
      });
      await audit({
        organizationId: user.organizationId,
        userId: approverUser.id,
        action: 'UPDATE',
        resourceType: 'ReminderCampaign',
        resourceId: id,
        metadata: { status },
      });
      revalidatePath('/provider/reminders');
      return updated;
    }

    const updated = await db.reminderCampaign.update({
      where: { id },
      data: { status },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'ReminderCampaign',
      resourceId: id,
      metadata: { status },
    });
    revalidatePath('/provider/reminders');
    return updated;
  },
});

export const generateReminderBody = action({
  schema: z.object({
    type: z.nativeEnum(ReminderType),
    channel: z.nativeEnum(ReminderChannel),
    locale: z.nativeEnum(SupportedLocale).default('EN'),
    practiceName: z.string().max(120),
  }),
  async handler({ type, channel, locale, practiceName }) {
    const user = await assertPermission('reminders:manage');
    const examples: Record<string, string> = {
      APPOINTMENT_REMINDER: `Hi {{firstName}}, reminder of your visit at ${practiceName} on {{appointmentDate}}. Reply Y to confirm.`,
      RECALL_REMINDER: `Hi {{firstName}}, it might be time for your visit at ${practiceName}. Tap to book: {{bookingLink}}.`,
      CL_RX_EXPIRATION: `Hi {{firstName}}, your contact lens Rx expires {{rxExpires}}. Schedule at {{bookingLink}}.`,
      GLASSES_RX_EXPIRATION: `Hi {{firstName}}, your glasses Rx expires {{rxExpires}}. Book at {{bookingLink}}.`,
      DRY_EYE_FOLLOWUP: `Hi {{firstName}}, checking in on your dry eye plan, reply if symptoms changed.`,
      NO_SHOW_RECOVERY: `Hi {{firstName}}, we missed you. Tap to rebook: {{bookingLink}}.`,
      DIABETIC_EXAM_REMINDER: `Hi {{firstName}}, your yearly diabetic eye exam helps protect vision. Book at {{bookingLink}}.`,
      POST_VISIT_INSTRUCTIONS: `Hi {{firstName}}, thanks for visiting ${practiceName}. Updates will appear in the portal.`,
      ANNUAL_EXAM_REMINDER: `Hi {{firstName}}, it has been a year, book your annual visit at ${practiceName}.`,
      PORTAL_INVITATION: `Hi {{firstName}}, your ${practiceName} portal is ready. Activate it at {{portalUrl}}.`,
      IMAGING_FOLLOWUP: `Hi {{firstName}}, our team wants to revisit your imaging. Tap to schedule: {{bookingLink}}.`,
      APPOINTMENT_CONFIRMATION: `Hi {{firstName}}, please confirm your visit at ${practiceName}. Reply Y to confirm.`,
      CUSTOM: `Hi {{firstName}}, ${practiceName} is reaching out, reply to this message.`,
    };
    const sample = examples[type] ?? 'Hi {{firstName}}, your practice is reaching out.';
    await audit({
      organizationId: user.organizationId ?? undefined,
      userId: user.id,
      action: 'AI_INVOCATION',
      resourceType: 'ReminderTemplate',
      metadata: { type, channel, locale },
    });
    return { body: sample };
  },
});

function extractVars(body: string): string[] {
  const matches = body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}\s]/g, ''))));
}

const prefSchema = z.object({
  patientId: z.string(),
  smsOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
  portalOptIn: z.boolean().optional(),
  callOptIn: z.boolean().optional(),
  preferredChannel: z.nativeEnum(ReminderChannel).optional(),
  setOptOut: z.boolean().optional(),
  clearOptOut: z.boolean().optional(),
});

export const updateCommunicationPreferences = action({
  schema: prefSchema,
  async handler(input) {
    const user = await assertPermission('reminders:manage');
    if (!user.organizationId) throw new Error('No organization context');
    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);
    const optOutAt = input.setOptOut
      ? new Date()
      : input.clearOptOut
        ? null
        : undefined;
    const pref = await db.communicationPreference.upsert({
      where: { patientId: input.patientId },
      create: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        smsOptIn: input.smsOptIn ?? false,
        emailOptIn: input.emailOptIn ?? false,
        portalOptIn: input.portalOptIn ?? true,
        callOptIn: input.callOptIn ?? true,
        preferredChannel: input.preferredChannel ?? 'PORTAL',
        optOutAt: optOutAt ?? null,
      },
      update: {
        smsOptIn: input.smsOptIn ?? undefined,
        emailOptIn: input.emailOptIn ?? undefined,
        portalOptIn: input.portalOptIn ?? undefined,
        callOptIn: input.callOptIn ?? undefined,
        preferredChannel: input.preferredChannel ?? undefined,
        ...(optOutAt !== undefined ? { optOutAt } : {}),
      },
    });
    revalidatePath(`/provider/patients/${input.patientId}`);
    return pref;
  },
});

export const sendReminderCampaign = action({
  schema: z.object({
    campaignId: z.string(),
    previewOnly: z.boolean().optional(),
  }),
  async handler({ campaignId, previewOnly }) {
    const user = await assertPermission('reminders:approve');
    if (!user.organizationId) throw new Error('No organization context');

    const campaign = await db.reminderCampaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });
    if (!campaign) throw new Error('Campaign not found');
    assertSameOrg(user, campaign);
    if (campaign.status !== 'APPROVED' && campaign.status !== 'SCHEDULED') {
      throw new Error('Campaign must be approved before sending');
    }

    const { evaluateReminderSend } = await import('@/lib/reminders/send-gate');
    const gate = await evaluateReminderSend({
      organizationId: user.organizationId,
      organizationSlug: user.organizationSlug,
      channel: campaign.channel,
    });

    if (previewOnly) {
      return {
        preview: true as const,
        channel: campaign.channel,
        templateBody: campaign.template?.body ?? null,
        gate,
      };
    }

    if (!gate.ok) {
      await db.reminderCampaign.update({
        where: { id: campaignId },
        data: {
          status: gate.status === 'BLOCKED_BAA' ? 'BLOCKED_BAA' : 'BLOCKED_VENDOR',
        },
      });
      await audit({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'REMINDER_SEND',
        resourceType: 'ReminderCampaign',
        resourceId: campaignId,
        success: false,
        newStatus: gate.status,
        metadata: { reason: gate.reason },
      });
      throw new Error(gate.reason);
    }

    if (gate.mode === 'demo') {
      await db.reminderCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          notes: `${campaign.notes ?? ''}\n[DEMO_SENT]`.trim(),
        },
      });
      await db.messageDeliveryLog.create({
        data: {
          organizationId: user.organizationId,
          campaignId,
          channel: campaign.channel,
          status: 'DEMO_SENT',
          vendor: 'demo',
          sentAt: new Date(),
          metadata: { mode: 'demo' },
        },
      });
      await audit({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'REMINDER_SEND',
        resourceType: 'ReminderCampaign',
        resourceId: campaignId,
        newStatus: 'DEMO_SENT',
        metadata: { mode: 'demo' },
      });
      revalidatePath('/provider/reminders');
      return {
        mode: 'demo' as const,
        message: 'Marked as demo-sent (no vendor message delivered).',
      };
    }

    await db.reminderCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    const { enqueueBackgroundJob } = await import('@/lib/jobs/queue');
    const job = await enqueueBackgroundJob({
      type: 'send-reminder-campaign',
      organizationId: user.organizationId,
      createdById: user.id,
      payload: { campaignId },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REMINDER_SEND',
      resourceType: 'ReminderCampaign',
      resourceId: campaignId,
      newStatus: 'SENDING',
      metadata: { jobId: job.id, mode: 'live' },
    });

    revalidatePath('/provider/reminders');
    return { mode: 'live' as const, jobId: job.id };
  },
});
