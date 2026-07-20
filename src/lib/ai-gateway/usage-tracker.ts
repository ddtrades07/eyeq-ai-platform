import 'server-only';
import { db } from '@/lib/db';
import type { AiProviderVendor, AiRequestType } from '@prisma/client';

export async function recordUsage(args: {
  practiceId: string;
  userId: string;
  requestId: string;
  requestType: AiRequestType;
  vendor: AiProviderVendor;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  latencyMs: number;
  success: boolean;
}): Promise<void> {
  try {
    await db.aiUsageRecord.create({
      data: {
        organizationId: args.practiceId,
        userId: args.userId,
        requestId: args.requestId,
        requestType: args.requestType,
        vendor: args.vendor,
        modelName: args.modelName,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        costCents: args.costCents,
        latencyMs: args.latencyMs,
        success: args.success,
      },
    });
  } catch (err) {
    console.error('[ai-gateway] usage record failed', err);
  }
}
