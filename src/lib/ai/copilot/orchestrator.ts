import 'server-only';
import type {
  CopilotContext,
  CopilotMessage,
  CopilotRequest,
  CopilotResponse,
  ExplainabilityBlock,
} from './types';
import { getSystemPrompt } from './prompts';
import {
  buildPatientSummary,
  buildAppointmentSummary,
  buildImagingSummary,
  buildCareGapSummary,
  buildPrescriptionSummary,
  buildRecentNotesSummary,
  buildTimelineIntelligenceSummary,
  buildPatientPortalSummary,
} from './context';
import { executeAIRequest } from '@/lib/ai-gateway';

/**
 * Copilot orchestrator: all requests route through the centralized AI Gateway.
 */
export async function runCopilot(
  request: CopilotRequest,
): Promise<CopilotResponse> {
  const ctx = request.context;
  const enriched = await enrichContext(ctx);
  const enrichedContext = buildContextBlock(enriched);
  const systemPrompt = getSystemPrompt(enriched.copilotRole);

  const gatewayResult = await executeAIRequest({
    userId: ctx.userId,
    practiceId: ctx.organizationId!,
    role: ctx.userRole,
    patientId: ctx.patientId,
    requestType: 'ASSISTANT_CHAT',
    requestedAction: 'copilot_chat',
    currentPage: ctx.page,
    message: request.message,
    requiresProviderReview: ctx.copilotRole !== 'patient',
    context: {
      conversationId: request.conversationId,
      history: request.history.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
      enrichedContext,
      systemPrompt,
      temperature: 0.4,
      maxTokens: 2048,
    },
  });

  const raw = gatewayResult.humanReadableOutput ?? '';
  const { body, explainability } = parseExplainability(raw, enriched, gatewayResult);

  const suggestedFollowUps = buildFollowUps(ctx, body);

  const message: CopilotMessage = {
    id: gatewayResult.requestId,
    role: 'assistant',
    content: body,
    explainability,
    createdAt: gatewayResult.createdAt,
  };

  return { message, suggestedFollowUps };
}

async function enrichContext(
  ctx: CopilotContext,
): Promise<CopilotContext> {
  if (!ctx.patientId || !ctx.organizationId) return ctx;
  const pid = ctx.patientId;
  const oid = ctx.organizationId;

  if (ctx.copilotRole === 'patient') {
    const portalSummary = await buildPatientPortalSummary(pid, oid);
    return { ...ctx, patientSummary: portalSummary };
  }

  const [
    patientSummary,
    appointmentSummary,
    imagingSummary,
    careGapSummary,
    prescriptionSummary,
    recentNotesSummary,
    timelineIntelligenceSummary,
  ] = await Promise.all([
    buildPatientSummary(pid, oid),
    buildAppointmentSummary(pid, oid),
    buildImagingSummary(pid, oid),
    buildCareGapSummary(pid, oid),
    buildPrescriptionSummary(pid, oid),
    buildRecentNotesSummary(pid, oid),
    buildTimelineIntelligenceSummary(pid, oid),
  ]);

  return {
    ...ctx,
    patientSummary: patientSummary ?? ctx.patientSummary,
    appointmentSummary: appointmentSummary ?? ctx.appointmentSummary,
    imagingSummary: imagingSummary ?? ctx.imagingSummary,
    careGapSummary: careGapSummary ?? ctx.careGapSummary,
    prescriptionSummary: prescriptionSummary ?? ctx.prescriptionSummary,
    recentNotesSummary: recentNotesSummary ?? ctx.recentNotesSummary,
    timelineIntelligenceSummary:
      timelineIntelligenceSummary ?? ctx.timelineIntelligenceSummary,
  };
}

function buildContextBlock(ctx: CopilotContext): string {
  const parts: string[] = [];
  parts.push(`User: ${ctx.userName} (role: ${ctx.userRole})`);
  parts.push(`Current page: ${ctx.page}`);
  if (ctx.patientSummary) parts.push(ctx.patientSummary);
  if (ctx.appointmentSummary) parts.push(ctx.appointmentSummary);
  if (ctx.imagingSummary) parts.push(ctx.imagingSummary);
  if (ctx.careGapSummary) parts.push(ctx.careGapSummary);
  if (ctx.prescriptionSummary) parts.push(ctx.prescriptionSummary);
  if (ctx.recentNotesSummary) parts.push(ctx.recentNotesSummary);
  if (ctx.timelineIntelligenceSummary) parts.push(ctx.timelineIntelligenceSummary);
  return parts.join('\n');
}

function parseExplainability(
  raw: string,
  ctx: CopilotContext,
  gatewayResult: { supportingSources?: { type: string; label: string }[]; limitations?: string; phiMessage?: string },
): { body: string; explainability: ExplainabilityBlock } {
  const marker = /\*\*Why EyeQ responded this way:\*\*/i;
  const match = raw.match(marker);

  let body = raw;
  const factors: string[] = [];

  if (match?.index !== undefined) {
    body = raw.slice(0, match.index).trim();
    const explainSection = raw.slice(match.index + match[0].length).trim();
    const bullets = explainSection
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0 && !l.startsWith('⚠'));
    factors.push(...bullets);
  }

  if (factors.length === 0) {
    if (ctx.patientSummary) factors.push('Patient chart data');
    if (ctx.appointmentSummary) factors.push('Appointment history');
    if (ctx.imagingSummary) factors.push('Imaging history');
    if (ctx.careGapSummary) factors.push('Open care gaps');
    if (ctx.timelineIntelligenceSummary) factors.push('Timeline Intelligence signals');
    if (ctx.recentNotesSummary) factors.push('Recent clinical notes');
    if (ctx.prescriptionSummary) factors.push('Prescription data');
    if (gatewayResult.supportingSources?.length) {
      factors.push(...gatewayResult.supportingSources.map((s) => s.label));
    }
  }

  if (gatewayResult.phiMessage) {
    factors.push(gatewayResult.phiMessage);
  }

  return {
    body,
    explainability: {
      heading: 'Why EyeQ responded this way',
      factors,
      disclaimer:
        ctx.copilotRole === 'patient'
          ? 'For clinical questions, please contact your eye care provider.'
          : gatewayResult.limitations ?? 'AI decision support only. Provider review required.',
    },
  };
}

function buildFollowUps(ctx: CopilotContext, body: string): string[] {
  const followUps: string[] = [];
  if (ctx.copilotRole === 'provider' && ctx.patientId) {
    if (body.includes('imaging') || body.includes('OCT')) {
      followUps.push('Show me the imaging progression details');
    }
    if (body.includes('follow-up') || body.includes('overdue')) {
      followUps.push('Draft a recall message for this patient');
    }
    followUps.push('Generate patient instructions');
  }
  if (ctx.copilotRole === 'front_desk') {
    followUps.push('Draft a reminder for the next patient');
  }
  if (ctx.copilotRole === 'patient') {
    followUps.push('What should I bring to my appointment?');
    followUps.push('How do I prepare for dilation?');
  }
  return followUps.slice(0, 3);
}
