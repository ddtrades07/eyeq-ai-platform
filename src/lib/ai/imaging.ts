import 'server-only';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import { getAIProvider, type ImagingReviewSignals } from '@/lib/ai';

/**
 * Runs the active AI provider against an imaging case and persists the
 * structured signals to the database. Always idempotent, re-running
 * overwrites the previous AI block. Sign-off remains a separate manual
 * provider action.
 */
export async function runImagingReview(
  imagingCaseId: string,
  ctx: { organizationId: string; userId: string },
): Promise<ImagingReviewSignals> {
  const provider = getAIProvider();

  const imagingCase = await db.imagingCase.findUnique({
    where: { id: imagingCaseId },
    include: { patient: true },
  });
  if (!imagingCase) throw new Error('Imaging case not found');
  if (imagingCase.organizationId !== ctx.organizationId) {
    throw new Error('Cross-tenant access denied');
  }

  const patientContext = [
    imagingCase.patient.hasDiabetes ? 'diabetic' : null,
    imagingCase.patient.hasHypertension ? 'hypertensive' : null,
    imagingCase.patient.hasGlaucomaPersonal ? 'history of glaucoma' : null,
    imagingCase.patient.hasGlaucomaFamily ? 'family history of glaucoma' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const signals = await provider.reviewImaging({
    imageType: imagingCase.imageType,
    patientContext,
    storageUrl: imagingCase.storagePath,
  });

  await db.imagingCase.update({
    where: { id: imagingCaseId },
    data: {
      status: 'AI_REVIEWED',
      aiQuality: signals.quality,
      aiAnatomyDetected: signals.anatomyDetected,
      aiFlags: signals.flags,
      aiUrgency: signals.urgency,
      aiConfidence: signals.confidence,
      aiNotes: signals.notes,
      aiInvokedAt: new Date(),
      aiProvider: provider.name,
    },
  });

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: 'AI_INVOCATION',
    resourceType: 'ImagingCase',
    resourceId: imagingCaseId,
    metadata: { provider: provider.name, urgency: signals.urgency },
  });

  return signals;
}
