import 'server-only';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import { redactForLogging } from './phi-safety-gate';
import type { StandardAIRequest, PHIScanResult } from './types';

export async function logPhiDetection(args: {
  practiceId: string;
  userId: string;
  requestId?: string;
  scan: PHIScanResult;
}): Promise<void> {
  if (args.scan.riskLevel === 'SAFE') return;

  try {
    await db.phiDetectionEvent.create({
      data: {
        organizationId: args.practiceId,
        requestId: args.requestId,
        userId: args.userId,
        riskLevel: args.scan.riskLevel,
        detectionMethod: args.scan.detections.map((d) => d.method).join(',') || 'scan',
        fieldTypes: args.scan.detections.map((d) => d.fieldType),
        redacted: Boolean(args.scan.redactedText),
        blocked: args.scan.blocked,
        details: { detectionCount: args.scan.detections.length },
      },
    });
  } catch (err) {
    console.error('[ai-gateway] phi event log failed', err);
  }
}

export async function logBlockedRequest(args: {
  practiceId: string;
  userId: string;
  requestType: StandardAIRequest['requestType'];
  reason: string;
  phiRiskLevel?: PHIScanResult['riskLevel'];
}): Promise<void> {
  try {
    await db.blockedAiRequest.create({
      data: {
        organizationId: args.practiceId,
        userId: args.userId,
        requestType: args.requestType,
        reason: args.reason,
        phiRiskLevel: args.phiRiskLevel,
      },
    });
  } catch (err) {
    console.error('[ai-gateway] blocked request log failed', err);
  }

  await audit({
    organizationId: args.practiceId,
    userId: args.userId,
    action: 'AI_INVOCATION',
    resourceType: 'ai_request_blocked',
    metadata: {
      requestType: args.requestType,
      reason: args.reason,
      phiRiskLevel: args.phiRiskLevel,
    },
  });
}

export async function logAiInvocation(args: {
  practiceId: string;
  userId: string;
  requestId: string;
  requestType: StandardAIRequest['requestType'];
  model?: string;
  vendor?: string;
  success: boolean;
  latencyMs: number;
  costCents?: number;
  safetyFlags?: string[];
}): Promise<void> {
  await audit({
    organizationId: args.practiceId,
    userId: args.userId,
    action: 'AI_INVOCATION',
    resourceType: 'ai_gateway_request',
    resourceId: args.requestId,
    metadata: {
      requestType: args.requestType,
      model: args.model,
      vendor: args.vendor,
      success: args.success,
      latencyMs: args.latencyMs,
      costCents: args.costCents,
      safetyFlags: args.safetyFlags,
    },
  });
}

export function safeLogMessage(message?: string): string | undefined {
  if (!message) return undefined;
  return redactForLogging(message).slice(0, 500);
}
