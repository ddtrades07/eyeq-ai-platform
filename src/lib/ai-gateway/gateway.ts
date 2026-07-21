import 'server-only';
import type { AiProviderVendor } from '@prisma/client';
import { db } from '@/lib/db';
import type { ChatMessage } from '@/lib/ai/provider';
import { serverEnv } from '@/lib/env';
import { authorizeAIRequest } from './authorization';
import { assertTenantAccess, loadKnownPatientIdentifiers } from './tenant-isolation';
import { scanForPhi } from './phi-safety-gate';
import { routeModel, isProviderConfigured } from './model-router';
import { invokeWithFallback } from './retry-manager';
import { guardPrompt } from './prompt-guard';
import { buildPrompt } from './prompt-builder';
import { retrieveKnowledge } from './knowledge-retriever';
import { validateClinicalSafety } from './clinical-safety-validator';
import { logAiInvocation, logBlockedRequest, logPhiDetection, safeLogMessage } from './audit-logger';
import { recordUsage } from './usage-tracker';
import type { StandardAIRequest, StandardAIResponse } from './types';
import { AIGatewayError } from './types';

/**
 * Central EyeQ AI Gateway. Every AI feature must pass through here.
 * No provider may be called directly from the browser.
 */
export async function executeAIRequest(
  request: StandardAIRequest,
): Promise<StandardAIResponse> {
  const started = Date.now();

  if (serverEnv.aiEmergencyShutdown) {
    throw new AIGatewayError(
      'AI services are temporarily disabled by an administrator.',
      'SHUTDOWN',
      503,
    );
  }

  authorizeAIRequest({
    role: request.role,
    requestType: request.requestType,
    hasPatientContext: Boolean(request.patientId),
  });

  await assertTenantAccess({
    userId: request.userId,
    practiceId: request.practiceId,
    locationId: request.locationId,
    patientId: request.patientId,
  });

  const route = routeModel(request.requestType);
  const messageText = request.message ?? '';

  let knownPatient;
  if (request.patientId) {
    knownPatient = await loadKnownPatientIdentifiers(request.patientId, request.practiceId);
  }

  const phiScan = scanForPhi(messageText, knownPatient ?? undefined);
  await logPhiDetection({
    practiceId: request.practiceId,
    userId: request.userId,
    scan: phiScan,
  });

  if (phiScan.blocked) {
    await logBlockedRequest({
      practiceId: request.practiceId,
      userId: request.userId,
      requestType: request.requestType,
      reason: phiScan.userMessage ?? 'PHI blocked',
      phiRiskLevel: phiScan.riskLevel,
    });
    throw new AIGatewayError(
      phiScan.userMessage ?? 'Request blocked by PHI Safety Gate.',
      'PHI_BLOCKED',
      403,
    );
  }

  const effectiveMessage = phiScan.redactedText ?? messageText;
  const providerReviewRequired = request.requiresProviderReview ?? true;

  if (
    request.patientId &&
    (request.context?.enrichedContext || serverEnv.aiAllowPhi)
  ) {
    const baaOk = serverEnv.openaiBaaConfirmed || serverEnv.aiBaaConfirmed;
    const openaiOk =
      (serverEnv.aiMode === 'openai' || serverEnv.aiProvider === 'openai') &&
      Boolean(serverEnv.openaiApiKey);

    if (!serverEnv.aiAllowPhi || !baaOk || !openaiOk) {
      await logBlockedRequest({
        practiceId: request.practiceId,
        userId: request.userId,
        requestType: request.requestType,
        reason: !serverEnv.aiAllowPhi
          ? 'Patient chart context blocked. AI_ALLOW_PHI=false'
          : !baaOk
            ? 'Patient chart context blocked without approved OpenAI BAA'
            : 'Patient chart context blocked. OpenAI not configured',
        phiRiskLevel: 'CONFIRMED_PHI',
      });
      throw new AIGatewayError(
        'Clinical AI with PHI requires AI_ALLOW_PHI=true, AI_MODE=openai, OPENAI_API_KEY, and an OpenAI BAA confirmation. Provider review is still required for any draft output.',
        'PHI_BLOCKED',
        403,
      );
    }
  }

  const dbRequest = await db.aiGatewayRequest.create({
    data: {
      organizationId: request.practiceId,
      locationId: request.locationId,
      userId: request.userId,
      patientId: request.patientId,
      appointmentId: request.appointmentId,
      requestType: request.requestType,
      requestedAction: request.requestedAction,
      currentPage: request.currentPage,
      role: request.role,
      message: safeLogMessage(messageText),
      redactedMessage: safeLogMessage(effectiveMessage),
      phiRiskLevel: phiScan.riskLevel,
      selectedModel: request.selectedModel,
      routedProvider: route.vendor,
      routedModel: route.model,
      status: 'PROCESSING',
      providerReviewRequired,
      idempotencyKey: request.idempotencyKey,
    },
  });

  if (!isProviderConfigured(route.vendor)) {
    await db.aiGatewayRequest.update({
      where: { id: dbRequest.id },
      data: { status: 'FAILED', errorMessage: 'No approved provider configured' },
    });
    throw new AIGatewayError(
      'AI assistant is not configured. Contact your practice administrator to enable an approved AI provider.',
      'NO_PROVIDER',
      503,
    );
  }

  const knowledge = await retrieveKnowledge({
    practiceId: request.practiceId,
    role: request.role,
    query: effectiveMessage,
  });

  const systemPrompt = buildPrompt({
    systemPrompt: request.context?.systemPrompt,
    enrichedContext: request.context?.enrichedContext,
    knowledgeChunks: knowledge,
  });

  const history: ChatMessage[] = (request.context?.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages: ChatMessage[] = guardPrompt([
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: effectiveMessage },
  ]);

  let result;
  try {
    const primary = {
      vendor: route.vendor,
      model: request.selectedModel ?? route.model,
      messages,
      temperature: request.context?.temperature,
      maxTokens: request.context?.maxTokens,
      jsonMode: request.context?.jsonMode,
    };
    const fallback = route.fallbackVendor
      ? {
          vendor: route.fallbackVendor,
          model: route.fallbackModel ?? route.model,
          messages,
          temperature: request.context?.temperature,
          maxTokens: request.context?.maxTokens,
          jsonMode: request.context?.jsonMode,
        }
      : undefined;

    result = await invokeWithFallback(primary, fallback);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Provider error';
    await db.aiGatewayRequest.update({
      where: { id: dbRequest.id },
      data: { status: 'FAILED', errorMessage: errorMessage.slice(0, 500), processingTimeMs: Date.now() - started },
    });
    await logAiInvocation({
      practiceId: request.practiceId,
      userId: request.userId,
      requestId: dbRequest.id,
      requestType: request.requestType,
      success: false,
      latencyMs: Date.now() - started,
    });
    throw new AIGatewayError(errorMessage, 'NO_PROVIDER', 502);
  }

  const clinicalCheck = validateClinicalSafety({
    output: result.text,
    requestType: request.requestType,
    providerReviewRequired,
  });

  const processingTimeMs = Date.now() - started;

  await db.aiGatewayResponse.create({
    data: {
      requestId: dbRequest.id,
      status: 'COMPLETED',
      modelUsed: result.model,
      taskType: request.requestType,
      humanReadableOutput: result.text,
      confidence: undefined,
      limitations: clinicalCheck.limitations,
      supportingSources: knowledge.map((k) => ({ type: 'knowledge', label: k.title })),
      providerReviewRequired,
      safetyFlags: clinicalCheck.flags,
    },
  });

  await db.aiGatewayRequest.update({
    where: { id: dbRequest.id },
    data: {
      status: 'COMPLETED',
      processingTimeMs,
      estimatedCostCents: result.costCents,
      routedProvider: result.vendor,
      routedModel: result.model,
    },
  });

  await recordUsage({
    practiceId: request.practiceId,
    userId: request.userId,
    requestId: dbRequest.id,
    requestType: request.requestType,
    vendor: result.vendor,
    modelName: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costCents: result.costCents,
    latencyMs: processingTimeMs,
    success: true,
  });

  await logAiInvocation({
    practiceId: request.practiceId,
    userId: request.userId,
    requestId: dbRequest.id,
    requestType: request.requestType,
    model: result.model,
    vendor: result.vendor,
    success: true,
    latencyMs: processingTimeMs,
    costCents: result.costCents,
    safetyFlags: clinicalCheck.flags,
  });

  return {
    requestId: dbRequest.id,
    status: 'completed',
    modelUsed: result.model,
    taskType: request.requestType,
    humanReadableOutput: result.text,
    supportingSources: knowledge.map((k) => ({ type: 'knowledge', label: k.title })),
    providerReviewRequired,
    safetyFlags: clinicalCheck.flags,
    processingTimeMs,
    estimatedCostCents: result.costCents,
    createdAt: new Date().toISOString(),
    phiRedacted: Boolean(phiScan.redactedText),
    phiMessage: phiScan.userMessage,
    limitations: clinicalCheck.limitations,
  };
}

export function isAiAvailable(): boolean {
  if (serverEnv.aiEmergencyShutdown) return false;
  if (serverEnv.aiProvider === 'mock' && serverEnv.aiHipaaMode) return false;
  const route = routeModel('ASSISTANT_CHAT');
  return isProviderConfigured(route.vendor);
}
