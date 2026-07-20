import { Suspense } from 'react';
import { FileText, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { KV } from '@/components/ui/kv';
import { NoteActions, NewClinicalNoteDialog } from '@/components/notes/clinical-note-dialogs';
import { listPatientNotesPage } from '@/server/queries/patient-chart';
import { formatDateTime } from '@/lib/utils';

function NotesSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

async function NotesList({
  organizationId,
  patientId,
  appointmentId,
  canWriteNotes,
  canSignNotes,
  mode,
}: {
  organizationId: string;
  patientId: string;
  appointmentId?: string;
  canWriteNotes: boolean;
  canSignNotes: boolean;
  mode: 'all' | 'signed';
}) {
  const notes = await listPatientNotesPage(organizationId, patientId, { take: 20 });
  const rows = mode === 'signed' ? notes.filter((n) => n.status === 'SIGNED') : notes;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={mode === 'signed' ? Pill : FileText}
        title={mode === 'signed' ? 'No signed visit summaries' : 'No clinical notes yet'}
        description={
          mode === 'signed'
            ? 'Signed clinical notes appear here as patient-facing visit summaries.'
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {mode === 'all' ? (
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Draft → review → provider sign-off. Nothing auto-signs. Showing latest {rows.length}.
          </p>
          {canWriteNotes ? (
            <NewClinicalNoteDialog patientId={patientId} appointmentId={appointmentId} />
          ) : null}
        </div>
      ) : null}
      {rows.map((n) => (
        <Card key={n.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {n.type}{' '}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </span>
                </CardTitle>
                <Badge
                  variant={
                    n.status === 'SIGNED'
                      ? 'success'
                      : n.status === 'AWAITING_SIGNOFF'
                        ? 'info'
                        : 'warning'
                  }
                >
                  {n.status}
                </Badge>
              </div>
              {mode === 'all' ? (
                <NoteActions
                  noteId={n.id}
                  status={n.status}
                  canWrite={canWriteNotes}
                  canSign={canSignNotes}
                  initial={{
                    type: n.type,
                    chiefComplaint: n.chiefComplaint ?? '',
                    subjective: n.subjective ?? '',
                    objective: n.objective ?? '',
                    assessment: n.assessment ?? '',
                    plan: n.plan ?? '',
                  }}
                />
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {n.chiefComplaint ? <KV k="Chief complaint" v={n.chiefComplaint} /> : null}
            {mode === 'all' && n.subjective ? <KV k="Subjective" v={n.subjective} /> : null}
            {mode === 'all' && n.objective ? <KV k="Objective" v={n.objective} /> : null}
            {n.assessment ? <KV k="Assessment" v={n.assessment} /> : null}
            {n.plan ? <KV k="Plan" v={n.plan} /> : null}
            {mode === 'all' && n.legacySummary ? <KV k="Additional" v={n.legacySummary} /> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PatientNotesTab(props: {
  organizationId: string;
  patientId: string;
  appointmentId?: string;
  canWriteNotes: boolean;
  canSignNotes: boolean;
  mode?: 'all' | 'signed';
}) {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NotesList {...props} mode={props.mode ?? 'all'} />
    </Suspense>
  );
}
