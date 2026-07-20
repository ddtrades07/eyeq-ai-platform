import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { resolveImagingStorageUrl } from '@/lib/imaging/resolve-storage-url';
import { serverEnv } from '@/lib/env';
import { formatDateTime, formatFullName } from '@/lib/utils';

export const metadata = { title: 'Compare scans' };

export default async function ImagingComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('imaging:read');
  if (!user.organizationId) return null;
  const { id } = await params;

  const current = await db.imagingCase.findUnique({
    where: { id },
    include: { patient: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!current) notFound();
  assertSameOrg(user, current);

  const prior = await db.imagingCase.findFirst({
    where: {
      patientId: current.patientId,
      imageType: current.imageType,
      laterality: current.laterality,
      id: { not: current.id },
      capturedAt: { lt: current.capturedAt },
      archivedAt: null,
    },
    orderBy: { capturedAt: 'desc' },
  });

  const [currentUrl, priorUrl] = await Promise.all([
    resolveImagingStorageUrl(current.storagePath, current.imageType, serverEnv.storageBucketImaging),
    prior
      ? resolveImagingStorageUrl(prior.storagePath, prior.imageType, serverEnv.storageBucketImaging)
      : Promise.resolve(null),
  ]);

  const patientName = formatFullName(current.patient.firstName, current.patient.lastName);
  const modalityLabel = current.imageType.replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <Link
        href={`/provider/imaging/${current.id}`}
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' -ml-2'}
      >
        <ArrowLeft className="h-4 w-4" /> Back to study
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Compare scans</h2>
        <p className="text-sm text-muted-foreground">
          {patientName} · {modalityLabel} · {current.laterality}
        </p>
      </div>

      {!prior ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No prior scan of this type and eye is on file for this patient.
          </CardContent>
        </Card>
      ) : (
        <>
          {current.trend ? (
            <Card className="border-sky-200/60 bg-sky-50/50">
              <CardContent className="py-3 text-sm text-sky-950">
                <span className="font-medium">Comparison summary:</span>{' '}
                {current.trend === 'mild change'
                  ? 'Mild change noted compared with the prior study. Review side by side before finalizing the plan.'
                  : current.trend === 'baseline'
                    ? 'Baseline study on file for future comparison.'
                    : `Trend noted: ${current.trend}.`}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { label: 'Prior', item: prior, url: priorUrl },
              { label: 'Current', item: current, url: currentUrl },
            ].map(({ label, item, url }) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{label} study</CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={label === 'Current' ? 'info' : 'outline'}>
                        {item.laterality}
                      </Badge>
                      <Badge variant="secondary">{formatDateTime(item.capturedAt)}</Badge>
                      {item.status === 'PROVIDER_SIGNED' ? (
                        <Badge variant="success">Provider reviewed</Badge>
                      ) : (
                        <Badge variant="warning">Awaiting review</Badge>
                      )}
                    </div>
                  </div>
                  {item.fileName ? (
                    <p className="text-xs text-muted-foreground">{item.fileName}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`${label} ${modalityLabel} scan`}
                      className="max-h-[420px] w-full rounded-md border bg-black object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                      Image preview not available
                    </div>
                  )}
                  {item.providerNote ? (
                    <div className="rounded-md border bg-muted/40 p-3 text-xs">
                      <p className="font-medium text-foreground">Provider interpretation</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {item.providerNote}
                      </p>
                    </div>
                  ) : item.aiNotes.length > 0 ? (
                    <div className="rounded-md border bg-muted/40 p-3 text-xs">
                      <p className="font-medium text-foreground">Review notes</p>
                      <ul className="mt-1 list-inside list-disc text-muted-foreground">
                        {item.aiNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <Link
                    href={`/provider/imaging/${item.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Open full study viewer
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {current.providerNote ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current study interpretation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                {current.providerNote}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Side by side comparison is for provider reference. Changes between scans must be
        interpreted by a qualified eye care provider. Demo images are fictional and not from real
        patients.
      </p>
    </div>
  );
}
