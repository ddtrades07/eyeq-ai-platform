import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Visit summaries' };

export default async function PortalVisits() {
  const session = await requirePortalPatient();
  const notes = await db.clinicalNote.findMany({
    where: { patientId: session.patientId, status: 'SIGNED' },
    orderBy: { signedAt: 'desc' },
  });
  const imaging = await db.imagingCase.findMany({
    where: {
      patientId: session.patientId,
      patientSummaryApprovedAt: { not: null },
      patientSummary: { not: null },
    },
    orderBy: { patientSummaryApprovedAt: 'desc' },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Visit summaries</h2>
        <p className="text-sm text-muted-foreground">
          Signed notes and provider-approved imaging summaries.
        </p>
      </div>

      <SafetyDisclaimer variant="patient" />

      {notes.length === 0 && imaging.length === 0 ? (
        <EmptyState icon={FileText} title="No completed visits yet" />
      ) : null}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {n.type}{' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {formatDate(n.signedAt ?? n.createdAt)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {n.assessment ? (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Summary
                    </div>
                    <p>{n.assessment}</p>
                  </div>
                ) : null}
                {n.plan ? (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Plan
                    </div>
                    <p>{n.plan}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {imaging.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imaging on file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {imaging.map((i) => (
              <div key={i.id} className="space-y-1 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{i.imageType.replace('_', ' ')} · {formatDate(i.patientSummaryApprovedAt ?? i.capturedAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{i.patientSummary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
