import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Brain, CalendarDays, FileText, ImageIcon, MessageSquare, Mic, Pill, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AppointmentStatusBadge } from '@/components/appointments/status-badge';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { UploadImagingDialog } from '@/components/imaging/upload-imaging-dialog';
import { ClinicalMemoryCards } from '@/components/intelligence/clinical-memory';
import { FollowUpRiskCard } from '@/components/intelligence/followup-risk';
import { FlagList } from '@/components/intelligence/flag-card';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { TrackRecentPatient } from '@/components/patients/track-recent-patient';
import { PatientCommunicationCard } from '@/components/patients/communication-consent-card';
import { NewScribeSessionButton } from '@/components/scribe/new-session-button';
import { NewClinicalNoteDialog } from '@/components/notes/clinical-note-dialogs';
import {
  NewPrescriptionDialog,
  PrescriptionActions,
} from '@/components/prescriptions/prescription-dialogs';
import { KV } from '@/components/ui/kv';
import { requirePermission, assertSameOrg } from '@/lib/auth/require';
import { hasPermission, canApproveAIOutput } from '@/lib/auth/rbac';
import { computePatientIntelligence } from '@/lib/intelligence/patient';
import { calculateAge, formatDate, formatDateTime, formatFullName } from '@/lib/utils';
import { PatientNotesTab } from '@/components/patients/patient-notes-tab';
import { getPatientChartOverview } from '@/server/queries/patient-chart';

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('patients:read');
  if (!user.organizationId) return null;
  const { id } = await params;

  const patient = await getPatientChartOverview(user.organizationId, id);
  if (!patient) notFound();
  assertSameOrg(user, patient);

  const fullName = formatFullName(patient.firstName, patient.lastName);
  const canUploadImaging = hasPermission(user.role, 'imaging:upload');
  const canWriteNotes = hasPermission(user.role, 'notes:write');
  const canSignNotes = hasPermission(user.role, 'notes:sign');
  const canWriteRx = hasPermission(user.role, 'rx:write');
  const canSeeIntelligence = hasPermission(user.role, 'intelligence:read');
  const intelligence = canSeeIntelligence
    ? await computePatientIntelligence(patient.id, user.organizationId, {
        patient: patient as never,
        appointments: patient.appointments as never,
        imaging: patient.imagingCases as never,
        notes: patient.clinicalNotes as never,
        prescriptions: patient.prescriptions as never,
        careGaps: patient.careGaps as never,
      })
    : null;
  const patientOption = [
    { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
  ];
  const cls = patient.prescriptions.filter((p) => p.type === 'CONTACTS');
  const glasses = patient.prescriptions.filter((p) => p.type === 'GLASSES');

  const openCareGaps = patient.careGaps.filter(
    (g) => g.status !== 'BOOKED' && g.status !== 'DISMISSED',
  ).length;
  const pendingScribe = patient.scribeSessions.filter(
    (s) => s.reviewStatus === 'READY_FOR_REVIEW',
  ).length;
  const pendingImaging = patient.imagingCases.filter(
    (i) => i.studyStatus === 'AWAITING_PROVIDER_REVIEW' || i.studyStatus === 'ANALYSIS_COMPLETE',
  ).length;
  const todayAppt = patient.appointments.find(
    (a) =>
      a.startsAt >= new Date(new Date().setHours(0, 0, 0, 0)) &&
      a.startsAt < new Date(new Date().setHours(23, 59, 59, 999)) &&
      a.status !== 'CANCELLED' &&
      a.status !== 'COMPLETED',
  );

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="patient_chart" patientId={patient.id} patientName={fullName} />
      <TrackRecentPatient id={patient.id} name={`${patient.firstName} ${patient.lastName}`} />

      <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 px-2">
              <Link href="/provider/patients">
                <ArrowLeft className="h-4 w-4" /> Patients
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {calculateAge(patient.dateOfBirth)} y/o · DOB {formatDate(patient.dateOfBirth)}
              {patient.phone ? ` · ${patient.phone}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {patient.hasDiabetes ? <Badge variant="warning">DM</Badge> : null}
              {patient.hasHypertension ? <Badge variant="warning">HTN</Badge> : null}
              {patient.hasGlaucomaPersonal ? <Badge variant="warning">Glaucoma</Badge> : null}
              {patient.hasGlaucomaFamily ? <Badge variant="info">Glaucoma FH</Badge> : null}
              {patient.isSmoker ? <Badge variant="destructive">Smoker</Badge> : null}
            </div>
          </div>
            <div className="flex flex-wrap gap-2">
            {hasPermission(user.role, 'appointments:create') ||
            hasPermission(user.role, 'appointments:update') ? (
              <Button asChild size="sm">
                <Link
                  href={
                    todayAppt?.encounter?.id
                      ? `/provider/encounters/${todayAppt.encounter.id}/exam`
                      : '/provider/patient-flow'
                  }
                >
                  <ClipboardList className="mr-1 h-4 w-4" /> Start encounter
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'appointments:read') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/provider/appointments">
                  <CalendarDays className="mr-1 h-4 w-4" /> Schedule
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'messages:send') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/provider/messages">
                  <MessageSquare className="mr-1 h-4 w-4" /> Send message
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'templates:read') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/provider/eye-health-library">
                  Eye Health Library
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'optical:order') || hasPermission(user.role, 'optical:sell') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/provider/optical">
                  Create optical order
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'billing:manage') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/provider/billing">
                  Create invoice draft
                </Link>
              </Button>
            ) : null}
            {hasPermission(user.role, 'scribe:use') ? (
              <NewScribeSessionButton patientId={patient.id} />
            ) : null}
            {canUploadImaging ? (
              <UploadImagingDialog patients={patientOption} defaultPatientId={patient.id} />
            ) : null}
            {canWriteNotes ? (
              <NewClinicalNoteDialog
                patientId={patient.id}
                appointmentId={todayAppt?.id}
              />
            ) : null}
            {canWriteRx ? <NewPrescriptionDialog patientId={patient.id} /> : null}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {intelligence ? (
            <TabsTrigger value="memory">
              <Brain className="mr-1 h-3.5 w-3.5" /> Memory
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="notes">Clinical notes</TabsTrigger>
          <TabsTrigger value="scribe">Scribe</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="cl">Contact lenses</TabsTrigger>
          <TabsTrigger value="caregaps">Care gaps</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="visits">Visit summaries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <PatientCommunicationCard
              patientId={patient.id}
              pref={
                patient.communicationPref
                  ? {
                      smsOptIn: patient.communicationPref.smsOptIn,
                      emailOptIn: patient.communicationPref.emailOptIn,
                      portalOptIn: patient.communicationPref.portalOptIn,
                      preferredChannel: patient.communicationPref.preferredChannel,
                      optOutAt: patient.communicationPref.optOutAt?.toISOString() ?? null,
                    }
                  : null
              }
              canEdit={hasPermission(user.role, 'reminders:manage')}
            />
            <Card>
              <CardHeader><CardTitle className="text-base">Today</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {todayAppt ? (
                  <>
                    <KV k="Visit" v={humanize(todayAppt.type)} />
                    <KV k="Time" v={formatDateTime(todayAppt.startsAt)} />
                    <AppointmentStatusBadge status={todayAppt.status} />
                  </>
                ) : (
                  <p className="text-muted-foreground">No visit scheduled today.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <KV k="Open care gaps" v={String(openCareGaps)} />
                {canApproveAIOutput(user.role) ? (
                  <>
                    <KV k="Scribe pending review" v={String(pendingScribe)} />
                    <KV k="Imaging pending review" v={String(pendingImaging)} />
                  </>
                ) : null}
                <KV k="Unread threads" v={String(patient.messageThreads.length)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Clinical snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <KV
                  k="Last visit"
                  v={
                    patient.appointments.find((a) => a.status === 'COMPLETED')
                      ? formatDate(
                          patient.appointments.find((a) => a.status === 'COMPLETED')!.startsAt,
                        )
                      : '-'
                  }
                />
                <KV
                  k="Latest imaging"
                  v={
                    patient.imagingCases[0]
                      ? formatDate(patient.imagingCases[0].capturedAt)
                      : '-'
                  }
                />
                <KV
                  k="Latest Rx"
                  v={patient.prescriptions[0] ? formatDate(patient.prescriptions[0].issuedAt) : '-'}
                />
                <KV k="Insurance" v={patient.insuranceCarrier ?? '-'} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {intelligence ? (
          <TabsContent value="memory" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-4 w-4 text-primary" /> EyeQ Clinical
                    Memory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="space-y-1">
                    {intelligence.summary.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Heuristic signals · provider review recommended · no
                    diagnosis is asserted.
                  </p>
                  <Link
                    href={`/provider/timeline-intelligence/${patient.id}`}
                    className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open full Timeline Intelligence →
                  </Link>
                </CardContent>
              </Card>
              <FollowUpRiskCard risk={intelligence.followUpRisk} />
            </div>

            {intelligence.providerAttentionAreas.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Provider attention areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FlagList
                    flags={intelligence.providerAttentionAreas}
                    emptyMessage="No priority items right now."
                  />
                </CardContent>
              </Card>
            ) : null}

            <ClinicalMemoryCards memory={intelligence.clinicalMemory} />

            {intelligence.suggestedQuestions.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Questions to revisit at next visit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-sm">
                    {intelligence.suggestedQuestions.map((q, i) => (
                      <li key={i}>
                        {i + 1}. {q}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        ) : null}

        <TabsContent value="appointments">
          {patient.appointments.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No appointments yet" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {patient.appointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium">{humanize(a.type)}</div>
                        <div className="text-muted-foreground">
                          {formatDateTime(a.startsAt)}
                          {a.provider?.user
                            ? ` · ${formatFullName(a.provider.user.firstName, a.provider.user.lastName)}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AppointmentStatusBadge status={a.status} />
                        {a.encounter ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/provider/encounters/${a.encounter.id}/exam`}>
                              Exam chart
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <PatientNotesTab
            organizationId={user.organizationId}
            patientId={patient.id}
            appointmentId={todayAppt?.id}
            canWriteNotes={canWriteNotes}
            canSignNotes={canSignNotes}
            mode="all"
          />
        </TabsContent>

        <TabsContent value="scribe">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              EyeQ AI assists with documentation only. Provider review and approval are required.
            </p>
            {hasPermission(user.role, 'scribe:use') ? (
              <NewScribeSessionButton patientId={patient.id} />
            ) : null}
          </div>
          {patient.scribeSessions.length === 0 ? (
            <EmptyState
              icon={Mic}
              title="No scribe sessions yet"
              description="Start a session to record the visit and generate a draft note."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {patient.scribeSessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatDateTime(s.createdAt)}
                          {s.provider
                            ? ` · ${formatFullName(s.provider.firstName, s.provider.lastName)}`
                            : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.chiefComplaint
                            ? s.chiefComplaint.slice(0, 90)
                            : 'No note generated yet'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            s.reviewStatus === 'APPROVED'
                              ? 'success'
                              : s.reviewStatus === 'READY_FOR_REVIEW'
                                ? 'warning'
                                : s.reviewStatus === 'REJECTED'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {s.reviewStatus.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/provider/ambient-scribe/${s.id}`}>Open</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="imaging">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SafetyDisclaimer className="flex-1" />
            {canUploadImaging ? (
              <UploadImagingDialog
                patients={patientOption}
                defaultPatientId={patient.id}
                buttonLabel="Upload"
              />
            ) : null}
          </div>
          {patient.imagingCases.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No imaging on file"
              description={
                canUploadImaging
                  ? 'Click “Upload” above to add fundus, OCT, VF, slit-lamp or external photos for this patient.'
                  : undefined
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {patient.imagingCases.map((img) => (
                <Card key={img.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      <Link href={`/provider/imaging/${img.id}`} className="hover:underline">
                        {img.imageType.replace('_', ' ')}
                      </Link>
                    </CardTitle>
                    <div className="flex gap-2 text-xs">
                      <Badge variant={img.status === 'PROVIDER_SIGNED' ? 'success' : 'info'}>
                        {humanize(img.status)}
                      </Badge>
                      {img.aiUrgency ? (
                        <Badge variant={img.aiUrgency === 'routine' ? 'secondary' : 'warning'}>
                          AI: {img.aiUrgency}
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground">{formatDateTime(img.capturedAt)}</p>
                    {img.aiUrgency ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        AI draft urgency: {img.aiUrgency} · open viewer for review-support details
                      </p>
                    ) : null}
                    <Link
                      href={`/provider/imaging/${img.id}`}
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Open viewer →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions">
          <div className="mb-3 flex justify-end">
            {canWriteRx ? (
              <NewPrescriptionDialog patientId={patient.id} defaultType="GLASSES" />
            ) : null}
          </div>
          <RxList
            rxs={glasses}
            kind="Glasses"
            canWrite={canWriteRx}
            canSign={canSignNotes}
          />
        </TabsContent>
        <TabsContent value="cl">
          <div className="mb-3 flex justify-end">
            {canWriteRx ? (
              <NewPrescriptionDialog patientId={patient.id} defaultType="CONTACTS" />
            ) : null}
          </div>
          <RxList
            rxs={cls}
            kind="Contacts"
            canWrite={canWriteRx}
            canSign={canSignNotes}
          />
        </TabsContent>

        <TabsContent value="caregaps">
          {patient.careGaps.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No care gaps tracked" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {patient.careGaps.map((g) => (
                    <li key={g.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{humanize(g.type)}</div>
                        <div className="text-xs text-muted-foreground">
                          Due {g.dueDate ? formatDate(g.dueDate) : '-'} · {g.suggestedAction ?? 'No suggested action'}
                        </div>
                      </div>
                      <Badge variant={g.status === 'OVERDUE' ? 'destructive' : 'warning'}>
                        {g.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          {patient.messageThreads.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations with this patient yet" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {patient.messageThreads.map((t) => (
                    <li key={t.id} className="px-4 py-3 text-sm">
                      <div className="font-medium">{t.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(t.updatedAt)}
                        {t.isInternal ? ' · internal note' : ''}
                      </div>
                      {t.messages[0] ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Latest activity {formatDateTime(t.messages[0].createdAt)}
                          {t.messages[0].readStatus === 'UNREAD' ? ' · unread' : ''}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {patient.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {patient.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span>{d.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(d.createdAt)} · {d.kind}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visits">
          <PatientNotesTab
            organizationId={user.organizationId}
            patientId={patient.id}
            canWriteNotes={false}
            canSignNotes={false}
            mode="signed"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RxList({
  rxs,
  kind,
  canWrite,
  canSign,
}: {
  rxs: {
    id: string;
    issuedAt: Date;
    expiresAt: Date;
    providerName: string | null;
    status?: string;
    signedAt?: Date | null;
  }[];
  kind: string;
  canWrite: boolean;
  canSign: boolean;
}) {
  if (rxs.length === 0) {
    return <EmptyState icon={Pill} title={`No ${kind.toLowerCase()} prescriptions on file`} />;
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rxs.map((r) => {
            const status = r.status ?? (r.signedAt ? 'ACTIVE' : 'DRAFT');
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{kind} Rx</div>
                  <div className="text-xs text-muted-foreground">
                    Issued {formatDate(r.issuedAt)} · expires {formatDate(r.expiresAt)}
                    {r.providerName ? ` · ${r.providerName}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      status === 'ARCHIVED' || r.expiresAt < new Date()
                        ? 'destructive'
                        : status === 'ACTIVE'
                          ? 'success'
                          : 'warning'
                    }
                  >
                    {status === 'DRAFT'
                      ? 'Draft'
                      : r.expiresAt < new Date()
                        ? 'Expired'
                        : status}
                  </Badge>
                  <PrescriptionActions
                    rxId={r.id}
                    status={status}
                    canWrite={canWrite}
                    canSign={canSign}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
