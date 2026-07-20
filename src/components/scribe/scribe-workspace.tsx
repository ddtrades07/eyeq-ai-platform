'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic, Square, PauseCircle, Plus, Sparkles, Loader2,
  ShieldAlert, CheckCircle2, AlertTriangle, Pencil, RotateCcw, XCircle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ScribeSessionStatus, ScribeSpeaker, ScribeReviewStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  appendTranscriptSegment,
  generateScribeArtifacts,
  requestScribeAudioUpload,
  setScribeStatus,
  transcribeScribeAudio,
  updateTranscriptSegment,
  updateScribeArtifacts,
  approveScribeNote,
  rejectScribeNote,
} from '@/server/actions/scribe';

type Segment = { id: string; speaker: ScribeSpeaker; text: string; startMs: number };
type Generated = { soap: string | null; plan: string | null; referral: string | null; coding: string[] };
export type StructuredNote = {
  chiefComplaint: string | null;
  hpi: string | null;
  examSummary: string | null;
  assessmentText: string | null;
  planText: string | null;
  patientInstructions: string | null;
  followUpRecommendation: string | null;
};

const SECTION_LABELS: { key: keyof StructuredNote; label: string }[] = [
  { key: 'chiefComplaint', label: 'Chief complaint' },
  { key: 'hpi', label: 'HPI' },
  { key: 'examSummary', label: 'Exam summary' },
  { key: 'assessmentText', label: 'Assessment' },
  { key: 'planText', label: 'Plan' },
  { key: 'patientInstructions', label: 'Patient instructions' },
  { key: 'followUpRecommendation', label: 'Follow-up recommendation' },
];

