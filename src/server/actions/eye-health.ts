'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { EyeHealthOrgReviewStatus, EyeHealthRecommendationContext } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { requirePortalPatient } from '@/lib/auth/portal';
import { getEyeHealthArticle } from '@/lib/eye-health/catalog';
import { explainArticlePlain } from '@/lib/eye-health/service';

const slugSchema = z.string().min(1).max(120);

export async function recommendEyeHealthArticle(input: {
  patientId: string;
  slug: string;
  context?: EyeHealthRecommendationContext;
  note?: string;
  encounterId?: string;
  appointmentId?: string;
  sendMessage?: boolean;
}) {
  const user = await requirePermission('messages:send');
  if (!user.organizationId) return { ok: false as const, error: 'No organization.' };

  const slug = slugSchema.parse(input.slug);
  const article = getEyeHealthArticle(slug);
  if (!article) return { ok: false as const, error: 'Article not found.' };

  const patient = await db.patient.findFirst({
    where: { id: input.patientId, organizationId: user.organizationId, archivedAt: null },
  });
  if (!patient) return { ok: false as const, error: 'Patient not found.' };
  assertSameOrg(user, patient);

  const rec = await db.eyeHealthRecommendation.create({
    data: {
      organizationId: user.organizationId,
      patientId: patient.id,
      slug,
      recommendedById: user.id,
      encounterId: input.encounterId,
      appointmentId: input.appointmentId,
      context: input.context ?? EyeHealthRecommendationContext.PROVIDER_RECOMMENDED,
      note:
        input.note?.trim() ||
        'Your provider shared this article because it may relate to your visit.',
    },
  });

  await audit({
    organizationId: user.organizationId,
    userId: user.id,
    action: 'CREATE',
    resourceType: 'EyeHealthRecommendation',
    resourceId: rec.id,
    metadata: { slug, patientId: patient.id, sendMessage: Boolean(input.sendMessage) },
  });

  if (input.sendMessage) {
    const portalPath = `/patient/eye-health-library/${slug}`;
    const body = [
      'Your care team shared an Eye Health Library article for education only.',
      '',
      `Article: ${article.title}`,
      rec.note,
      '',
      `Open in your portal: ${portalPath}`,
      '',
      'This is not a diagnosis. Ask your provider what applies to you.',
    ].join('\n');

    const thread = await db.messageThread.create({
      data: {
        organizationId: user.organizationId,
        patientId: patient.id,
        subject: `Education: ${article.title}`,
        isInternal: false,
        messages: {
          create: {
            body,
            direction: 'OUTBOUND',
            channel: 'PORTAL',
            readStatus: 'UNREAD',
            senderId: user.id,
            senderRoleAtSend: user.role,
          },
        },
      },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'MessageThread',
      resourceId: thread.id,
      metadata: { kind: 'eye_health_share', slug },
    });
  }

  revalidateTag(`org:${user.organizationId}:eye-health`);
  revalidatePath('/patient/eye-health-library');
  revalidatePath(`/provider/patients/${patient.id}`);
  return { ok: true as const, id: rec.id };
}

export async function setEyeHealthArticleOrgStatus(input: {
  slug: string;
  reviewStatus: EyeHealthOrgReviewStatus;
  hidden?: boolean;
}) {
  const user = await requirePermission('templates:manage');
  if (!user.organizationId) return { ok: false as const, error: 'No organization.' };
  const slug = slugSchema.parse(input.slug);
  if (!getEyeHealthArticle(slug)) return { ok: false as const, error: 'Article not found.' };

  await db.eyeHealthOrgArticleState.upsert({
    where: {
      organizationId_slug: { organizationId: user.organizationId, slug },
    },
    create: {
      organizationId: user.organizationId,
      slug,
      reviewStatus: input.reviewStatus,
      hidden: input.hidden ?? input.reviewStatus === 'HIDDEN',
      lastReviewedAt: new Date(),
      reviewedById: user.id,
    },
    update: {
      reviewStatus: input.reviewStatus,
      hidden: input.hidden ?? input.reviewStatus === 'HIDDEN',
      lastReviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  await audit({
    organizationId: user.organizationId,
    userId: user.id,
    action: 'UPDATE',
    resourceType: 'EyeHealthOrgArticleState',
    resourceId: slug,
    metadata: { reviewStatus: input.reviewStatus, hidden: input.hidden },
  });

  revalidateTag(`org:${user.organizationId}:eye-health`);
  revalidateTag(`org:${user.organizationId}:settings`);
  revalidatePath('/provider/eye-health-library');
  return { ok: true as const };
}

export async function toggleSaveEyeHealthArticle(slugRaw: string) {
  const session = await requirePortalPatient();
  if (!session.organizationId || !session.patientId) {
    return { ok: false as const, error: 'Portal patient required.' };
  }
  const slug = slugSchema.parse(slugRaw);
  if (!getEyeHealthArticle(slug)) return { ok: false as const, error: 'Article not found.' };

  const existing = await db.eyeHealthSavedArticle.findUnique({
    where: { patientId_slug: { patientId: session.patientId, slug } },
  });

  if (existing) {
    await db.eyeHealthSavedArticle.delete({ where: { id: existing.id } });
    revalidatePath('/patient/eye-health-library');
    return { ok: true as const, saved: false };
  }

  await db.eyeHealthSavedArticle.create({
    data: {
      organizationId: session.organizationId,
      patientId: session.patientId,
      userId: session.id,
      slug,
    },
  });
  revalidatePath('/patient/eye-health-library');
  return { ok: true as const, saved: true };
}

/** Explain an article in simpler words. No diagnosis. Uses library text only. */
export async function explainEyeHealthArticle(slugRaw: string) {
  const slug = slugSchema.parse(slugRaw);
  const article = getEyeHealthArticle(slug);
  if (!article) return { ok: false as const, error: 'Article not found.' };
  return { ok: true as const, text: explainArticlePlain(article) };
}
