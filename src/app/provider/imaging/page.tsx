import Link from 'next/link';
import { ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { ImagingActions } from '@/components/imaging/imaging-actions';
import { UploadImagingDialog } from '@/components/imaging/upload-imaging-dialog';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/auth/rbac';
import { formatDateTime, formatFullName } from '@/lib/utils';
import { resolveActiveLocationId } from '@/lib/location/server';

export const metadata = { title: 'Imaging' };

export default async function ImagingPage() {
  const user = await requirePermission('imaging:read');
  if (!user.organizationId) return null;

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const canReview = hasPermission(user.role, 'imaging:review');
  const canUpload = hasPermission(user.role, 'imaging:upload');

  const [cases, patients] = await Promise.all([
    db.imagingCase.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(locationId ? { locationId } : {}),
      },
      orderBy: { capturedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        imageType: true,
        laterality: true,
        studyStatus: true,
        status: true,
        aiUrgency: true,
        capturedAt: true,
        needsFollowUp: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    canUpload
      ? db.patient.findMany({
          where: { organizationId: user.organizationId, archivedAt: null },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { lastName: 'asc' },
          take: 100,
        })
      : Promise.resolve([] as { id: string; firstName: string; lastName: string }[]),
  ]);

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="imaging" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Imaging</h2>
          <p className="text-sm text-muted-foreground">
            Latest uploads. AI signals are surfaced for clinician verification.
          </p>
        </div>
        {canUpload ? <UploadImagingDialog patients={patients} /> : null}
      </div>
      <SafetyDisclaimer />
      {cases.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No imaging captured yet"
          description={
            canUpload
              ? 'Use “Upload imaging” to add a fundus, OCT, VF, slit-lamp or external photo.'
              : 'Imaging uploaded from a patient chart will appear here.'
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Link
                      href={`/provider/imaging/${c.id}`}
                      className="hover:underline"
                    >
                      {formatFullName(c.patient.firstName, c.patient.lastName)}
                    </Link>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={c.status === 'PROVIDER_SIGNED' ? 'success' : 'info'}>
                      {c.status.replace('_', ' ')}
                    </Badge>
                    {c.aiUrgency ? (
                      <Badge variant={c.aiUrgency === 'routine' ? 'secondary' : 'warning'}>
                        AI: {c.aiUrgency}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.imageType.replace('_', ' ')} · {formatDateTime(c.capturedAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Open the viewer for full study details and AI image analysis for provider review.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/provider/imaging/${c.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open viewer →
                  </Link>
                  <ImagingActions
                    imagingCaseId={c.id}
                    isSigned={c.status === 'PROVIDER_SIGNED'}
                    canReview={canReview}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
