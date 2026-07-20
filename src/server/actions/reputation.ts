'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { GoogleReviewReplyStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { generateReviewReplyDraft } from '@/lib/reputation/review-reply-generator';
import {
  fetchGoogleReviews,
  postGoogleReviewReply,
} from '@/lib/providers/google-business';
import { withDemoNotice } from '@/lib/demo/safety-server';

const reviewIdSchema = z.object({ reviewId: z.string().min(1) });

export const draftReviewReply = action({
  schema: reviewIdSchema,
  async handler({ reviewId }) {
    const user = await assertPermission('reputation:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await db.googleReview.findUnique({
      where: { id: reviewId },
      include: {
        organization: { select: { name: true } },
        location: { select: { name: true } },
        connection: { select: { demoMode: true } },
      },
    });
    if (!review) throw new Error('Review not found');
    assertSameOrg(user, review);

    if (
      review.replyStatus === GoogleReviewReplyStatus.PUBLISHED ||
      review.replyStatus === GoogleReviewReplyStatus.DEMO_PUBLISHED
    ) {
      throw new Error('This review already has a published reply.');
    }

    const draft = await generateReviewReplyDraft({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      practiceName: review.organization.name,
      reviewerName: review.reviewerName,
      starRating: review.starRating,
      comment: review.comment,
      locationName: review.location?.name,
    });

    const updated = await db.googleReview.update({
      where: { id: reviewId },
      data: {
        draftReply: draft.replyText,
        draftGeneratedAt: new Date(),
        draftGeneratedById: user.id,
        replyStatus: GoogleReviewReplyStatus.DRAFT,
        aiGatewayRequestId: draft.gatewayRequestId ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'GoogleReview',
      resourceId: reviewId,
      metadata: { action: 'draft_reply', source: draft.source },
    });

    revalidatePath('/provider/reputation');
    return updated;
  },
});

export const updateReviewReplyDraft = action({
  schema: z.object({
    reviewId: z.string().min(1),
    draftReply: z.string().min(1).max(3500),
  }),
  async handler({ reviewId, draftReply }) {
    const user = await assertPermission('reputation:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await db.googleReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error('Review not found');
    assertSameOrg(user, review);

    if (
      review.replyStatus === GoogleReviewReplyStatus.PUBLISHED ||
      review.replyStatus === GoogleReviewReplyStatus.DEMO_PUBLISHED
    ) {
      throw new Error('Published replies cannot be edited here.');
    }

    const updated = await db.googleReview.update({
      where: { id: reviewId },
      data: {
        draftReply,
        replyStatus: GoogleReviewReplyStatus.DRAFT,
      },
    });

    revalidatePath('/provider/reputation');
    return updated;
  },
});

export const publishReviewReply = action({
  schema: z.object({
    reviewId: z.string().min(1),
    replyText: z.string().min(1).max(3500).optional(),
  }),
  async handler({ reviewId, replyText }) {
    const user = await assertPermission('reputation:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await db.googleReview.findUnique({
      where: { id: reviewId },
      include: { connection: true },
    });
    if (!review) throw new Error('Review not found');
    assertSameOrg(user, review);

    if (
      review.replyStatus === GoogleReviewReplyStatus.PUBLISHED ||
      review.replyStatus === GoogleReviewReplyStatus.DEMO_PUBLISHED
    ) {
      throw new Error('This review already has a published reply.');
    }

    const text = (replyText ?? review.draftReply)?.trim();
    if (!text) throw new Error('No reply text to publish. Draft a reply first.');

    const result = await postGoogleReviewReply({
      connectionId: review.connectionId,
      externalReviewId: review.externalReviewId,
      replyText: text,
      demoMode: review.connection.demoMode,
    });

    if (result.mode === 'not_configured') {
      throw new Error(
        'Google Business Profile is not configured. Connect Google API keys, or use a demo-mode connection to mark replies as demo-published.',
      );
    }

    const replyStatus =
      result.mode === 'demo'
        ? GoogleReviewReplyStatus.DEMO_PUBLISHED
        : GoogleReviewReplyStatus.PUBLISHED;

    const updated = await db.googleReview.update({
      where: { id: reviewId },
      data: {
        publishedReply: text,
        publishedAt: new Date(),
        publishedById: user.id,
        replyStatus,
        draftReply: text,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'GoogleReview',
      resourceId: reviewId,
      metadata: { action: 'publish_reply', mode: result.mode, replyStatus },
    });

    revalidatePath('/provider/reputation');
    return withDemoNotice(
      { ...updated, publishMode: result.mode },
      user.organizationSlug,
    );
  },
});

export const skipReviewReply = action({
  schema: reviewIdSchema,
  async handler({ reviewId }) {
    const user = await assertPermission('reputation:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await db.googleReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error('Review not found');
    assertSameOrg(user, review);

    const updated = await db.googleReview.update({
      where: { id: reviewId },
      data: { replyStatus: GoogleReviewReplyStatus.SKIPPED },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'GoogleReview',
      resourceId: reviewId,
      metadata: { action: 'skip_reply' },
    });

    revalidatePath('/provider/reputation');
    return updated;
  },
});

export const syncGoogleReviews = action({
  schema: z.object({ connectionId: z.string().min(1).optional() }),
  async handler({ connectionId }) {
    const user = await assertPermission('reputation:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const connections = await db.googleBusinessConnection.findMany({
      where: {
        organizationId: user.organizationId,
        ...(connectionId ? { id: connectionId } : {}),
      },
      include: { location: true },
    });

    if (!connections.length) {
      throw new Error('No Google Business connection found. Connect a location first.');
    }

    let imported = 0;

    for (const connection of connections) {
      const external = await fetchGoogleReviews({
        connectionId: connection.id,
        demoMode: connection.demoMode,
      });

      for (const row of external) {
        await db.googleReview.upsert({
          where: {
            connectionId_externalReviewId: {
              connectionId: connection.id,
              externalReviewId: row.externalReviewId,
            },
          },
          create: {
            organizationId: user.organizationId,
            connectionId: connection.id,
            locationId: connection.locationId,
            externalReviewId: row.externalReviewId,
            reviewerName: row.reviewerName,
            starRating: row.starRating,
            comment: row.comment,
            reviewedAt: row.reviewedAt,
            replyStatus: GoogleReviewReplyStatus.PENDING_REPLY,
          },
          update: {
            reviewerName: row.reviewerName,
            starRating: row.starRating,
            comment: row.comment,
            reviewedAt: row.reviewedAt,
          },
        });
        imported += 1;
      }

      await db.googleBusinessConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'GoogleBusinessConnection',
      resourceId: connections[0].id,
      metadata: { action: 'sync_reviews', imported },
    });

    revalidatePath('/provider/reputation');
    return withDemoNotice({ imported }, user.organizationSlug);
  },
});
