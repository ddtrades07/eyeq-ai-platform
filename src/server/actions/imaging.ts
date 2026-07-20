'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ImageType, ImagingStatus, ImagingAuditAction, ProviderReviewStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { createImagingUploadUrl } from '@/lib/storage/upload';
import { runStructuredReview } from '@/lib/imaging';
import { revalidateImagingViews } from '@/lib/revalidate-paths';
import { logImagingAudit } from '@/lib/imaging/services/audit-service';
import { resolveActiveLocationId } from '@/lib/location/server';

const createImagingCaseSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional().nullable(),
  imageType: z.nativeEnum(ImageType),
  laterality: z.enum(['OD', 'OS', 'OU', 'UNKNOWN']).optional().default('UNKNOWN'),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  fileSizeBytes: z.coerce.number().int().min(1).max(100 * 1024 * 1024),
  checksum: z.string().max(128).optional(),
});

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'application/pdf',
  'application/dicom',
]);

export const requestImagingUpload = action({
  schema: createImagingCaseSchema,
  async handler(input) {
    const user = await assertPermission('imaging:upload');
    if (!user.organizationId) throw new Error('No organization context');

    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new Error('Unsupported file type. Allowed: JPEG, PNG, TIFF, WebP, PDF, DICOM');
    }

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const locationId = await resolveActiveLocationId({
      organizationId: user.organizationId,
      userId: user.id,
      role: user.role,
    });

    const ext = input.fileName.split('.').pop()?.toLowerCase() ?? 'bin';
    const checksum =
      input.checksum ??
      createHash('sha256').update(`${input.fileName}-${input.fileSizeBytes}-${Date.now()}`).digest('hex').slice(0, 32);

    if (input.checksum) {
      const dup = await db.imagingCase.findFirst({
        where: { organizationId: user.organizationId, patientId: input.patientId, checksum: input.checksum },
      });
      if (dup) throw new Error('This file appears to have been uploaded already for this patient.');
    }

    const imagingCase = await db.imagingCase.create({
      data: {
        organizationId: user.organizationId,
        locationId,
        patientId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        uploaderId: user.id,
        imageType: input.imageType,
        confirmedModality: input.imageType,
        laterality: input.laterality,
        storagePath: 'pending',
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        checksum,
        status: ImagingStatus.AWAITING_AI,
        studyStatus: 'UPLOADED',
      },
    });

    const signed = await createImagingUploadUrl({
      organizationId: user.organizationId,
      patientId: input.patientId,
      imagingCaseId: imagingCase.id,
      extension: ext,
    });

    await db.imagingCase.update({
      where: { id: imagingCase.id },
      data: { storagePath: signed.path },
    });

    await db.imagingAsset.create({
      data: {
        imagingCaseId: imagingCase.id,
        storagePath: signed.path,
        originalFilename: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        checksum,
        isOriginal: true,
      },
    });

    await logImagingAudit({
      organizationId: user.organizationId,
      locationId,
      patientId: input.patientId,
      imagingCaseId: imagingCase.id,
      userId: user.id,
      action: ImagingAuditAction.IMAGE_UPLOADED,
      details: { fileName: input.fileName, mimeType: input.mimeType },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'ImagingCase',
      resourceId: imagingCase.id,
    });

    revalidateImagingViews(input.patientId, imagingCase.id, user.organizationId);

    return {
      imagingCaseId: imagingCase.id,
      uploadUrl: signed.uploadUrl,
      bucket: signed.bucket,
      path: signed.path,
      token: signed.token,
    };
  },
});

export const confirmImagingUpload = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('imaging:upload');
    if (!user.organizationId) throw new Error('No organization context');

    const imagingCase = await db.imagingCase.findUnique({ where: { id } });
    if (!imagingCase) throw new Error('Imaging study not found');
    assertSameOrg(user, imagingCase);

    if (imagingCase.storagePath === 'pending') {
      throw new Error('Upload not complete, storage path still pending');
    }

    await db.imagingCase.update({
      where: { id },
      data: { studyStatus: 'UPLOADED' },
    });

    revalidateImagingViews(imagingCase.patientId, id, user.organizationId);
    return { ok: true };
  },
});

export const runAIReview = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('imaging:review');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await runStructuredReview({
      imagingCaseId: id,
      organizationId: user.organizationId,
      userId: user.id,
    });

    revalidateImagingViews(undefined, id, user.organizationId);
    return review;
  },
});

export const runStructuredAIReview = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('imaging:read');
    if (!user.organizationId) throw new Error('No organization context');

    const review = await runStructuredReview({
      imagingCaseId: id,
      organizationId: user.organizationId,
      userId: user.id,
    });

    revalidateImagingViews(undefined, id, user.organizationId);
    return review;
  },
});

