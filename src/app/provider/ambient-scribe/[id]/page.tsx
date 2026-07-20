import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { ScribeWorkspace } from '@/components/scribe/scribe-workspace';
import { isTranscriptionAvailable } from '@/lib/providers/transcription';
import { serverEnv } from '@/lib/env';

export const metadata = { title: 'Scribe session' };

export default async function ScribeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('scribe:use');
  if (!user.organizationId) return null;
  const { id } = await params;

  const session = await db.ambientScribeSession.findUnique({
    where: { id },
    include: {
      patient: true,
      appointment: true,
      segments: { orderBy: { startMs: 'asc' } },
    },
  });
  if (!session) notFound();
  assertSameOrg(user, session);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider/ambient-scribe">
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {session.patient
              ? `${session.patient.firstName} ${session.patient.lastName}`
              : 'Unattributed session'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Started {formatDateTime(session.createdAt)} · Duration{' '}
            {Math.round(session.durationSeconds / 60)} min
          </p>
        </div>
        <Badge variant="outline">{session.status.toLowerCase()}</Badge>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {isTranscriptionAvailable()
            ? 'Audio is uploaded to your private storage bucket and sent to your configured transcription vendor (BAA required). Generated notes must be reviewed and signed by the provider.'
            : 'Automated transcription is not configured. Manually enter transcript segments below. Configure TRANSCRIPTION_PROVIDER and TRANSCRIPTION_API_KEY to enable recording.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {session.consentRecorded ? (
            <Badge variant="success">Consent on file</Badge>
          ) : (
            <Badge variant="warning">Consent not recorded</Badge>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Consent text used by your practice should be added in Practice Setup
            and reviewed by your compliance counsel.
          </p>
        </CardContent>
      </Card>

      <ScribeWorkspace
        id={session.id}
        status={session.status}
        segments={session.segments.map((s) => ({
          id: s.id,
          speaker: s.speaker,
          text: s.text,
          startMs: s.startMs,
        }))}
        generated={{
          soap: session.generatedSoap,
          plan: session.generatedPlan,
          referral: session.generatedReferral,
          coding: session.generatedCoding,
        }}
        structured={{
          chiefComplaint: session.chiefComplaint,
          hpi: session.hpi,
          examSummary: session.examSummary,
          assessmentText: session.assessmentText,
          planText: session.planText,
          patientInstructions: session.patientInstructions,
          followUpRecommendation: session.followUpRecommendation,
        }}
        reviewStatus={session.reviewStatus}
        aiConfidenceScore={session.aiConfidenceScore}
        savedNoteId={session.savedNoteId}
        patientId={session.patientId}
        transcriptionConfigured={isTranscriptionAvailable()}
        demoMode={serverEnv.demoModeEnabled}
      />
    </div>
  );
}
