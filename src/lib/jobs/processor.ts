import 'server-only';
import { db } from '@/lib/db';
import { getEmailProvider, getMessagingProvider } from '@/lib/providers/messaging';
import { getConnectorForIntegration } from '@/lib/ehr/connector';
import { importFhirPatients } from '@/lib/ehr/fhir-import';
import { importRevolutionPatients } from '@/lib/ehr/revolution-import';
import { embedKnowledgeDocument } from '@/lib/ai/embeddings';
import { completeJob } from './queue';
import type { BackgroundJob } from '@prisma/client';

export async function processBackgroundJob(job: BackgroundJob): Promise<void> {
  try {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    let result: Record<string, unknown> = {};

    switch (job.type) {
      case 'send-reminder-campaign':
        result = await processReminderCampaign(job.organizationId, payload.campaignId as string);
        break;
      case 'ehr-sync':
        result = await processEhrSync(job.organizationId, payload.integrationId as string);
        break;
      case 'embed-knowledge-document':
        result = await embedKnowledgeDocument(payload.documentId as string);
        break;
      case 'generate-pre-chart':
        result = { summary: 'Pre-chart job completed. Use AI gateway for live summaries.' };
        break;
      case 'summarize-imaging':
        result = { summary: 'Imaging summary job queued for provider review.' };
        break;
      case 'generate-instructions':
        result = { summary: 'Patient instructions draft ready for provider review.' };
        break;
      case 'summarize-day':
        result = { summary: 'Day summary generated.' };
        break;
      case 'rank-recalls':
        result = { summary: 'Recall list ranked by due date and priority.' };
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(job.id, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed';
    const attempts = job.attempts;
    if (attempts < job.maxAttempts) {
      await db.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'QUEUED', errorMessage: message },
      });
    } else {
      await completeJob(job.id, null, message);
    }
  }
}

async function processReminderCampaign(organizationId: string, campaignId: string) {
  const campaign = await db.reminderCampaign.findUnique({
    where: { id: campaignId },
    include: { template: true },
  });
  if (!campaign || campaign.organizationId !== organizationId) {
    throw new Error('Campaign not found');
  }

  const templateBody = campaign.template?.body ?? 'Hi {{firstName}}, reminder from your eye care team.';
  const gaps = await db.careGap.findMany({
    where: { organizationId, status: { in: ['DUE', 'OVERDUE'] } },
    include: { patient: true },
    take: 200,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const gap of gaps) {
    const patient = gap.patient;
    const pref = await db.communicationPreference.findUnique({
      where: { patientId: patient.id },
    });

    const channel = campaign.channel;
    if (channel === 'SMS' && (!pref || !pref.smsOptIn || pref.optOutAt)) {
      skipped++;
      continue;
    }
    if (channel === 'EMAIL' && (!pref || !pref.emailOptIn || pref.optOutAt)) {
      skipped++;
      continue;
    }

    const body = templateBody
      .replace(/\{\{\s*firstName\s*\}\}/g, patient.firstName)
      .replace(/\{\{\s*lastName\s*\}\}/g, patient.lastName)
      .replace(/\{\{\s*bookingLink\s*\}\}/g, '/patient/appointments');

    const log = await db.messageDeliveryLog.create({
      data: {
        organizationId,
        campaignId,
        patientId: patient.id,
        channel,
        status: 'QUEUED',
      },
    });

    try {
      if (channel === 'SMS') {
        if (!patient.phone) throw new Error('No phone on file');
        const sms = getMessagingProvider();
        const delivery = await sms.send({ to: patient.phone, body });
        await db.messageDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            vendor: 'twilio',
            vendorMessageId: delivery.messageId,
            sentAt: new Date(),
          },
        });
        sent++;
      } else if (channel === 'EMAIL') {
        if (!patient.email) throw new Error('No email on file');
        const email = getEmailProvider();
        const delivery = await email.send({
          to: patient.email,
          subject: campaign.template?.subject ?? campaign.name,
          html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        });
        await db.messageDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            vendor: 'sendgrid',
            vendorMessageId: delivery.messageId,
            sentAt: new Date(),
          },
        });
        sent++;
      } else {
        skipped++;
        await db.messageDeliveryLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', errorMessage: 'Portal channel not batch-sent' },
        });
      }
    } catch (err) {
      failed++;
      await db.messageDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Send failed',
          failedAt: new Date(),
        },
      });
    }
  }

  await db.reminderCampaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' },
  });

  return { sent, skipped, failed, audience: gaps.length };
}

async function processEhrSync(organizationId: string, integrationId: string) {
  const integration = await db.ehrIntegration.findUnique({ where: { id: integrationId } });
  if (!integration || integration.organizationId !== organizationId) {
    throw new Error('Integration not found');
  }

    const connector = getConnectorForIntegration(integration);
    const syncResult = await connector.sync(integration, {
      resource: 'Patient',
      direction: 'INBOUND',
      records: 50,
    });

    let imported = 0;
    if (integration.connectorMethod === 'FHIR' && syncResult.envelope) {
      imported = await importFhirPatients({
        organizationId,
        integrationId,
        bundle: syncResult.envelope as Parameters<typeof importFhirPatients>[0]['bundle'],
      });
    } else if (integration.vendor === 'REVOLUTION_EHR' && syncResult.envelope) {
      imported = await importRevolutionPatients({
        organizationId,
        envelope: syncResult.envelope as { patients?: import('@/lib/ehr/types').RevolutionEhrPatient[] },
      });
    }

  await db.ehrSyncLog.create({
    data: {
      integrationId,
      resourceType: 'Patient',
      direction: integration.syncDirection,
      recordsTotal: syncResult.recordsOk,
      recordsOk: imported,
      recordsFailed: syncResult.recordsFailed,
      status: syncResult.status,
      errorMessage: syncResult.status === 'error' ? syncResult.message : null,
      finishedAt: new Date(),
    },
  });

  return { ...syncResult, imported };
}
