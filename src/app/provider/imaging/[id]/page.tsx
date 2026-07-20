import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ImagingViewer } from '@/components/imaging/imaging-viewer';
import { ImagingCaseActions } from '@/components/imaging/imaging-case-actions';
import { StructuredReviewActions } from '@/components/imaging/structured-review-actions';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { IMAGING_SAFETY_DISCLAIMER, MANUAL_REVIEW_MESSAGE } from '@/lib/imaging/constants';
import { buildStructuredReviewFromDb } from '@/lib/imaging/build-review-from-db';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { isDemoImagingPath, resolveDemoImagingUrl } from '@/lib/demo/imaging-placeholders';
import { db } from '@/lib/db';
import { getSignedDownloadUrl } from '@/lib/storage/upload';
import { serverEnv } from '@/lib/env';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Imaging case' };

export default async function ImagingViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('imaging:read');
  if (!user.organizationId) return null;
  const { id } = await params;

  const imagingCase = await db.imagingCase.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, hasDiabetes: true, hasHypertension: true, hasGlaucomaPersonal: true, hasGlaucomaFamily: true, isSmoker: true, dateOfBirth: true } },
      uploader: { select: { firstName: true, lastName: true, role: true } },
      signedBy: { select: { firstName: true, lastName: true } },
      qualityAssessments: { orderBy: { createdAt: 'desc' }, take: 1 },
      analyses: { orderBy: { createdAt: 'desc' }, take: 1, include: { findings: true } },
      providerReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!imagingCase) notFound();
  assertSameOrg(user, imagingCase);

  let signedUrl: string | null = null;
  const isDemoSample = isDemoImagingPath(imagingCase.storagePath);
  if (isDemoSample) {
    signedUrl = resolveDemoImagingUrl(imagingCase.storagePath, imagingCase.imageType);
  } else if (imagingCase.storagePath && imagingCase.storagePath !== 'pending') {
    try {
      signedUrl = await getSignedDownloadUrl(
        serverEnv.storageBucketImaging,
        imagingCase.storagePath,
        60 * 10,
      );
    } catch {
      signedUrl = null;
    }
  }

  const canReview = hasPermission(user.role, 'imaging:review');
  const latestQuality = imagingCase.qualityAssessments[0];
  const latestAnalysis = imagingCase.analyses[0];
  const isDevMock = latestAnalysis?.isDevelopmentMock ?? false;
  const manualOnly =
    imagingCase.analysisMode === 'manual' ||
    (latestAnalysis?.analysisStatus === 'SKIPPED_MANUAL' && !latestAnalysis?.isDevelopmentMock);

  const qualityWarning =
    latestQuality?.grade === 'NOT_GRADABLE'
      ? 'Image quality limits assessment. Retake or manual provider review recommended. No automated clinical findings were generated.'
      : latestQuality?.retakeRecommended
        ? 'Image gradable with limitations. Interpret cautiously.'
        : null;

  const persistedReview = buildStructuredReviewFromDb(imagingCase);

  const priorCase = await db.imagingCase.findFirst({
    where: {
      patientId: imagingCase.patientId,
      imageType: imagingCase.imageType,
      laterality: imagingCase.laterality,
      id: { not: imagingCase.id },
      capturedAt: { lt: imagingCase.capturedAt },
      archivedAt: null,
    },
    orderBy: { capturedAt: 'desc' },
    select: { id: true },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/provider/imaging"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' -ml-2'}
      >
        <ArrowLeft className="h-4 w-4" /> Back to imaging
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            <Link href={`/provider/patients/${imagingCase.patient.id}`} className="hover:underline">
              {formatFullName(imagingCase.patient.firstName, imagingCase.patient.lastName)}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">
            {imagingCase.imageType.replace(/_/g, ' ')} · {imagingCase.laterality} · {formatDateTime(imagingCase.capturedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {imagingCase.needsFollowUp ? (
            <Badge variant="warning">Needs follow up</Badge>
          ) : null}
          <Badge variant={imagingCase.status === 'PROVIDER_SIGNED' ? 'success' : 'info'}>
            {imagingCase.studyStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <ImagingCaseActions
        caseId={imagingCase.id}
        needsFollowUp={imagingCase.needsFollowUp}
        followUpNote={imagingCase.followUpNote}
        priorCaseId={priorCase?.id ?? null}
        canReview={canReview}
      />

      <p className="text-xs text-muted-foreground">{IMAGING_SAFETY_DISCLAIMER}</p>

      <CopilotContextSetter page="imaging" patientId={imagingCase.patient.id} />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <ImagingViewer
              signedUrl={signedUrl}
              fileName={imagingCase.fileName}
              mimeType={imagingCase.mimeType}
              modality={imagingCase.imageType}
              laterality={imagingCase.laterality}
              capturedAt={formatDateTime(imagingCase.capturedAt)}
              studyStatus={imagingCase.studyStatus}
              qualityWarning={qualityWarning}
              analysisMode={imagingCase.analysisMode}
              isDevelopmentMock={isDevMock}
              manualReviewOnly={manualOnly}
              isDemoSample={isDemoSample}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider sign-off</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {imagingCase.signedBy ? (
              <>
                <p>Signed by {formatFullName(imagingCase.signedBy.firstName, imagingCase.signedBy.lastName)}</p>
                <p className="text-muted-foreground">
                  {imagingCase.signedAt ? formatDateTime(imagingCase.signedAt) : ''}
                </p>
                {imagingCase.providerNote ? (
                  <p className="mt-2 rounded bg-muted/50 p-2 whitespace-pre-wrap">{imagingCase.providerNote}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Awaiting provider review and sign-off.</p>
            )}
            {manualOnly && !persistedReview?.descriptiveReview ? (
              <p className="text-xs text-muted-foreground">{MANUAL_REVIEW_MESSAGE}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imaging review pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StructuredReviewActions
            imagingCaseId={imagingCase.id}
            isSigned={imagingCase.status === 'PROVIDER_SIGNED'}
            canReview={canReview}
            analysisMode={imagingCase.analysisMode}
            initialReview={persistedReview}
          />
        </CardContent>
      </Card>
    </div>
  );
}
