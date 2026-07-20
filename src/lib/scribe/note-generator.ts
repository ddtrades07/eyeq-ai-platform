import 'server-only';
import { executeAIRequest, isAiAvailable } from '@/lib/ai-gateway';
import type { Role } from '@prisma/client';

export type ScribeNoteDraft = {
  chiefComplaint: string;
  hpi: string;
  examSummary: string;
  assessmentText: string;
  planText: string;
  patientInstructions: string;
  followUpRecommendation: string;
  generatedSoap: string;
  generatedPlan: string;
  generatedReferral: string;
  generatedCoding: string[];
  aiConfidenceScore: number;
  source: 'ai-gateway' | 'transcript-parser';
  gatewayRequestId?: string;
};

const SCRIBE_SYSTEM = `You are an optometry ambient scribe assistant for EyeQ.
Generate a structured clinical documentation DRAFT from the transcript ONLY.

RULES:
- Never invent exam findings, diagnoses, medications, or plans not in the transcript
- Mark missing sections as "Not documented in transcript"
- Never assert a final diagnosis
- Always label output as requiring provider review
- Return valid JSON with keys: chiefComplaint, hpi, examSummary, assessmentText, planText, patientInstructions, followUpRecommendation, missingInformation (array), limitations (string)`;

export async function generateScribeNoteViaGateway(args: {
  userId: string;
  organizationId: string;
  role: Role;
  patientId?: string | null;
  appointmentId?: string | null;
  transcript: string;
}): Promise<ScribeNoteDraft | null> {
  if (!isAiAvailable()) return null;

  try {
    const result = await executeAIRequest({
      userId: args.userId,
      practiceId: args.organizationId,
      role: args.role,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      requestType: 'SCRIBE_NOTE_GENERATION',
      requestedAction: 'generate_scribe_note',
      message: `Generate an optometry visit note draft from this transcript:\n\n${args.transcript}`,
      requiresProviderReview: true,
      context: {
        systemPrompt: SCRIBE_SYSTEM,
        temperature: 0.2,
        maxTokens: 3000,
        jsonMode: true,
      },
    });

    const raw = result.humanReadableOutput ?? '';
    let parsed: Record<string, string | string[]> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    const missing = Array.isArray(parsed.missingInformation)
      ? parsed.missingInformation.map(String)
      : [];

    const soap = [
      '⚠️ AI-GENERATED DRAFT. PROVIDER REVIEW AND SIGN-OFF REQUIRED',
      '',
      `Chief complaint: ${parsed.chiefComplaint ?? 'Not documented'}`,
      `HPI: ${parsed.hpi ?? 'Not documented'}`,
      `Objective: ${parsed.examSummary ?? 'Not documented'}`,
      `Assessment: ${parsed.assessmentText ?? 'Not documented'}`,
      `Plan: ${parsed.planText ?? 'Not documented'}`,
      '',
      ...(missing.length ? ['Missing:', ...missing.map((m) => `- ${m}`)] : []),
      '',
      String(parsed.limitations ?? 'Provider review required.'),
    ].join('\n');

    return {
      chiefComplaint: String(parsed.chiefComplaint ?? 'Not documented in transcript'),
      hpi: String(parsed.hpi ?? 'Not documented in transcript'),
      examSummary: String(parsed.examSummary ?? 'Not documented in transcript'),
      assessmentText: String(parsed.assessmentText ?? 'Not documented in transcript'),
      planText: String(parsed.planText ?? 'Not documented in transcript'),
      patientInstructions: String(parsed.patientInstructions ?? 'Provider to complete before sharing with patient.'),
      followUpRecommendation: String(parsed.followUpRecommendation ?? 'Not stated in transcript.'),
      generatedSoap: soap,
      generatedPlan: String(parsed.patientInstructions ?? ''),
      generatedReferral: 'Referral draft requires provider completion.',
      generatedCoding: ['Coding requires provider review. Not determined from transcript alone.'],
      aiConfidenceScore: result.confidence ?? 0.65,
      source: 'ai-gateway',
      gatewayRequestId: result.requestId,
    };
  } catch {
    return null;
  }
}