export const signImagingCase = action({
  schema: z.object({
    id: z.string(),
    note: z.string().max(2000).optional().nullable(),
    trend: z
      .enum(['baseline', 'stable', 'improved', 'subtle-change', 'concern-noted'])
      .optional(),
  }),
  async handler(input) {
    const user = await assertPermission('imaging:review');
    if (!user.organizationId) throw new Error('No organization context');

    const imagingCase = await db.imagingCase.findUnique({ where: { id: input.id } });
    if (!imagingCase) throw new Error('Imaging case not found');
    assertSameOrg(user, imagingCase);

    const updated = await db.imagingCase.update({
      where: { id: input.id },
      data: {
        status: ImagingStatus.PROVIDER_SIGNED,
        studyStatus: 'PROVIDER_REVIEWED',
        signedById: user.id,
        signedAt: new Date(),
        providerNote: input.note ?? null,
        trend: input.trend ?? imagingCase.trend ?? null,
      },
    });

    await db.providerImagingReview.create({
      data: {
        imagingCaseId: input.id,
        providerId: user.id,
        reviewStatus: ProviderReviewStatus.SIGNED,
        providerInterpretation: input.note,
        signedAt: new Date(),
      },
    });

    await logImagingAudit({
      organizationId: user.organizationId,
      imagingCaseId: input.id,
      userId: user.id,
      action: ImagingAuditAction.PROVIDER_SIGNED,
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SIGN_OFF',
      resourceType: 'ImagingCase',
      resourceId: updated.id,
    });

    revalidateImagingViews(imagingCase.patientId, input.id, user.organizationId);
    return updated;
  },
});

export const markImagingFollowUp = action({
  schema: z.object({
    id: z.string(),
    needsFollowUp: z.boolean(),
    note: z.string().max(2000).optional().nullable(),
  }),
  async handler(input) {
    const user = await assertPermission('imaging:review');
    if (!user.organizationId) throw new Error('No organization context');

    const imagingCase = await db.imagingCase.findUnique({ where: { id: input.id } });
    if (!imagingCase) throw new Error('Imaging case not found');
    assertSameOrg(user, imagingCase);

    const updated = await db.imagingCase.update({
      where: { id: input.id },
      data: {
        needsFollowUp: input.needsFollowUp,
        followUpNote: input.needsFollowUp ? (input.note ?? null) : null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'ImagingCase',
      resourceId: updated.id,
      metadata: { event: 'imaging_follow_up_flag', needsFollowUp: input.needsFollowUp },
    });

    revalidateImagingViews(imagingCase.patientId, input.id, user.organizationId);
    return updated;
  },
});

export const submitProviderVerification = action({
  schema: z.object({
    id: z.string(),
    agrees: z.boolean(),
    partiallyAgrees: z.boolean().optional(),
    providerNote: z.string().max(2000).optional().nullable(),
    patientSummary: z.string().max(2000).optional().nullable(),
    followUpPlan: z.string().max(2000).optional().nullable(),
    referralNeeded: z.boolean().default(false),
    approvePatientSummary: z.boolean().default(false),
    trend: z
      .enum(['baseline', 'stable', 'improved', 'subtle-change', 'concern-noted'])
      .optional(),
  }),
  async handler(input) {
    const user = await assertPermission('imaging:review');
    if (!user.organizationId) throw new Error('No organization context');

    const imagingCase = await db.imagingCase.findUnique({ where: { id: input.id } });
    if (!imagingCase) throw new Error('Imaging case not found');
    assertSameOrg(user, imagingCase);

    const reviewStatus = input.partiallyAgrees
      ? ProviderReviewStatus.PARTIALLY_AGREED
      : input.agrees
        ? ProviderReviewStatus.AGREED
        : ProviderReviewStatus.DISAGREED;

    const providerNote = [
      input.agrees ? 'Provider agrees with review-support output.' : input.partiallyAgrees ? 'Provider partially agrees.' : 'Provider disagrees with review-support output.',
      input.providerNote ?? '',
      input.referralNeeded ? 'Referral indicated.' : '',
      input.followUpPlan ? `Follow-up: ${input.followUpPlan}` : '',
    ].filter(Boolean).join('\n');

    const updated = await db.imagingCase.update({
      where: { id: input.id },
      data: {
        status: ImagingStatus.PROVIDER_SIGNED,
        studyStatus: input.approvePatientSummary ? 'PATIENT_SUMMARY_APPROVED' : 'PROVIDER_REVIEWED',
        signedById: user.id,
        signedAt: new Date(),
        providerNote,
        patientSummary: input.patientSummary ?? null,
        patientSummaryApprovedAt: input.approvePatientSummary ? new Date() : null,
        trend: input.trend ?? imagingCase.trend ?? null,
      },
    });

    await db.providerImagingReview.create({
      data: {
        imagingCaseId: input.id,
        providerId: user.id,
        reviewStatus,
        agreesWithAI: input.agrees,
        providerInterpretation: input.providerNote,
        followUpPlan: input.followUpPlan,
        referralPlan: input.referralNeeded ? 'Referral indicated by provider' : null,
        patientSummary: input.patientSummary,
        signedAt: new Date(),
      },
    });

    await logImagingAudit({
      organizationId: user.organizationId,
      imagingCaseId: input.id,
      userId: user.id,
      action: input.approvePatientSummary
        ? ImagingAuditAction.PATIENT_SUMMARY_APPROVED
        : ImagingAuditAction.PROVIDER_SIGNED,
    });

    revalidateImagingViews(imagingCase.patientId, input.id, user.organizationId);
    return updated;
  },
});
