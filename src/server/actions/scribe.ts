'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ScribeSessionStatus, ScribeSpeaker } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { createScribeAudioUploadUrl, getSignedDownloadUrl } from '@/lib/storage/upload';
import { getTranscriptionProvider, isTranscriptionAvailable } from '@/lib/providers/transcription';
import { serverEnv } from '@/lib/env';

export const createScribeSession = action({
  schema: z.object({
    patientId: z.string().optional().nullable(),
    appointmentId: z.string().optional().nullable(),
    consentRecorded: z.boolean().default(false),
    consentBy: z.string().max(120).optional().nullable(),
  }),
  async handler(input) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');

    if (input.patientId) {
      const patient = await db.patient.findUnique({ where: { id: input.patientId } });
      if (!patient) throw new Error('Patient not found');
      assertSameOrg(user, patient);
    }

    const session = await db.ambientScribeSession.create({
      data: {
        organizationId: user.organizationId,
        providerId: user.id,
        patientId: input.patientId || null,
        appointmentId: input.appointmentId || null,
        consentRecorded: input.consentRecorded,
        consentBy: input.consentBy || null,
        status: ScribeSessionStatus.IDLE,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'AmbientScribeSession',
      resourceId: session.id,
    });

    revalidatePath('/provider/ambient-scribe');
    return session;
  },
});

export const setScribeStatus = action({
  schema: z.object({
    id: z.string(),
    status: z.nativeEnum(ScribeSessionStatus),
  }),
  async handler({ id, status }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');

    const session = await db.ambientScribeSession.findUnique({ where: { id } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);

    const now = new Date();
    const startedAt = status === 'RECORDING' && !session.startedAt ? now : session.startedAt;
    const stoppedAt =
      status === 'STOPPED' || status === 'READY' || status === 'ARCHIVED'
        ? now
        : session.stoppedAt;
    const duration =
      session.startedAt && stoppedAt
        ? Math.max(0, Math.round((stoppedAt.getTime() - session.startedAt.getTime()) / 1000))
        : session.durationSeconds;

    const updated = await db.ambientScribeSession.update({
      where: { id },
      data: { status, startedAt, stoppedAt, durationSeconds: duration },
    });

    if (status === 'RECORDING' && session.status !== 'RECORDING') {
      await audit({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'UPDATE',
        resourceType: 'AmbientScribeSession',
        resourceId: id,
        metadata: { event: 'recording_started' },
      });
    }

    revalidatePath(`/provider/ambient-scribe/${id}`);
    revalidatePath('/provider/ambient-scribe');
    return updated;
  },
});

/** Provider corrects a transcript segment before note generation. */
export const updateTranscriptSegment = action({
  schema: z.object({
    segmentId: z.string(),
    text: z.string().min(1).max(4000),
  }),
  async handler({ segmentId, text }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    const segment = await db.transcriptSegment.findUnique({
      where: { id: segmentId },
      include: { session: true },
    });
    if (!segment) throw new Error('Transcript segment not found');
    assertSameOrg(user, segment.session);
    const updated = await db.transcriptSegment.update({
      where: { id: segmentId },
      data: { text },
    });
    revalidatePath(`/provider/ambient-scribe/${segment.sessionId}`);
    return updated;
  },
});

export const appendTranscriptSegment = action({
  schema: z.object({
    sessionId: z.string(),
    speaker: z.nativeEnum(ScribeSpeaker),
    text: z.string().min(1).max(2000),
  }),
  async handler({ sessionId, speaker, text }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    const session = await db.ambientScribeSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);
    const last = await db.transcriptSegment.findFirst({
      where: { sessionId },
      orderBy: { endMs: 'desc' },
    });
    const startMs = last?.endMs ?? 0;
    const endMs = startMs + Math.max(2000, text.length * 60);
    const segment = await db.transcriptSegment.create({
      data: { sessionId, speaker, startMs, endMs, text },
    });
    revalidatePath(`/provider/ambient-scribe/${sessionId}`);
    return segment;
  },
});