export function ScribeWorkspace({
  id, status, segments, generated, structured, reviewStatus, aiConfidenceScore,
  savedNoteId, patientId, transcriptionConfigured = false, demoMode = false,
}: {
  id: string;
  status: ScribeSessionStatus;
  segments: Segment[];
  generated: Generated;
  structured: StructuredNote;
  reviewStatus: ScribeReviewStatus;
  aiConfidenceScore: number | null;
  savedNoteId: string | null;
  patientId: string | null;
  transcriptionConfigured?: boolean;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [speaker, setSpeaker] = React.useState<ScribeSpeaker>('PROVIDER');
  const [draft, setDraft] = React.useState('');
  const [micState, setMicState] = React.useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [consentAcknowledged, setConsentAcknowledged] = React.useState(false);
  const [providerReviewed, setProviderReviewed] = React.useState(false);
  const [editingSegmentId, setEditingSegmentId] = React.useState<string | null>(null);
  const [segmentDraft, setSegmentDraft] = React.useState('');
  const [sections, setSections] = React.useState<StructuredNote>(structured);
  const [sectionsDirty, setSectionsDirty] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  React.useEffect(() => {
    setSections(structured);
    setSectionsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    structured.chiefComplaint, structured.hpi, structured.examSummary,
    structured.assessmentText, structured.planText,
    structured.patientInstructions, structured.followUpRecommendation,
  ]);

  const isApproved = reviewStatus === 'APPROVED';
  const isRejected = reviewStatus === 'REJECTED';

  async function requestMic() {
    setMicState('pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState('granted');
    } catch {
      setMicState('denied');
      toast.message('Microphone permission not granted. Use manual entry or Mock fill.');
    }
  }

  function appendSegment(spk: ScribeSpeaker, text: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const r = await appendTranscriptSegment({ sessionId: id, speaker: spk, text });
        if (!r.ok) toast.error(r.error);
        resolve();
      });
    });
  }

  function setStatusFn(next: ScribeSessionStatus) {
    startTransition(async () => {
      const r = await setScribeStatus({ id, status: next });
      if (!r.ok) { toast.error(r.error); return; }
      router.refresh();
    });
  }

  async function startRecording() {
    if (!consentAcknowledged) {
      toast.error('You must acknowledge the consent warning before recording.');
      return;
    }
    if (!transcriptionConfigured) {
      toast.error('Transcription vendor is not configured.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicState('granted');
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setStatusFn('RECORDING');
    } catch {
      setMicState('denied');
      toast.message('Microphone permission not granted. Use manual entry or Demo fill.');
    }
  }

  function pauseRecording() {
    mediaRecorderRef.current?.pause();
    setStatusFn('PAUSED');
  }

  function resumeRecording() {
    mediaRecorderRef.current?.resume();
    setStatusFn('RECORDING');
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setStatusFn('STOPPED');
      return;
    }

    setTranscribing(true);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    });

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    chunksRef.current = [];

    if (blob.size === 0) {
      setTranscribing(false);
      setStatusFn('STOPPED');
      toast.error('No audio captured.');
      return;
    }

    try {
      const reservation = await requestScribeAudioUpload({
        sessionId: id,
        mimeType: blob.type || 'audio/webm',
        fileSizeBytes: blob.size,
      });
      if (!reservation.ok) throw new Error(reservation.error);

      const put = await fetch(reservation.data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
          'x-upsert': 'true',
        },
        body: blob,
      });
      if (!put.ok) throw new Error(`Upload failed (HTTP ${put.status})`);

      const transcribe = await transcribeScribeAudio({ sessionId: id });
      if (!transcribe.ok) throw new Error(transcribe.error);

      toast.success('Recording transcribed. Review segments before generating the note.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transcription failed');
      setStatusFn('STOPPED');
    } finally {
      setTranscribing(false);
    }
  }

  async function injectMockTranscript() {
    const MOCK: { speaker: ScribeSpeaker; text: string }[] = [
      { speaker: 'PROVIDER', text: 'Hi, what brings you in today?' },
      { speaker: 'PATIENT', text: 'My eyes have been burning and feel tired by the end of the day.' },
      { speaker: 'PROVIDER', text: 'How long has that been going on, and is it both eyes?' },
      { speaker: 'PATIENT', text: 'Maybe two months. Both eyes, worse on screens.' },
      { speaker: 'PROVIDER', text: 'Any drops you have been using already?' },
      { speaker: 'PATIENT', text: 'Just a generic artificial tear a few times a day.' },
      { speaker: 'TECHNICIAN', text: 'Vision today 20/20 each eye, IOP 14 and 15.' },
      { speaker: 'PROVIDER', text: 'Slit lamp shows mild meibomian gland dysfunction, fluorescein is clear of staining.' },
    ];
    for (const seg of MOCK) {
      await appendSegment(seg.speaker, seg.text);
    }
    toast.success('Mock transcript appended');
    router.refresh();
  }

  function generate() {
    startTransition(async () => {
      const r = await generateScribeArtifacts({ id });
      if (!r.ok) { toast.error(r.error); return; }
      setProviderReviewed(false);
      toast.success('Draft generated from transcript. Provider review required.');
      router.refresh();
    });
  }

  function saveSegmentEdit(segmentId: string) {
    if (!segmentDraft.trim()) return;
    startTransition(async () => {
      const r = await updateTranscriptSegment({ segmentId, text: segmentDraft.trim() });
      if (!r.ok) { toast.error(r.error); return; }
      setEditingSegmentId(null);
      toast.success('Transcript segment updated. Regenerate the note to apply changes.');
      router.refresh();
    });
  }

  function saveSections() {
    startTransition(async () => {
      const r = await updateScribeArtifacts({
        id,
        chiefComplaint: sections.chiefComplaint ?? undefined,
        hpi: sections.hpi ?? undefined,
        examSummary: sections.examSummary ?? undefined,
        assessmentText: sections.assessmentText ?? undefined,
        planText: sections.planText ?? undefined,
        patientInstructions: sections.patientInstructions ?? undefined,
        followUpRecommendation: sections.followUpRecommendation ?? undefined,
      });
      if (!r.ok) { toast.error(r.error); return; }
      setSectionsDirty(false);
      toast.success('Note sections saved');
      router.refresh();
    });
  }

  function approve() {
    startTransition(async () => {
      const r = await approveScribeNote({ id });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success('Note approved and saved to the patient chart');
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const r = await rejectScribeNote({ id });
      if (!r.ok) { toast.error(r.error); return; }
      toast.message('Draft rejected. You can regenerate or edit the transcript.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Consent acknowledgment */}
      {!consentAcknowledged && !isApproved && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Recording Consent Required
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Recording should only occur with patient consent and according to
                practice policy and applicable law. Ensure consent is documented
                before proceeding.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setConsentAcknowledged(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> I confirm consent was obtained
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approved banner */}
      {isApproved && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>This note was approved and saved to the patient chart.</span>
          </div>
          {savedNoteId && patientId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/provider/patients/${patientId}`}>
                <FileText className="h-4 w-4" /> View chart
              </Link>
            </Button>
          ) : null}
        </div>
      )}

      {!transcriptionConfigured && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Transcription not configured.</strong> Automated speech-to-text is unavailable.
            Manually enter transcript segments below. Configure an approved transcription vendor
            (with BAA) to enable recording. See docs/TRANSCRIPTION_PROVIDER_SETUP.md.
          </span>
        </div>
      )}

      {demoMode && !transcriptionConfigured && (
        <div className="flex items-center gap-2 rounded-md border bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Demo mode:</strong> Mock fill is available for testing only. Not for clinical use.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: Transcript */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Raw Transcript</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={micState === 'granted' ? 'success' : micState === 'denied' ? 'destructive' : 'outline'}>
                  Mic: {micState}
                </Badge>
                {status === 'RECORDING' ? (
                  <>
                    <Badge variant="destructive" className="animate-pulse">Recording</Badge>
                    <Button size="sm" variant="outline" onClick={pauseRecording} disabled={pending || transcribing}>
                      <PauseCircle className="h-4 w-4" /> Pause
                    </Button>
                    <Button size="sm" variant="destructive" onClick={stopRecording} disabled={pending || transcribing}>
                      {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                      {transcribing ? 'Transcribing…' : 'Stop'}
                    </Button>
                  </>
                ) : status === 'PAUSED' ? (
                  <>
                    <Badge variant="warning">Paused</Badge>
                    <Button size="sm" onClick={resumeRecording} disabled={pending || transcribing || !transcriptionConfigured}>
                      <Mic className="h-4 w-4" /> Resume
                    </Button>
                    <Button size="sm" variant="destructive" onClick={stopRecording} disabled={pending || transcribing}>
                      {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                      {transcribing ? 'Transcribing…' : 'Stop'}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={startRecording} disabled={pending || !consentAcknowledged || isApproved || !transcriptionConfigured || transcribing}>
                    <Mic className="h-4 w-4" /> Start
                  </Button>
                )}
                {demoMode && !transcriptionConfigured ? (
                  <Button size="sm" variant="outline" onClick={injectMockTranscript} disabled={pending || isApproved}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Demo fill
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {segments.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Press <strong>Start</strong> to record (requires consent), or use
                <strong> Mock fill</strong> to populate a sample transcript, or
                manually add segments below.
              </p>
            ) : (
              <ul className="space-y-1 rounded-md border bg-muted/20 p-3 text-sm">
                {segments.map((s) => (
                  <li key={s.id} className="group leading-snug">
                    {editingSegmentId === s.id ? (
                      <div className="space-y-2 py-1">
                        <Textarea
                          rows={2}
                          value={segmentDraft}
                          onChange={(e) => setSegmentDraft(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingSegmentId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveSegmentEdit(s.id)} disabled={pending}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="inline-block min-w-[80px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {s.speaker.toLowerCase()}
                        </span>
                        <span className="flex-1">{s.text}</span>
                        {!isApproved && (
                          <button
                            type="button"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => { setEditingSegmentId(s.id); setSegmentDraft(s.text); }}
                            aria-label="Edit segment"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Manual segment entry */}
            {!isApproved && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid w-32 gap-1">
                  <label className="text-xs font-medium">Speaker</label>
                  <Select value={speaker} onValueChange={(v) => setSpeaker(v as ScribeSpeaker)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROVIDER">Provider</SelectItem>
                      <SelectItem value="PATIENT">Patient</SelectItem>
                      <SelectItem value="TECHNICIAN">Technician</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add manual transcript segment"
                  className="flex-1"
                />
                <Button
                  onClick={async () => {
                    if (!draft.trim()) return;
                    await appendSegment(speaker, draft.trim());
                    setDraft('');
                    router.refresh();
                  }}
                  disabled={pending || !draft.trim()}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Generated note with provider review */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Draft Clinical Note</CardTitle>
                {generated.soap ? (
                  <Badge variant="info" className="text-[10px]">AI generated</Badge>
                ) : null}
                {aiConfidenceScore != null && generated.soap ? (
                  <Badge variant="outline" className="text-[10px]">
                    Confidence {(aiConfidenceScore * 100).toFixed(0)}%
                  </Badge>
                ) : null}
                {isRejected ? (
                  <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                ) : null}
              </div>
              {!isApproved && (
                <Button size="sm" variant="outline" onClick={generate} disabled={pending || segments.length === 0}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generated.soap ? 'Regenerate' : 'Generate'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              EyeQ AI assists with documentation only. Provider review and approval are required.
            </p>
            {!generated.soap ? (
              <p className="text-sm text-muted-foreground">
                No draft yet. Add transcript segments, then press <strong>Generate</strong> to
                create a note from the transcript only.
              </p>
            ) : (
              <>
                <Tabs defaultValue="sections">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sections">Note</TabsTrigger>
                    <TabsTrigger value="soap">Full SOAP</TabsTrigger>
                    <TabsTrigger value="referral">Referral</TabsTrigger>
                    <TabsTrigger value="coding">Coding</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sections" className="space-y-3">
                    {SECTION_LABELS.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-semibold">{label}</label>
                        {isApproved ? (
                          <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-2 font-sans text-sm">
                            {sections[key] || 'Not documented'}
                          </pre>
                        ) : (
                          <Textarea
                            rows={2}
                            value={sections[key] ?? ''}
                            onChange={(e) => {
                              setSections((prev) => ({ ...prev, [key]: e.target.value }));
                              setSectionsDirty(true);
                            }}
                            className="text-sm"
                          />
                        )}
                      </div>
                    ))}
                    {!isApproved && sectionsDirty && (
                      <Button size="sm" onClick={saveSections} disabled={pending}>
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save edits
                      </Button>
                    )}
                  </TabsContent>
                  <TabsContent value="soap">
                    <NoteSection value={generated.soap} />
                  </TabsContent>
                  <TabsContent value="referral">
                    <NoteSection value={generated.referral} />
                  </TabsContent>
                  <TabsContent value="coding">
                    {generated.coding.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No coding suggestions.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {generated.coding.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Quality checklist */}
                <QualityChecklist text={generated.soap ?? ''} />

                {/* Provider review section */}
                {!isApproved && (
                  <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-indigo-900">
                      Provider Review Required
                    </p>
                    <p className="text-[10px] text-indigo-800">
                      Do not approve this note unless you have reviewed it for
                      clinical accuracy. All sections are generated from the transcript
                      only. Verify completeness before saving.
                    </p>
                    {!patientId && (
                      <p className="text-[10px] font-medium text-amber-700">
                        This session is not linked to a patient. Link a patient to save
                        the note to a chart.
                      </p>
                    )}
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={providerReviewed}
                        onChange={(e) => setProviderReviewed(e.target.checked)}
                        className="rounded border-indigo-300"
                      />
                      I have reviewed this note and confirm it is clinically accurate.
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={!providerReviewed || pending || !patientId} onClick={approve}>
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve and save to chart
                      </Button>
                      <Button size="sm" variant="outline" onClick={reject} disabled={pending}>
                        <XCircle className="h-4 w-4" /> Reject draft
                      </Button>
                      <Button size="sm" variant="ghost" onClick={generate} disabled={pending}>
                        <RotateCcw className="h-4 w-4" /> Regenerate
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NoteSection({ value }: { value: string | null }) {
  if (!value) return <p className="text-sm text-muted-foreground">No content generated.</p>;
  return (
    <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 font-sans text-sm leading-relaxed">
      {value}
    </pre>
  );
}

function QualityChecklist({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const checks = [
    { label: 'Visual acuity', found: !!lower.match(/20\/\d+|acuity/) },
    { label: 'IOP', found: !!lower.match(/iop|\d+\s*and\s*\d+/) },
    { label: 'Assessment', found: !lower.includes('assessment') || !lower.includes('not stated') },
    { label: 'Plan', found: !lower.includes('plan') || !lower.includes('not documented in transcript') },
    { label: 'Follow-up', found: !!lower.match(/follow.?up|return|come back/) },
  ];
  const allGood = checks.every((c) => c.found);

  return (
    <div className="rounded-md border bg-gray-50 p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Quality Checklist
      </p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.found
              ? <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              : <AlertTriangle className="h-3 w-3 text-amber-500" />}
            <span className={c.found ? 'text-foreground' : 'text-amber-700 font-medium'}>
              {c.label}: {c.found ? 'Documented' : 'Missing'}
            </span>
          </div>
        ))}
      </div>
      {!allGood && (
        <p className="mt-1.5 text-[10px] text-amber-700">
          Missing items should be completed by the provider before signing.
        </p>
      )}
    </div>
  );
}
