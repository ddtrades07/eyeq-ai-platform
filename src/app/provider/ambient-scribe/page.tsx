import Link from 'next/link';
import { Mic, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { NewScribeSessionButton } from '@/components/scribe/new-session-button';

export const metadata = { title: 'Ambient scribe' };

export default async function AmbientScribePage() {
  const user = await requireStaffUser();
  await requirePermission('scribe:use');
  if (!user.organizationId) return null;

  const sessions = await db.ambientScribeSession.findMany({
    where: { organizationId: user.organizationId, providerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { patient: true },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ambient scribe</h2>
          <p className="text-sm text-muted-foreground">
            Capture an in-room visit and generate a draft note. Audio stays in
            the browser until a real transcription provider is wired in.
          </p>
        </div>
        <NewScribeSessionButton />
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Recording requires patient consent. Follow practice policy and
          applicable law. AI-generated notes require provider review and
          sign-off.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4 text-primary" /> Recent sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState
              title="No scribe sessions yet"
              description="Start a new session above. Sessions stay private to you until shared."
            />
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">
                      {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : 'No patient linked'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(s.createdAt)} · {Math.round(s.durationSeconds / 60)} min
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.reviewStatus === 'READY_FOR_REVIEW' ? (
                      <Badge variant="warning">needs review</Badge>
                    ) : s.reviewStatus === 'APPROVED' ? (
                      <Badge variant="success">approved</Badge>
                    ) : null}
                    <Badge variant={badgeVariant(s.status)}>{s.status.toLowerCase()}</Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/provider/ambient-scribe/${s.id}`}>Open</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function badgeVariant(status: string) {
  if (status === 'READY') return 'success' as const;
  if (status === 'RECORDING') return 'info' as const;
  if (status === 'STOPPED' || status === 'PAUSED' || status === 'TRANSCRIBING') return 'warning' as const;
  return 'outline' as const;
}