export const requestScribeAudioUpload = action({
  schema: z.object({
    sessionId: z.string(),
    mimeType: z.string().default('audio/webm'),
    fileSizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
  }),
  async handler({ sessionId, mimeType, fileSizeBytes }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    if (!isTranscriptionAvailable()) {
      throw new Error('Transcription vendor is not configured');
    }
    if (!serverEnv.transcriptionBaaConfirmed) {
      throw new Error('Transcription BAA must be confirmed before uploading audio');
    }

    const session = await db.ambientScribeSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);

    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'webm';
    const signed = await createScribeAudioUploadUrl({
      organizationId: user.organizationId,
      sessionId,
      extension: ext,
    });

    await db.ambientScribeSession.update({
      where: { id: sessionId },
      data: { audioBucket: signed.bucket, audioPath: signed.path },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'AmbientScribeSession',
      resourceId: sessionId,
      metadata: { event: 'audio_upload_reserved', fileSizeBytes },
    });

    return {
      uploadUrl: signed.uploadUrl,
      bucket: signed.bucket,
      path: signed.path,
    };
  },
});

function mapTranscriptSpeaker(raw: string): ScribeSpeaker {
  const upper = raw.toUpperCase();
  if (upper === 'PROVIDER' || upper === 'PATIENT' || upper === 'TECHNICIAN') {
    return upper as ScribeSpeaker;
  }
  return ScribeSpeaker.OTHER;
}

export const transcribeScribeAudio = action({
  schema: z.object({ sessionId: z.string() }),
  async handler({ sessionId }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    if (!isTranscriptionAvailable()) {
      throw new Error('Transcription vendor is not configured');
    }
    if (!serverEnv.transcriptionBaaConfirmed) {
      throw new Error('Transcription BAA must be confirmed before transcribing audio');
    }

    const session = await db.ambientScribeSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);
    if (!session.audioBucket || !session.audioPath) {
      throw new Error('No audio uploaded for this session');
    }

    const audioUrl = await getSignedDownloadUrl(session.audioBucket, session.audioPath, 600);
    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(audioUrl);

    await db.transcriptSegment.deleteMany({ where: { sessionId } });
    if (result.segments.length > 0) {
      await db.transcriptSegment.createMany({
        data: result.segments.map((seg) => ({
          sessionId,
          speaker: mapTranscriptSpeaker(seg.speaker),
          startMs: seg.startMs,
          endMs: seg.endMs,
          text: seg.text,
          confidence: seg.confidence ?? null,
        })),
      });
    } else if (result.text.trim()) {
      await db.transcriptSegment.create({
        data: {
          sessionId,
          speaker: ScribeSpeaker.OTHER,
          startMs: 0,
          endMs: Math.max(1000, result.text.length * 60),
          text: result.text.trim(),
        },
      });
    }

    const updated = await db.ambientScribeSession.update({
      where: { id: sessionId },
      data: {
        status: ScribeSessionStatus.STOPPED,
        reviewStatus: 'PROCESSING',
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'AI_INVOCATION',
      resourceType: 'AmbientScribeSession',
      resourceId: sessionId,
      metadata: {
        event: 'transcription_complete',
        provider: provider.name,
        segmentCount: result.segments.length,
      },
    });

    revalidatePath(`/provider/ambient-scribe/${sessionId}`);
    return updated;
  },
});

/**
 * Transcript-faithful note generation.
 *
 * ANTI-HALLUCINATION RULES:
 * - Never invent exam findings, diagnoses, medications, or plans
 * - Only include information explicitly present in the transcript
 * - Mark missing sections as "Not documented in transcript"
 * - Every extracted item cites the transcript source
 */
export const generateScribeArtifacts = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    const session = await db.ambientScribeSession.findUnique({
      where: { id },
      include: { segments: { orderBy: { startMs: 'asc' } } },
    });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);

    if (session.segments.length === 0) {
      throw new Error('No transcript segments to generate from. Record or add segments first.');
    }

    const segments = session.segments;
    const transcript = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');

    // Try AI Gateway first when configured; fall back to transcript parser.
    let gatewayDraft = null;
    try {
      const { generateScribeNoteViaGateway } = await import('@/lib/scribe/note-generator');
      gatewayDraft = await generateScribeNoteViaGateway({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        patientId: session.patientId,
        appointmentId: session.appointmentId,
        transcript,
      });
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AIGatewayError')) {
        console.error('[scribe] gateway note generation failed, using parser fallback:', err);
      }
    }

    if (gatewayDraft) {
      const updated = await db.ambientScribeSession.update({
        where: { id },
        data: {
          generatedSoap: gatewayDraft.generatedSoap,
          generatedPlan: gatewayDraft.generatedPlan,
          generatedReferral: gatewayDraft.generatedReferral,
          generatedCoding: gatewayDraft.generatedCoding,
          chiefComplaint: gatewayDraft.chiefComplaint,
          hpi: gatewayDraft.hpi,
          examSummary: gatewayDraft.examSummary,
          assessmentText: gatewayDraft.assessmentText,
          planText: gatewayDraft.planText,
          patientInstructions: gatewayDraft.patientInstructions,
          followUpRecommendation: gatewayDraft.followUpRecommendation,
          aiConfidenceScore: gatewayDraft.aiConfidenceScore,
          reviewStatus: 'READY_FOR_REVIEW',
          status: 'READY',
        },
      });

      await audit({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'AI_INVOCATION',
        resourceType: 'AmbientScribeSession',
        resourceId: id,
        metadata: {
          provider: 'ai-gateway',
          requestId: gatewayDraft.gatewayRequestId,
          source: gatewayDraft.source,
        },
      });

      revalidatePath(`/provider/ambient-scribe/${id}`);
      return updated;
    }

    const patientLines = segments.filter((s) => s.speaker === 'PATIENT');
    const providerLines = segments.filter((s) => s.speaker === 'PROVIDER');
    const techLines = segments.filter((s) => s.speaker === 'TECHNICIAN');
    const allText = transcript.toLowerCase();

    // Extract only what's explicitly in the transcript
    const chiefComplaint = extractChiefComplaint(patientLines, providerLines);
    const hpi = extractHPI(patientLines);
    const objectiveFindings = extractObjectiveFindings(techLines, providerLines, allText);
    const assessmentFromTranscript = extractAssessment(providerLines, allText);
    const planFromTranscript = extractPlan(providerLines, allText);
    const missingInfo = buildMissingChecklist(allText);
    const unsupported = findUnsupportedNoteSections(transcript, {
      chiefComplaint: chiefComplaint.text,
      hpi: hpi.text,
      objective: objectiveFindings.text,
      assessment: assessmentFromTranscript.text,
      plan: planFromTranscript.text,
    });

    const soap = [
      '⚠️ AI-GENERATED DRAFT. PROVIDER REVIEW AND SIGN-OFF REQUIRED',
      '⚠️ Only information found in the transcript is included below.',
      '',
      ...(unsupported.length > 0
        ? [
            '━━━ UNSUPPORTED STATEMENT CHECK ━━━',
            ...unsupported.map((u) => `⚠ ${u.section}: ${u.reason}`),
            '',
          ]
        : []),
      '━━━ CHIEF COMPLAINT ━━━',
      chiefComplaint.text,
      `  [Source: ${chiefComplaint.source}]`,
      `  [Confidence: ${chiefComplaint.confidence}]`,
      '',
      '━━━ HPI (History of Present Illness) ━━━',
      hpi.text,
      `  [Source: ${hpi.source}]`,
      `  [Confidence: ${hpi.confidence}]`,
      '',
      '━━━ OBJECTIVE / EXAM FINDINGS ━━━',
      objectiveFindings.text,
      `  [Source: ${objectiveFindings.source}]`,
      `  [Confidence: ${objectiveFindings.confidence}]`,
      '',
      '━━━ ASSESSMENT ━━━',
      assessmentFromTranscript.text,
      `  [Source: ${assessmentFromTranscript.source}]`,
      `  [Confidence: ${assessmentFromTranscript.confidence}]`,
      '',
      '━━━ PLAN ━━━',
      planFromTranscript.text,
      `  [Source: ${planFromTranscript.source}]`,
      `  [Confidence: ${planFromTranscript.confidence}]`,
      '',
      '━━━ MISSING INFORMATION ━━━',
      ...missingInfo,
      '',
      '━━━ PROVIDER REVIEW NEEDED ━━━',
      'This note was generated from the transcript only.',
      'Do NOT sign unless you have reviewed for clinical accuracy.',
      'Sections marked "Not documented" must be completed by the provider.',
    ].join('\n');

    // Patient instructions, only reference what was actually discussed
    const instructions = [
      '⚠️ DRAFT PATIENT INSTRUCTIONS. PROVIDER REVIEW REQUIRED',
      '',
      'Based on today\'s visit transcript:',
      ...(planFromTranscript.text.includes('Not documented')
        ? ['- Specific instructions were not documented in the transcript.', '- Provider must add instructions before sharing with patient.']
        : [`- ${planFromTranscript.text.split('\n').filter(l => l.startsWith('-')).join('\n')}`]),
      '',
      'Standard reminders:',
      '- Contact the office if you experience sudden vision loss, flashes, floaters, severe eye pain, or worsening symptoms.',
      '',
      'Provider must review and customize before sharing with patient.',
    ].join('\n');

    // Referral, empty template, never fabricate reason
    const referral = [
      '⚠️ REFERRAL DRAFT. PROVIDER MUST COMPLETE ALL FIELDS',
      '',
      'Dear Colleague,',
      '',
      'Reason for referral: [Provider to complete. Not documented in transcript]',
      'Pertinent findings: [Provider to complete]',
      'Requested input: [Provider to complete]',
      '',
      'Sincerely,',
      '[Provider name]',
    ].join('\n');

    // Coding, never suggest specific codes from transcript
    const coding = [
      'Coding cannot be determined from transcript alone.',
      'Provider must select appropriate E/M level based on complexity.',
      'Verify with practice billing policy.',
    ];

    const confidenceMap = { High: 0.85, Medium: 0.6, Low: 0.35 } as const;
    const sectionScores = [
      chiefComplaint.confidence,
      hpi.confidence,
      objectiveFindings.confidence,
      assessmentFromTranscript.confidence,
      planFromTranscript.confidence,
    ].map((c) => confidenceMap[c]);
    const aiConfidenceScore =
      sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;

    const followUpMatch = planFromTranscript.text.match(
      /(?:follow[- ]?up|come back|return|see you)[^.\n]*/i,
    );

    const updated = await db.ambientScribeSession.update({
      where: { id },
      data: {
        generatedSoap: soap,
        generatedPlan: instructions,
        generatedReferral: referral,
        generatedCoding: coding,
        chiefComplaint: chiefComplaint.text,
        hpi: hpi.text,
        examSummary: objectiveFindings.text,
        assessmentText: assessmentFromTranscript.text,
        planText: planFromTranscript.text,
        patientInstructions: instructions,
        followUpRecommendation: followUpMatch
          ? `From transcript: "${followUpMatch[0].trim()}". Provider to confirm interval.`
          : 'Not stated in transcript. Provider to set follow-up interval.',
        aiConfidenceScore,
        reviewStatus: 'READY_FOR_REVIEW',
        status: 'READY',
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'AI_INVOCATION',
      resourceType: 'AmbientScribeSession',
      resourceId: id,
      metadata: { provider: 'transcript-parser', transcriptChars: transcript.length },
    });

    revalidatePath(`/provider/ambient-scribe/${id}`);
    return updated;
  },
});

/** Provider edits the AI draft sections before approval. */
export const updateScribeArtifacts = action({
  schema: z.object({
    id: z.string(),
    chiefComplaint: z.string().max(4000).optional(),
    hpi: z.string().max(8000).optional(),
    examSummary: z.string().max(8000).optional(),
    assessmentText: z.string().max(8000).optional(),
    planText: z.string().max(8000).optional(),
    patientInstructions: z.string().max(8000).optional(),
    followUpRecommendation: z.string().max(2000).optional(),
  }),
  async handler(input) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    const session = await db.ambientScribeSession.findUnique({ where: { id: input.id } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);
    if (session.reviewStatus === 'APPROVED') {
      throw new Error('This note is already approved. Create an amendment instead.');
    }

    const { id, ...fields } = input;
    const updated = await db.ambientScribeSession.update({
      where: { id },
      data: fields,
    });
    revalidatePath(`/provider/ambient-scribe/${id}`);
    return updated;
  },
});

/**
 * Provider approves the AI draft. Creates a ClinicalNote on the patient
 * chart marked as AI assisted, links it back to the session.
 */
export const approveScribeNote = action({
  schema: z.object({
    id: z.string(),
    comment: z.string().max(2000).optional(),
  }),
  async handler({ id, comment }) {
    const user = await assertPermission('notes:sign');
    if (!user.organizationId) throw new Error('No organization context');

    const session = await db.ambientScribeSession.findUnique({ where: { id } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);
    if (!session.patientId) {
      throw new Error('Link this session to a patient before saving the note.');
    }
    if (session.reviewStatus === 'APPROVED') {
      throw new Error('This note is already approved.');
    }
    if (!session.generatedSoap) {
      throw new Error('Generate the note from the transcript first.');
    }

    const note = await db.clinicalNote.create({
      data: {
        organizationId: user.organizationId,
        patientId: session.patientId,
        appointmentId: session.appointmentId,
        authorId: user.id,
        signedById: user.id,
        signedAt: new Date(),
        type: 'AI_ASSISTED_VISIT_NOTE',
        chiefComplaint: session.chiefComplaint,
        subjective: session.hpi,
        objective: session.examSummary,
        assessment: session.assessmentText,
        plan: [session.planText, session.patientInstructions]
          .filter(Boolean)
          .join('\n\nPatient instructions:\n'),
        status: 'SIGNED',
        legacySummary:
          'AI generated from ambient scribe transcript. Reviewed and approved by provider.',
      },
    });

    await db.ambientScribeSession.update({
      where: { id },
      data: {
        reviewStatus: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewComment: comment ?? null,
        savedNoteId: note.id,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SIGN_OFF',
      resourceType: 'AmbientScribeSession',
      resourceId: id,
      metadata: { savedNoteId: note.id, event: 'provider_approved_ai_note' },
    });

    revalidatePath(`/provider/ambient-scribe/${id}`);
    revalidatePath('/provider/ambient-scribe');
    revalidatePath(`/provider/patients/${session.patientId}`);
    revalidatePath('/provider/dashboard');
    return { noteId: note.id };
  },
});

export const rejectScribeNote = action({
  schema: z.object({
    id: z.string(),
    comment: z.string().max(2000).optional(),
  }),
  async handler({ id, comment }) {
    const user = await assertPermission('scribe:use');
    if (!user.organizationId) throw new Error('No organization context');
    const session = await db.ambientScribeSession.findUnique({ where: { id } });
    if (!session) throw new Error('Session not found');
    assertSameOrg(user, session);

    const updated = await db.ambientScribeSession.update({
      where: { id },
      data: {
        reviewStatus: 'REJECTED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewComment: comment ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'AmbientScribeSession',
      resourceId: id,
      metadata: { event: 'provider_rejected_ai_note' },
    });

    revalidatePath(`/provider/ambient-scribe/${id}`);
    revalidatePath('/provider/dashboard');
    return updated;
  },
});

// ── Transcript extraction helpers ─────────────────────────────────

type Extracted = { text: string; source: string; confidence: 'High' | 'Medium' | 'Low' };
type Seg = { speaker: string; text: string };

function extractChiefComplaint(patientLines: Seg[], providerLines: Seg[]): Extracted {
  // Look for the first patient response to a "what brings you in" type question
  const firstPatient = patientLines[0];
  if (firstPatient) {
    return {
      text: `"${firstPatient.text}"`,
      source: `Patient statement (first patient segment)`,
      confidence: 'High',
    };
  }
  // Check if provider stated a chief complaint
  const provCC = providerLines.find((l) => l.text.toLowerCase().includes('brings you'));
  if (provCC) {
    return {
      text: `Provider asked: "${provCC.text}". Patient response not captured.`,
      source: 'Provider segment',
      confidence: 'Low',
    };
  }
  return { text: 'Not documented in transcript.', source: 'No chief complaint found', confidence: 'Low' };
}

function extractHPI(patientLines: Seg[]): Extracted {
  if (patientLines.length === 0) {
    return { text: 'Not documented in transcript.', source: 'No patient statements found', confidence: 'Low' };
  }
  const statements = patientLines.map((l) => `- "${l.text}"`).join('\n');
  return {
    text: `Patient reported:\n${statements}`,
    source: `${patientLines.length} patient segment(s)`,
    confidence: patientLines.length >= 2 ? 'High' : 'Medium',
  };
}

function extractObjectiveFindings(techLines: Seg[], providerLines: Seg[], allText: string): Extracted {
  const findings: string[] = [];
  const sources: string[] = [];

  // Look for VA/IOP/specific measurements in tech and provider lines
  for (const line of [...techLines, ...providerLines]) {
    const lower = line.text.toLowerCase();
    if (lower.match(/20\/\d+|iop|pressure|vision|acuity/)) {
      findings.push(`- ${line.speaker}: "${line.text}"`);
      sources.push(`${line.speaker} statement`);
    }
    if (lower.match(/slit\s*lamp|fundus|cornea|lens|disc|macula|retina|anterior|chamber/)) {
      findings.push(`- ${line.speaker}: "${line.text}"`);
      sources.push(`${line.speaker} statement`);
    }
    if (lower.match(/meibomian|fluorescein|staining|tear|dry/)) {
      findings.push(`- ${line.speaker}: "${line.text}"`);
      sources.push(`${line.speaker} statement`);
    }
  }

  // Deduplicate
  const unique = [...new Set(findings)];

  if (unique.length === 0) {
    // Check if there are any tech/provider lines at all
    if (techLines.length > 0 || providerLines.length > 0) {
      const other = [...techLines, ...providerLines]
        .filter((l) => !l.text.toLowerCase().includes('brings you') && !l.text.toLowerCase().includes('how long'))
        .map((l) => `- ${l.speaker}: "${l.text}"`);
      if (other.length > 0) {
        return {
          text: `Statements from exam (provider to confirm if these are findings):\n${other.join('\n')}`,
          source: 'Provider/technician segments. May not be exam findings.',
          confidence: 'Low',
        };
      }
    }
    return {
      text: 'Not documented in transcript. Provider must complete exam findings.',
      source: 'No objective data found in transcript',
      confidence: 'Low',
    };
  }

  return {
    text: `Documented in transcript:\n${unique.join('\n')}`,
    source: [...new Set(sources)].join(', '),
    confidence: unique.length >= 2 ? 'High' : 'Medium',
  };
}

function extractAssessment(providerLines: Seg[], allText: string): Extracted {
  // Look for assessment-like statements
  const assessmentKeywords = ['diagnos', 'assessment', 'impression', 'consistent with', 'suspect', 'mgd', 'dry eye', 'glaucoma', 'cataract', 'macular'];
  const found: string[] = [];

  for (const line of providerLines) {
    const lower = line.text.toLowerCase();
    if (assessmentKeywords.some((k) => lower.includes(k))) {
      found.push(`- Provider stated: "${line.text}"`);
    }
  }

  if (found.length > 0) {
    return {
      text: `From transcript:\n${found.join('\n')}\n\nProvider must confirm or modify assessment.`,
      source: 'Provider statement(s)',
      confidence: 'Medium',
    };
  }

  return {
    text: 'Not stated by provider in transcript. Provider must document assessment.',
    source: 'No assessment statements found in transcript',
    confidence: 'Low',
  };
}

function extractPlan(providerLines: Seg[], allText: string): Extracted {
  const planKeywords = ['follow up', 'follow-up', 'come back', 'return', 'prescri', 'recommend', 'start', 'continue', 'drops', 'warm compress', 'lid scrub', 'refer', 'schedule'];
  const found: string[] = [];

  for (const line of providerLines) {
    const lower = line.text.toLowerCase();
    if (planKeywords.some((k) => lower.includes(k))) {
      found.push(`- Provider stated: "${line.text}"`);
    }
  }

  if (found.length > 0) {
    return {
      text: `From transcript:\n${found.join('\n')}\n\nProvider must confirm plan is complete and accurate.`,
      source: 'Provider statement(s)',
      confidence: 'Medium',
    };
  }

  return {
    text: 'Not documented in transcript. Provider must document plan.',
    source: 'No plan statements found in transcript',
    confidence: 'Low',
  };
}

function buildMissingChecklist(allText: string): string[] {
  const checks: string[] = [];
  if (!allText.match(/20\/\d+|acuity|vision/)) checks.push('☐ Visual acuity not mentioned');
  if (!allText.match(/iop|pressure|tonometry/)) checks.push('☐ IOP not mentioned');
  if (!allText.match(/dilat/)) checks.push('☐ Dilation not discussed');
  if (!allText.match(/assessment|diagnos|impression/)) checks.push('☐ Assessment not stated');
  if (!allText.match(/plan|follow.?up|return|come back/)) checks.push('☐ Plan/follow-up not stated');
  if (!allText.match(/prescri|drop|medic/)) checks.push('☐ Medications not mentioned');
  if (!allText.match(/refer/)) checks.push('☐ Referral not discussed');
  if (checks.length === 0) checks.push('All major sections have some transcript evidence.');
  return checks;
}

/** Flags note lines that lack clear transcript support (conservative heuristic). */
function findUnsupportedNoteSections(
  transcript: string,
  sections: Record<string, string>,
): { section: string; reason: string }[] {
  const transcriptLower = transcript.toLowerCase();
  const flags: { section: string; reason: string }[] = [];

  for (const [section, text] of Object.entries(sections)) {
    if (
      text.includes('Not documented') ||
      text.includes('Not stated') ||
      text.includes('Provider must')
    ) {
      continue;
    }

    const quoted = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]?.toLowerCase()).filter(Boolean);
    if (quoted.length === 0) continue;

    const unsupportedQuotes = quoted.filter((q) => q && !transcriptLower.includes(q.slice(0, Math.min(24, q.length))));
    if (unsupportedQuotes.length > 0) {
      flags.push({
        section,
        reason: `Quoted content may not match transcript verbatim. Provider to verify (${unsupportedQuotes.length} line(s)).`,
      });
    }
  }

  return flags;
}
